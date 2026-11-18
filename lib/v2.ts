import "server-only";
import { db } from "@/lib/db";
import type { DigestItem } from "@/lib/ai/digest";
import { DISTRICTS, HOSPITAL_CODES, type ActionStrength, type DistrictId, type Harm, type HospitalCode, type IncidentType, type InvolvedRole, type Shift } from "@/lib/taxonomy";
import { tashkentDate } from "@/lib/time";

// v2-lite data layer (SPEC_V2_FLOW): analyst inbox → digest → chief doctor decisions → district reaction.
// Privacy: only de-identified summaries and labels; no contacts are read anywhere in v2-lite.

export type DigestStatus = "draft" | "sent" | "acknowledged";
export type Digest = {
  id: string;
  hospital_id: HospitalCode;
  period_start: string;
  period_end: string;
  headline: string | null;
  items: DigestItem[];
  stats: { reports?: number; near_miss_share?: number; severe?: number };
  analyst_note: string | null;
  status: DigestStatus;
  sent_at: string | null;
  acknowledged_at: string | null;
};
export type DigestAction = {
  id: string;
  digest_id: string;
  item_id: string;
  decision: "accepted" | "rejected";
  action_text: string | null;
  strength: ActionStrength | null;
  reject_reason: string | null;
  due_date: string | null;
  status: "planned" | "done";
  done_at: string | null;
  show_to_staff: boolean;
};
export type InboxRow = {
  id: string;
  incident_date: string;
  shift: Shift;
  incident_type: IncidentType;
  harm: Harm;
  near_miss: boolean;
  involved_role: InvolvedRole;
  summary: string;
  pattern_id: string | null;
};

const DAY = 86_400_000;

/** Monday and Sunday (YYYY-MM-DD) of the Tashkent week that holds `iso`. */
export function weekOf(iso: string = tashkentDate()): { start: string; end: string } {
  const d = new Date(`${iso}T00:00:00Z`);
  const monday = new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * DAY);
  const day = (t: number) => new Date(t).toISOString().slice(0, 10);
  return { start: day(monday.getTime()), end: day(monday.getTime() + 6 * DAY) };
}

export const isHospital = (v: string): v is HospitalCode => (HOSPITAL_CODES as readonly string[]).includes(v);
export const isDistrict = (v: string): v is DistrictId => v in DISTRICTS;

// ---------------------------------------------------------------- analyst
const INBOX_COLS = "id, incident_date, shift, incident_type, harm, near_miss, involved_role, summary, pattern_id";

/** This week's reports of a hospital that are not in a digest yet. */
export async function inbox(h: HospitalCode): Promise<InboxRow[]> {
  const w = weekOf();
  const { data, error } = await db()
    .from("incidents")
    .select(INBOX_COLS)
    .eq("hospital_id", h)
    .is("digest_id", null)
    .eq("excluded_from_digest", false)
    .gte("incident_date", w.start)
    .lte("incident_date", w.end)
    .order("incident_date", { ascending: false });
  if (error) throw new Error("INBOX_QUERY_FAILED");
  return (data ?? []) as InboxRow[];
}

export async function inboxCounts(): Promise<Record<HospitalCode, number>> {
  const w = weekOf();
  const { data, error } = await db()
    .from("incidents")
    .select("hospital_id")
    .is("digest_id", null)
    .eq("excluded_from_digest", false)
    .gte("incident_date", w.start)
    .lte("incident_date", w.end);
  if (error) throw new Error("INBOX_QUERY_FAILED");
  const out = Object.fromEntries(HOSPITAL_CODES.map((h) => [h, 0])) as Record<HospitalCode, number>;
  for (const r of data ?? []) out[r.hospital_id as HospitalCode] += 1;
  return out;
}

/** The digest of this week for a hospital, if any (draft or sent). */
export async function currentDigest(h: HospitalCode): Promise<Digest | null> {
  const { data, error } = await db().from("digests").select("*").eq("hospital_id", h).eq("period_start", weekOf().start).maybeSingle();
  if (error) throw new Error("DIGEST_QUERY_FAILED");
  return (data as Digest | null) ?? null;
}

export async function patternsFor(ids: string[]) {
  if (ids.length === 0) return [];
  const { data, error } = await db().from("patterns").select("id, title, incident_count, hospital_count").in("id", ids);
  if (error) throw new Error("PATTERN_QUERY_FAILED");
  return (data ?? []) as { id: string; title: string; incident_count: number; hospital_count: number }[];
}

/** Stats are computed in code, never by the AI (SPEC_V2_FLOW §5). */
export function statsOf(rows: Pick<InboxRow, "near_miss" | "harm">[]) {
  const reports = rows.length;
  return {
    reports,
    near_miss_share: reports ? rows.filter((r) => r.near_miss).length / reports : 0,
    severe: rows.filter((r) => r.harm === "severe" || r.harm === "death").length,
  };
}

