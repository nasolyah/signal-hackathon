import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ChevronDown } from "lucide-react";
import { AppBar } from "@/components/app-bar";
import { t } from "@/lib/i18n";
import { DISTRICT_IDS } from "@/lib/taxonomy";
import { formatDateRu, formatSpanRu } from "@/lib/time";
import { districtView, isDistrict, type DistrictRow } from "@/lib/v2";

export const metadata: Metadata = { title: `${t.roles.district} · ${t.app.name}` };

export default function DistrictPage({ params }: PageProps<"/district/[id]">) {
  return (
    <main className="flex min-h-dvh flex-1 flex-col bg-page">
      <AppBar place={t.roles.district} role="district" />
      <Suspense fallback={<div className="mx-auto h-72 w-full max-w-[76rem] rounded-[20px] bg-ground" aria-hidden />}>
        <District params={params} />
      </Suspense>
    </main>
  );
}

function DigestCell({ r }: { r: DistrictRow }) {
  if (!r.digest) return <span className="text-ink-muted">{t.v2.noDigest}</span>;
  if (r.unreadOver48h)
    return (
      <span className="inline-flex items-center gap-2 font-medium text-margin-red">
        <span className="size-2 rounded-full bg-margin-red" aria-hidden />
        {t.v2.unread48}
      </span>
    );
  if (r.digest.status === "sent")
    return (
      <span className="inline-flex items-center gap-2 text-ink">
        <span className="size-2 rounded-full bg-rule-strong" aria-hidden />
        {t.v2.unread}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-2 text-ink">
      <span className="size-2 rounded-full bg-mint-deep" aria-hidden />
      {r.hoursToAck !== null ? t.v2.readIn(formatSpanRu(r.hoursToAck)) : t.v2.status.acknowledged}
    </span>
  );
}

async function District({ params }: Pick<PageProps<"/district/[id]">, "params">) {
  const { id } = await params;
  if (!isDistrict(id)) notFound();
  await connection(); // "today" and reaction times are request-time values
  const { rows, patterns } = await districtView(id);

  return (
    <div className="mx-auto w-full max-w-[76rem] px-5 pb-24 lg:px-10">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 pt-10 pb-8 lg:pt-14">
        <div>
          <p className="text-base text-ink-muted">
            {t.v2.districtDept} · {t.v2.hospitalsOf(rows.length)}
          </p>
          <h1 className="mt-1 text-[2rem] leading-[1.1] font-medium tracking-[-0.025em] text-ink lg:text-[2.75rem]">{t.districts[id]}</h1>
        </div>
        <nav aria-label={t.roles.district} className="flex gap-1 rounded-full bg-ground p-1">
          {DISTRICT_IDS.map((d) => (
            <Link
              key={d}
              href={`/district/${d}`}
              aria-current={d === id ? "page" : undefined}
              className={`rounded-full px-3 py-1.5 text-sm ${d === id ? "bg-page font-medium text-ink shadow-[0_1px_2px_rgb(0_0_0/0.08)]" : "text-ink-muted hover:text-ink"}`}
            >
              {t.districts[d]}
            </Link>
          ))}
        </nav>
      </div>

      <p className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-base text-ink">
        <span className="size-2 rounded-full bg-mint-deep" aria-hidden />
        {t.v2.districtLine}
      </p>
      <p className="mt-3 text-sm text-ink-muted">{t.v2.sortNote}</p>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[46rem] border-collapse text-[0.9375rem]">
          <thead>
            <tr className="border-b border-rule text-left text-sm text-ink-muted">
              <th className="py-3 pr-4 font-normal">{t.v2.cols.hospital}</th>
              <th className="px-4 py-3 font-normal">{t.v2.cols.digest}</th>
              <th className="px-4 py-3 text-right font-normal">{t.v2.cols.accepted}</th>
              <th className="px-4 py-3 text-right font-normal">{t.v2.cols.done}</th>
              <th className="px-4 py-3 text-right font-normal">{t.v2.cols.overdue}</th>
              <th className="py-3 pl-4 text-right font-normal">{t.v2.cols.reports}</th>
            </tr>
          </thead>
          {rows.map((r) => (
            <tbody key={r.hospital} className="border-b border-rule">
              <tr>
                <td className="py-4 pr-4 align-top">
                  <details className="group/d">
                    <summary className="flex cursor-pointer list-none items-center gap-2 font-medium whitespace-nowrap text-ink [&::-webkit-details-marker]:hidden">
                      <ChevronDown className="size-4 text-ink-muted transition-transform group-open/d:rotate-180" aria-hidden />
                      {t.hospitals[r.hospital].name}
                    </summary>
                    <div className="mt-3 max-w-[40rem] rounded-xl bg-ground px-4 py-3 text-sm">
                      <p className="text-ink-muted">{t.v2.decisions}</p>
                      {r.decisions.length === 0 ? (
                        <p className="mt-1 text-ink">{t.v2.noDecisions}</p>
                      ) : (
                        <ul className="mt-2 flex flex-col gap-2">
                          {r.decisions.map((d, i) => (
                            <li key={i} className="text-ink">
                              <span className="font-medium">{d.item}</span> —{" "}
                              {d.decision === "accepted" ? (
                                <>
                                  {t.v2.accepted.toLowerCase()}: {d.action}
                                  {d.due ? ` (${t.v2.dueBy(formatDateRu(d.due))}${d.status === "done" ? `, ${t.v2.done.toLowerCase()}` : ""})` : ""}
                                </>
                              ) : (
                                t.v2.rejected.toLowerCase()
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </details>
                </td>
                <td className="px-4 py-4 align-top whitespace-nowrap">
                  <DigestCell r={r} />
                </td>
                <td className="px-4 py-4 text-right align-top">{r.accepted}</td>
                <td className="px-4 py-4 text-right align-top">{r.done}</td>
                <td className={`px-4 py-4 text-right align-top ${r.overdue ? "font-medium text-margin-red" : ""}`}>{r.overdue}</td>
                <td className="py-4 pl-4 text-right align-top text-ink-muted">{r.reports4w}</td>
              </tr>
            </tbody>
          ))}
        </table>
      </div>

      <section aria-labelledby="cross-h" className="mt-14">
        <h2 id="cross-h" className="text-xl font-medium tracking-tight text-ink">
          {t.v2.crossPatterns}
        </h2>
        {patterns.length === 0 ? (
          <p className="mt-3 text-base text-ink-muted">{t.v2.crossEmpty}</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {patterns.map((p) => (
              <li key={p.id} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 rounded-xl bg-ground px-5 py-4">
                <span className="font-medium text-ink">{p.title}</span>
                <span className="text-sm text-ink-muted">
                  {p.count} {t.plural.cases(p.count)} · {t.v2.hospitalsOf(p.hospitals)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
