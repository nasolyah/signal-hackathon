import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n";
import { getRca } from "@/lib/rca-store";
import type { Department, Factor, Harm, HospitalCode, IncidentType, Shift, Stage } from "@/lib/taxonomy";
import { formatDateRu } from "@/lib/time";
import { RedactedText } from "@/app/report/redacted-text";
import { RcaPanel } from "@/app/rca/rca-panel";
import { RcaSheet, SheetSkeleton } from "@/app/rca/sheet";
import { Classification } from "./classification";

export const metadata: Metadata = { title: `${t.rcaUi.incidentHead} · ${t.app.name}` };

export default function IncidentPage({ params }: PageProps<"/incident/[id]">) {
  return (
    <Suspense fallback={<SheetSkeleton />}>
      <Incident params={params} />
    </Suspense>
  );
}

const UUID = /^[0-9a-f-]{36}$/i;

type Row = {
  id: string;
  hospital_id: HospitalCode;
  department: Department | null;
  shift: Shift;
  incident_date: string;
  redacted_text: string;
  redaction_count: number;
  incident_type: IncidentType;
  stage: Stage;
  harm: Harm;
  near_miss: boolean;
  factors: Factor[];
  status: string;
  human_verified: boolean;
  pattern_id: string | null;
};

async function Incident({ params }: Pick<PageProps<"/incident/[id]">, "params">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const sb = db();
  const [{ data }, rca] = await Promise.all([
    sb
      .from("incidents")
      .select("id, hospital_id, department, shift, incident_date, redacted_text, redaction_count, incident_type, stage, harm, near_miss, factors, status, human_verified, pattern_id")
      .eq("id", id)
      .maybeSingle(),
    getRca({ kind: "incident", id }),
  ]);
  if (!data) notFound();
  const r = data as Row;
  const { data: pattern } = r.pattern_id
    ? await sb.from("patterns").select("id, title").eq("id", r.pattern_id).maybeSingle()
    : { data: null };
  const h = t.hospitals[r.hospital_id];

  return (
    <RcaSheet
      head={t.rcaUi.incidentHead}
      status={r.status}
      left={
        <div className="px-5 pt-10 pb-12 lg:px-10 lg:pt-12">
          <dl className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
            {[
              [t.report.date, formatDateRu(r.incident_date)],
              [t.dashboard.columns.hospital, `${h.name} · ${h.region}`],
              [t.report.shift, t.shift[r.shift]],
              ...(r.department ? [[t.report.department, t.departments[r.department]]] : []),
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-ink-muted">{label}</dt>
                <dd className="mt-0.5 text-base text-ink">{value}</dd>
              </div>
            ))}
          </dl>

          <h1 className="mt-10 text-[1.75rem] leading-[1.15] font-medium tracking-[-0.02em] text-ink lg:text-[2.25rem]">{t.rcaUi.whatHappened}</h1>
          <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-page px-3 py-1 text-sm text-ink">
            <span className="size-2 rounded-full bg-mint-deep" aria-hidden />
            {t.report.removedCount(r.redaction_count)}
          </p>
          <p className="mt-5 rounded-[20px] bg-page px-6 py-5 text-[1.125rem] leading-[1.7] text-ink">
            <RedactedText text={r.redacted_text} />
          </p>

          {pattern && (
            <p className="mt-5 text-sm text-ink-muted">
              {t.rcaUi.partOfPattern}:{" "}
              <Link
                href={`/pattern/${pattern.id}`}
                className="font-medium text-ink underline decoration-rule-strong underline-offset-4 hover:decoration-ink focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
              >
                {pattern.title}
              </Link>
            </p>
          )}

          <div className="mt-12">
            <Classification
              id={r.id}
              verified={r.human_verified}
              initial={{ incident_type: r.incident_type, stage: r.stage, harm: r.harm, near_miss: r.near_miss, factors: r.factors }}
            />
          </div>
        </div>
      }
      right={<RcaPanel target={{ kind: "incident", id }} initial={rca} status={r.status} />}
    />
  );
}
