"use server";

import { z } from "zod";
import { draftDigest } from "@/lib/ai/digest";
import { db } from "@/lib/db";
import { allow, LIMITS } from "@/lib/rate-limit";
import { HOSPITAL_CODES } from "@/lib/taxonomy";
import { currentDigest, inbox, patternsFor, statsOf, weekOf, type Digest } from "@/lib/v2";

// HACK: no auth — in production only our analysts may call these (SPEC_V2_FLOW §3).

type Result<T> = { ok: true; value: T } | { ok: false; reason?: "empty" | "busy" };

/** «Собрать сводку»: an AI draft from this week's inbox of one hospital (step 6). */
export async function buildDigest(hospital: string): Promise<Result<Digest>> {
  try {
    const h = z.enum(HOSPITAL_CODES).parse(hospital);
    const existing = await currentDigest(h);
    if (existing) return { ok: true, value: existing };
    const rows = await inbox(h);
    if (rows.length === 0) return { ok: false, reason: "empty" };
    if (!allow("rca-ai", LIMITS.rcaAi)) return { ok: false, reason: "busy" };
    const { data: full } = await db().from("incidents").select("id, stage, factors").in("id", rows.map((r) => r.id));
    const extra = new Map((full ?? []).map((r) => [r.id as string, r as { stage: string; factors: string[] }]));
    const patterns = await patternsFor([...new Set(rows.map((r) => r.pattern_id).filter((x): x is string => Boolean(x)))]);
    const draft = await draftDigest({
      incidents: rows.map((r) => ({
        id: r.id,
        summary: r.summary,
        incident_type: r.incident_type,
        stage: extra.get(r.id)?.stage ?? "other",
        harm: r.harm,
        near_miss: r.near_miss,
        factors: extra.get(r.id)?.factors ?? [],
        involved_role: r.involved_role,
        shift: r.shift,
        pattern_id: r.pattern_id,
      })),
      patterns,
    });
    const w = weekOf();
    const { data, error } = await db()
      .from("digests")
      .insert({ hospital_id: h, period_start: w.start, period_end: w.end, headline: draft.headline, items: draft.items, stats: statsOf(rows), status: "draft" })
      .select("*")
      .single();
    if (error) throw new Error("DIGEST_INSERT_FAILED");
    return { ok: true, value: data as Digest };
  } catch {
    return { ok: false };
  }
}

const Edits = z.object({
  headline: z.string().trim().min(3).max(300),
  analyst_note: z.string().trim().max(600).optional(),
  items: z.array(z.object({ id: z.string().uuid(), title: z.string().trim().min(3).max(140), what: z.string().trim().min(3).max(600), why: z.string().trim().min(3).max(600) })).max(3),
});

/** «Отправить главврачу»: save the analyst's edits, mark sent, attach this week's reports. */
export async function sendDigest(digestId: string, edits: z.input<typeof Edits>): Promise<Result<true>> {
  try {
    const id = z.string().uuid().parse(digestId);
    const e = Edits.parse(edits);
    const sb = db();
    const { data: d } = await sb.from("digests").select("*").eq("id", id).eq("status", "draft").single();
    if (!d) throw new Error("NOT_A_DRAFT");
    const digest = d as Digest;
    const items = digest.items.map((it) => {
      const ed = e.items.find((x) => x.id === it.id);
      return ed ? { ...it, title: ed.title, what: ed.what, why: ed.why } : it;
    });
    const rows = await inbox(digest.hospital_id);
    const { error } = await sb
      .from("digests")
      .update({ headline: e.headline, analyst_note: e.analyst_note || null, items, status: "sent", sent_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error("DIGEST_SEND_FAILED");
    if (rows.length) await sb.from("incidents").update({ digest_id: id }).in("id", rows.map((r) => r.id));
    return { ok: true, value: true };
  } catch {
    return { ok: false };
  }
}
