import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight } from "lucide-react";
import { dashboardData, liveCounts, type Filters, type PatternCard } from "@/lib/dashboard";
import { t } from "@/lib/i18n";
import { HARMS, HOSPITAL_CODES, INCIDENT_TYPES, type Harm, type HospitalCode, type IncidentType } from "@/lib/taxonomy";
import { formatDateRu } from "@/lib/time";
import { FilterSelect } from "./filters";
import { LiveCountsProvider, LivePatternCount, LivePatternStats, LiveTotal } from "./live";

export const metadata: Metadata = { title: `${t.dashboard.title} · ${t.app.name}` };

export default function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  return (
    <main className="flex min-h-dvh flex-1 flex-col bg-ground lg:px-6 lg:py-8">
      <Suspense fallback={<SheetSkeleton />}>
        <Dashboard searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

function pick<T extends string>(v: string | string[] | undefined, allowed: readonly T[]): T | undefined {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : undefined;
}

async function Dashboard({ searchParams }: Pick<PageProps<"/dashboard">, "searchParams">) {
  const sp = await searchParams;
  const filters: Filters = {
    hospital: pick<HospitalCode>(sp.h, HOSPITAL_CODES),
    type: pick<IncidentType>(sp.type, INCIDENT_TYPES),
    harm: pick<Harm>(sp.harm, HARMS),
  };
  const [data, live] = await Promise.all([dashboardData(filters), liveCounts({ hospital: filters.hospital })]);
  const scope = filters.hospital
    ? `${t.hospitals[filters.hospital].name} · ${t.hospitals[filters.hospital].region}`
    : t.dashboard.allHospitals;

  return (
    <LiveCountsProvider initial={live} hospital={filters.hospital ?? null}>
      <div className="mx-auto flex w-full max-w-[92rem] flex-1 flex-col bg-page lg:flex-none lg:rounded-[3px] lg:shadow-[0_1px_2px_rgb(0_0_0/0.06),0_18px_40px_-16px_rgb(0_0_0/0.22)]">
        {/* Printed running head */}
        <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-rule px-5 py-3 text-sm lg:px-8">
          <p className="text-ink">
            <span className="font-semibold">{t.dashboard.title}</span> · {scope}
            <span className="ml-3 text-ink-muted">{t.dashboard.synthetic}</span>
          </p>
          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
            <FilterSelect
              name="h"
              label={t.dashboard.hospitalFilter}
              value={filters.hospital ?? ""}
              anyLabel={t.dashboard.any}
              options={HOSPITAL_CODES.map((c) => [c, `${t.hospitals[c].name} · ${t.hospitals[c].region}`])}
            />
            {/* HACK: demo role switcher (SPEC §2) */}
            <Link className="text-ink-muted underline hover:text-ink" href="/report?h=A">
              {t.dashboard.staffLink}
            </Link>
            <span className="font-semibold tracking-tight text-ink-muted">{t.app.name}</span>
          </div>
        </header>

        <Totals kpi={data.kpi} total={live.total} />

        {/* The spread: conclusions on the left page, the register on the right */}
        <div className="grid flex-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <section aria-labelledby="patterns-h" className="relative border-b border-rule lg:border-b-0">
            <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 hidden w-10 bg-[linear-gradient(to_left,rgb(0_0_0/0.045),transparent)] lg:block" />
            <div className="px-5 pt-6 pb-2 lg:px-8">
              <h2 id="patterns-h" className="text-[1.75rem] leading-tight font-semibold">
                {t.dashboard.patterns}
              </h2>
              <p className="mt-1 max-w-[46ch] text-sm text-ink-muted">{t.dashboard.patternsHint}</p>
            </div>
            {data.patterns.length === 0 ? (
              <p className="px-5 py-6 text-base text-ink-muted lg:px-8">{t.dashboard.patternsEmpty}</p>
            ) : (
              <ol>
                {data.patterns.map((p, i) => (
                  <PatternEntry key={p.id} p={p} lead={i === 0} />
                ))}
              </ol>
            )}
          </section>

          <section aria-labelledby="register-h" className="relative min-w-0 lg:border-l lg:border-rule">
            <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 hidden w-10 bg-[linear-gradient(to_right,rgb(0_0_0/0.035),transparent)] lg:block" />
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 px-5 pt-6 pb-4 lg:px-8">
              <h2 id="register-h" className="text-[1.75rem] leading-tight font-semibold">
                {t.dashboard.register}
              </h2>
              <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
                <FilterSelect
                  name="type"
                  label={t.dashboard.filterType}
                  value={filters.type ?? ""}
                  anyLabel={t.dashboard.any}
                  options={INCIDENT_TYPES.map((k) => [k, t.incidentType[k]])}
                />
                <FilterSelect
                  name="harm"
                  label={t.dashboard.filterHarm}
                  value={filters.harm ?? ""}
                  anyLabel={t.dashboard.any}
                  options={HARMS.map((k) => [k, t.harm[k]])}
                />
              </div>
            </div>

            <div className="grid gap-x-8 gap-y-6 border-y border-rule px-5 py-5 md:grid-cols-2 lg:px-8">
              <Bars title={t.dashboard.byType} rows={data.byType.map(([k, n]) => [t.incidentType[k], n])} />
              <div className="flex flex-col gap-6">
                <Bars title={t.dashboard.byHospital} rows={data.byHospital.map(([k, n]) => [`${t.hospitals[k].name} · ${t.hospitals[k].region}`, n])} />
                <DayNight day={data.byShift.day} night={data.byShift.night} />
              </div>
            </div>

            <Register rows={data.feed} total={data.kpi.total} />
          </section>
        </div>
      </div>
    </LiveCountsProvider>
  );
}

function Totals({ kpi, total }: { kpi: Awaited<ReturnType<typeof dashboardData>>["kpi"]; total: number }) {
  const cells: [string, React.ReactNode, boolean][] = [
    [t.dashboard.totals.total, <LiveTotal key="t" initial={total} />, false],
    [t.dashboard.totals.nearMiss, `${Math.round(kpi.nearMissShare * 100)}%`, false],
    [t.dashboard.totals.severe, kpi.severeOrDeath, kpi.severeOrDeath > 0],
    [t.dashboard.totals.openPatterns, kpi.openPatterns, false],
  ];
  return (
    <dl className="grid grid-cols-2 border-b border-rule md:grid-cols-4">
      {cells.map(([label, value, attention], i) => (
        <div
          key={label}
          className={`border-rule px-5 py-3 lg:px-8 ${i % 2 === 0 ? "border-r" : ""} md:border-r md:last:border-r-0 ${i < 2 ? "border-b md:border-b-0" : ""}`}
        >
          <dt className="text-xs text-ink-muted">{label}</dt>
          <dd className={`mt-0.5 text-[1.75rem] leading-tight font-semibold ${attention ? "text-margin-red" : "text-ink"}`}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function PatternEntry({ p, lead }: { p: PatternCard; lead: boolean }) {
  const initial = { count: p.incidentCount, hospitals: p.hospitalCount, night: p.nightShare };
  return (
    <li className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-4 border-t border-rule px-5 py-5 lg:grid-cols-[5.5rem_minmax(0,1fr)] lg:px-8">
      <div className="text-right">
        <LivePatternCount
          id={p.id}
          initial={p.incidentCount}
          underline
          className={`leading-none font-semibold text-margin-red ${lead ? "text-[3.5rem]" : "text-[2.25rem]"}`}
        />
      </div>
      <div className="min-w-0">
        <h3 className={`leading-snug font-semibold text-balance ${lead ? "text-[1.75rem]" : "text-lg"}`}>{p.title}</h3>
        <LivePatternStats id={p.id} initial={initial} size={lead ? "lg" : "sm"} />
        <p className="mt-2 text-sm text-ink-muted">
          {p.hospitals.map((h) => t.hospitals[h].region).join(" · ")}
        </p>
        {lead && p.description && <p className="mt-2 max-w-[52ch] text-base text-ink">{p.description}</p>}
        {p.topFactors.length > 0 && (
          <p className="mt-2 text-sm text-ink">
            <span className="text-ink-muted">{t.dashboard.mostOften}: </span>
            {p.topFactors.map((f) => t.factor[f as keyof typeof t.factor] ?? f).join(" · ")}
          </p>
        )}
        <Link
          href={`/pattern/${p.id}`}
          className="mt-3 inline-flex items-center gap-1.5 text-base font-medium text-pen underline decoration-1 underline-offset-4 hover:decoration-2 focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
        >
          {t.dashboard.open} <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </li>
  );
}

/** Horizontal bars drawn to scale (the longest = full width). Also readable as a list. */
function Bars({ title, rows }: { title: string; rows: [string, number][] }) {
  const max = Math.max(1, ...rows.map(([, n]) => n));
  return (
    <figure>
      <figcaption className="pb-2 text-xs text-ink-muted">{title}</figcaption>
      <ul className="flex flex-col gap-1.5">
        {rows.map(([label, n]) => (
          <li key={label} className="grid grid-cols-[minmax(0,11rem)_minmax(0,1fr)_2.5rem] items-center gap-3 text-sm">
            <span className="truncate text-ink" title={label}>
              {label}
            </span>
            <span className="h-2 overflow-hidden rounded-[2px] bg-rule/70">
              <span className="block h-full bg-ink/75" style={{ width: `${(n / max) * 100}%` }} />
            </span>
            <span className="text-right font-medium text-ink">{n}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

function DayNight({ day, night }: { day: number; night: number }) {
  const total = Math.max(1, day + night);
  return (
    <figure>
      <figcaption className="pb-2 text-xs text-ink-muted">{t.dashboard.dayNight}</figcaption>
      <div className="flex h-2 overflow-hidden rounded-[2px]" role="img" aria-label={`${t.shift.day} ${day}, ${t.shift.night} ${night}`}>
        <span className="block h-full bg-rule-strong" style={{ width: `${(day / total) * 100}%` }} />
        <span className="block h-full bg-ink" style={{ width: `${(night / total) * 100}%` }} />
      </div>
      <p className="mt-1.5 flex justify-between text-sm text-ink">
        <span>
          {t.shift.day} · {day}
        </span>
        <span className="font-semibold">
          {t.shift.night} · {night}
        </span>
      </p>
    </figure>
  );
}

function Register({ rows, total }: { rows: Awaited<ReturnType<typeof dashboardData>>["feed"]; total: number }) {
  const c = t.dashboard.columns;
  if (rows.length === 0) return <p className="px-5 py-8 text-base text-ink-muted lg:px-8">{t.dashboard.feedEmpty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] border-collapse text-sm">
        <caption className="sr-only">{t.dashboard.register}</caption>
        <thead>
          <tr className="border-b border-rule text-left text-xs text-ink-muted">
            <th className="py-2 pr-3 pl-5 font-normal lg:pl-8">{c.date}</th>
            <th className="px-3 py-2 font-normal">{c.hospital}</th>
            <th className="px-3 py-2 font-normal">{c.type}</th>
            <th className="px-3 py-2 font-normal">{c.harm}</th>
            <th className="px-3 py-2 font-normal">{c.nearMiss}</th>
            <th className="py-2 pr-5 pl-3 font-normal lg:pr-8">{c.status}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const attention = r.harm === "severe" || r.harm === "death";
            return (
              <tr key={r.id} className="border-b border-rule transition-colors hover:bg-accent/60">
                <td className="py-2 pr-3 pl-5 whitespace-nowrap text-ink-muted lg:pl-8">{formatDateRu(r.date).slice(0, 5)}</td>
                <td className="px-3 py-2 whitespace-nowrap">{t.hospitals[r.hospital].region}</td>
                <td className="px-3 py-2">
                  <Link
                    href={`/incident/${r.id}`}
                    className="text-ink underline decoration-rule-strong decoration-1 underline-offset-4 hover:decoration-pen focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
                  >
                    {t.incidentType[r.type]}
                  </Link>
                </td>
                <td className={`px-3 py-2 whitespace-nowrap ${attention ? "font-semibold text-margin-red" : ""}`}>{t.harm[r.harm]}</td>
                <td className="px-3 py-2 text-ink-muted">{r.nearMiss ? t.fields.yes : "—"}</td>
                <td className="py-2 pr-5 pl-3 whitespace-nowrap text-ink-muted lg:pr-8">
                  {t.status[r.status as keyof typeof t.status] ?? r.status}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="px-5 py-3 text-xs text-ink-muted lg:px-8">{t.dashboard.shownOf(rows.length, total)}</p>
    </div>
  );
}

function SheetSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-[92rem] flex-1 flex-col gap-4 bg-page p-8 lg:flex-none lg:rounded-[3px]" aria-hidden>
      <div className="h-5 w-1/3 rounded-sm bg-muted" />
      <div className="h-16 rounded-sm bg-muted" />
      <div className="grid flex-1 gap-8 lg:grid-cols-[5fr_7fr]">
        <div className="h-96 rounded-sm bg-muted" />
        <div className="h-96 rounded-sm bg-muted" />
      </div>
    </div>
  );
}
