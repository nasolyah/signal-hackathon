import Link from "next/link";
import { t } from "@/lib/i18n";
import type { HospitalCode } from "@/lib/taxonomy";

/** The journal page itself: full-bleed on phones, a single sheet on a laptop (wider for the result). */
export function JournalPage({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div
      className={`flex min-h-dvh w-full flex-1 flex-col bg-page md:min-h-0 md:flex-none md:rounded-[3px] md:shadow-[0_1px_2px_rgb(0_0_0/0.06),0_18px_40px_-16px_rgb(0_0_0/0.22)] ${wide ? "md:max-w-[48rem]" : "md:max-w-[40rem]"}`}
    >
      {children}
    </div>
  );
}

/** Printed running head of the journal page: «Журнал · Больница А · Ташкент», product mark on the right. */
export function JournalHead({ hospital }: { hospital?: HospitalCode }) {
  const h = hospital ? t.hospitals[hospital] : null;
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-rule px-5 py-3 text-sm">
      <span className="text-ink">
        <span className="font-semibold">{t.report.journal}</span>
        {h && (
          <>
            {" · "}
            {h.name} · {h.region}
          </>
        )}
      </span>
      <span className="font-semibold tracking-tight text-ink-muted">{t.app.name}</span>
    </div>
  );
}

// HACK: demo navigation between roles until the real header exists (SPEC §2: role switcher).
export function DemoLinks() {
  return (
    <nav className="flex gap-4 px-5 pb-4 text-xs text-ink-muted">
      <span>{t.report.demoLinks}</span>
      <Link className="underline hover:text-ink" href="/dashboard">
        {t.roles.ministry}
      </Link>
    </nav>
  );
}
