import type { Metadata } from "next";
import { notFound } from "next/navigation";
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
      <Suspense fallback={<div className="mx-auto h-72 w-full max-w-[60rem] rounded-[20px] bg-ground" aria-hidden />}>
        <Hospital params={params} />
      </Suspense>
    </main>
  );
}

async function Hospital({ params }: Pick<PageProps<"/hospital/[id]">, "params">) {
  const { id } = await params;
  if (!isHospital(id)) notFound();
  const [digest, actions] = await Promise.all([latestReceivedDigest(id), actionsOfHospital(id)]);
  const patterns = await patternsFor((digest?.items ?? []).map((i) => i.pattern_id).filter((x): x is string => Boolean(x)));
  const today = tashkentDate();
  const accepted = actions.filter((a) => a.decision === "accepted");

  return (
    <div className="mx-auto w-full max-w-[60rem] px-5 pb-24 lg:px-10">
      <div className="pt-10 pb-8 lg:pt-14">
        <p className="text-base text-ink-muted">
          {t.hospitals[id].name} · {t.hospitals[id].region}
        </p>
        <h1 className="mt-1 text-[2rem] leading-[1.1] font-medium tracking-[-0.025em] text-ink lg:text-[2.75rem]">{t.v2.digest}</h1>
      </div>

      {!digest ? (
        <p className="rounded-[20px] bg-ground px-8 py-10 text-lg text-ink-muted">{t.v2.hospitalEmpty}</p>
      ) : (
        <section aria-label={t.v2.digest} className="rounded-[20px] bg-ground px-5 py-7 sm:px-8 sm:py-9">
          <Acknowledge digestId={digest.id} unread={digest.status === "sent"} />
          <p className="text-sm text-ink-muted">
            {t.v2.week(formatDateRu(digest.period_start).slice(0, 5), formatDateRu(digest.period_end).slice(0, 5))}
            {digest.sent_at ? ` · ${t.v2.sentAt(formatStampRu(digest.sent_at))}` : ""}
          </p>
          <p className="mt-3 text-[1.5rem] leading-snug font-medium tracking-[-0.015em] text-balance text-ink">{digest.headline}</p>
          <p className="mt-2 text-sm text-ink-muted">
            {t.v2.stats(digest.stats.reports ?? 0, Math.round((digest.stats.near_miss_share ?? 0) * 100), digest.stats.severe ?? 0)}
          </p>
          {digest.analyst_note && <p className="mt-3 border-l-2 border-mint-deep pl-3 text-[0.9375rem] text-ink">{digest.analyst_note}</p>}

          <ol className="mt-7 flex flex-col gap-4">
            {digest.items.map((it, n) => {
              const p = patterns.find((x) => x.id === it.pattern_id);
              const decision = actions.find((a) => a.digest_id === digest.id && a.item_id === it.id) ?? null;
              return (
                <li key={it.id} className="rounded-xl bg-page px-5 py-5">
                  <p className="text-sm text-ink-muted">{n + 1}</p>
                  <p className="mt-0.5 text-lg leading-snug font-medium text-ink">{it.title}</p>
                  {p && <p className="mt-2 inline-flex rounded-full bg-accent px-3 py-1 text-sm text-ink">{t.v2.pattern(p.title, p.incident_count, p.hospital_count)}</p>}
                  <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink">
                    <span className="text-ink-muted">{t.v2.what}: </span>
                    {it.what}
                  </p>
                  <p className="mt-1 text-[0.9375rem] leading-relaxed text-ink">
                    <span className="text-ink-muted">{t.v2.why}: </span>
                    {it.why}
                  </p>
                  <p className="mt-4 text-sm text-ink-muted">{t.v2.suggested}</p>
                  <ul className="mt-2 flex flex-col gap-2">
                    {it.actions.map((a, i) => (
                      <li key={i} className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-start gap-3 text-[0.9375rem]">
                        <StrengthBadge strength={a.strength} />
                        <span>
                          <span className="text-ink">{a.text}</span>
                          <span className={`block text-sm ${a.strength === "weak" ? "text-margin-red" : "text-ink-muted"}`}>{a.rationale}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                  <ItemDecision
                    digestId={digest.id}
                    itemId={it.id}
                    suggestion={it.actions[0]?.text ?? ""}
                    decision={decision ? { decision: decision.decision, action: decision.action_text, reason: decision.reject_reason, due: decision.due_date } : null}
                  />
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <section aria-labelledby="work-h" className="mt-14">
        <h2 id="work-h" className="text-xl font-medium tracking-tight text-ink">
          {t.v2.inWork}
        </h2>
        {accepted.length === 0 ? (
          <p className="mt-4 text-base text-ink-muted">{t.v2.inWorkEmpty}</p>
        ) : (
          <ul className="mt-4 flex flex-col">
            {accepted.map((a) => {
              const overdue = a.status === "planned" && a.due_date !== null && a.due_date < today;
              return (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-rule py-4 last:border-b-0">
                  <span className="flex min-w-0 items-start gap-3">
                    {a.strength && <StrengthBadge strength={a.strength} />}
                    <span className="min-w-0 text-[0.9375rem] text-ink">
                      {a.action_text}
                      <span className={`block text-sm ${overdue ? "font-medium text-margin-red" : "text-ink-muted"}`}>
                        {a.due_date ? t.v2.dueBy(formatDateRu(a.due_date)) : ""}
                        {overdue ? ` · ${t.v2.overdue}` : ""}
                      </span>
                    </span>
                  </span>
                  {a.status === "done" ? (
                    <span className="inline-flex items-center gap-2 text-sm text-ink">
                      <span className="size-2 rounded-full bg-mint-deep" aria-hidden />
                      {t.v2.done}
                      {a.done_at ? ` ${formatDateRu(a.done_at.slice(0, 10)).slice(0, 5)}` : ""}
                    </span>
                  ) : (
                    <DoneButton actionId={a.id} />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
