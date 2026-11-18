import { t } from "@/lib/i18n";
import type { ActionStrength } from "@/lib/taxonomy";

const TONE: Record<ActionStrength, string> = {
  strong: "bg-mint text-ink border-mint",
  medium: "bg-page text-ink border-rule-strong",
  weak: "bg-page text-margin-red border-margin-red",
};

/** RCA² strength as a pill — the same look as in the RCA panel. */
export function StrengthBadge({ strength }: { strength: ActionStrength }) {
  return <span className={`inline-flex shrink-0 justify-center rounded-full border px-2.5 py-0.5 text-sm font-medium ${TONE[strength]}`}>{t.strength[strength]}</span>;
}
