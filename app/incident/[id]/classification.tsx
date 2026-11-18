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

/** AI suggests, a human confirms: proposals stay muted until a person confirms; then the seal pops in. */
export function Classification({ id, initial, verified }: { id: string; initial: Fields; verified: boolean }) {
  const [f, setF] = useState(initial);
  const router = useRouter();
  const [ok, setOk] = useState(verified);
  // The stamp lands once, at the moment a person confirms — not on every page load.
  const [justConfirmed, setJustConfirmed] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();
  const tone = ok ? "text-ink" : "text-ink-muted";

  const select = <K extends keyof Fields>(key: K, label: string, options: [string, string][], wide = false) => (
    <label className={`flex flex-col gap-1.5 rounded-xl bg-page px-4 py-3 ${wide ? "sm:col-span-2" : ""}`}>
      <span className="text-sm text-ink-muted">{label}</span>
      <span className="relative">
      <select
        value={String(f[key])}
        onChange={(e) => {
          setOk(false);
          setF({ ...f, [key]: key === "near_miss" ? e.target.value === "true" : e.target.value } as Fields);
        }}
        className={`w-full appearance-none bg-transparent pr-6 text-base font-medium outline-none focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring/40 ${tone}`}
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
    <section aria-label={t.rcaUi.confirm}>
      <div className="flex min-h-11 items-center justify-between gap-3">
        <h2 className="text-xl font-medium tracking-tight text-ink">{t.fields.classification}</h2>
        {ok ? <Stamp date={tashkentDate()} label={t.rcaUi.confirmed} animate={justConfirmed} /> : <p className="text-sm text-ink-muted">{t.rcaUi.aiProposal}</p>}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {select("incident_type", t.fields.type, INCIDENT_TYPES.map((k) => [k, t.incidentType[k]]), true)}
        {select("stage", t.fields.stage, STAGES.map((k) => [k, t.stage[k]]))}
        {select("harm", t.fields.harm, HARMS.map((k) => [k, t.harm[k]]))}
        {select("near_miss", t.fields.nearMissMinistry, [["true", t.fields.yes], ["false", t.fields.no]])}
      </div>
      <fieldset className="mt-3 rounded-xl bg-page px-4 py-3">
        <legend className="sr-only">{t.fields.factors}</legend>
        <p className="text-sm text-ink-muted">{t.fields.factors}</p>
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
                className={`rounded-full border px-3 py-1 text-sm transition-colors focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none ${on ? `border-mint bg-mint font-medium ${tone}` : "border-rule-strong text-ink-muted hover:bg-ground"}`}
              >
                {t.factor[k]}
              </button>
            );
          })}
        </div>
      </fieldset>
      {!ok && (
        <div className="pt-5">
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
            className="flex h-11 items-center rounded-lg bg-pen px-5 text-base font-medium text-pen-ink transition-[transform,background-color] duration-150 hover:bg-[#3a3a3a] active:scale-[0.98] focus-visible:ring-4 focus-visible:ring-ring/40 focus-visible:outline-none disabled:cursor-progress disabled:bg-[#3a3a3a]"
          >
            {pending ? t.rcaUi.confirming : t.rcaUi.confirm}
          </button>
          {failed && <p className="mt-2 text-sm text-margin-red">{t.rcaUi.failed}</p>}
        </div>
      )}
    </section>
  );
}
