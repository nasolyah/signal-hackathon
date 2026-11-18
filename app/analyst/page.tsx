import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AppBar } from "@/components/app-bar";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n";
import { DISTRICT_IDS, DISTRICTS, type HospitalCode } from "@/lib/taxonomy";
import { formatDateRu } from "@/lib/time";
import { currentDigest, inbox, inboxCounts, isHospital, patternsFor, weekOf, type Digest } from "@/lib/v2";
import { DigestPanel } from "./digest-panel";

export const metadata: Metadata = { title: `${t.v2.analystTitle} · ${t.app.name}` };

export default function AnalystPage({ searchParams }: PageProps<"/analyst">) {
  return (
    <main className="flex min-h-dvh flex-1 flex-col bg-page">
      <AppBar place={t.roles.analyst} role="analyst" />
      <Suspense fallback={<Skeleton />}>
        <Analyst searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Analyst({ searchParams }: Pick<PageProps<"/analyst">, "searchParams">) {
  const sp = await searchParams;
  const h: HospitalCode = typeof sp.h === "string" && isHospital(sp.h) ? sp.h : "A";
  const w = weekOf();
  const [counts, rows, digest, { data: weekDigests }] = await Promise.all([
    inboxCounts(),
    inbox(h),
    currentDigest(h),
    db().from("digests").select("hospital_id, status").eq("period_start", w.start),
  ]);
  const statusOf = new Map((weekDigests ?? []).map((d) => [d.hospital_id as string, d.status as Digest["status"]]));
  const patternIds = [...new Set([...rows.map((r) => r.pattern_id), ...(digest?.items ?? []).map((i) => i.pattern_id)].filter((x): x is string => Boolean(x)))];
  const patterns = await patternsFor(patternIds);

  return (
    <div className="mx-auto w-full max-w-[76rem] px-5 pb-24 lg:px-10">
      <div className="pt-10 pb-8 lg:pt-14">
        <h1 className="text-[2rem] leading-[1.1] font-medium tracking-[-0.025em] text-ink lg:text-[2.75rem]">{t.v2.analystTitle}</h1>
        <p className="mt-2 max-w-[60ch] text-base text-ink-muted">{t.v2.analystHint}</p>
        <p className="mt-1 text-sm text-ink-muted">{t.v2.week(formatDateRu(w.start).slice(0, 5), formatDateRu(w.end).slice(0, 5))}</p>
      </div>

      <div className="grid gap-10 lg:grid-cols-[15rem_minmax(0,1fr)]">
        {/* Hospitals by district */}
        <nav aria-label={t.dashboard.hospitalFilter} className="flex flex-col gap-6">
          {DISTRICT_IDS.map((d) => (
            <div key={d}>
              <p className="pb-2 text-sm text-ink-muted">{t.districts[d]}</p>
              <ul className="flex flex-col gap-1">
                {DISTRICTS[d].map((code) => {
                  const on = code === h;
                  const st = statusOf.get(code);
                  return (
                    <li key={code}>
                      <Link
                        href={`/analyst?h=${code}`}
                        aria-current={on ? "page" : undefined}
                        className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-[0.9375rem] transition-colors focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none ${on ? "bg-ground font-medium text-ink" : "text-ink hover:bg-ground"}`}
                      >
                        <span>
                          {t.hospitals[code].name}
                          {st && <span className="block text-xs font-normal text-ink-muted">{t.v2.status[st]}</span>}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-xs ${counts[code] ? "bg-mint text-ink" : "text-ink-muted"}`}>{counts[code] || "—"}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="min-w-0">
          <h2 className="text-[1.75rem] leading-tight font-medium tracking-[-0.02em] text-ink">
            {t.hospitals[h].name} <span className="text-ink-muted">· {t.hospitals[h].region}</span>
          </h2>

          {/* Inbox */}
          <section aria-labelledby="inbox-h" className="mt-8">
            <h3 id="inbox-h" className="text-xl font-medium tracking-tight text-ink">
              {t.v2.inboxTitle} <span className="text-ink-muted">· {t.v2.newThisWeek(rows.length)}</span>
            </h3>
            {rows.length === 0 ? (
              <p className="mt-4 rounded-[20px] bg-ground px-6 py-6 text-base text-ink-muted">{t.v2.inboxEmpty}</p>
            ) : (
              <ul className="mt-4 flex flex-col gap-3">
                {rows.map((r) => {
                  const severe = r.harm === "severe" || r.harm === "death";
                  const p = patterns.find((x) => x.id === r.pattern_id);
                  return (
                    <li key={r.id}>
                      <Link
                        href={`/incident/${r.id}`}
                        className="block rounded-xl border border-rule px-5 py-4 transition-colors hover:bg-ground focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
                      >
                        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
                          <span>{formatDateRu(r.incident_date)} · {t.shift[r.shift]}</span>
                          <span>{t.involvedRole[r.involved_role] ?? t.involvedRole.unknown}</span>
                          <span className="font-medium text-ink">{t.incidentType[r.incident_type]}</span>
                          <span className={severe ? "font-medium text-margin-red" : ""}>{t.harm[r.harm]}</span>
                          {r.near_miss && <span>{t.fields.nearMissMinistry}</span>}
                        </span>
                        <span className="mt-2 block text-[0.9375rem] leading-relaxed text-ink">{r.summary}</span>
                        {p && <span className="mt-2 inline-flex rounded-full bg-accent px-3 py-1 text-sm text-ink">{t.v2.pattern(p.title, p.incident_count, p.hospital_count)}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Digest */}
          <section aria-labelledby="digest-h" className="mt-14">
            <h3 id="digest-h" className="text-xl font-medium tracking-tight text-ink">
              {t.v2.digest}
            </h3>
            <DigestPanel hospital={h} digest={digest} inboxCount={rows.length} patterns={patterns} />
          </section>
        </div>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="mx-auto flex w-full max-w-[76rem] flex-col gap-6 px-5 pt-24 lg:px-10" aria-hidden>
      <div className="h-10 w-1/3 rounded-lg bg-ground" />
      <div className="h-72 rounded-[20px] bg-ground" />
    </div>
  );
}
