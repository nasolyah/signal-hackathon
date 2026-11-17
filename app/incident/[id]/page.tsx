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
        <div className="pb-8">
          <div className="grid grid-cols-3 border-b border-rule text-sm">
            {[
              [t.report.date, formatDateRu(r.incident_date)],
              [t.dashboard.columns.hospital, `${h.name} · ${h.region}`],
              [t.report.shift, t.shift[r.shift]],
            ].map(([label, value]) => (
              <div key={label} className="border-r border-rule px-5 py-2.5 last:border-r-0 lg:px-6">
                <div className="text-xs text-ink-muted">{label}</div>
                <div className="mt-0.5 text-base text-ink">{value}</div>
              </div>
            ))}
          </div>
          {r.department && (
            <p className="border-b border-rule px-5 py-2.5 text-sm lg:px-8">
              <span className="text-xs text-ink-muted">{t.report.department}: </span>
              {t.departments[r.department]}
            </p>
          )}
          <div className="pt-5">
            <h1 className="px-5 pb-1 text-[1.75rem] leading-tight font-semibold lg:px-8">{t.rcaUi.whatHappened}</h1>
            <p className="px-5 pb-1 text-sm font-semibold text-margin-red lg:px-8">{t.report.removedCount(r.redaction_count)}</p>
            <p className="ruled pr-5 pl-12 text-[1.125rem] text-ink lg:pr-8">
              <RedactedText text={r.redacted_text} />
            </p>
          </div>
          {pattern && (
            <p className="mt-4 px-5 text-sm lg:px-8">
              <span className="text-ink-muted">{t.rcaUi.partOfPattern}: </span>
              <Link
                href={`/pattern/${pattern.id}`}
                className="text-pen underline decoration-pen/40 underline-offset-4 hover:decoration-pen focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
              >
                {pattern.title}
              </Link>
            </p>
          )}
          <div className="mt-5">
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
