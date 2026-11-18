import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowRight } from "lucide-react";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n";
import { getRca } from "@/lib/rca-store";
import type { Harm, HospitalCode, IncidentType, Shift } from "@/lib/taxonomy";
import { formatDateRu } from "@/lib/time";
import { RedactedText } from "@/app/report/redacted-text";
import { RcaPanel } from "@/app/rca/rca-panel";
import { RcaSheet, SheetSkeleton } from "@/app/rca/sheet";
import { devData, WORST_PATTERN, WORST_RCA } from "@/lib/dev-fixtures";
import { DevDataToggle } from "@/components/dev-data-toggle";

export const metadata: Metadata = { title: `${t.rcaUi.patternKicker} · ${t.app.name}` };

export default function PatternPage({ params, searchParams }: PageProps<"/pattern/[id]">) {
  return (
    <Suspense fallback={<SheetSkeleton />}>
      <Pattern params={params} searchParams={searchParams} />
    </Suspense>
  );
}

const UUID = /^[0-9a-f-]{36}$/i;

async function Pattern({ params, searchParams }: Pick<PageProps<"/pattern/[id]">, "params" | "searchParams">) {
  const { id } = await params;
  if (devData((await searchParams).data)) {
    const { cases, ...p } = WORST_PATTERN;
    return (
      <>
        <PatternView id="dev" p={p} rows={cases} rca={WORST_RCA} />
        <DevDataToggle states={[["", "Демо"], ["worst", "Худший случай"]]} />
      </>
    );
  }
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
  return <PatternView id={id} p={p} rows={(cases ?? []) as CaseRow[]} rca={rca} />;
}

type CaseRow = {
  id: string;
  incident_date: string;
  hospital_id: HospitalCode;
  shift: Shift;
  incident_type: IncidentType;
  harm: Harm;
  near_miss: boolean;
  redacted_text: string;
};

type PatternRowData = {
  title: string;
  description: string | null;
  incident_count: number;
  hospital_count: number;
  night_share: number | string;
  top_factors: string[] | null;
  status: string;
};

function PatternView({ id, p, rows, rca }: { id: string; p: PatternRowData; rows: CaseRow[]; rca: Awaited<ReturnType<typeof getRca>> }) {
  const regions = [...new Set(rows.map((r) => r.hospital_id))].sort().map((h) => t.hospitals[h].name);
  const nightPct = Math.round(Number(p.night_share) * 100);

  return (
    <RcaSheet
      head={t.rcaUi.patternKicker}
      status={p.status}
      left={
        <div className="px-5 pt-10 pb-12 lg:px-10 lg:pt-12">
          <h1 className="text-[1.75rem] leading-[1.15] font-medium tracking-[-0.02em] text-balance text-ink lg:text-[2.25rem]">{p.title}</h1>
          <p className="mt-4 text-lg text-ink">
            {t.num(p.incident_count)} {t.plural.cases(p.incident_count)} · {p.hospital_count} {t.plural.hospitals(p.hospital_count)} ·{" "}
            <span className="font-medium">
              {nightPct}% {t.dashboard.night}
            </span>
          </p>
          <div className="mt-3 h-2 w-full max-w-[24rem] overflow-hidden rounded-full bg-page" role="img" aria-label={`${nightPct}% ${t.dashboard.night}`}>
            <div className="h-full rounded-full bg-ink" style={{ width: `${nightPct}%` }} />
          </div>
          <p className="mt-3 text-sm text-ink-muted">{regions.join(" · ")}</p>
          {p.description && <p className="mt-6 max-w-[56ch] text-base leading-relaxed text-ink">{p.description}</p>}
          {(p.top_factors ?? []).length > 0 && (
            <p className="mt-3 text-sm text-ink-muted">
              {t.dashboard.mostOften}: <span className="text-ink">{(p.top_factors as string[]).map((f) => t.factor[f as keyof typeof t.factor] ?? f).join(" · ")}</span>
            </p>
          )}

          <h2 className="mt-12 text-xl font-medium tracking-tight text-ink">{t.rcaUi.cases}</h2>
          <ol className="mt-4 flex flex-col gap-3">
            {rows.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/incident/${r.id}`}
                  className="group block rounded-xl bg-page px-5 py-4 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-12px_rgb(0_0_0/0.18)] focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
                >
                  <span className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm text-ink-muted">
                    <span>
                      {formatDateRu(r.incident_date)} · {t.hospitals[r.hospital_id].name} · {t.shift[r.shift]}
                    </span>
                    <span className={r.harm === "severe" || r.harm === "death" ? "font-medium text-margin-red" : ""}>
                      {t.harm[r.harm]}
                      {r.near_miss ? ` · ${t.fields.nearMissMinistry.toLowerCase()}` : ""}
                    </span>
                  </span>
                  <span className="mt-2 line-clamp-3 block text-[0.9375rem] leading-relaxed text-ink">
                    <RedactedText text={r.redacted_text} />
                  </span>
                  <span className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-ink">
                    {t.rcaUi.openCase} <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
                  </span>
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
