// Re-embed stored incidents after the embedding input changed (lib/ai/analyze.ts → embeddingInput).
// Uses only de-identified data already in the DB. Throttled for the free-tier limit (100 embeds/min).
//   npm run reembed
import { embed, embeddingInput } from "@/lib/ai/analyze";
import { db } from "@/lib/db";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const sb = db();
  const { data, error } = await sb.from("incidents").select("id, summary, redacted_text");
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  console.log(`Re-embedding ${rows.length} incidents…`);
  for (const [i, r] of rows.entries()) {
    for (;;) {
      try {
        const embedding = await embed(embeddingInput(r));
        const { error: upErr } = await sb.from("incidents").update({ embedding }).eq("id", r.id);
        if (upErr) throw new Error(upErr.message);
        break;
      } catch {
        await sleep(20_000);
      }
    }
    await sleep(700);
    if ((i + 1) % 20 === 0) console.log(`  ${i + 1}/${rows.length}`);
  }
  console.log("✓ done");
}

main().catch((e) => {
  console.error("✗", (e as Error).message);
  process.exit(1);
});
