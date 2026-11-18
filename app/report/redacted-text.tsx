import { t } from "@/lib/i18n";

const PLACEHOLDER = /(\[(?:ПАЦИЕНТ|СОТРУДНИК|ПАЛАТА|НОМЕР|ДАТА)\])/;

/** Stored text with every removed piece of personal data marked in mint, as on the landing. */
export function RedactedText({ text }: { text: string }) {
  const parts = text.split(PLACEHOLDER);
  return (
    <>
      {parts.map((part, i) =>
        PLACEHOLDER.test(part) ? (
          <span
            key={i}
            className="mx-px inline-block rounded-md bg-mint/70 px-1.5 align-baseline text-[0.85em] leading-[1.35] font-medium text-ink"
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
