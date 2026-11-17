import { t } from "@/lib/i18n";
import { formatDateRu } from "@/lib/time";

/**
 * Round office stamp in ballpoint-blue ink (DESIGN.md: never a badge).
 * `label` is the ring text; it lands once only when `animate` is set — never on every load.
 */
export function Stamp({
  date,
  label = t.report.stamp,
  animate = true,
  className = "size-[6.5rem]",
}: {
  date: string;
  label?: string;
  animate?: boolean;
  className?: string;
}) {
  const ring = `${label.toUpperCase()} · ${label.toUpperCase()} · `;
  const id = `stamp-ring-${label.length}`;
  return (
    <svg
      viewBox="0 0 120 120"
      className={`shrink-0 text-pen opacity-90 ${animate ? "motion-safe:animate-[stamp-land_480ms_cubic-bezier(0.2,0.8,0.2,1)_both]" : ""} ${className}`}
      style={{ transform: "rotate(-9deg)" }}
      role="img"
      aria-label={`${label}, ${formatDateRu(date)}`}
    >
      <defs>
        <path id={id} d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0" />
      </defs>
      <circle cx="60" cy="60" r="56" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="60" cy="60" r="34" fill="none" stroke="currentColor" strokeWidth="1.5" />
      {/* textLength = ring circumference (2π·44 ≈ 276), so the phrase closes evenly with no seam */}
      <text fill="currentColor" fontSize="10.5" fontWeight="600">
        <textPath href={`#${id}`} textLength="274" lengthAdjust="spacing">
          {ring}
        </textPath>
      </text>
      <text x="60" y="58" textAnchor="middle" fill="currentColor" fontSize="11" fontWeight="700">
        {t.app.name.toUpperCase()}
      </text>
      <text x="60" y="73" textAnchor="middle" fill="currentColor" fontSize="9.5" fontWeight="500">
        {formatDateRu(date)}
      </text>
    </svg>
  );
}
