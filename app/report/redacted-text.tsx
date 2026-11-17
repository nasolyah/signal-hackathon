import { t } from "@/lib/i18n";

const PLACEHOLDER = /(\[(?:ПАЦИЕНТ|СОТРУДНИК|ПАЛАТА|НОМЕР|ДАТА)\])/;

/** Stored text with every removed piece of personal data boxed out in red pencil. */
export function RedactedText({ text }: { text: string }) {
  const parts = text.split(PLACEHOLDER);
  return (
    <>
      {parts.map((part, i) =>
        PLACEHOLDER.test(part) ? (
          <span
            key={i}
            className="mx-px inline-block rounded-[2px] border-[1.5px] border-margin-red px-1.5 align-baseline text-[0.85em] leading-[1.3] font-semibold tracking-wide text-margin-red [background:repeating-linear-gradient(-45deg,var(--redact-fill)_0_3px,transparent_3px_7px)] md:border-2"
          >
            <span className="sr-only">удалено: </span>
            {t.redaction[part] ?? "удалено"}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}
