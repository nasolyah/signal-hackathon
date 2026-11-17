// Step 4 (SPEC §4): batch pattern discovery.
//   npm run patterns -- --dry                → threshold sweep, writes nothing
//   npm run patterns -- --threshold 0.84     → cluster, name with Gemini, write patterns
// Edge if cosine similarity ≥ threshold; clusters = connected components; keep ≥ 5 incidents.

import { z } from "zod";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { generate } from "@/lib/ai/gemini";
import { recomputePatternStats } from "@/lib/patterns";

type Row = {
  id: string;
  hospital_id: string;
  shift: string;
  incident_type: string;
  summary: string;
  seed_pattern: string | null;
  vec: number[];
};

const MIN_CLUSTER = 5;

async function load(): Promise<Row[]> {
  const { data, error } = await db()
    .from("incidents")
    .select("id, hospital_id, shift, incident_type, summary, seed_pattern, embedding")
    .not("embedding", "is", null);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => {
    const vec = typeof r.embedding === "string" ? (JSON.parse(r.embedding) as number[]) : (r.embedding as number[]);
    const norm = Math.hypot(...vec);
    return { ...r, vec: vec.map((x) => x / norm) } as Row;
  });
}

function similarity(rows: Row[]): number[][] {
  return rows.map((a) => rows.map((b) => a.vec.reduce((s, x, i) => s + x * b.vec[i], 0)));
}

function clusters(rows: Row[], sim: number[][], threshold: number): number[][] {
  const parent = rows.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < rows.length; i++)
    for (let j = i + 1; j < rows.length; j++) if (sim[i][j] >= threshold) parent[find(i)] = find(j);
  const groups = new Map<number, number[]>();
  rows.forEach((_, i) => groups.set(find(i), [...(groups.get(find(i)) ?? []), i]));
  return [...groups.values()].filter((g) => g.length >= MIN_CLUSTER).sort((a, b) => b.length - a.length);
}

function describe(rows: Row[], group: number[]): string {
  const seeds = new Map<string, number>();
  for (const i of group) seeds.set(rows[i].seed_pattern ?? "—", (seeds.get(rows[i].seed_pattern ?? "—") ?? 0) + 1);
  const hospitals = new Set(group.map((i) => rows[i].hospital_id)).size;
  const night = group.filter((i) => rows[i].shift === "night").length;
  const mix = [...seeds.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}×${v}`).join(" ");
  return `${group.length} incidents · ${hospitals} hospitals · ${night} night · seed: ${mix}`;
}

const Naming = z.object({ title: z.string().min(5), description: z.string().min(10) });

async function name(rows: Row[], group: number[]) {
  const summaries = group.map((i) => `- ${rows[i].summary}`).join("\n");
  const res = await generate(env.modelSmart(), {
    contents: `Сводки обезличенных инцидентов одного кластера:\n${summaries}`,
    config: {
      systemInstruction:
        "Ты аналитик безопасности пациентов. Назови общую закономерность этих случаев. title — короткое название по-русски (до 70 символов), про системную причину, без обвинения людей, например «Путаница инсулинов короткого и длительного действия». description — 1–2 нейтральных предложения о том, что объединяет случаи и какой системный фактор повторяется. Не выдумывай фактов, не упоминай больницы и числа.",
      responseMimeType: "application/json",
      responseJsonSchema: {
        type: "object",
        properties: { title: { type: "string" }, description: { type: "string" } },
        required: ["title", "description"],
      },
      temperature: 0.2,
    },
  });
  return Naming.parse(JSON.parse(res.text ?? "null"));
}

async function main() {
  const rows = await load();
  const sim = similarity(rows);
  console.log(`${rows.length} incidents with embeddings`);

  if (process.argv.includes("--dry")) {
    for (let t = 0.7; t <= 0.951; t += 0.01) {
      const cs = clusters(rows, sim, t);
      console.log(`\nthreshold ${t.toFixed(2)}: ${cs.length} clusters ≥${MIN_CLUSTER}`);
      for (const g of cs) console.log(`   ${describe(rows, g)}`);
    }
    return;
  }

  const ti = process.argv.indexOf("--threshold");
  const threshold = ti > 0 ? Number(process.argv[ti + 1]) : env.simThreshold();
  const cs = clusters(rows, sim, threshold);
  console.log(`threshold ${threshold}: ${cs.length} clusters`);

  const sb = db();
  await sb.from("incidents").update({ pattern_id: null }).not("pattern_id", "is", null);
  await sb.from("patterns").delete().not("id", "is", null);

  for (const g of cs) {
    const { title, description } = await name(rows, g);
    const { data, error } = await sb.from("patterns").insert({ title, description }).select("id").single();
    if (error || !data) throw new Error(`pattern insert: ${error?.message}`);
    const ids = g.map((i) => rows[i].id);
    const { error: upErr } = await sb.from("incidents").update({ pattern_id: data.id }).in("id", ids);
    if (upErr) throw new Error(upErr.message);
    await recomputePatternStats(data.id);
    console.log(`  ✓ «${title}» — ${describe(rows, g)}`);
  }
}

main().catch((e) => {
  console.error("✗", (e as Error).message);
  process.exit(1);
});
