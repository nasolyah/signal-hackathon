import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { t } from "@/lib/i18n";

/**
 * The analysis spread: the case on the left page, the analysis on the right (DESIGN.md journal).
 * On laptops the two pages scroll independently under a fixed running head, so the presenter
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
  return (
    <main className="flex min-h-dvh flex-1 flex-col bg-ground lg:h-dvh lg:min-h-0 lg:flex-none lg:overflow-hidden lg:px-6 lg:py-6">
      <div className="mx-auto flex w-full max-w-[92rem] flex-1 flex-col bg-page lg:min-h-0 lg:rounded-[3px] lg:shadow-[0_1px_2px_rgb(0_0_0/0.06),0_18px_40px_-16px_rgb(0_0_0/0.22)]">
        <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-rule px-5 py-3 text-sm lg:px-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-pen underline decoration-pen/40 underline-offset-4 hover:decoration-pen focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
          >
            <ArrowLeft className="size-4" aria-hidden /> {t.rcaUi.back}
          </Link>
          <p className="text-ink">
            <span className="font-semibold">{head}</span>
            <span className="ml-3 text-ink-muted">
              {t.rcaUi.status}: {t.status[status as keyof typeof t.status] ?? (status === "open" ? t.status.new : status)}
            </span>
          </p>
          <p className="flex items-baseline gap-4">
            <span className="whitespace-nowrap text-ink-muted">{t.dashboard.synthetic}</span>
            <span className="font-semibold tracking-tight text-ink-muted">{t.app.name}</span>
          </p>
        </header>
        {/* Spine: the journal's own double rule at the gutter (Flat Page Rule — no shadows) */}
        <div className="grid flex-1 lg:min-h-0 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <section className="relative border-b border-rule lg:overflow-y-auto lg:border-r lg:border-b-0 lg:[scrollbar-gutter:stable]">
            {left}
          </section>
          <section className="relative min-w-0 lg:overflow-y-auto lg:border-l lg:border-rule lg:[margin-left:3px] lg:[scrollbar-gutter:stable]">
            {right}
          </section>
        </div>
      </div>
    </main>
  );
}

export function SheetSkeleton() {
  return (
    <main className="flex min-h-dvh flex-1 flex-col bg-ground lg:px-6 lg:py-6" aria-hidden>
      <div className="mx-auto grid w-full max-w-[92rem] flex-1 gap-8 bg-page p-8 lg:flex-none lg:grid-cols-[5fr_7fr] lg:rounded-[3px]">
        <div className="h-96 rounded-sm bg-muted" />
        <div className="h-96 rounded-sm bg-muted" />
      </div>
    </main>
  );
}
