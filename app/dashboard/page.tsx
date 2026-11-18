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
import { AppBar, PrimaryLink, SecondaryLink } from "@/components/app-bar";

export const metadata: Metadata = { title: `${t.dashboard.title} · ${t.app.name}` };

export default function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  return (
    <main className="flex min-h-dvh flex-1 flex-col bg-page">
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
  const [lead, ...rest] = data.patterns;

  return (
    <LiveCountsProvider initial={live} hospital={filters.hospital ?? null}>
      {/* HACK: demo role switcher (SPEC §2) — the staff form sits one click away */}
      <AppBar place={t.dashboard.title}>
        <SecondaryLink href="/report?h=A" className="hidden sm:inline-flex">
          {t.dashboard.staffForm}
        </SecondaryLink>
      </AppBar>

      <div className="mx-auto w-full max-w-[76rem] px-5 pb-24 lg:px-10">
        {/* 1. Heading and the one scope control */}
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 pt-10 pb-8 lg:pt-14">
          <div>
            <h1 className="text-[2rem] leading-[1.1] font-medium tracking-[-0.025em] text-ink lg:text-[2.75rem]">{t.dashboard.patterns}</h1>
            <p className="mt-2 text-base text-ink-muted">
              {scope} · {t.dashboard.synthetic}
            </p>
          </div>
          <FilterSelect
            name="h"
            label={t.dashboard.hospitalFilter}
            value={filters.hospital ?? ""}
            anyLabel={t.dashboard.any}
            options={HOSPITAL_CODES.map((c) => [c, `${t.hospitals[c].name} · ${t.hospitals[c].region}`])}
          />
        </div>

        {/* 2. The focal point: the pattern that repeats most */}
        {lead ? <LeadPattern p={lead} /> : <p className="rounded-[20px] bg-ground px-8 py-12 text-lg text-ink-muted">{t.dashboard.patternsEmpty}</p>}

        {/* 3. The other patterns, one quiet row each */}
        {rest.length > 0 && (
          <section aria-labelledby="other-h" className="mt-16">
            <h2 id="other-h" className="text-xl font-medium tracking-tight text-ink">
              {t.dashboard.otherPatterns}
            </h2>
            <ol className="mt-4">
              {rest.map((p) => (
                <PatternRow key={p.id} p={p} />
              ))}
            </ol>
          </section>
        )}

        {/* 4. The numbers, set like the landing's stats: figure above caption, no boxes */}
        <section aria-labelledby="numbers-h" className="mt-20">
          <h2 id="numbers-h" className="text-xl font-medium tracking-tight text-ink">
            {t.dashboard.inNumbers}
          </h2>
          <Totals kpi={data.kpi} total={live.total} />
        </section>

        {/* 5. Where and when */}
        <section aria-labelledby="dist-h" className="mt-20">
          <h2 id="dist-h" className="text-xl font-medium tracking-tight text-ink">
            {t.dashboard.distribution}
          </h2>
          <div className="mt-6 grid gap-x-12 gap-y-10 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <Bars title={t.dashboard.byType} labelWidth="12rem" rows={data.byType.map(([k, n]) => [t.incidentType[k], n])} />
            <div className="flex flex-col gap-10">
              <Bars title={t.dashboard.byHospital} labelWidth="6.5rem" rows={data.byHospital.map(([k, n]) => [t.hospitals[k].region, n])} />
              <DayNight day={data.byShift.day} night={data.byShift.night} />
            </div>
          </div>
        </section>

        {/* 6. The register */}
        <section aria-labelledby="register-h" className="mt-20">
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
            <div>
              <h2 id="register-h" className="text-xl font-medium tracking-tight text-ink">
                {t.dashboard.register}
              </h2>
              <p className="mt-1 text-sm text-ink-muted">{t.dashboard.registerHint}</p>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
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
          <Register rows={data.feed} total={data.kpi.total} />
        </section>
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
    <dl className="mt-6 grid grid-cols-2 gap-x-8 gap-y-8 md:grid-cols-4">
      {cells.map(([label, value, attention]) => (
        <div key={label} className="flex flex-col-reverse gap-2">
          <dt className="text-sm text-ink-muted">{label}</dt>
          <dd className={`text-[2.25rem] leading-none font-medium tracking-[-0.025em] ${attention ? "text-margin-red" : "text-ink"}`}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The one focal block: a big live counter on the landing's grey surface, the title, the facts, one action. */
function LeadPattern({ p }: { p: PatternCard }) {
  const initial = { count: p.incidentCount, hospitals: p.hospitalCount, night: p.nightShare };
  return (
    <section aria-labelledby="lead-h" className="rounded-[20px] bg-ground px-6 py-8 sm:px-10 sm:py-10 lg:px-14 lg:py-12">
      <div className="grid gap-x-12 gap-y-6 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center">
        <LivePatternCount id={p.id} initial={p.incidentCount} underline className="self-start text-[4.5rem] leading-none font-medium tracking-[-0.04em] text-ink sm:text-[6rem] lg:self-center lg:text-[8rem]" />
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 rounded-full bg-page px-3 py-1 text-sm text-ink">
            <span className="size-2 rounded-full bg-mint-deep" aria-hidden />
            {t.dashboard.leadKicker}
          </p>
          <h2 id="lead-h" className="mt-4 text-[1.75rem] leading-[1.15] font-medium tracking-[-0.02em] text-balance text-ink lg:text-[2.25rem]">
            {p.title}
          </h2>
          <LivePatternStats id={p.id} initial={initial} size="lg" />
          <p className="mt-3 text-sm text-ink-muted">{p.hospitals.map((h) => t.hospitals[h].region).join(" · ")}</p>
          {p.topFactors.length > 0 && (
            <p className="mt-1 line-clamp-2 text-sm text-ink-muted">
              {t.dashboard.mostOften}: <span className="text-ink">{p.topFactors.map((f) => t.factor[f as keyof typeof t.factor] ?? f).join(" · ")}</span>
            </p>
          )}
          <div className="mt-8">
            <PrimaryLink href={`/pattern/${p.id}`}>
              {t.dashboard.openRca} <ArrowRight className="size-4" aria-hidden />
            </PrimaryLink>
          </div>
        </div>
      </div>
    </section>
  );
}

/** A quiet row: the count, the title and its facts, an arrow. The whole row is the link. */
function PatternRow({ p }: { p: PatternCard }) {
  const initial = { count: p.incidentCount, hospitals: p.hospitalCount, night: p.nightShare };
  return (
    <li className="border-b border-rule last:border-b-0">
      <Link
        href={`/pattern/${p.id}`}
        className="group grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-x-5 rounded-xl px-2 py-6 transition-colors hover:bg-ground focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none sm:grid-cols-[4.5rem_minmax(0,1fr)_auto] sm:px-4"
      >
        <LivePatternCount id={p.id} initial={p.incidentCount} underline className="text-[2.5rem] leading-none font-medium tracking-[-0.03em] text-ink" />
        <span className="min-w-0">
          <span className="block text-lg leading-snug font-medium text-balance text-ink">{p.title}</span>
          <LivePatternStats id={p.id} initial={initial} size="sm" bar={false} />
        </span>
        <ArrowRight className="size-5 text-ink-muted transition-transform duration-200 group-hover:translate-x-1 group-hover:text-ink" aria-hidden />
      </Link>
    </li>
  );
}

/** Horizontal bars drawn to scale (the longest = full width). Also readable as a list. */
function Bars({ title, rows, labelWidth }: { title: string; rows: [string, number][]; labelWidth: string }) {
  const max = Math.max(1, ...rows.map(([, n]) => n));
  return (
    <figure>
      <figcaption className="pb-4 text-sm text-ink-muted">{title}</figcaption>
      <ul className="flex flex-col gap-3">
        {rows.map(([label, n]) => (
          <li key={label} className="grid items-center gap-4 text-[0.9375rem]" style={{ gridTemplateColumns: `minmax(0,${labelWidth}) minmax(0,1fr) 2.5rem` }}>
            <span className="leading-tight text-pretty text-ink">{label}</span>
            <span className="h-2 overflow-hidden rounded-full bg-ground">
              <span className="block h-full rounded-full bg-ink" style={{ width: `${(n / max) * 100}%` }} />
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
      <figcaption className="pb-4 text-sm text-ink-muted">{t.dashboard.dayNight}</figcaption>
      <div className="flex h-2 gap-1 overflow-hidden" role="img" aria-label={`${t.shift.day} ${day}, ${t.shift.night} ${night}`}>
        <span className="block h-full rounded-full bg-rule-strong" style={{ width: `${(day / total) * 100}%` }} />
        <span className="block h-full rounded-full bg-ink" style={{ width: `${(night / total) * 100}%` }} />
      </div>
      <p className="mt-3 flex justify-between text-[0.9375rem] text-ink">
        <span className="text-ink-muted">
          {t.shift.day} · {day}
        </span>
        <span className="font-medium">
          {t.shift.night} · {night}
        </span>
      </p>
    </figure>
  );
}

function Register({ rows, total }: { rows: Awaited<ReturnType<typeof dashboardData>>["feed"]; total: number }) {
  const c = t.dashboard.columns;
  if (rows.length === 0) return <p className="mt-6 rounded-[20px] bg-ground px-8 py-10 text-base text-ink-muted">{t.dashboard.feedEmpty}</p>;
  return (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full min-w-[42rem] border-collapse text-[0.9375rem]">
        <caption className="sr-only">{t.dashboard.register}</caption>
        <thead>
          <tr className="border-b border-rule text-left text-sm text-ink-muted">
            <th className="py-3 pr-4 font-normal">{c.date}</th>
            <th className="px-4 py-3 font-normal">{c.hospital}</th>
            <th className="px-4 py-3 font-normal">{c.type}</th>
            <th className="px-4 py-3 font-normal">{c.harm}</th>
            <th className="px-4 py-3 font-normal">{c.nearMiss}</th>
            <th className="py-3 pl-4 font-normal">{c.status}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const attention = r.harm === "severe" || r.harm === "death";
            return (
              <tr key={r.id} className="border-b border-rule transition-colors hover:bg-ground">
                <td className="py-4 pr-4 whitespace-nowrap text-ink-muted">{formatDateRu(r.date).slice(0, 5)}</td>
                <td className="px-4 py-4 whitespace-nowrap">{t.hospitals[r.hospital].region}</td>
                <td className="px-4 py-4">
                  <Link
                    href={`/incident/${r.id}`}
                    className="text-ink underline decoration-rule-strong decoration-1 underline-offset-4 hover:decoration-ink focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
                  >
                    {t.incidentType[r.type]}
                  </Link>
                </td>
                <td className={`px-4 py-4 whitespace-nowrap ${attention ? "font-medium text-margin-red" : ""}`}>{t.harm[r.harm]}</td>
                <td className="px-4 py-4 text-ink-muted">{r.nearMiss ? t.fields.yes : "—"}</td>
                <td className="py-4 pl-4 whitespace-nowrap text-ink-muted">{t.status[r.status as keyof typeof t.status] ?? r.status}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="pt-4 text-sm text-ink-muted">{t.dashboard.shownOf(rows.length, total)}</p>
    </div>
  );
}

function SheetSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-[76rem] flex-col gap-8 px-5 pt-24 lg:px-10" aria-hidden>
      <div className="h-10 w-1/3 rounded-lg bg-ground" />
      <div className="h-72 rounded-[20px] bg-ground" />
      <div className="h-40 rounded-[20px] bg-ground" />
    </div>
  );
}
