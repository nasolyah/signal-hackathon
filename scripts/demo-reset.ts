// Reset the demo between rehearsals: delete live reports (rows without expected_* — i.e. not seed),
// recompute every pattern's stats (insulin alert back to 11), and re-draft the pattern RCAs.
//   npm run demo:reset
import { db } from "@/lib/db";
import { recomputePatternStats } from "@/lib/patterns";
import { warmPatternRcas } from "@/lib/rca-warm";
import { seedV2 } from "@/lib/seed-v2";

async function main() {
  const sb = db();
  const { data: live, error } = await sb.from("incidents").select("id").is("expected_type", null);
  if (error) throw new Error(error.message);
  if (live?.length) await sb.from("incidents").delete().in("id", live.map((r) => r.id));
  await sb.from("rca").delete().not("id", "is", null);
  await sb.from("incidents").update({ status: "new", human_verified: false }).not("expected_type", "is", null);
  const { data: ps } = await sb.from("patterns").select("id, title");
  for (const p of ps ?? []) await recomputePatternStats(p.id);
  await sb.from("patterns").update({ status: "open" }).not("id", "is", null);
  const { data: after } = await sb.from("patterns").select("title, incident_count").order("incident_count", { ascending: false });
  console.log(`✓ removed ${live?.length ?? 0} live reports; RCA cleared, re-drafting pattern RCAs…`);
  await warmPatternRcas(console.log);
  for (const p of after ?? []) console.log(`  ${p.incident_count}  ${p.title}`);
  // v2: last week's digests back to their demo states, this week empty for the live demo.
  await seedV2(console.log).catch((e) => console.error("✗ v2 seed:", (e as Error).message));
}

main().catch((e) => {
  console.error("✗", (e as Error).message);
  process.exit(1);
});
