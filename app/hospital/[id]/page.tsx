import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { AppBar } from "@/components/app-bar";
import { StrengthBadge } from "@/components/strength-badge";
import { t } from "@/lib/i18n";
import { formatDateRu, formatStampRu, tashkentDate } from "@/lib/time";
import { actionsOfHospital, isHospital, latestReceivedDigest, patternsFor } from "@/lib/v2";
import { Acknowledge, DoneButton, ItemDecision } from "./controls";

export const metadata: Metadata = { title: `${t.roles.hospital} · ${t.app.name}` };

export default function HospitalPage({ params }: PageProps<"/hospital/[id]">) {
  return (
    <main className="flex min-h-dvh flex-1 flex-col bg-page">
      <AppBar place={t.v2.digest} role="hospital" />
      <Suspense fallback={<div className="mx-auto mt-24 h-72 w-full max-w-[60rem] rounded-[20px] bg-ground" aria-hidden />}>
        <Hospital params={params} />
      </Suspense>
    </main>
  );
}

const short = (iso: string) => formatDateRu(iso).slice(0, 5);

async function Hospital({ params }: Pick<PageProps<"/hospital/[id]">, "params">) {
  const { id } = await params;
  if (!isHospital(id)) notFound();
  await connection(); // "today" (overdue) is a request-time value
  const [digest, actions] = await Promise.all([latestReceivedDigest(id), actionsOfHospital(id)]);
  const patterns = await patternsFor((digest?.items ?? []).map((i) => i.pattern_id).filter((x): x is string => Boolean(x)));
  const today = tashkentDate();
  const decisionOf = (itemId: string) => (digest ? actions.find((a) => a.digest_id === digest.id && a.item_id === itemId) ?? null : null);
  const decided = digest ? digest.items.filter((it) => decisionOf(it.id)).length : 0;
  const accepted = actions.filter((a) => a.decision === "accepted");
  const planned = accepted.filter((a) => a.status === "planned");
  const done = accepted.filter((a) => a.status === "done");

  return (
    <div className="mx-auto w-full max-w-[60rem] px-5 pb-24 lg:px-10">
      <div className="pt-10 pb-8 lg:pt-14">
        <p className="text-base text-ink-muted">
          {t.hospitals[id].name} · {t.hospitals[id].region}
        </p>
        <h1 className="mt-1 text-[2rem] leading-[1.1] font-medium tracking-[-0.025em] text-ink lg:text-[2.75rem]">
          {digest ? t.v2.hospitalTitle(short(digest.period_start), short(digest.period_end)) : t.v2.digest}
        </h1>
        {digest && <p className="mt-3 max-w-[60ch] text-base leading-relaxed text-ink-muted">{t.v2.hospitalLead}</p>}
      </div>

      {!digest ? (
        <p className="rounded-[20px] bg-ground px-8 py-10 text-lg text-ink-muted">{t.v2.hospitalEmpty}</p>
      ) : (
        <>
          {/* Status line: when it came, how much is decided */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            {digest.sent_at && <span className="text-ink-muted">{t.v2.received(formatStampRu(digest.sent_at))}</span>}
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 ${decided === digest.items.length ? "bg-accent text-ink" : "bg-[#fdf6e3] text-ink"}`}
            >
              <span className={`size-2 rounded-full ${decided === digest.items.length ? "bg-mint-deep" : "bg-[#d99a1e]"}`} aria-hidden />
              {t.v2.decidedOf(decided, digest.items.length)}
            </span>
          </div>
          <Acknowledge digestId={digest.id} unread={digest.status === "sent"} />

          {/* The week in one sentence */}
          <div className="mt-6 rounded-[20px] bg-ground px-6 py-6 sm:px-8">
            <p className="text-sm text-ink-muted">{t.v2.headline}</p>
            <p className="mt-1 text-[1.375rem] leading-snug font-medium tracking-[-0.01em] text-balance text-ink">{digest.headline}</p>
            <p className="mt-2 text-sm text-ink-muted">
              {t.v2.stats(digest.stats.reports ?? 0, Math.round((digest.stats.near_miss_share ?? 0) * 100), digest.stats.severe ?? 0)}
            </p>
            {digest.analyst_note && <p className="mt-3 border-l-2 border-mint-deep pl-3 text-[0.9375rem] text-ink">{digest.analyst_note}</p>}
          </div>

          {/* One card per item: what, why, choose a measure */}
          <ol className="mt-6 flex flex-col gap-5">
            {digest.items.map((it, n) => {
              const p = patterns.find((x) => x.id === it.pattern_id);
              const d = decisionOf(it.id);
              return (
                <li key={it.id} className="rounded-[20px] border border-rule px-5 py-6 sm:px-7">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-sm text-ink-muted">{t.v2.itemOf(n + 1, digest.items.length)}</span>
                    {!d ? (
                      <span className="inline-flex items-center gap-2 rounded-full bg-[#fdf6e3] px-3 py-1 text-sm font-medium text-ink">
                        <span className="size-2 rounded-full bg-[#d99a1e]" aria-hidden />
                        {t.v2.waiting}
                      </span>
                    ) : (
                      <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium text-ink ${d.decision === "accepted" ? "bg-accent" : "bg-ground"}`}>
                        <span className={`size-2 rounded-full ${d.decision === "accepted" ? "bg-mint-deep" : "bg-rule-strong"}`} aria-hidden />
                        {d.decision === "accepted" ? t.v2.accepted : t.v2.rejected}
                      </span>
                    )}
                  </div>
                  <h2 className="mt-2 text-xl leading-snug font-medium text-ink">{it.title}</h2>
                  <dl className="mt-3 flex flex-col gap-1.5 text-[0.9375rem] leading-relaxed">
                    <div>
                      <dt className="inline text-ink-muted">{t.v2.what}: </dt>
                      <dd className="inline text-ink">{it.what}</dd>
                    </div>
                    <div>
                      <dt className="inline text-ink-muted">{t.v2.why}: </dt>
                      <dd className="inline text-ink">{it.why}</dd>
                    </div>
                  </dl>
                  {p && <p className="mt-3 inline-flex rounded-full bg-ground px-3 py-1 text-sm text-ink-muted">{t.v2.pattern(p.title, p.incident_count, p.hospital_count)}</p>}
                  <ItemDecision
                    digestId={digest.id}
                    itemId={it.id}
                    options={it.actions}
                    decision={d ? { decision: d.decision, action: d.action_text, reason: d.reject_reason, due: d.due_date } : null}
                  />
                </li>
              );
            })}
          </ol>
        </>
      )}

      {/* Accepted measures across weeks: in progress, then done */}
      <section aria-labelledby="work-h" className="mt-16">
        <h2 id="work-h" className="text-xl font-medium tracking-tight text-ink">
          {t.v2.acceptedMeasures}
        </h2>
        {accepted.length === 0 ? (
          <p className="mt-4 text-base text-ink-muted">{t.v2.inWorkEmpty}</p>
        ) : (
          <div className="mt-4 flex flex-col gap-8">
            {[
              [t.v2.planned, planned],
              [t.v2.doneList, done],
            ].map(([label, list]) =>
              (list as typeof accepted).length === 0 ? null : (
                <div key={label as string}>
                  <p className="text-sm text-ink-muted">{label as string}</p>
                  <ul className="mt-2 flex flex-col">
                    {(list as typeof accepted).map((a) => {
                      const overdue = a.status === "planned" && a.due_date !== null && a.due_date < today;
                      return (
                        <li key={a.id} className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-x-4 gap-y-2 border-b border-rule py-4 last:border-b-0 sm:grid-cols-[6.5rem_minmax(0,1fr)_auto]">
                          {a.strength ? <StrengthBadge strength={a.strength} /> : <span />}
                          <span className="min-w-0 text-[0.9375rem] text-ink">
                            {a.action_text}
                            <span className={`block text-sm ${overdue ? "font-medium text-margin-red" : "text-ink-muted"}`}>
                              {a.due_date ? t.v2.dueBy(formatDateRu(a.due_date)) : ""}
                              {overdue ? ` · ${t.v2.overdue}` : ""}
                            </span>
                          </span>
                          <span className="col-start-2 sm:col-start-auto">
                            {a.status === "done" ? (
                              <span className="inline-flex items-center gap-2 text-sm whitespace-nowrap text-ink">
                                <span className="size-2 rounded-full bg-mint-deep" aria-hidden />
                                {t.v2.done} {a.done_at ? short(a.done_at.slice(0, 10)) : ""}
                              </span>
                            ) : (
                              <DoneButton actionId={a.id} />
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ),
            )}
          </div>
        )}
      </section>
    </div>
  );
}
