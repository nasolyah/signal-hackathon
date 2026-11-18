import type { Shift } from "@/lib/taxonomy";

// Hospitals are in Uzbekistan: day/shift are computed in Asia/Tashkent, never the server's zone.
// Privacy: we keep date + shift only, never the exact time (CLAUDE.md rule 3).
const TZ = "Asia/Tashkent";

/** YYYY-MM-DD in Tashkent. */
export function tashkentDate(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Day shift 08:00–20:00 Tashkent time, otherwise night. */
export function tashkentShift(d: Date = new Date()): Shift {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hourCycle: "h23" }).format(d),
  );
  return hour >= 8 && hour < 20 ? "day" : "night";
}

/** 2026-11-17 → 17.11.2026 */
export function formatDateRu(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

/** «18.11 14:05» in Tashkent time — for sent/read stamps of digests (not for reports: rule 3). */
export function formatStampRu(iso: string): string {
  return new Intl.DateTimeFormat("ru-RU", { timeZone: "Asia/Tashkent", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)).replace(",", "");
}

/** «12 мин», «5 ч», «3 дн» — reaction time for the district screen. */
export function formatSpanRu(hours: number): string {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} мин`;
  if (hours < 48) return `${Math.round(hours)} ч`;
  return `${Math.round(hours / 24)} дн`;
}
