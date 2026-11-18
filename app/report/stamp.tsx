import { Check } from "lucide-react";
import { t } from "@/lib/i18n";
import { formatDateRu } from "@/lib/time";

/**
 * The «done» seal in the landing's world: a mint disc with a check, the label and the date beside it.
 * It pops in once only when `animate` is set — never on every load. (Was the journal's round stamp.)
 */
export function Stamp({
  date,
  label = t.report.stamp,
  animate = true,
  className = "",
}: {
  date: string;
  label?: string;
  animate?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`} role="img" aria-label={`${label}, ${formatDateRu(date)}`}>
      <span
        aria-hidden
        className={`grid size-11 shrink-0 place-items-center rounded-full bg-mint text-ink ${animate ? "motion-safe:animate-[seal-in_420ms_cubic-bezier(0.2,0.8,0.2,1)_both]" : ""}`}
      >
        <Check className="size-5" strokeWidth={2.5} />
      </span>
      <span aria-hidden className="flex flex-col leading-tight">
        <span className="text-base font-medium text-ink">{label.charAt(0).toUpperCase() + label.slice(1)}</span>
        <span className="text-sm text-ink-muted">{formatDateRu(date)}</span>
      </span>
    </span>
  );
}
