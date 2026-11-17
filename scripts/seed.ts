// Seed (SPEC §5): every synthetic record goes through the real pipeline (steps 0–2),
// exactly like a live report. report_text is NOT stored; expected_* is kept for eval only.
//   npm run seed            → wipe seed rows + patterns, re-seed all 120
//   npm run seed -- --limit 10

import { readFileSync } from "node:fs";
import { analyzeReport, embed, embeddingInput } from "@/lib/ai/analyze";
import { db } from "@/lib/db";
import type { Department, Harm, HospitalCode, IncidentType } from "@/lib/taxonomy";

type Raw = {
  id: number;
  hospital: string;
  department: string;
  date: string;
  shift: string;
  report_text: string;
  expected_type: string;
  expected_harm: string;
  expected_near_miss: boolean;
  expected_factors: string[];
  pattern_id: string | null;
};

// Mapping documented in data/README.md
const HOSPITAL: Record<string, HospitalCode> = { А: "A", Б: "B", В: "C", Г: "D", Д: "E", Е: "F" };
const DEPARTMENT: Record<string, Department> = {
  терапия: "therapy",
  хирургия: "surgery",
  кардиология: "cardiology",
  эндокринология: "endocrinology",
  травматология: "traumatology",
  родильное: "maternity",
  реанимация: "icu",
};
const TYPE: Record<string, IncidentType> = {
  лекарства: "medication",
  падение: "fall",
  "идентификация пациента": "patient_identification",
  "коммуникация и передача пациента": "communication_handover",
  инфекции: "infection",
  хирургия: "surgery",
  диагностика: "diagnosis",
  оборудование: "equipment",
  выписка: "discharge",
};
const HARM: Record<string, Harm> = {
  "без вреда": "none",
  лёгкий: "mild",
  умеренный: "moderate",
  тяжёлый: "severe",
  смерть: "death",
};

function hospitalCode(label: string): HospitalCode {
  const letter = label.match(/Больница\s+([А-ЯЁ])/)?.[1] ?? "";
  const code = HOSPITAL[letter];
  if (!code) throw new Error(`Unknown hospital: ${label}`);
  return code;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function seedOne(r: Raw) {
  const a = await analyzeReport(r.report_text);
  const embedding = await embed(embeddingInput(a));
  const { error } = await db().from("incidents").insert({
    hospital_id: hospitalCode(r.hospital),
    department: DEPARTMENT[r.department] ?? null,
    shift: r.shift === "ночь" ? "night" : "day",
    incident_date: r.date,
    created_at: `${r.date}T00:00:00+05:00`,
    redacted_text: a.redacted_text,
    redaction_count: a.total_redactions,
    incident_type: a.incident_type,
    stage: a.stage,
    harm: a.harm,
    near_miss: a.near_miss,
    factors: a.factors,
    summary: a.summary,
    embedding,
    expected_type: TYPE[r.expected_type] ?? r.expected_type,
    expected_harm: HARM[r.expected_harm] ?? r.expected_harm,
    expected_near_miss: r.expected_near_miss,
    seed_pattern: r.pattern_id,
  });
  if (error) throw new Error(`insert: ${error.message}`);
}

async function main() {
  const limitArg = process.argv.indexOf("--limit");
  const limit = limitArg > 0 ? Number(process.argv[limitArg + 1]) : Infinity;
  const records = (JSON.parse(readFileSync("data/incidents.json", "utf8")) as Raw[]).slice(0, limit);

  const sb = db();
  await sb.from("incidents").delete().not("expected_type", "is", null);
  await sb.from("patterns").delete().not("id", "is", null);
  console.log(`Seeding ${records.length} records (old seed rows and patterns wiped)…`);

  const queue = [...records];
  const failed: number[] = [];
  let done = 0;
  const t0 = Date.now();

  async function worker() {
    for (let r = queue.shift(); r; r = queue.shift()) {
      let ok = false;
      for (let attempt = 0; attempt < 4 && !ok; attempt++) {
        try {
          await seedOne(r);
          ok = true;
        } catch {
          await sleep([4000, 12000, 30000][attempt] ?? 30000);
        }
      }
      if (!ok) failed.push(r.id);
      done++;
      if (done % 10 === 0 || done === records.length)
        console.log(`  ${done}/${records.length}  (${Math.round((Date.now() - t0) / 1000)}s, failed: ${failed.length})`);
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker));

  console.log(failed.length ? `✗ failed ids: ${failed.join(", ")}` : "✓ all records seeded");
  if (failed.length) process.exit(1);
}

main().catch((e) => {
  console.error("✗", (e as Error).message);
  process.exit(1);
});
