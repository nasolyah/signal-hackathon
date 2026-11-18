"use server";

import { z } from "zod";
import { classifyAction, draftRca, type RcaAction } from "@/lib/ai/rca";
import { db } from "@/lib/db";
import { caseText, getRca, insertRca, setStatus, updateRca, type RcaRow, type RcaTarget } from "@/lib/rca-store";
import { FACTORS, HARMS, INCIDENT_TYPES, STAGES } from "@/lib/taxonomy";
import { allow, LIMITS } from "@/lib/rate-limit";

// HACK: no auth for the hackathon (SPEC §2: roles are a demo switcher). In production every
// action here must check that the caller is the hospital's quality lead or a Ministry analyst.

const Target = z.object({ kind: z.enum(["pattern", "incident"]), id: z.string().uuid() });
/** Position in a whys/actions list (≤ 5 whys, ≤ 6 drafted actions plus a few added). */
const Index = z.number().int().min(0).max(30);
const STRENGTH_ORDER = { strong: 0, medium: 1, weak: 2 } as const;
const ranked = (a: RcaAction[]) => [...a].sort((x, y) => STRENGTH_ORDER[x.strength] - STRENGTH_ORDER[y.strength]);

type Result<T> = { ok: true; value: T } | { ok: false };

async function attempt<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, value: await fn() };
  } catch {
    return { ok: false };
  }
}

/** Returns the existing analysis, or drafts one with Gemini and stores it. */
export async function startRca(target: RcaTarget): Promise<Result<RcaRow>> {
  return attempt(async () => {
    const t = Target.parse(target);
    const existing = await getRca(t);
    if (existing) return existing;
    if (!allow("rca-ai", LIMITS.rcaAi)) throw new Error("RATE_LIMITED");
    const draft = await draftRca(await caseText(t));
    const row = await insertRca(t, { ...draft, actions: ranked(draft.actions) });
    await setStatus(t, "in_review");
    return row;
  });
}

export async function editWhy(rcaId: string, index: number, text: string): Promise<Result<RcaRow>> {
  return attempt(async () => {
    const id = z.string().uuid().parse(rcaId);
    const i = Index.parse(index);
    const clean = z.string().trim().min(1).max(500).parse(text);
    const { data } = await db().from("rca").select("whys").eq("id", id).single();
    const whys = [...((data?.whys as string[]) ?? [])];
    if (i >= whys.length) throw new Error("BAD_INDEX");
    whys[i] = clean;
    return updateRca(id, { whys });
  });
}

/** A person adds their own action; Gemini rates its strength; the list is re-ranked. */
export async function addAction(rcaId: string, text: string): Promise<Result<RcaRow>> {
  return attempt(async () => {
    const id = z.string().uuid().parse(rcaId);
    const clean = z.string().trim().min(3).max(300).parse(text);
    if (!allow("rca-ai", LIMITS.rcaAi)) throw new Error("RATE_LIMITED");
    const { strength, rationale } = await classifyAction(clean);
    const { data } = await db().from("rca").select("actions").eq("id", id).single();
    const actions = [...((data?.actions as RcaAction[]) ?? []), { text: clean, strength, rationale, userAdded: true }];
    return updateRca(id, { actions: ranked(actions) });
  });
}

export async function removeAction(rcaId: string, index: number): Promise<Result<RcaRow>> {
  return attempt(async () => {
    const id = z.string().uuid().parse(rcaId);
    const i = Index.parse(index);
    const { data } = await db().from("rca").select("actions").eq("id", id).single();
    const actions = [...((data?.actions as RcaAction[]) ?? [])];
    if (i >= actions.length) throw new Error("BAD_INDEX");
    actions.splice(i, 1);
    return updateRca(id, { actions });
  });
}

export async function setActionMeta(rcaId: string, index: number, meta: { owner?: string; due?: string }): Promise<Result<RcaRow>> {
  return attempt(async () => {
    const id = z.string().uuid().parse(rcaId);
    const i = Index.parse(index);
    const m = z
      .object({ owner: z.string().trim().max(120).optional(), due: z.string().regex(/^(\d{2}\.\d{2}\.\d{4})?$/).optional() })
      .parse(meta);
    const { data } = await db().from("rca").select("actions").eq("id", id).single();
    const actions = [...((data?.actions as RcaAction[]) ?? [])];
    if (!actions[i]) throw new Error("BAD_INDEX");
    actions[i] = { ...actions[i], ...m };
    return updateRca(id, { actions });
  });
}

export async function changeStatus(target: RcaTarget, status: "in_review" | "closed"): Promise<Result<true>> {
  return attempt(async () => {
    await setStatus(Target.parse(target), z.enum(["in_review", "closed"]).parse(status));
    return true as const;
  });
}

/** AI suggests, a human confirms (CLAUDE.md rule 6): saving flips human_verified. */
export async function confirmClassification(
  incidentId: string,
  fields: { incident_type: string; stage: string; harm: string; near_miss: boolean; factors: string[] },
): Promise<Result<true>> {
  return attempt(async () => {
    const id = z.string().uuid().parse(incidentId);
    const f = z
      .object({
        incident_type: z.enum(INCIDENT_TYPES),
        stage: z.enum(STAGES),
        harm: z.enum(HARMS),
        near_miss: z.boolean(),
        factors: z.array(z.enum(FACTORS)).min(1).max(3),
      })
      .parse(fields);
    const { error } = await db().from("incidents").update({ ...f, human_verified: true }).eq("id", id);
    if (error) throw new Error("CONFIRM_FAILED");
    return true as const;
  });
}
