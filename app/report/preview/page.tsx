import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DevDataToggle } from "@/components/dev-data-toggle";
import { devData } from "@/lib/dev-fixtures";
import { KeptPreview } from "../report-journal";

// HACK: dev-only screenshot fixture for the result screen (review captures, break-ui). 404 in production.
export default function ReportPreviewPage({ searchParams }: PageProps<"/report/preview">) {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="flex min-h-dvh flex-1 flex-col bg-ground md:items-center md:px-4 md:py-10">
      <Suspense>
        <Preview searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Preview({ searchParams }: Pick<PageProps<"/report/preview">, "searchParams">) {
  const worst = devData((await searchParams).data) === "worst";
  return (
    <>
      <KeptPreview worst={worst} />
      <DevDataToggle states={[["", "Демо"], ["worst", "Худший случай"]]} />
    </>
  );
}
