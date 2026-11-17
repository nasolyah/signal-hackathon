import "server-only";
import { draftRca, type RcaAction } from "@/lib/ai/rca";
import { db } from "@/lib/db";
import { caseText, getRca, insertRca, setStatus } from "@/lib/rca-store";

const ORDER = { strong: 0, medium: 1, weak: 2 } as const;

/** Pre-draft the RCA of every pattern so the demo opens instantly (drafting takes ~12 s). */
export async function warmPatternRcas(log: (s: string) => void = () => {}) {
  const { data: ps } = await db().from("patterns").select("id, title");
  await Promise.all(
    (ps ?? []).map(async (p) => {
      const t = { kind: "pattern" as const, id: p.id };
      if (await getRca(t)) return log(`  = ${p.title} (already drafted)`);
      const draft = await draftRca(await caseText(t));
      const actions = [...draft.actions].sort((a: RcaAction, b: RcaAction) => ORDER[a.strength] - ORDER[b.strength]);
      await insertRca(t, { ...draft, actions });
      await setStatus(t, "in_review");
      log(`  ✓ ${p.title}: ${actions.map((a) => a.strength).join(", ")}`);
    }),
  );
}
