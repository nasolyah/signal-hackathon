"use server";

import { z } from "zod";
import { classifyAction } from "@/lib/ai/rca";
import { db } from "@/lib/db";
import { allow, LIMITS } from "@/lib/rate-limit";
import type { Digest } from "@/lib/v2";

// HACK: no auth — in production only this hospital's chief doctor may call these (SPEC_V2_FLOW §3).

type Result = { ok: true } | { ok: false };

async function attempt(fn: () => Promise<void>): Promise<Result> {
  try {
    await fn();
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

/** First open of a sent digest: the chief doctor has read it (reaction time for the district). */
export async function acknowledge(digestId: string): Promise<Result> {
  return attempt(async () => {
    const id = z.string().uuid().parse(digestId);
    await db().from("digests").update({ status: "acknowledged", acknowledged_at: new Date().toISOString() }).eq("id", id).eq("status", "sent");
  });
}

const Decision = z.discriminatedUnion("decision", [
  z.object({ decision: z.literal("accepted"), action_text: z.string().trim().min(3).max(300), due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }),
  z.object({ decision: z.literal("rejected"), reject_reason: z.string().trim().min(3).max(300) }),
]);

/** «Принять меру» (text, due date) or «Отклонить» (reason) for one digest item. */
export async function decide(digestId: string, itemId: string, input: z.input<typeof Decision>): Promise<Result> {
  return attempt(async () => {
    const id = z.string().uuid().parse(digestId);
    const item = z.string().uuid().parse(itemId);
    const d = Decision.parse(input);
    const sb = db();
    const { data } = await sb.from("digests").select("items").eq("id", id).neq("status", "draft").single();
    const found = ((data as Pick<Digest, "items"> | null)?.items ?? []).find((it) => it.id === item);
    if (!found) throw new Error("NO_ITEM");
    const { count } = await sb.from("digest_actions").select("id", { count: "exact", head: true }).eq("digest_id", id).eq("item_id", item);
    if (count) throw new Error("ALREADY_DECIDED");
    if (d.decision === "rejected") {
      await sb.from("digest_actions").insert({ digest_id: id, item_id: item, decision: "rejected", reject_reason: d.reject_reason }).throwOnError();
      return;
    }
    // A suggested action keeps its strength; an edited one is rated again (the RCA² call from SPEC §2.4.3).
    let strength = found.actions.find((a) => a.text.trim() === d.action_text)?.strength;
    if (!strength) {
      if (!allow("rca-ai", LIMITS.rcaAi)) throw new Error("RATE_LIMITED");
      strength = (await classifyAction(d.action_text)).strength;
    }
    await sb
      .from("digest_actions")
      .insert({ digest_id: id, item_id: item, decision: "accepted", action_text: d.action_text, strength, due_date: d.due_date })
      .throwOnError();
  });
}

/** «Выполнено». */
export async function markDone(actionId: string): Promise<Result> {
  return attempt(async () => {
    const id = z.string().uuid().parse(actionId);
    await db()
      .from("digest_actions")
      .update({ status: "done", done_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("decision", "accepted")
      .throwOnError();
  });
}
