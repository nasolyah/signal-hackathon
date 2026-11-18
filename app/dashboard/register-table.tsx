import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { FeedRow } from "@/lib/dashboard";
import { t } from "@/lib/i18n";
import { formatDateRu } from "@/lib/time";

/**
 * The register of cases. The whole row opens the case: one real link per row (the type, for keyboards and
 * screen readers) stretched over the row with ::after, so there is no nested or duplicated link.
 */
export function RegisterTable({ rows, showShift = false }: { rows: FeedRow[]; showShift?: boolean }) {
  const c = t.dashboard.columns;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[42rem] border-collapse text-[0.9375rem]">
        <caption className="sr-only">{t.dashboard.register}</caption>
        <thead>
          <tr className="border-b border-rule text-left text-sm text-ink-muted">
            <th className="py-3 pr-4 font-normal">{c.date}</th>
            {showShift && <th className="px-4 py-3 font-normal">{c.shift}</th>}
            <th className="px-4 py-3 font-normal">{c.hospital}</th>
            <th className="px-4 py-3 font-normal">{c.type}</th>
            <th className="px-4 py-3 font-normal">{c.harm}</th>
            <th className="px-4 py-3 font-normal">{c.nearMiss}</th>
            <th className="py-3 pl-4 font-normal">{c.status}</th>
            <th className="w-8 py-3" aria-hidden />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const attention = r.harm === "severe" || r.harm === "death";
            return (
              <tr key={r.id} className="group relative cursor-pointer border-b border-rule transition-colors hover:bg-ground">
                <td className="py-4 pr-4 whitespace-nowrap text-ink-muted">{formatDateRu(r.date).slice(0, 5)}</td>
                {showShift && <td className="px-4 py-4 whitespace-nowrap text-ink-muted">{t.shift[r.shift]}</td>}
                <td className="px-4 py-4 whitespace-nowrap">{t.hospitals[r.hospital].name}</td>
                <td className="px-4 py-4">
                  <Link
                    href={`/incident/${r.id}`}
                    className="font-medium text-ink decoration-rule-strong underline-offset-4 outline-none group-hover:underline after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-3 focus-visible:after:ring-ring/40"
                  >
                    {t.incidentType[r.type]}
                  </Link>
                </td>
                <td className={`px-4 py-4 whitespace-nowrap ${attention ? "font-medium text-margin-red" : ""}`}>{t.harm[r.harm]}</td>
                <td className="px-4 py-4 text-ink-muted">{r.nearMiss ? t.fields.yes : "—"}</td>
                <td className="py-4 pl-4 whitespace-nowrap text-ink-muted">{t.status[r.status as keyof typeof t.status] ?? r.status}</td>
                <td className="py-4 pl-2 text-right" aria-hidden>
                  <ChevronRight className="inline size-4 text-rule-strong transition-[transform,color] duration-200 group-hover:translate-x-0.5 group-hover:text-ink" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
