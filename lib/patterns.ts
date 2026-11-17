import "server-only";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

// Step 3 (SPEC §4): attach a new incident to an existing pattern when ≥ 3 of its
// top-5 neighbours above SIM_THRESHOLD share a pattern_id. New patterns are only
// created by the batch job (scripts/patterns.ts) so the demo stays deterministic.

type Neighbour = { id: string; pattern_id: string | null; hospital_id: string; similarity: number };

export async function attachToPattern(incidentId: string, embedding: number[]): Promise<string | null> {
  const sb = db();
  const { data, error } = await sb.rpc("match_incidents", {
    query_embedding: embedding,
    match_count: 5,
    exclude_id: incidentId,
  });
  if (error) throw new Error("MATCH_FAILED");

  const threshold = env.simThreshold();
  const votes = new Map<string, number>();
  for (const n of (data ?? []) as Neighbour[]) {
    if (n.pattern_id && n.similarity >= threshold) votes.set(n.pattern_id, (votes.get(n.pattern_id) ?? 0) + 1);
  }
  const [best] = [...votes.entries()].sort((a, b) => b[1] - a[1]);
  if (!best || best[1] < 3) return null;

  const { error: upErr } = await sb.from("incidents").update({ pattern_id: best[0] }).eq("id", incidentId);
  if (upErr) throw new Error("ATTACH_FAILED");
  await recomputePatternStats(best[0]);
  return best[0];
}

/** Pattern stats are always computed in code from its incidents, never by AI. */
export async function recomputePatternStats(patternId: string): Promise<void> {
  const sb = db();
  const { data, error } = await sb.from("incidents").select("hospital_id, shift, factors").eq("pattern_id", patternId);
  if (error) throw new Error("STATS_FAILED");
  const rows = data ?? [];
  const factorCounts = new Map<string, number>();
  for (const r of rows) for (const f of r.factors ?? []) factorCounts.set(f, (factorCounts.get(f) ?? 0) + 1);
  const top = [...factorCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([f]) => f);
  const { error: upErr } = await sb
    .from("patterns")
    .update({
      incident_count: rows.length,
      hospital_count: new Set(rows.map((r) => r.hospital_id)).size,
      night_share: rows.length ? rows.filter((r) => r.shift === "night").length / rows.length : 0,
      top_factors: top,
      updated_at: new Date().toISOString(),
    })
    .eq("id", patternId);
  if (upErr) throw new Error("STATS_UPDATE_FAILED");
}
