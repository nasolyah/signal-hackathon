import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n";
import { getRca } from "@/lib/rca-store";
import type { Harm, HospitalCode, IncidentType, Shift } from "@/lib/taxonomy";
import { formatDateRu } from "@/lib/time";
import { RedactedText } from "@/app/report/redacted-text";
import { RcaPanel } from "@/app/rca/rca-panel";
import { RcaSheet, SheetSkeleton } from "@/app/rca/sheet";

export const metadata: Metadata = { title: `${t.rcaUi.patternKicker} · ${t.app.name}` };

export default function PatternPage({ params }: PageProps<"/pattern/[id]">) {
  return (
    <Suspense fallback={<SheetSkeleton />}>
      <Pattern params={params} />
    </Suspense>
  );
}

const UUID = /^[0-9a-f-]{36}$/i;

async function Pattern({ params }: Pick<PageProps<"/pattern/[id]">, "params">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const sb = db();
  const [{ data: p }, { data: cases }, rca] = await Promise.all([
    sb.from("patterns").select("id, title, description, incident_count, hospital_count, night_share, top_factors, status").eq("id", id).maybeSingle(),
    sb
      .from("incidents")
      .select("id, incident_date, hospital_id, shift, incident_type, harm, near_miss, redacted_text")
      .eq("pattern_id", id)
      .order("incident_date", { ascending: false }),
    getRca({ kind: "pattern", id }),
  ]);
  if (!p) notFound();
  const rows = (cases ?? []) as {
    id: string;
    incident_date: string;
    hospital_id: HospitalCode;
    shift: Shift;
    incident_type: IncidentType;
    harm: Harm;
    near_miss: boolean;
    redacted_text: string;
  }[];
  const regions = [...new Set(rows.map((r) => r.hospital_id))].sort().map((h) => t.hospitals[h].region);
  const nightPct = Math.round(Number(p.night_share) * 100);

  return (
    <RcaSheet
      head={t.rcaUi.patternKicker}
      status={p.status}
      left={
        <div className="pb-8">
          <div className="px-5 pt-6 lg:px-8">
            <h1 className="text-[1.75rem] leading-[1.15] font-semibold text-balance">{p.title}</h1>
            <p className="mt-3 text-base text-ink">
              {p.incident_count} {t.plural.cases(p.incident_count)} · {p.hospital_count} {t.plural.hospitals(p.hospital_count)} ·{" "}
              <span className="font-semibold">
                {nightPct}% {t.dashboard.night}
              </span>
            </p>
            <div className="mt-1.5 h-2 w-full max-w-[22rem] overflow-hidden rounded-[2px] bg-rule" role="img" aria-label={`${nightPct}% ${t.dashboard.night}`}>
              <div className="h-full bg-pen" style={{ width: `${nightPct}%` }} />
            </div>
            <p className="mt-2 text-sm text-ink-muted">{regions.join(" · ")}</p>
            {p.description && <p className="mt-3 max-w-[56ch] text-base text-ink">{p.description}</p>}
            {(p.top_factors ?? []).length > 0 && (
              <p className="mt-2 text-sm text-ink">
                <span className="text-ink-muted">{t.dashboard.mostOften}: </span>
                {(p.top_factors as string[]).map((f) => t.factor[f as keyof typeof t.factor] ?? f).join(" · ")}
              </p>
            )}
          </div>
          <h2 className="mt-6 border-t border-rule px-5 pt-4 pb-1 text-lg font-semibold lg:px-8">{t.rcaUi.cases}</h2>
          <ol>
            {rows.map((r) => (
              <li key={r.id} className="border-b border-rule px-5 py-3 lg:px-8">
                <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-xs text-ink-muted">
                  <span>
                    {formatDateRu(r.incident_date)} · {t.hospitals[r.hospital_id].region} · {t.shift[r.shift]}
                  </span>
                  <span className={r.harm === "severe" || r.harm === "death" ? "font-semibold text-margin-red" : ""}>
                    {t.harm[r.harm]}
                    {r.near_miss ? ` · ${t.fields.nearMissMinistry.toLowerCase()}` : ""}
                  </span>
                </p>
                <p className="mt-1 text-base leading-relaxed text-ink">
                  <RedactedText text={r.redacted_text} />
                </p>
                <Link
                  href={`/incident/${r.id}`}
                  className="mt-1 inline-block text-sm text-pen underline decoration-pen/40 underline-offset-4 hover:decoration-pen focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
                >
                  {t.rcaUi.openCase}
                </Link>
              </li>
            ))}
          </ol>
        </div>
      }
      right={<RcaPanel target={{ kind: "pattern", id }} initial={rca} status={p.status} />}
    />
  );
}
