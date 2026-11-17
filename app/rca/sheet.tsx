import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { t } from "@/lib/i18n";

/** The analysis spread: the case on the left page, the analysis on the right (DESIGN.md journal). */
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
    <main className="flex min-h-dvh flex-1 flex-col bg-ground lg:px-6 lg:py-8">
      <div className="mx-auto flex w-full max-w-[92rem] flex-1 flex-col bg-page lg:flex-none lg:rounded-[3px] lg:shadow-[0_1px_2px_rgb(0_0_0/0.06),0_18px_40px_-16px_rgb(0_0_0/0.22)]">
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
          <span className="font-semibold tracking-tight text-ink-muted">{t.app.name}</span>
        </header>
        <div className="grid flex-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <section className="relative border-b border-rule lg:border-b-0">
            <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 hidden w-16 bg-[linear-gradient(to_left,rgb(0_0_0/0.09),transparent)] lg:block dark:bg-[linear-gradient(to_left,rgb(0_0_0/0.45),transparent)]" />
            {left}
          </section>
          <section className="relative min-w-0">
            <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 hidden w-12 bg-[linear-gradient(to_right,rgb(0_0_0/0.07),transparent)] lg:block dark:bg-[linear-gradient(to_right,rgb(0_0_0/0.35),transparent)]" />
            {right}
          </section>
        </div>
      </div>
    </main>
  );
}

export function SheetSkeleton() {
  return (
    <main className="flex min-h-dvh flex-1 flex-col bg-ground lg:px-6 lg:py-8" aria-hidden>
      <div className="mx-auto grid w-full max-w-[92rem] flex-1 gap-8 bg-page p-8 lg:flex-none lg:grid-cols-[5fr_7fr] lg:rounded-[3px]">
        <div className="h-96 rounded-sm bg-muted" />
        <div className="h-96 rounded-sm bg-muted" />
      </div>
    </main>
  );
}
