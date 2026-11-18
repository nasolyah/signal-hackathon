"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { t } from "@/lib/i18n";
import type { RcaRow, RcaTarget } from "@/lib/rca-store";
import { CAUSE_CATEGORIES, type ActionStrength } from "@/lib/taxonomy";
import { tashkentDate } from "@/lib/time";
import { Stamp } from "@/app/report/stamp";
import { addAction, changeStatus, editWhy, removeAction, setActionMeta, startRca } from "./actions";

const STRENGTH_TAG: Record<ActionStrength, string> = {
  strong: "bg-mint text-ink border-mint",
  medium: "bg-page text-ink border-rule-strong",
  weak: "bg-page text-margin-red border-margin-red",
};

/** Computed in code, never by AI (SPEC §2.4.4). */
const onlyWeak = (r: RcaRow) => r.actions.length > 0 && !r.actions.some((a) => a.strength !== "weak");

/** «дд.мм.гггг» — a Russian date field instead of the browser's English mask. */
const DUE = /^\d{2}\.\d{2}\.\d{4}$/;

export function RcaPanel({ target, initial, status }: { target: RcaTarget; initial: RcaRow | null; status: string }) {
  const router = useRouter();
  const [rca, setRca] = useState(initial);
  const [state, setState] = useState(status);
  const [failed, setFailed] = useState(false);
  // Only the action a person just added slides in and stamps — never on page load.
  const [fresh, setFresh] = useState<string | null>(null);
  // The closed stamp lands once, when a person closes it here — independent of the refresh timing.
  const [justClosed, setJustClosed] = useState(false);
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ ok: true; value: RcaRow } | { ok: false }>, after?: (r: RcaRow) => void) =>
    startTransition(async () => {
      const res = await fn();
      setFailed(!res.ok);
      if (res.ok) {
        setRca(res.value);
        after?.(res.value);
      }
    });

  if (!rca) {
    return (
      <div className="px-5 py-12 lg:px-12">
        <p className="max-w-[48ch] text-lg leading-relaxed text-ink">{t.rcaUi.startHint}</p>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            run(
              () => startRca(target),
              () => {
                setState("in_review");
                router.refresh(); // running head status «Новый» → «На разборе»
              },
            )
          }
          className="mt-6 flex h-12 items-center rounded-lg bg-pen px-5 text-base font-medium text-pen-ink transition-[transform,background-color] duration-150 hover:bg-[#3a3a3a] active:scale-[0.98] focus-visible:ring-4 focus-visible:ring-ring/40 focus-visible:outline-none disabled:cursor-progress disabled:bg-[#3a3a3a]"
        >
          {pending ? t.rcaUi.drafting : t.rcaUi.start}
        </button>
        {pending && (
          <div className="mt-5 h-1 max-w-[28rem] overflow-hidden rounded-full bg-ground" aria-hidden>
            <div className="h-full origin-left scale-x-90 rounded-full bg-mint-deep motion-safe:animate-[pen-stroke_18s_cubic-bezier(0.16,1,0.3,1)_forwards]" />
          </div>
        )}
        {failed && <p className="mt-3 text-sm text-margin-red">{t.rcaUi.failed}</p>}
      </div>
    );
  }

  const closed = state === "closed";
  const canClose = rca.actions.some((a) => a.strength !== "weak");

  return (
    <div className="px-5 pt-10 pb-16 lg:px-12 lg:pt-12" aria-busy={pending}>
      {/* Five whys: numbered steps, each editable in place */}
      <section aria-labelledby="whys-h">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 id="whys-h" className="text-xl font-medium tracking-tight text-ink">
            {t.rcaUi.whys}
          </h3>
          <span className="text-sm text-ink-muted">{t.rcaUi.draftNote}</span>
        </div>
        <ol className="mt-5 flex flex-col gap-4">
          {rca.whys.map((w, i) => (
            <li key={i} className="flex gap-4 text-base leading-relaxed">
              <span className="grid size-8 shrink-0 place-items-center rounded-full border border-rule-strong text-sm font-medium text-ink">{i + 1}</span>
              <span
                className={`min-w-0 flex-1 rounded-md px-1 pt-0.5 caret-mint-deep outline-none focus-visible:bg-ground ${closed ? "" : "cursor-text decoration-rule-strong underline-offset-4 hover:underline"}`}
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

      {/* Causes: six quiet cards on the grey surface */}
      <section className="mt-14" aria-labelledby="causes-h">
        <h3 id="causes-h" className="text-xl font-medium tracking-tight text-ink">
          {t.rcaUi.causes}
        </h3>
        <dl className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {CAUSE_CATEGORIES.map((c) => (
            <div key={c} className="rounded-xl bg-ground px-4 py-3.5">
              <dt className="text-sm text-ink-muted">{t.causeCategory[c]}</dt>
              <dd className="mt-1.5 text-[0.9375rem] leading-snug text-ink">
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
      <section className="mt-14" aria-labelledby="actions-h">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 id="actions-h" className="text-xl font-medium tracking-tight text-ink">
            {t.rcaUi.actions}
          </h3>
          <span className="text-sm text-ink-muted">{t.rcaUi.actionsHint}</span>
        </div>

        {onlyWeak(rca) && (
          <p
            role="alert"
            className="mt-5 rounded-xl border border-margin-red/40 bg-[#fdf0ee] px-5 py-4 text-base font-medium text-margin-red"
          >
            {t.rca.weakOnlyWarning}
          </p>
        )}

        <ol className="mt-5 flex flex-col gap-3">
          {rca.actions.map((a, i) => {
            const isFresh = a.text === fresh;
            return (
              <li
                key={a.text}
                className={`grid grid-cols-[6.5rem_minmax(0,1fr)_auto] items-start gap-x-4 rounded-xl border border-rule px-4 py-4 sm:px-5 ${isFresh ? "motion-safe:animate-[row-in_320ms_cubic-bezier(0.22,1,0.36,1)_both]" : ""}`}
              >
                <span
                  className={`mt-0.5 inline-flex justify-center rounded-full border px-2.5 py-0.5 text-sm font-medium ${STRENGTH_TAG[a.strength]} ${isFresh ? "motion-safe:animate-[tag-stamp_360ms_cubic-bezier(0.2,0.8,0.2,1)_both]" : ""}`}
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
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                    <label className="flex items-baseline gap-2">
                      <span className="text-xs text-ink-muted">{t.rcaUi.owner}</span>
                      <input
                        defaultValue={a.owner ?? ""}
                        disabled={closed}
                        onBlur={(e) => e.target.value !== (a.owner ?? "") && run(() => setActionMeta(rca.id, i, { owner: e.target.value }))}
                        className="w-40 border-b border-rule-strong bg-transparent px-1 py-0.5 text-ink outline-none focus-visible:border-mint-deep"
                      />
                    </label>
                    <label className="flex items-baseline gap-2">
                      <span className="text-xs text-ink-muted">{t.rcaUi.due}</span>
                      <input
                        defaultValue={a.due ?? ""}
                        disabled={closed}
                        inputMode="numeric"
                        maxLength={10}
                        placeholder="дд.мм.гггг"
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v !== (a.due ?? "") && (v === "" || DUE.test(v))) run(() => setActionMeta(rca.id, i, { due: v }));
                        }}
                        className="w-28 border-b border-rule-strong bg-transparent px-1 py-0.5 text-ink tabular-nums outline-none placeholder:text-ink-muted focus-visible:border-mint-deep"
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
            );
          })}
        </ol>

        {!closed && (
          <AddAction
            pending={pending}
            onAdd={(text) =>
              run(
                () => addAction(rca.id, text),
                () => setFresh(text),
              )
            }
          />
        )}
        {failed && <p className="pt-3 text-sm text-margin-red">{t.rcaUi.failed}</p>}
      </section>

      <div className="mt-12 border-t border-rule pt-8">
        {closed ? (
          <Stamp date={tashkentDate()} label={t.rcaUi.closed} animate={justClosed} />
        ) : (
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              disabled={!canClose || pending}
              onClick={() =>
                startTransition(async () => {
                  const r = await changeStatus(target, "closed");
                  setFailed(!r.ok);
                  if (r.ok) {
                    setState("closed");
                    setJustClosed(true);
                    router.refresh(); // running head status → «Закрыт»
                  }
                })
              }
              className="flex h-11 items-center rounded-lg bg-pen px-5 text-base font-medium text-pen-ink transition-[transform,background-color] duration-150 hover:bg-[#3a3a3a] active:scale-[0.98] focus-visible:ring-4 focus-visible:ring-ring/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-rule-strong disabled:text-ink-muted"
            >
              {t.rcaUi.close}
            </button>
            {!canClose && <span className="text-sm text-ink-muted">{t.rcaUi.closeNeedsStrong}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function AddAction({ pending, onAdd }: { pending: boolean; onAdd: (text: string) => void }) {
  const [text, setText] = useState("");
  return (
    <form
      className="mt-4 flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim().length < 3) return;
        onAdd(text.trim());
        setText("");
      }}
    >
      <label className="flex min-w-[16rem] flex-1 flex-col gap-1">
        <span className="text-sm text-ink-muted">{t.rcaUi.addAction}</span>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t.rcaUi.addPlaceholder}
          className="h-11 rounded-lg border border-rule-strong bg-page px-3.5 text-base text-ink outline-none placeholder:text-ink-muted focus-visible:border-mint-deep focus-visible:ring-3 focus-visible:ring-ring/30"
        />
      </label>
      <button
        type="submit"
        disabled={pending || text.trim().length < 3}
        className="flex h-11 items-center rounded-lg border border-rule-strong bg-page px-4 text-base font-medium text-ink transition-colors hover:bg-ground focus-visible:ring-4 focus-visible:ring-ring/40 focus-visible:outline-none disabled:opacity-50"
      >
        {pending ? t.rcaUi.adding : t.rcaUi.add}
      </button>
    </form>
  );
}
