// Step 4 (SPEC §4): batch pattern discovery.
//   npm run patterns -- --dry                → threshold sweep, writes nothing
//   npm run patterns -- --threshold 0.90 --local 0.84 → cluster, name with Gemini, write patterns
// Average linkage nationally, then inside each hospital for the rest; keep clusters ≥ 5 incidents.

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
  redacted_text: string;
  seed_pattern: string | null;
  vec: number[];
};

const MIN_CLUSTER = 5;

async function load(): Promise<Row[]> {
  const { data, error } = await db()
    .from("incidents")
    .select("id, hospital_id, shift, incident_type, summary, redacted_text, seed_pattern, embedding")
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

/** Average-linkage agglomerative clustering: merge while mean pairwise similarity ≥ threshold.
 *  Single linkage chained everything into one blob on the seed; average linkage does not. */
function averageLinkage(idx: number[], sim: number[][], threshold: number): number[][] {
  let cl = idx.map((i) => [i]);
  for (;;) {
    let best = -1, bi = -1, bj = -1;
    for (let i = 0; i < cl.length; i++)
      for (let j = i + 1; j < cl.length; j++) {
        let s = 0;
        for (const a of cl[i]) for (const b of cl[j]) s += sim[a][b];
        s /= cl[i].length * cl[j].length;
        if (s > best) [best, bi, bj] = [s, i, j];
      }
    if (best < threshold) return cl;
    cl = [...cl.filter((_, k) => k !== bi && k !== bj), [...cl[bi], ...cl[bj]]];
  }
}

/**
 * National pass across all hospitals, then a local pass inside each hospital for what is left:
 * a pattern visible in one hospital only (falls in one building, same-surname mix-ups) is real too.
 */
function clusters(rows: Row[], sim: number[][], national: number, local: number): number[][] {
  const all = rows.map((_, i) => i);
  const found = averageLinkage(all, sim, national).filter((g) => g.length >= MIN_CLUSTER);
  const taken = new Set(found.flat());
  for (const h of new Set(rows.map((r) => r.hospital_id))) {
    const rest = all.filter((i) => rows[i].hospital_id === h && !taken.has(i));
    found.push(...averageLinkage(rest, sim, local).filter((g) => g.length >= MIN_CLUSTER));
  }
  return found.sort((a, b) => b.length - a.length);
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
  // Summaries generalize («препарат»); the de-identified texts keep the specifics («инсулин», «ампулы»).
  const cases = group.map((i) => `- ${rows[i].summary}\n  Текст: ${rows[i].redacted_text.slice(0, 400)}`).join("\n");
  const res = await generate(env.modelSmart(), {
    contents: `Обезличенные инциденты одного кластера:\n${cases}`,
    config: {
      systemInstruction:
        "Ты аналитик безопасности пациентов. Назови общую закономерность этих случаев. title — короткое конкретное название по-русски (до 70 символов): если в большинстве текстов один и тот же препарат, предмет или место (инсулины, ампулы, коридор, фамилии), назови его прямо, например «Путаница инсулинов короткого и длительного действия». Без обвинения людей. description — 1–2 нейтральных предложения о том, что объединяет случаи и какой системный фактор повторяется. Не выдумывай фактов, не упоминай больницы, имена и числа.",
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
    for (const n of [0.88, 0.89, 0.9, 0.91])
      for (const l of [0.8, 0.82, 0.84, 0.86, 0.88]) {
        const cs = clusters(rows, sim, n, l);
        console.log(`\nnational ${n.toFixed(2)} · local ${l.toFixed(2)}: ${cs.length} clusters`);
        for (const g of cs) console.log(`   ${describe(rows, g)}`);
      }
    return;
  }

  const arg = (name: string, fallback: number) => {
    const i = process.argv.indexOf(name);
    return i > 0 ? Number(process.argv[i + 1]) : fallback;
  };
  const national = arg("--threshold", 0.9);
  const local = arg("--local", 0.84);
  const cs = clusters(rows, sim, national, local);
  console.log(`national ${national} · local ${local}: ${cs.length} clusters`);

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
