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
import { WORST_KEPT } from "@/lib/dev-fixtures";

type Props = { hospital: HospitalCode; today: string; defaultShift: Shift };

export function ReportJournal(props: Props) {
  // A new round remounts the form, so the previous text is gone from memory too.
  const [round, setRound] = useState(0);
  return <JournalRound key={round} {...props} onAnother={() => setRound((r) => r + 1)} />;
}

const IDLE: ReportState = { status: "idle" };
/** Same limit as the server (app/report/actions.ts). Not maxLength: a paste must never be cut silently. */
const MAX_TEXT = 4000;

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

        <h1 className="px-5 pt-8 pb-6 text-[1.875rem] leading-[1.12] font-medium tracking-[-0.025em] text-balance md:text-[2.25rem]">
          {t.report.title}
        </h1>

        {/* Date is fixed, shift is pre-filled from the clock */}
        <div className="flex flex-wrap items-end gap-x-6 gap-y-4 px-5">
          <div>
            <div className="text-sm text-ink-muted">{t.report.date}</div>
            <div className="mt-1.5 flex h-10 items-center text-base text-ink">{formatDateRu(today)}</div>
          </div>
          <fieldset>
            <legend className="sr-only">{t.report.shift}</legend>
            <div className="text-sm text-ink-muted" aria-hidden>
              {t.report.shift}
            </div>
            <div className="mt-1.5 flex gap-2">
              {SHIFTS.map((s) => (
                <label
                  key={s}
                  className="flex h-10 cursor-pointer items-center gap-1.5 rounded-full border border-rule-strong px-4 text-base text-ink transition-colors hover:bg-ground has-checked:border-mint has-checked:bg-mint has-checked:font-medium has-focus-visible:ring-3 has-focus-visible:ring-ring/40"
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
                  <Check className="hidden size-4 text-ink peer-checked:block" aria-hidden />
                  {t.shift[s]}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <label className="mt-5 flex flex-col gap-1.5 px-5">
          <span className="text-sm text-ink-muted">{t.report.department}</span>
          <span className="relative">
            <select
              name="department"
              defaultValue=""
              className="h-11 w-full appearance-none rounded-lg border border-rule-strong bg-page pr-9 pl-3.5 text-base text-ink outline-none hover:bg-ground focus-visible:border-mint-deep focus-visible:ring-3 focus-visible:ring-ring/30"
            >
              <option value="">{t.report.departmentAny}</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {t.departments[d]}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-muted" aria-hidden />
          </span>
        </label>

        {/* The one field that matters */}
        <div className="flex flex-col px-5 pt-7">
          <label htmlFor="report-text" className="pb-2 text-lg font-medium text-ink">
            {t.report.textLabel}
          </label>
          <div className="relative">
            <textarea
              id="report-text"
              name="text"
              required
              value={text}
              onChange={(e) => setText(e.target.value)}
              readOnly={pending}
              placeholder={t.report.textPlaceholder}
              aria-invalid={state.status === "too_short" || state.status === "too_long" || text.length > MAX_TEXT}
              aria-describedby="report-hint"
              spellCheck
              autoComplete="off"
              className="block h-64 w-full resize-none rounded-2xl border border-transparent bg-ground px-4 py-3.5 text-[1.125rem] leading-relaxed text-ink outline-none placeholder:text-ink-muted focus-visible:border-mint-deep focus-visible:bg-page focus-visible:ring-3 focus-visible:ring-ring/20 md:h-72"
            />
            {pending && (
              <div className="pointer-events-none absolute right-4 bottom-3 left-4 h-1 overflow-hidden rounded-full bg-page" aria-hidden>
                <div className="h-full origin-left scale-x-90 rounded-full bg-mint-deep motion-safe:animate-[pen-stroke_5s_cubic-bezier(0.16,1,0.3,1)_forwards]" />
              </div>
            )}
          </div>
          {text.length > MAX_TEXT * 0.85 && (
            <p className={`pt-1.5 text-sm ${text.length > MAX_TEXT ? "text-margin-red" : "text-ink-muted"}`}>{t.report.charCount(text.length, MAX_TEXT)}</p>
          )}
          <p id="report-hint" className="min-h-6 pt-1.5 text-sm text-margin-red" aria-live="polite">
            {state.status === "too_short" ? t.report.tooShort : state.status === "too_long" || text.length > MAX_TEXT ? t.report.tooLong : null}
          </p>
        </div>

        {/* Always in view, right above the button: safety is felt before submitting (PRODUCT.md §1) */}
        <div className="sticky bottom-0 mt-auto border-t border-rule bg-page/95 px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm">
          {/* «Подпись» is crossed out: this entry is never signed */}
          <p className="flex gap-2.5 pb-4 text-base leading-snug text-pretty text-ink">
            <span className="mt-[0.4em] size-2 shrink-0 rounded-full bg-mint-deep" aria-hidden />
            <span>
              <span className="text-ink-muted line-through decoration-rule-strong">{t.report.signature}</span>{" "}
              <span className="font-medium">{t.report.signatureNotNeeded}.</span> {t.report.trustLine}
            </span>
          </p>
          {state.status === "failed" && (
            <p className="pb-2 text-sm text-margin-red" role="alert">
              {t.report.failed}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="flex h-14 w-full items-center justify-center rounded-xl bg-pen text-lg font-medium text-pen-ink transition-[transform,background-color] duration-150 hover:bg-[#3a3a3a] focus-visible:ring-4 focus-visible:ring-ring/40 focus-visible:outline-none active:scale-[0.99] disabled:cursor-progress disabled:bg-[#3a3a3a]"
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
    <JournalPage wide>
      <JournalHead hospital={hospital} />
      <article className="flex flex-1 flex-col" aria-live="polite">
        <div className="px-5 pt-8 md:px-8">
          <h1 className="text-[1.875rem] leading-[1.12] font-medium tracking-[-0.025em] text-balance md:text-[2.5rem]">{t.report.resultTitle}</h1>
          <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-3">
            <Stamp date={entry.date} />
            <span className="text-base text-ink-muted">{t.shift[entry.shift]}</span>
          </div>
        </div>

        <section className="px-5 pt-8 md:px-8">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="text-lg font-medium text-ink">{showMine ? t.report.textLabel : t.report.keptLabel}</h2>
            <button
              type="button"
              onClick={() => setShowMine((v) => !v)}
              className="text-sm text-ink underline decoration-rule-strong underline-offset-4 hover:decoration-ink focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
            >
              {showMine ? t.report.showKept : t.report.showMine}
            </button>
          </div>
          {!showMine && (
            <p className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-mint px-3.5 py-1.5 text-base font-medium text-ink md:text-lg">
              {t.report.removedCount(entry.removed)}
            </p>
          )}
          <p className="mt-4 rounded-[20px] bg-ground px-5 py-4 text-[1.1875rem] leading-[1.65] whitespace-pre-wrap text-ink md:px-7 md:py-6 md:text-[1.625rem] md:leading-[1.55]">
            {showMine ? original : <RedactedText text={entry.redactedText} />}
          </p>
          <p className="pt-2 text-sm text-ink-muted">
            {showMine ? t.report.mineNote : t.report.removedHint}
          </p>
        </section>

        <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-6 px-5 md:px-8">
          {fields.map(([label, value]) => (
            <div key={label}>
              <dt className="text-sm text-ink-muted">{label}</dt>
              <dd className="mt-1 text-lg leading-snug font-medium text-ink md:text-[1.5rem]">{value}</dd>
            </div>
          ))}
          <div className="col-span-2">
            <dt className="text-sm text-ink-muted">{t.fields.factors}</dt>
            <dd className="mt-1 text-lg leading-snug font-medium text-ink md:text-[1.5rem]">
              {entry.factors.map((f) => t.factor[f]).join(" · ")}
            </dd>
          </div>
        </dl>

        {entry.joinedPattern && (
          <p className="mx-5 mt-8 flex gap-2.5 rounded-xl bg-accent px-4 py-3.5 text-base text-ink md:mx-8">
            <span className="mt-[0.45em] size-2 shrink-0 rounded-full bg-mint-deep" aria-hidden />
            {t.report.joinedPattern}
          </p>
        )}

        <div className="mt-auto px-5 pt-8 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-8">
          <button
            type="button"
            onClick={onAnother}
            className="flex h-14 w-full items-center justify-center rounded-xl border border-rule-strong text-lg font-medium text-ink transition-colors hover:bg-ground focus-visible:ring-4 focus-visible:ring-ring/40 focus-visible:outline-none"
          >
            {t.report.another}
          </button>
        </div>
        <DemoLinks />
      </article>
    </JournalPage>
  );
}

// Dev-only preview of the kept view (app/report/preview). Synthetic entry, nothing is stored.
const PREVIEW_ENTRY: KeptEntry = {
  date: "2026-11-17",
  shift: "night",
  redactedText:
    "Ночью в [ПАЛАТА] медсестра [СОТРУДНИК] чуть не ввела пациенту [ПАЦИЕНТ] Лантус вместо Актрапида — коробки одинаковые и стоят рядом в холодильнике. Заметила перед уколом. [НОМЕР].",
  removed: 4,
  incidentType: "medication",
  stage: "administration",
  harm: "none",
  nearMiss: true,
  factors: ["similar_packaging", "fatigue"],
  summary: "",
  joinedPattern: true,
};

export function KeptPreview({ worst = false }: { worst?: boolean }) {
  return (
    <KeptView
      hospital="A"
      entry={worst ? WORST_KEPT : PREVIEW_ENTRY}
      original="(синтетический пример — исходного текста в превью нет)"
      onAnother={() => {}}
    />
  );
}
