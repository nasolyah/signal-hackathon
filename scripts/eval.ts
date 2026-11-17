// Eval (SPEC §5): AI classification vs expected_* on the synthetic seed.
//   npm run eval
// The number goes to the technical mentor: «тип определяется верно в X% случаев».

import { db } from "@/lib/db";

async function main() {
  const { data, error } = await db()
    .from("incidents")
    .select("incident_type, harm, near_miss, expected_type, expected_harm, expected_near_miss")
    .not("expected_type", "is", null);
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  if (!rows.length) return console.log("No seed rows. Run npm run seed first.");

  const pct = (n: number) => `${Math.round((n / rows.length) * 100)}%`;
  const type = rows.filter((r) => r.incident_type === r.expected_type).length;
  const harm = rows.filter((r) => r.harm === r.expected_harm).length;
  const harmNear = rows.filter((r) => {
    const scale = ["none", "mild", "moderate", "severe", "death"];
    return Math.abs(scale.indexOf(r.harm) - scale.indexOf(r.expected_harm)) <= 1;
  }).length;
  const near = rows.filter((r) => r.near_miss === r.expected_near_miss).length;

  console.table([
    { metric: "Тип инцидента", correct: `${type}/${rows.length}`, accuracy: pct(type) },
    { metric: "Тяжесть вреда (точно)", correct: `${harm}/${rows.length}`, accuracy: pct(harm) },
    { metric: "Тяжесть вреда (±1 уровень)", correct: `${harmNear}/${rows.length}`, accuracy: pct(harmNear) },
    { metric: "Почти-ошибка", correct: `${near}/${rows.length}`, accuracy: pct(near) },
  ]);

  const confusion = new Map<string, number>();
  for (const r of rows)
    if (r.incident_type !== r.expected_type)
      confusion.set(`${r.expected_type} → ${r.incident_type}`, (confusion.get(`${r.expected_type} → ${r.incident_type}`) ?? 0) + 1);
  if (confusion.size) {
    console.log("Type mismatches (expected → AI):");
    for (const [k, v] of [...confusion.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${v} × ${k}`);
  }
}

main().catch((e) => {
  console.error("✗", (e as Error).message);
  process.exit(1);
});
