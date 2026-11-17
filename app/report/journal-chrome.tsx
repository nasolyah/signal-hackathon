import Link from "next/link";
import { t } from "@/lib/i18n";
import type { HospitalCode } from "@/lib/taxonomy";

/** The journal page itself: full-bleed on phones, a single sheet on a laptop. */
export function JournalPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh w-full flex-1 flex-col bg-page md:min-h-0 md:max-w-[40rem] md:flex-none md:rounded-[3px] md:shadow-[0_1px_2px_rgb(0_0_0/0.06),0_18px_40px_-16px_rgb(0_0_0/0.22)]">
      {children}
    </div>
  );
}

/** Printed head of the journal page: product name, and the hospital the QR code belongs to. */
export function JournalHead({ hospital }: { hospital?: HospitalCode }) {
  const h = hospital ? t.hospitals[hospital] : null;
  return (
    <div className="flex items-center justify-between gap-3 border-b border-rule px-5 py-3 text-sm">
      <span className="font-semibold tracking-tight">
        {t.app.name}
        <span className="font-normal text-ink-muted"> · {t.report.journal}</span>
      </span>
      {h && (
        <span className="rounded-full border border-rule-strong px-2.5 py-0.5 text-ink">
          {h.name} · {h.region}
        </span>
      )}
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
