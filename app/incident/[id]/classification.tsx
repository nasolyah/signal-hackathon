"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { t } from "@/lib/i18n";
import { FACTORS, HARMS, INCIDENT_TYPES, STAGES, type Factor, type Harm, type IncidentType, type Stage } from "@/lib/taxonomy";
import { confirmClassification } from "@/app/rca/actions";
import { Stamp } from "@/app/report/stamp";
import { tashkentDate } from "@/lib/time";

type Fields = { incident_type: IncidentType; stage: Stage; harm: Harm; near_miss: boolean; factors: Factor[] };

/** AI suggests, a human confirms: proposals stay in faded ink until a person confirms; then the stamp lands. */
export function Classification({ id, initial, verified }: { id: string; initial: Fields; verified: boolean }) {
  const [f, setF] = useState(initial);
  const router = useRouter();
  const [ok, setOk] = useState(verified);
  // The stamp lands once, at the moment a person confirms — not on every page load.
  const [justConfirmed, setJustConfirmed] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();
  const tone = ok ? "text-ink" : "text-ink-muted";

  const select = <K extends keyof Fields>(key: K, label: string, options: [string, string][]) => (
    <label className="flex flex-col gap-1 border-r border-b border-rule px-5 py-3 lg:px-6">
      <span className="text-xs text-ink-muted">{label}</span>
      <span className="relative">
      <select
        value={String(f[key])}
        onChange={(e) => {
          setOk(false);
          setF({ ...f, [key]: key === "near_miss" ? e.target.value === "true" : e.target.value } as Fields);
        }}
        className={`w-full appearance-none bg-transparent pr-6 text-base font-semibold outline-none focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring/40 ${tone}`}
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-0 size-4 -translate-y-1/2 text-ink-muted" aria-hidden />
      </span>
    </label>
  );

  return (
    <section className="border-t border-rule" aria-label={t.rcaUi.confirm}>
      <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-2 lg:px-8">
        <p className="text-sm text-ink-muted">{ok ? null : t.rcaUi.aiProposal}</p>
        {ok && <Stamp date={tashkentDate()} label={t.rcaUi.confirmed} animate={justConfirmed} className="size-[5rem]" />}
      </div>
      <div className="grid grid-cols-2 border-t border-rule">
        {select("incident_type", t.fields.type, INCIDENT_TYPES.map((k) => [k, t.incidentType[k]]))}
        {select("stage", t.fields.stage, STAGES.map((k) => [k, t.stage[k]]))}
        {select("harm", t.fields.harm, HARMS.map((k) => [k, t.harm[k]]))}
        {select("near_miss", t.fields.nearMissMinistry, [["true", t.fields.yes], ["false", t.fields.no]])}
      </div>
      <fieldset className="border-b border-rule px-5 py-3 lg:px-6">
        <legend className="sr-only">{t.fields.factors}</legend>
        <p className="text-xs text-ink-muted">{t.fields.factors}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {FACTORS.map((k) => {
            const on = f.factors.includes(k);
            return (
              <button
                key={k}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  const next = on ? f.factors.filter((x) => x !== k) : [...f.factors, k].slice(-3);
                  if (next.length === 0) return;
                  setOk(false);
                  setF({ ...f, factors: next });
                }}
                className={`rounded-[4px] border px-2 py-0.5 text-sm transition-colors focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none ${on ? `border-pen bg-accent font-medium ${tone}` : "border-rule text-ink-muted hover:border-rule-strong"}`}
              >
                {t.factor[k]}
              </button>
            );
          })}
        </div>
      </fieldset>
      {!ok && (
        <div className="px-5 pt-3 lg:px-8">
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await confirmClassification(id, f);
                setFailed(!r.ok);
                if (r.ok) {
                  setOk(true);
                  setJustConfirmed(true);
                  router.refresh();
                }
              })
            }
            className="flex h-11 items-center rounded-[6px] bg-pen px-4 text-base font-semibold text-pen-ink transition-[filter] hover:brightness-110 focus-visible:ring-4 focus-visible:ring-ring/40 focus-visible:outline-none disabled:cursor-progress disabled:brightness-95"
          >
            {pending ? t.rcaUi.confirming : t.rcaUi.confirm}
          </button>
          {failed && <p className="mt-2 text-sm text-margin-red">{t.rcaUi.failed}</p>}
        </div>
      )}
    </section>
  );
}
