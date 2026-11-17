import { notFound } from "next/navigation";
import { KeptPreview } from "../report-journal";

// HACK: dev-only screenshot fixture for the result screen (review captures, break-ui). 404 in production.
export default function ReportPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="flex min-h-dvh flex-1 flex-col bg-ground md:items-center md:px-4 md:py-10">
      <KeptPreview />
    </main>
  );
}
