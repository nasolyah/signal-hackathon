import "server-only";
import { db } from "@/lib/db";
import type { Harm, HospitalCode, IncidentType, Shift } from "@/lib/taxonomy";

// Read model for /dashboard (SPEC §2.2). Everything here is de-identified data only.
// Privacy rule 4: no department breakdown here (groups of < 5 could identify people).

export type Filters = { hospital?: HospitalCode; type?: IncidentType; harm?: Harm };

export type PatternCard = {
  id: string;
  title: string;
  description: string | null;
  incidentCount: number;
  hospitalCount: number;
  nightShare: number;
  topFactors: string[];
  status: string;
  /** Hospitals the pattern spans, in code order (А…Е). */
  hospitals: HospitalCode[];
};

export type FeedRow = {
  id: string;
  date: string;
  hospital: HospitalCode;
  type: IncidentType;
  harm: Harm;
  nearMiss: boolean;
  status: string;
  shift: Shift;
};

type IncidentLite = {
  id: string;
  hospital_id: HospitalCode;
  incident_type: IncidentType;
  harm: Harm;
  near_miss: boolean;
  status: string;
  shift: Shift;
  incident_date: string;
};

async function incidents(f: Filters): Promise<IncidentLite[]> {
  let q = db()
    .from("incidents")
    .select("id, hospital_id, incident_type, harm, near_miss, status, shift, incident_date")
    .order("incident_date", { ascending: false })
    .order("id");
  if (f.hospital) q = q.eq("hospital_id", f.hospital);
  if (f.type) q = q.eq("incident_type", f.type);
  if (f.harm) q = q.eq("harm", f.harm);
  const { data, error } = await q;
  if (error) throw new Error("DASHBOARD_QUERY_FAILED");
  return (data ?? []) as IncidentLite[];
}

const toFeed = (r: IncidentLite): FeedRow => ({
  id: r.id,
  date: r.incident_date,
  hospital: r.hospital_id,
  type: r.incident_type,
  harm: r.harm,
  nearMiss: r.near_miss,
  status: r.status,
  shift: r.shift,
});

export const REGISTER_PAGE_SIZE = 50;

/** The full register: one page of rows (newest first) and the total for the filters. */
export async function registerPage(f: Filters & { shift?: Shift }, page: number): Promise<{ rows: FeedRow[]; total: number }> {
  let q = db()
    .from("incidents")
    .select("id, hospital_id, incident_type, harm, near_miss, status, shift, incident_date", { count: "exact" })
    .order("incident_date", { ascending: false })
    .order("id");
  if (f.hospital) q = q.eq("hospital_id", f.hospital);
  if (f.type) q = q.eq("incident_type", f.type);
  if (f.harm) q = q.eq("harm", f.harm);
  if (f.shift) q = q.eq("shift", f.shift);
  const from = (page - 1) * REGISTER_PAGE_SIZE;
  const { data, count, error } = await q.range(from, from + REGISTER_PAGE_SIZE - 1);
  if (error) throw new Error("REGISTER_QUERY_FAILED");
  return { rows: ((data ?? []) as IncidentLite[]).map(toFeed), total: count ?? 0 };
}

export async function patternCards(hospital?: HospitalCode): Promise<PatternCard[]> {
  const [{ data, error }, { data: members, error: mErr }] = await Promise.all([
    db()
      .from("patterns")
      .select("id, title, description, incident_count, hospital_count, night_share, top_factors, status")
      .order("incident_count", { ascending: false }),
    db().from("incidents").select("pattern_id, hospital_id").not("pattern_id", "is", null),
  ]);
  if (error || mErr) throw new Error("PATTERNS_QUERY_FAILED");
  const spans = new Map<string, Set<HospitalCode>>();
  for (const m of members ?? []) spans.set(m.pattern_id, (spans.get(m.pattern_id) ?? new Set()).add(m.hospital_id));
  return (data ?? [])
    .filter((p) => !hospital || spans.get(p.id)?.has(hospital))
    .map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    incidentCount: p.incident_count,
    hospitalCount: p.hospital_count,
    nightShare: Number(p.night_share),
    topFactors: p.top_factors ?? [],
    status: p.status,
    hospitals: [...(spans.get(p.id) ?? [])].sort(),
  }));
}

/** Minimal numbers the dashboard polls for the live counter. */
export async function liveCounts(f: Filters = {}) {
  const [patterns, total] = await Promise.all([
    patternCards(f.hospital),
    (async () => {
      let q = db().from("incidents").select("id", { count: "exact", head: true });
      if (f.hospital) q = q.eq("hospital_id", f.hospital);
      const { count } = await q;
      return count ?? 0;
    })(),
  ]);
  return {
    total,
    patterns: Object.fromEntries(
      patterns.map((p) => [p.id, { count: p.incidentCount, hospitals: p.hospitalCount, night: p.nightShare }]),
    ),
  };
}
export type LiveCounts = Awaited<ReturnType<typeof liveCounts>>;

export async function dashboardData(f: Filters = {}) {
  const [rows, patterns] = await Promise.all([incidents(f), patternCards(f.hospital)]);
  const total = rows.length;
  const count = <K extends string>(key: (r: IncidentLite) => K) => {
    const m = new Map<K, number>();
    for (const r of rows) m.set(key(r), (m.get(key(r)) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };

  return {
    kpi: {
      total,
      nearMissShare: total ? rows.filter((r) => r.near_miss).length / total : 0,
      severeOrDeath: rows.filter((r) => r.harm === "severe" || r.harm === "death").length,
      openPatterns: patterns.filter((p) => p.status !== "closed").length,
    },
    patterns,
    byType: count((r) => r.incident_type),
    byHospital: count((r) => r.hospital_id),
    byShift: { day: rows.filter((r) => r.shift === "day").length, night: rows.filter((r) => r.shift === "night").length },
    feed: rows.slice(0, 60).map(toFeed),
  };
}

export type DashboardData = Awaited<ReturnType<typeof dashboardData>>;
