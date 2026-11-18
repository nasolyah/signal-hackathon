import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { t } from "@/lib/i18n";
import { AppBar } from "@/components/app-bar";

/**
 * The analysis spread in the landing's world: the case on a grey surface on the left, the analysis on
 * white on the right. On laptops the two sides scroll independently under the app bar, so the presenter
 * scrolls the analysis while the case stays in view.
 */
export function RcaSheet({
  head,
  status,
  left,
  right,
}: {
  head: string;
  status: string;
  left: React.ReactNode;
  right: React.ReactNode;
}) {
  const statusLabel = t.status[status as keyof typeof t.status] ?? (status === "open" ? t.status.new : status);
  return (
    <main className="flex min-h-dvh flex-1 flex-col bg-page lg:h-dvh lg:min-h-0 lg:flex-none lg:overflow-hidden">
      <AppBar place={head} wide>
        <span className="hidden items-center gap-2 rounded-full bg-ground px-3 py-1 text-sm text-ink sm:inline-flex">
          <span className="size-2 rounded-full bg-mint-deep" aria-hidden />
          {t.rcaUi.status}: {statusLabel}
        </span>
        <Link
          href="/dashboard"
          aria-label={t.rcaUi.back}
          className="inline-flex size-10 items-center justify-center gap-2 rounded-lg border border-rule-strong text-sm font-medium text-ink transition-colors hover:bg-ground focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none sm:w-auto sm:px-4"
        >
          <ArrowLeft className="size-4" aria-hidden /> <span className="hidden sm:inline">{t.rcaUi.back}</span>
        </Link>
      </AppBar>
      <div className="grid flex-1 grid-cols-[minmax(0,1fr)] [overflow-wrap:anywhere] lg:min-h-0 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="relative bg-ground lg:overflow-y-auto lg:[scrollbar-gutter:stable]">{left}</section>
        <section className="relative min-w-0 lg:overflow-y-auto lg:[scrollbar-gutter:stable]">{right}</section>
      </div>
    </main>
  );
}

export function SheetSkeleton() {
  return (
    <main className="flex min-h-dvh flex-1 flex-col bg-page" aria-hidden>
      <div className="h-16 border-b border-rule" />
      <div className="grid flex-1 lg:grid-cols-[5fr_7fr]">
        <div className="bg-ground p-10"><div className="h-10 w-2/3 rounded-lg bg-page" /></div>
        <div className="p-10"><div className="h-64 rounded-[20px] bg-ground" /></div>
      </div>
    </main>
  );
}
