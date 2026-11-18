import Link from "next/link";
import { t } from "@/lib/i18n";
import { RingMark } from "@/components/app-bar";
import type { HospitalCode } from "@/lib/taxonomy";

/** The report page: full-bleed white on phones, one rounded card on the grey ground on a laptop (wider for the result). */
export function JournalPage({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div
      className={`flex min-h-dvh w-full flex-1 flex-col bg-page md:min-h-0 md:flex-none md:overflow-hidden md:rounded-[20px] md:shadow-[0_1px_2px_rgb(0_0_0/0.04),0_24px_48px_-24px_rgb(0_0_0/0.18)] ${wide ? "md:max-w-[48rem]" : "md:max-w-[40rem]"}`}
    >
      {children}
    </div>
  );
}

/** The page's head: the mark and name on the left, the hospital on the right — as the landing's nav. */
export function JournalHead({ hospital }: { hospital?: HospitalCode }) {
  const h = hospital ? t.hospitals[hospital] : null;
  return (
    <div className="flex h-14 items-center justify-between gap-3 border-b border-rule px-5 text-sm">
      <span className="flex items-center gap-2 text-base font-medium tracking-tight text-ink">
        <RingMark className="size-5 text-mint-deep" />
        {t.app.name}
      </span>
      {h && (
        <span className="truncate text-ink-muted">
          {h.name} · {h.region}
        </span>
      )}
    </div>
  );
}

// HACK: demo navigation between roles until the real header exists (SPEC §2: role switcher).
export function DemoLinks() {
  return (
    <nav className="flex gap-4 px-5 pb-5 text-sm text-ink-muted">
      <span>{t.report.demoLinks}</span>
      <Link className="underline decoration-rule-strong underline-offset-4 hover:text-ink" href="/dashboard">
        {t.roles.ministry}
      </Link>
    </nav>
  );
}
