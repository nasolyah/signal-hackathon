"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { t } from "@/lib/i18n";
import type { RcaRow, RcaTarget } from "@/lib/rca-store";
import { CAUSE_CATEGORIES, type ActionStrength } from "@/lib/taxonomy";
import { addAction, changeStatus, editWhy, removeAction, setActionMeta, startRca } from "./actions";

const STRENGTH_TAG: Record<ActionStrength, string> = {
  strong: "bg-pen text-pen-ink border-pen",
  medium: "border-pen text-pen",
  weak: "border-margin-red text-margin-red",
};

/** Computed in code, never by AI (SPEC §2.4.4). */
const onlyWeak = (r: RcaRow) => r.actions.length > 0 && !r.actions.some((a) => a.strength !== "weak");

export function RcaPanel({ target, initial, status }: { target: RcaTarget; initial: RcaRow | null; status: string }) {
  const [rca, setRca] = useState(initial);
  const [state, setState] = useState(status);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ ok: true; value: RcaRow } | { ok: false }>) =>
    startTransition(async () => {
      const res = await fn();
      setFailed(!res.ok);
      if (res.ok) setRca(res.value);
    });

  if (!rca) {
    return (
      <div className="px-5 py-8 lg:px-8">
        <p className="max-w-[48ch] text-base text-ink">{t.rcaUi.startHint}</p>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            run(async () => {
              const r = await startRca(target);
              if (r.ok) setState("in_review");
              return r;
            })
          }
          className="mt-4 flex h-12 items-center rounded-[6px] bg-pen px-5 text-base font-semibold text-pen-ink transition-[filter] hover:brightness-110 focus-visible:ring-4 focus-visible:ring-ring/40 focus-visible:outline-none disabled:cursor-progress disabled:brightness-95"
        >
          {pending ? t.rcaUi.drafting : t.rcaUi.start}
        </button>
        {failed && <p className="mt-3 text-sm text-margin-red">{t.rcaUi.failed}</p>}
      </div>
    );
  }

  const closed = state === "closed";
  const canClose = rca.actions.some((a) => a.strength !== "weak");

  return (
    <div className="pb-8" aria-busy={pending}>
      <p className="px-5 pt-5 text-sm text-ink-muted lg:px-8">{t.rcaUi.draftNote}</p>

      {/* Five whys: numbered lines on the ruled page */}
      <section className="pt-4" aria-labelledby="whys-h">
        <h3 id="whys-h" className="px-5 pb-1 text-lg font-semibold lg:px-8">
          {t.rcaUi.whys}
        </h3>
        <ol className="ruled pr-5 pl-12 lg:pr-8">
          {rca.whys.map((w, i) => (
            <li key={i} className="flex gap-2 text-base leading-(--line)">
              <span className="w-5 shrink-0 text-ink-muted">{i + 1}.</span>
              <span
                className="min-w-0 flex-1 rounded-sm outline-none focus-visible:bg-accent"
                contentEditable={!closed}
                suppressContentEditableWarning
                role="textbox"
                aria-label={`${t.rcaUi.whys}, ${i + 1}`}
                onBlur={(e) => {
                  const text = e.currentTarget.textContent ?? "";
                  if (text.trim() && text !== w) run(() => editWhy(rca.id, i, text));
                }}
              >
                {w}
              </span>
            </li>
          ))}
        </ol>
      </section>

      {/* Causes: six ruled columns with printed heads */}
      <section className="mt-5 border-t border-rule" aria-labelledby="causes-h">
        <h3 id="causes-h" className="px-5 pt-4 pb-2 text-lg font-semibold lg:px-8">
          {t.rcaUi.causes}
        </h3>
        <dl className="grid grid-cols-2 border-t border-rule md:grid-cols-3">
          {CAUSE_CATEGORIES.map((c) => (
            <div key={c} className="border-r border-b border-rule px-5 py-3 last:border-r-0 lg:px-6">
              <dt className="text-xs text-ink-muted">{t.causeCategory[c]}</dt>
              <dd className="mt-1 text-sm leading-snug text-ink">
                {(rca.causes[c] ?? []).length ? (
                  <ul className="flex flex-col gap-1">
                    {rca.causes[c].map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-ink-muted">—</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Actions ranked by RCA² strength */}
      <section className="mt-5" aria-labelledby="actions-h">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 px-5 pb-2 lg:px-8">
          <h3 id="actions-h" className="text-lg font-semibold">
            {t.rcaUi.actions}
          </h3>
          <span className="text-sm text-ink-muted">{t.rcaUi.actionsHint}</span>
        </div>

        {onlyWeak(rca) && (
          <p
            role="alert"
            className="mx-5 mb-3 rounded-[4px] border-[1.5px] border-margin-red px-4 py-3 text-base font-medium text-margin-red [background:repeating-linear-gradient(-45deg,var(--redact-fill)_0_3px,transparent_3px_7px)] lg:mx-8"
          >
            {t.rca.weakOnlyWarning}
          </p>
        )}

        <ol className="border-t border-rule">
          {rca.actions.map((a, i) => (
            <li
              key={`${a.text}-${i}`}
              className="grid grid-cols-[6.5rem_minmax(0,1fr)_auto] items-start gap-x-4 border-b border-rule px-5 py-3 motion-safe:animate-[row-in_320ms_cubic-bezier(0.22,1,0.36,1)_both] lg:px-8"
            >
              <span
                className={`mt-0.5 inline-flex justify-center rounded-[4px] border-[1.5px] px-2 py-0.5 text-sm font-semibold motion-safe:animate-[tag-stamp_360ms_cubic-bezier(0.2,0.8,0.2,1)_both] ${STRENGTH_TAG[a.strength]}`}
              >
                {t.strength[a.strength]}
              </span>
              <div className="min-w-0">
                <p className="text-base leading-snug font-medium text-ink">
                  {a.text}
                  {a.userAdded && <span className="ml-2 text-sm font-normal text-ink-muted">· {t.rcaUi.yours}</span>}
                </p>
                <p className={`mt-0.5 text-sm leading-snug ${a.strength === "weak" ? "text-margin-red" : "text-ink-muted"}`}>
                  {a.rationale}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm">
                  <label className="flex items-baseline gap-2">
                    <span className="text-xs text-ink-muted">{t.rcaUi.owner}</span>
                    <input
                      defaultValue={a.owner ?? ""}
                      disabled={closed}
                      onBlur={(e) => e.target.value !== (a.owner ?? "") && run(() => setActionMeta(rca.id, i, { owner: e.target.value }))}
                      className="w-40 border-b border-rule-strong bg-transparent px-1 py-0.5 text-ink outline-none focus-visible:border-pen"
                    />
                  </label>
                  <label className="flex items-baseline gap-2">
                    <span className="text-xs text-ink-muted">{t.rcaUi.due}</span>
                    <input
                      type="date"
                      defaultValue={a.due ?? ""}
                      disabled={closed}
                      onChange={(e) => run(() => setActionMeta(rca.id, i, { due: e.target.value }))}
                      className="border-b border-rule-strong bg-transparent px-1 py-0.5 text-ink outline-none focus-visible:border-pen"
                    />
                  </label>
                </div>
              </div>
              {!closed && (
                <button
                  type="button"
                  onClick={() => run(() => removeAction(rca.id, i))}
                  className="rounded-sm p-1 text-ink-muted hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
                  aria-label={`${t.rcaUi.remove}: ${a.text}`}
                >
                  <X className="size-4" aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ol>

        {!closed && <AddAction pending={pending} onAdd={(text) => run(() => addAction(rca.id, text))} />}
        {failed && <p className="px-5 pt-2 text-sm text-margin-red lg:px-8">{t.rcaUi.failed}</p>}
      </section>

      <div className="mt-6 flex flex-wrap items-center gap-4 px-5 lg:px-8">
        {closed ? (
          <span className="rounded-[4px] border-2 border-pen px-3 py-1 text-base font-semibold text-pen -rotate-2">{t.rcaUi.closed}</span>
        ) : (
          <>
            <button
              type="button"
              disabled={!canClose || pending}
              onClick={() =>
                startTransition(async () => {
                  const r = await changeStatus(target, "closed");
                  if (r.ok) setState("closed");
                  setFailed(!r.ok);
                })
              }
              className="flex h-11 items-center rounded-[6px] border border-rule-strong px-4 text-base font-medium text-ink transition-colors hover:bg-accent focus-visible:ring-4 focus-visible:ring-ring/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t.rcaUi.close}
            </button>
            {!canClose && <span className="text-sm text-ink-muted">{t.rcaUi.closeNeedsStrong}</span>}
          </>
        )}
      </div>
    </div>
  );
}

function AddAction({ pending, onAdd }: { pending: boolean; onAdd: (text: string) => void }) {
  const [text, setText] = useState("");
  return (
    <form
      className="flex flex-wrap items-end gap-3 px-5 pt-4 lg:px-8"
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim().length < 3) return;
        onAdd(text.trim());
        setText("");
      }}
    >
      <label className="flex min-w-[16rem] flex-1 flex-col gap-1">
        <span className="text-xs text-ink-muted">{t.rcaUi.addAction}</span>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t.rcaUi.addPlaceholder}
          className="h-11 rounded-[4px] border border-rule-strong bg-page px-3 text-base text-ink outline-none placeholder:text-ink-muted focus-visible:border-pen focus-visible:ring-3 focus-visible:ring-ring/30"
        />
      </label>
      <button
        type="submit"
        disabled={pending || text.trim().length < 3}
        className="flex h-11 items-center rounded-[6px] bg-pen px-4 text-base font-semibold text-pen-ink transition-[filter] hover:brightness-110 focus-visible:ring-4 focus-visible:ring-ring/40 focus-visible:outline-none disabled:opacity-60"
      >
        {pending ? t.rcaUi.adding : t.rcaUi.add}
      </button>
    </form>
  );
}
