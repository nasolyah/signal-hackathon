// Gemini smoke test (SPEC build order, step 2).
//   npm run smoke            → step 0+1 on 5 synthetic texts + one embedding
//   npm run smoke -- --models → list models this API key can use (to fill .env.local)
// Texts below are synthetic, so printing results here is fine (never do this with live reports).

import { gemini } from "@/lib/ai/gemini";
import { analyzeReport, embed, embeddingInput } from "@/lib/ai/analyze";
import { preScrub } from "@/lib/ai/scrub";
import { EMBEDDING_DIM } from "@/lib/env";

type Sample = {
  text: string;
  mustNotContain: string[];
  expect: { type: string; harm: string; near_miss: boolean };
};

const SAMPLES: Sample[] = [
  {
    text:
      "Ночью около 03:40 в палате 12 медсестра Гульнора Каримова чуть не ввела пациенту Рустаму Алиеву инсулин длительного действия вместо короткого — флаконы стоят рядом на одной полке и очень похожи. Заметила сама перед инъекцией. ИБ-45821.",
    mustNotContain: ["Гульнора", "Каримова", "Рустам", "Алиев", "45821", "03:40", "палате 12"],
    expect: { type: "medication", harm: "none", near_miss: true },
  },
  {
    text:
      "12 марта пациентка Шоира Юсупова, 78 лет, упала ночью в коридоре корпуса 2 по пути в туалет. Свет в коридоре не работает уже неделю, санитарка одна на два этажа. Ушиб бедра, сделали рентген.",
    mustNotContain: ["Шоира", "Юсупова", "12 марта"],
    expect: { type: "fall", harm: "mild", near_miss: false },
  },
  {
    text:
      "В отделении две пациентки с фамилией Рахимова. Медбрат Азиз взял кровь не у той, ошибку заметили в лаборатории по дате рождения до переливания. Браслетов с идентификацией у нас нет.",
    mustNotContain: ["Рахимова", "Азиз"],
    expect: { type: "patient_identification", harm: "none", near_miss: true },
  },
  {
    text:
      "Kecha tungi smenada hamshira Dilnoza 5-palatadagi bemorga noto'g'ri dozada antibiotik berdi. Shifokor yozuvi o'qib bo'lmaydigan edi. Bemorda toshma paydo bo'ldi, dori to'xtatildi. Tel: +998 90 123 45 67.",
    mustNotContain: ["Dilnoza", "123 45 67"],
    expect: { type: "medication", harm: "mild", near_miss: false },
  },
  {
    text:
      "На пересменке не передали, что у пациента Каримова аллергия на пенициллин. Утром врач Ташматов назначил амоксициллин, препарат уже ввели, развился отёк, перевели в реанимацию. Единственный аллерголог больницы был в отпуске.",
    mustNotContain: ["Каримов", "Ташматов", "Единственный аллерголог"],
    expect: { type: "communication_handover", harm: "moderate", near_miss: false },
  },
];

async function listModels() {
  const pager = await gemini().models.list();
  const rows: { name: string; actions: string }[] = [];
  for await (const m of pager) {
    const actions = (m.supportedActions ?? []).filter((a) => /generateContent|embedContent/.test(a));
    if (actions.length) rows.push({ name: (m.name ?? "").replace(/^models\//, ""), actions: actions.join(",") });
  }
  console.table(rows);
}

async function main() {
  if (process.argv.includes("--models")) return listModels();

  for (const key of ["GEMINI_API_KEY", "GEMINI_MODEL_FAST", "GEMINI_EMBED_MODEL"]) {
    if (!process.env[key]) {
      console.error(`✗ ${key} is empty in .env.local. Fill it in (npm run smoke -- --models lists model names).`);
      process.exit(1);
    }
  }

  console.log("Step 0 (local regex) preview:");
  for (const s of SAMPLES) console.log(`  ${preScrub(s.text).count} replacements`);

  const rows = [];
  let lastSummary = null as null | Parameters<typeof embeddingInput>[0];
  for (const [i, s] of SAMPLES.entries()) {
    const t0 = Date.now();
    try {
      const a = await analyzeReport(s.text);
      const leaks = s.mustNotContain.filter((w) => a.redacted_text.toLowerCase().includes(w.toLowerCase()));
      lastSummary = a;
      console.log(`\n#${i + 1} ${a.redacted_text}\n   summary: ${a.summary}`);
      rows.push({
        "#": i + 1,
        ms: Date.now() - t0,
        removed: a.total_redactions,
        leaks: leaks.length ? leaks.join(", ") : "ok",
        type: a.incident_type + (a.incident_type === s.expect.type ? " ✓" : ` ✗ (${s.expect.type})`),
        harm: a.harm + (a.harm === s.expect.harm ? " ✓" : ` ✗ (${s.expect.harm})`),
        near_miss: String(a.near_miss) + (a.near_miss === s.expect.near_miss ? " ✓" : " ✗"),
        factors: a.factors.join(","),
      });
    } catch (e) {
      rows.push({ "#": i + 1, ms: Date.now() - t0, removed: 0, leaks: "-", type: `ERROR ${(e as Error).message}`, harm: "", near_miss: "", factors: "" });
    }
  }
  console.log();
  console.table(rows);

  if (lastSummary) {
    const v = await embed(embeddingInput(lastSummary));
    console.log(`Embedding: ${v.length} dims ${v.length === EMBEDDING_DIM ? "✓ matches vector(768)" : `✗ change vector(${EMBEDDING_DIM}) in schema.sql to ${v.length}`}`);
  }
}

main().catch((e) => {
  console.error("✗", (e as Error).message);
  process.exit(1);
});
