// Step 0 — local pre-scrub (SPEC §4). Runs on our server BEFORE any AI call,
// so ward numbers, record numbers, phones and exact dates never leave the server.

// JS \b is ASCII-only, so use Unicode-aware boundaries for Cyrillic.
const L = "(?<![\\p{L}\\d])";
const R = "(?![\\p{L}\\d])";

const MONTHS =
  "января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря|" +
  "yanvar|fevral|mart|aprel|may|iyun|iyul|avgust|sentabr|oktabr|noyabr|dekabr";

type Rule = { re: RegExp; placeholder: string };

const RULES: Rule[] = [
  // Medical record numbers: «ИБ-45821», «ИБ №45821», «история болезни № 45821», «карта №123»
  {
    re: new RegExp(
      `${L}(?:ИБ\\s*[-№]?\\s*\\d+|истори[яиюей]\\s+болезни\\s*№?\\s*\\d+|(?:мед\\.?\\s*)?карт[аыуе]\\s*№\\s*\\d+)${R}`,
      "giu",
    ),
    placeholder: "[НОМЕР]",
  },
  // Phones: +998 90 123 45 67, 90-123-45-67, (90) 123-45-67
  {
    re: /(?:\+?998[\s-]?)?\(?\d{2}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}(?!\d)/g,
    placeholder: "[НОМЕР]",
  },
  // Wards: «палата 12», «палате №12», «в 12-й палате», «12-палата», «palata 5»
  {
    re: new RegExp(
      `${L}(?:(?:палат[а-яё]*|palata[a-z'ʻ’]*)\\s*№?\\s*\\d+[а-яa-z]?|\\d+\\s*-?\\s*(?:я|й|ю)?\\s*(?:палат[а-яё]*|palata[a-z'ʻ’]*))${R}`,
      "giu",
    ),
    placeholder: "[ПАЛАТА]",
  },
  // Full dates: 12.03.2026, 12/03/26, 2026-03-12
  {
    re: new RegExp(`${L}(?:\\d{1,2}[./]\\d{1,2}[./]\\d{2,4}|\\d{4}-\\d{2}-\\d{2})${R}`, "gu"),
    placeholder: "[ДАТА]",
  },
  // Dates with month names: «12 марта», «12-го марта 2026 г.», «5 mart»
  {
    re: new RegExp(
      `${L}\\d{1,2}(?:-?го)?\\s+(?:${MONTHS})(?:\\s+\\d{4}(?:\\s*(?:г\\.|года?))?)?${R}`,
      "giu",
    ),
    placeholder: "[ДАТА]",
  },
  // Exact times: 03:40, 3.40 is left alone (could be a dose)
  { re: new RegExp(`${L}\\d{1,2}:\\d{2}${R}`, "gu"), placeholder: "[ДАТА]" },
  // Short dates: 12.03 — valid day.month only, so doses like 0.25 or 2.5 survive
  {
    re: new RegExp(
      `(?<![\\p{L}\\d.])(?:0?[1-9]|[12]\\d|3[01])\\.(?:0[1-9]|1[0-2])(?![\\d.])`,
      "gu",
    ),
    placeholder: "[ДАТА]",
  },
];

export function preScrub(text: string): { text: string; count: number } {
  let out = text;
  let count = 0;
  for (const { re, placeholder } of RULES) {
    out = out.replace(re, () => {
      count += 1;
      return placeholder;
    });
  }
  return { text: out, count };
}

/** Number of placeholder tokens in a text (used to cross-check the AI's count). */
export function countPlaceholders(text: string): number {
  return text.match(/\[(?:ПАЦИЕНТ|СОТРУДНИК|ПАЛАТА|НОМЕР|ДАТА)\]/g)?.length ?? 0;
}