// ---------------------------------------------------------------- hospital
/** The newest digest the chief doctor has received (sent or read). */
export async function latestReceivedDigest(h: HospitalCode): Promise<Digest | null> {
  const { data, error } = await db()
    .from("digests")
    .select("*")
    .eq("hospital_id", h)
    .neq("status", "draft")
    .order("period_start", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("DIGEST_QUERY_FAILED");
  return (data as Digest | null) ?? null;
}

export async function actionsOfHospital(h: HospitalCode): Promise<(DigestAction & { digest: Pick<Digest, "period_start"> })[]> {
  const { data, error } = await db()
    .from("digest_actions")
    .select("*, digest:digests!inner(period_start, hospital_id)")
    .eq("digest.hospital_id", h)
    .order("created_at", { ascending: false });
  if (error) throw new Error("ACTIONS_QUERY_FAILED");
  return (data ?? []) as (DigestAction & { digest: Pick<Digest, "period_start"> })[];
}

// ---------------------------------------------------------------- district
export type DistrictRow = {
  hospital: HospitalCode;
  reports4w: number;
  digest: Pick<Digest, "id" | "status" | "sent_at" | "acknowledged_at" | "period_start" | "items"> | null;
  hoursToAck: number | null;
  unreadOver48h: boolean;
  accepted: number;
  done: number;
  overdue: number;
  decisions: { item: string; decision: "accepted" | "rejected"; action: string | null; due: string | null; status: string }[];
};

export async function districtView(id: DistrictId): Promise<{ rows: DistrictRow[]; patterns: { id: string; title: string; count: number; hospitals: number }[] }> {
  const hospitals = [...DISTRICTS[id]] as HospitalCode[];
  const today = tashkentDate();
  const since = new Date(new Date(`${today}T00:00:00Z`).getTime() - 28 * DAY).toISOString().slice(0, 10);
  const sb = db();
  const [{ data: inc }, { data: digests }, { data: acts }] = await Promise.all([
    sb.from("incidents").select("hospital_id, pattern_id, incident_date").in("hospital_id", hospitals),
    sb.from("digests").select("id, hospital_id, status, sent_at, acknowledged_at, period_start, items").in("hospital_id", hospitals).neq("status", "draft").order("period_start", { ascending: false }),
    sb.from("digest_actions").select("digest_id, item_id, decision, action_text, due_date, status, digests!inner(hospital_id)").in("digests.hospital_id", hospitals),
  ]);
  const now = Date.now();
  const rows: DistrictRow[] = hospitals.map((h) => {
    const d = (digests ?? []).find((x) => x.hospital_id === h) as DistrictRow["digest"] & { hospital_id: string } | undefined;
    const mine = (acts ?? []).filter((a) => (a as unknown as { digests: { hospital_id: string } }).digests.hospital_id === h);
    const accepted = mine.filter((a) => a.decision === "accepted");
    const titles = new Map(((d?.items ?? []) as DigestItem[]).map((it) => [it.id, it.title]));
    return {
      hospital: h,
      reports4w: (inc ?? []).filter((r) => r.hospital_id === h && r.incident_date >= since).length,
      digest: d ?? null,
      hoursToAck: d?.sent_at && d.acknowledged_at ? Math.max(0, (Date.parse(d.acknowledged_at) - Date.parse(d.sent_at)) / 3_600_000) : null,
      unreadOver48h: Boolean(d && d.status === "sent" && d.sent_at && now - Date.parse(d.sent_at) > 48 * 3_600_000),
      accepted: accepted.length,
      done: accepted.filter((a) => a.status === "done").length,
      overdue: accepted.filter((a) => a.status === "planned" && a.due_date && a.due_date < today).length,
      decisions: d
        ? mine
            .filter((a) => a.digest_id === d.id)
            .map((a) => ({ item: titles.get(a.item_id) ?? "—", decision: a.decision as "accepted" | "rejected", action: a.action_text, due: a.due_date, status: a.status }))
        : [],
    };
  });
  // Rule 9: sort by reaction (overdue, then unread), never by the number of reports.
  rows.sort((a, b) => b.overdue - a.overdue || Number(b.unreadOver48h) - Number(a.unreadOver48h) || a.hospital.localeCompare(b.hospital));

  const byPattern = new Map<string, Set<string>>();
  const counts = new Map<string, number>();
  for (const r of inc ?? []) {
    if (!r.pattern_id) continue;
    byPattern.set(r.pattern_id, (byPattern.get(r.pattern_id) ?? new Set()).add(r.hospital_id));
    counts.set(r.pattern_id, (counts.get(r.pattern_id) ?? 0) + 1);
  }
  const multi = [...byPattern.entries()].filter(([, hs]) => hs.size >= 2).map(([pid]) => pid);
  const pats = await patternsFor(multi);
  return {
    rows,
    patterns: pats.map((p) => ({ id: p.id, title: p.title, count: counts.get(p.id) ?? 0, hospitals: byPattern.get(p.id)?.size ?? 0 })),
  };
}
