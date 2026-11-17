import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { t } from "@/lib/i18n";
import { HOSPITAL_CODES, type HospitalCode } from "@/lib/taxonomy";
import { tashkentDate, tashkentShift } from "@/lib/time";
import { JournalHead, JournalPage } from "./journal-chrome";
import { ReportJournal } from "./report-journal";

export const metadata: Metadata = {
  title: `${t.report.title} · ${t.app.name}`,
  description: t.app.tagline,
};

export default function ReportPage({ searchParams }: PageProps<"/report">) {
  return (
    <main className="flex min-h-dvh flex-1 flex-col bg-ground md:items-center md:px-4 md:py-10">
      <Suspense fallback={<JournalSkeleton />}>
        <ReportLoader searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function ReportLoader({ searchParams }: Pick<PageProps<"/report">, "searchParams">) {
  const { h } = await searchParams;
  const code = typeof h === "string" ? h.trim().toUpperCase() : "";
  if (!(HOSPITAL_CODES as readonly string[]).includes(code)) return <NoHospital />;
  await connection(); // today's date and shift are request-time values, never prerendered
  return (
    <ReportJournal hospital={code as HospitalCode} today={tashkentDate()} defaultShift={tashkentShift()} />
  );
}

function NoHospital() {
  return (
    <JournalPage>
      <JournalHead />
      <div className="flex flex-1 flex-col gap-6 px-5 py-8">
        <h1 className="text-[1.75rem] leading-tight font-semibold text-balance">{t.report.title}</h1>
        <p className="max-w-[34ch] text-lg text-ink-muted">{t.report.noHospital}</p>
      </div>
    </JournalPage>
  );
}

function JournalSkeleton() {
  return (
    <JournalPage>
      <JournalHead />
      <div className="flex flex-1 flex-col gap-5 px-5 py-6" aria-hidden>
        <div className="h-8 w-4/5 rounded-sm bg-muted" />
        <div className="h-14 rounded-sm bg-muted" />
        <div className="ruled h-64 rounded-sm" />
      </div>
    </JournalPage>
  );
}
