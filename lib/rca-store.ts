import "server-only";
import { db } from "@/lib/db";
import type { RcaAction, RcaDraft } from "@/lib/ai/rca";
import type { CauseCategory } from "@/lib/taxonomy";

// Persistence for RCA (table `rca`). Everything stored here is derived from de-identified text.

export type RcaTarget = { kind: "pattern" | "incident"; id: string };

export type RcaRow = {
  id: string;
  whys: string[];
  causes: Record<CauseCategory, string[]>;
  actions: RcaAction[];
};

const column = (t: RcaTarget) => (t.kind === "pattern" ? "pattern_id" : "incident_id");

export async function getRca(t: RcaTarget): Promise<RcaRow | null> {
  const { data, error } = await db()
    .from("rca")
    .select("id, whys, causes, actions")
    .eq(column(t), t.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("RCA_QUERY_FAILED");
  return (data as RcaRow | null) ?? null;
}

export async function insertRca(t: RcaTarget, draft: RcaDraft): Promise<RcaRow> {
  const { data, error } = await db()
    .from("rca")
    .insert({ [column(t)]: t.id, whys: draft.whys, causes: draft.causes, actions: draft.actions })
    .select("id, whys, causes, actions")
    .single();
  if (error || !data) throw new Error("RCA_INSERT_FAILED");
  return data as RcaRow;
}

export async function updateRca(id: string, patch: Partial<Pick<RcaRow, "whys" | "actions">>): Promise<RcaRow> {
  const { data, error } = await db()
    .from("rca")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, whys, causes, actions")
    .single();
  if (error || !data) throw new Error("RCA_UPDATE_FAILED");
  return data as RcaRow;
}

/** The de-identified text the model sees for a target. Never raw text: it does not exist in the DB. */
export async function caseText(t: RcaTarget): Promise<string> {
  if (t.kind === "pattern") {
    const { data: p } = await db().from("patterns").select("title, description").eq("id", t.id).single();
    const { data: inc } = await db().from("incidents").select("redacted_text, shift").eq("pattern_id", t.id).limit(12);
    if (!p) throw new Error("PATTERN_NOT_FOUND");
    return `Закономерность: ${p.title}\n${p.description ?? ""}\nСлучаи (обезличены):\n${(inc ?? [])
      .map((i) => `- [${i.shift === "night" ? "ночь" : "день"}] ${i.redacted_text}`)
      .join("\n")}`;
  }
  const { data: i } = await db().from("incidents").select("redacted_text, shift, summary").eq("id", t.id).single();
  if (!i) throw new Error("INCIDENT_NOT_FOUND");
  return `Случай (обезличен), смена: ${i.shift === "night" ? "ночь" : "день"}\n${i.redacted_text}\nКратко: ${i.summary}`;
}

export async function setStatus(t: RcaTarget, status: "new" | "open" | "in_review" | "closed") {
  const table = t.kind === "pattern" ? "patterns" : "incidents";
  // patterns use open/in_review/closed; incidents use new/in_review/closed
  const value = t.kind === "pattern" && status === "new" ? "open" : t.kind === "incident" && status === "open" ? "new" : status;
  const { error } = await db().from(table).update({ status: value }).eq("id", t.id);
  if (error) throw new Error("STATUS_UPDATE_FAILED");
}
