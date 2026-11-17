"use client";

import { useActionState, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { t } from "@/lib/i18n";
import { DEPARTMENTS, SHIFTS, type HospitalCode, type Shift } from "@/lib/taxonomy";
import { formatDateRu } from "@/lib/time";
import { submitReport, type KeptEntry, type ReportState } from "./actions";
import { DemoLinks, JournalHead, JournalPage } from "./journal-chrome";
import { RedactedText } from "./redacted-text";
import { Stamp } from "./stamp";

type Props = { hospital: HospitalCode; today: string; defaultShift: Shift };

export function ReportJournal(props: Props) {
  // A new round remounts the form, so the previous text is gone from memory too.
  const [round, setRound] = useState(0);
  return <JournalRound key={round} {...props} onAnother={() => setRound((r) => r + 1)} />;
}

const IDLE: ReportState = { status: "idle" };

function JournalRound({ hospital, today, defaultShift, onAnother }: Props & { onAnother: () => void }) {
  const [state, action, pending] = useActionState(submitReport, IDLE);
  // The original text exists only in this browser tab. It is sent once for processing and never kept.
  const [text, setText] = useState("");
  const [shift, setShift] = useState<Shift>(defaultShift);
  const [shiftTouched, setShiftTouched] = useState(false);

  if (state.status === "kept") {
    return <KeptView hospital={hospital} entry={state.entry} original={text} onAnother={onAnother} />;
  }

  return (
    <JournalPage>
      <JournalHead hospital={hospital} />
      <form action={action} className="flex flex-1 flex-col" aria-busy={pending}>
        <input type="hidden" name="hospital" value={hospital} />
        <input type="hidden" name="shift_touched" value={shiftTouched ? "1" : "0"} />

        <h1 className="px-5 pt-6 pb-5 text-[1.75rem] leading-[1.15] font-semibold tracking-[-0.01em] text-balance md:text-[2rem]">
          {t.report.title}
        </h1>

        {/* Journal columns: date is fixed, shift is pre-filled from the clock */}
        <div className="grid grid-cols-[auto_1fr] border-y border-rule">
          <div className="border-r border-rule px-5 py-2.5">
            <div className="text-xs text-ink-muted">{t.report.date}</div>
            <div className="mt-0.5 text-base">{formatDateRu(today)}</div>
          </div>
          <fieldset className="px-4 py-2.5">
            <legend className="sr-only">{t.report.shift}</legend>
            <div className="text-xs text-ink-muted" aria-hidden>
              {t.report.shift}
            </div>
            <div className="mt-0.5 flex gap-2">
              {SHIFTS.map((s) => (
                <label
                  key={s}
                  className="flex min-h-9 cursor-pointer items-center gap-1.5 rounded-[4px] border border-rule-strong px-3 text-base transition-colors has-checked:border-pen has-checked:bg-accent has-focus-visible:ring-3 has-focus-visible:ring-ring/40"
                >
                  <input
                    type="radio"
                    name="shift"
                    value={s}
                    checked={shift === s}
                    onChange={() => {
                      setShift(s);
                      setShiftTouched(true);
                    }}
                    className="peer sr-only"
                  />
                  <Check className="size-4 text-pen opacity-0 peer-checked:opacity-100" aria-hidden />
                  {t.shift[s]}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <label className="flex items-center justify-between gap-3 border-b border-rule px-5 py-2.5">
          <span className="text-xs text-ink-muted">{t.report.department}</span>
          <span className="relative">
            <select
              name="department"
              defaultValue=""
              className="appearance-none rounded-[4px] bg-transparent py-1 pr-7 pl-2 text-right text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
            >
              <option value="">{t.report.departmentAny}</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {t.departments[d]}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-1 size-4 -translate-y-1/2 text-ink-muted" aria-hidden />
          </span>
        </label>

        {/* The ruled page: the one field that matters */}
        <div className="flex flex-1 flex-col px-0 pt-4">
          <label htmlFor="report-text" className="px-5 pb-1 text-lg font-semibold">
            {t.report.textLabel}
          </label>
          <div className="relative flex flex-1 flex-col">
            <textarea
              id="report-text"
              name="text"
              required
              value={text}
              onChange={(e) => setText(e.target.value)}
              readOnly={pending}
              placeholder={t.report.textPlaceholder}
              aria-invalid={state.status === "too_short"}
              aria-describedby="report-hint"
              spellCheck
              autoComplete="off"
              className="ruled min-h-[clamp(14rem,42dvh,26rem)] w-full flex-1 resize-none bg-transparent pr-5 pl-12 text-[1.125rem] text-ink outline-none placeholder:text-ink-muted/80 md:text-[1.1875rem]"
            />
            {pending && (
              <div className="pointer-events-none absolute right-5 bottom-3 left-12 h-[2px] overflow-hidden" aria-hidden>
                <div className="h-full origin-left bg-pen motion-safe:animate-[pen-stroke_6s_cubic-bezier(0.16,1,0.3,1)_forwards]" />
              </div>
            )}
          </div>
          <p id="report-hint" className="min-h-6 px-5 pl-12 text-sm text-margin-red" aria-live="polite">
            {state.status === "too_short" ? t.report.tooShort : null}
          </p>
        </div>

        {/* Always in view, right above the button: safety is felt before submitting (PRODUCT.md §1) */}
        <div className="sticky bottom-0 border-t border-rule bg-page/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-[2px]">
          {/* «Подпись» column is crossed out: this entry is never signed */}
          <p className="px-1 pb-2.5 text-sm leading-snug text-ink-muted">
            <span className="ruler-strike">{t.report.signature}</span>{" "}
            <span className="font-medium text-ink">{t.report.signatureNotNeeded}.</span> {t.report.trustLine}
          </p>
          {state.status === "failed" && (
            <p className="pb-2 text-sm text-margin-red" role="alert">
              {t.report.failed}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="flex h-14 w-full items-center justify-center rounded-[6px] bg-pen text-lg font-semibold text-pen-ink transition-[filter,transform] duration-150 hover:brightness-110 focus-visible:ring-4 focus-visible:ring-ring/40 focus-visible:outline-none active:translate-y-px disabled:cursor-progress disabled:brightness-95"
          >
            {pending ? t.report.submitting : t.report.submit}
          </button>
        </div>
        <DemoLinks />
      </form>
    </JournalPage>
  );
}

function KeptView({
  hospital,
  entry,
  original,
  onAnother,
}: {
  hospital: HospitalCode;
  entry: KeptEntry;
  original: string;
  onAnother: () => void;
}) {
  const [showMine, setShowMine] = useState(false);
  const fields: [string, string][] = [
    [t.fields.type, t.incidentType[entry.incidentType]],
    [t.fields.stage, t.stage[entry.stage]],
    [t.fields.harm, t.harm[entry.harm]],
    [t.fields.nearMiss, entry.nearMiss ? t.fields.yes : t.fields.no],
  ];

  return (
    <JournalPage>
      <JournalHead hospital={hospital} />
      <article className="flex flex-1 flex-col" aria-live="polite">
        <div className="flex items-start justify-between gap-3 px-5 pt-6 pb-4">
          <h1 className="text-[1.625rem] leading-[1.15] font-semibold tracking-[-0.01em] text-balance md:text-[2rem]">
            {t.report.resultTitle}
          </h1>
          <Stamp date={entry.date} />
        </div>

        <div className="grid grid-cols-2 border-y border-rule">
          <div className="border-r border-rule px-5 py-2.5">
            <div className="text-xs text-ink-muted">{t.report.date}</div>
            <div className="mt-0.5 text-base">{formatDateRu(entry.date)}</div>
          </div>
          <div className="px-5 py-2.5">
            <div className="text-xs text-ink-muted">{t.report.shift}</div>
            <div className="mt-0.5 text-base">{t.shift[entry.shift]}</div>
          </div>
        </div>

        <section className="pt-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 pb-1">
            <h2 className="text-lg font-semibold">{showMine ? t.report.textLabel : t.report.keptLabel}</h2>
            <button
              type="button"
              onClick={() => setShowMine((v) => !v)}
              className="text-sm text-pen underline decoration-1 hover:decoration-2 focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
            >
              {showMine ? t.report.showKept : t.report.showMine}
            </button>
          </div>
          {!showMine && (
            <p className="px-5 pb-2 pl-12 text-lg font-semibold text-margin-red md:text-xl">
              {t.report.removedCount(entry.removed)}
            </p>
          )}
          <div className="relative">
            <p className="ruled min-h-[calc(var(--line)*4)] pr-5 pb-[calc(var(--line)/2)] pl-12 text-[1.1875rem] whitespace-pre-wrap text-ink md:text-[1.375rem]">
              {showMine ? original : <RedactedText text={entry.redactedText} />}
            </p>
          </div>
          <p className="px-5 pt-1 pl-12 text-sm text-ink-muted">
            {showMine ? t.report.mineNote : t.report.removedHint}
          </p>
        </section>

        <dl className="mt-5 grid grid-cols-2 border-t border-rule">
          {fields.map(([label, value], i) => (
            <div key={label} className={`border-b border-rule px-5 py-3 ${i % 2 === 0 ? "border-r" : ""}`}>
              <dt className="text-xs text-ink-muted">{label}</dt>
              <dd className="mt-0.5 text-lg leading-snug font-semibold md:text-xl">{value}</dd>
            </div>
          ))}
          <div className="col-span-2 border-b border-rule px-5 py-3">
            <dt className="text-xs text-ink-muted">{t.fields.factors}</dt>
            <dd className="mt-0.5 text-lg leading-snug font-semibold md:text-xl">
              {entry.factors.map((f) => t.factor[f]).join(" · ")}
            </dd>
          </div>
        </dl>

        {entry.joinedPattern && (
          <p className="mx-5 mt-4 rounded-[4px] bg-accent px-4 py-3 text-base text-ink">{t.report.joinedPattern}</p>
        )}

        <div className="mt-auto px-4 pt-6 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onAnother}
            className="flex h-14 w-full items-center justify-center rounded-[6px] border border-rule-strong text-lg font-medium text-ink transition-colors hover:bg-accent focus-visible:ring-4 focus-visible:ring-ring/40 focus-visible:outline-none"
          >
            {t.report.another}
          </button>
        </div>
        <DemoLinks />
      </article>
    </JournalPage>
  );
}
