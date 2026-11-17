"use client";

import { useState, useTransition } from "react";
import { t } from "@/lib/i18n";
import { FACTORS, HARMS, INCIDENT_TYPES, STAGES, type Factor, type Harm, type IncidentType, type Stage } from "@/lib/taxonomy";
import { confirmClassification } from "@/app/rca/actions";

type Fields = { incident_type: IncidentType; stage: Stage; harm: Harm; near_miss: boolean; factors: Factor[] };

/** AI suggests, a human confirms: proposals stay in faded ink until a person confirms; then the stamp lands. */
export function Classification({ id, initial, verified }: { id: string; initial: Fields; verified: boolean }) {
  const [f, setF] = useState(initial);
  const [ok, setOk] = useState(verified);
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();
  const tone = ok ? "text-ink" : "text-ink-muted";

  const select = <K extends keyof Fields>(key: K, label: string, options: [string, string][]) => (
    <label className="flex flex-col gap-1 border-r border-b border-rule px-5 py-3 lg:px-6">
      <span className="text-xs text-ink-muted">{label}</span>
      <select
        value={String(f[key])}
        onChange={(e) => {
          setOk(false);
          setF({ ...f, [key]: key === "near_miss" ? e.target.value === "true" : e.target.value } as Fields);
        }}
        className={`appearance-none bg-transparent text-base font-semibold outline-none focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring/40 ${tone}`}
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <section className="border-t border-rule" aria-label={t.rcaUi.confirm}>
      <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-2 lg:px-8">
        <p className="text-sm text-ink-muted">{ok ? null : t.rcaUi.aiProposal}</p>
        {ok && (
          <span className="rounded-[4px] border-2 border-pen px-2.5 py-0.5 text-sm font-semibold text-pen motion-safe:animate-[tag-stamp_360ms_cubic-bezier(0.2,0.8,0.2,1)_both] -rotate-3">
            {t.rcaUi.confirmed}
          </span>
        )}
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
                if (r.ok) setOk(true);
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
