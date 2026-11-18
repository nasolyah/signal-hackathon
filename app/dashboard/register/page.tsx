import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { AppBar, SecondaryLink } from "@/components/app-bar";
import { REGISTER_PAGE_SIZE, registerPage } from "@/lib/dashboard";
import { t } from "@/lib/i18n";
import { HARMS, HOSPITAL_CODES, INCIDENT_TYPES, SHIFTS, type Harm, type HospitalCode, type IncidentType, type Shift } from "@/lib/taxonomy";
import { FilterSelect } from "../filters";
import { RegisterTable } from "../register-table";

export const metadata: Metadata = { title: `${t.dashboard.register} · ${t.app.name}` };

export default function RegisterPage({ searchParams }: PageProps<"/dashboard/register">) {
  return (
    <main className="flex min-h-dvh flex-1 flex-col bg-page">
      <Suspense fallback={<Skeleton />}>
        <Register searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

function pick<T extends string>(v: string | string[] | undefined, allowed: readonly T[]): T | undefined {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : undefined;
}

async function Register({ searchParams }: Pick<PageProps<"/dashboard/register">, "searchParams">) {
  const sp = await searchParams;
  const f = {
    hospital: pick<HospitalCode>(sp.h, HOSPITAL_CODES),
    type: pick<IncidentType>(sp.type, INCIDENT_TYPES),
    harm: pick<Harm>(sp.harm, HARMS),
    shift: pick<Shift>(sp.shift, SHIFTS),
  };
  const asked = Number(typeof sp.page === "string" ? sp.page : 1);
  const page = Number.isInteger(asked) && asked > 0 && asked < 10_000 ? asked : 1;
  const { rows, total } = await registerPage(f, page);
  const pages = Math.max(1, Math.ceil(total / REGISTER_PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * REGISTER_PAGE_SIZE + 1;
  const to = Math.min(total, page * REGISTER_PAGE_SIZE);
  const filtered = Boolean(f.hospital || f.type || f.harm || f.shift);

  // Links keep the filters; only the page changes.
  const href = (p: number) => {
    const q = new URLSearchParams();
    if (f.hospital) q.set("h", f.hospital);
    if (f.type) q.set("type", f.type);
    if (f.harm) q.set("harm", f.harm);
    if (f.shift) q.set("shift", f.shift);
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return s ? `/dashboard/register?${s}` : "/dashboard/register";
  };
  const back = f.hospital ? `/dashboard?h=${f.hospital}` : "/dashboard";

  return (
    <>
      <AppBar place={t.dashboard.register} role="ministry">
        <SecondaryLink href={back}>
          <ArrowLeft className="size-4" aria-hidden /> <span className="hidden sm:inline">{t.rcaUi.back}</span>
        </SecondaryLink>
      </AppBar>

      <div className="mx-auto w-full max-w-[76rem] px-5 pb-24 lg:px-10">
        <div className="pt-10 pb-8 lg:pt-14">
          <h1 className="text-[2rem] leading-[1.1] font-medium tracking-[-0.025em] text-ink lg:text-[2.75rem]">{t.dashboard.register}</h1>
          <p className="mt-2 text-base text-ink-muted">{t.dashboard.registerPageHint}</p>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <FilterSelect
            name="h"
            label={t.dashboard.hospitalFilter}
            value={f.hospital ?? ""}
            anyLabel={t.dashboard.any}
            options={HOSPITAL_CODES.map((c) => [c, `${t.hospitals[c].name} · ${t.hospitals[c].region}`])}
          />
          <FilterSelect name="type" label={t.dashboard.filterType} value={f.type ?? ""} anyLabel={t.dashboard.any} options={INCIDENT_TYPES.map((k) => [k, t.incidentType[k]])} />
          <FilterSelect name="harm" label={t.dashboard.filterHarm} value={f.harm ?? ""} anyLabel={t.dashboard.any} options={HARMS.map((k) => [k, t.harm[k]])} />
          <FilterSelect name="shift" label={t.dashboard.filterShift} value={f.shift ?? ""} anyLabel={t.dashboard.any} options={SHIFTS.map((k) => [k, t.shift[k]])} />
          {filtered && (
            <Link href="/dashboard/register" className="text-sm text-ink-muted underline decoration-rule-strong underline-offset-4 hover:text-ink">
              {t.dashboard.reset}
            </Link>
          )}
        </div>

        <p className="mt-8 text-sm text-ink-muted">{t.dashboard.found(total)}</p>

        {rows.length === 0 ? (
          <p className="mt-4 rounded-[20px] bg-ground px-8 py-10 text-base text-ink-muted">{t.dashboard.feedEmpty}</p>
        ) : (
          <div className="mt-2">
            <RegisterTable rows={rows} showShift />
          </div>
        )}

        {total > 0 && (
          <nav aria-label={t.dashboard.register} className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <span className="text-sm text-ink-muted">{t.dashboard.pageOf(from, to, total)}</span>
            {pages > 1 && (
              <span className="flex gap-3">
                {page > 1 ? (
                  <SecondaryLink href={href(page - 1)}>
                    <ArrowLeft className="size-4" aria-hidden /> {t.dashboard.prev}
                  </SecondaryLink>
                ) : null}
                {page < pages ? (
                  <SecondaryLink href={href(page + 1)}>
                    {t.dashboard.next} <ArrowRight className="size-4" aria-hidden />
                  </SecondaryLink>
                ) : null}
              </span>
            )}
          </nav>
        )}
      </div>
    </>
  );
}

function Skeleton() {
  return (
    <div className="mx-auto flex w-full max-w-[76rem] flex-col gap-6 px-5 pt-24 lg:px-10" aria-hidden>
      <div className="h-10 w-1/3 rounded-lg bg-ground" />
      <div className="h-10 w-2/3 rounded-lg bg-ground" />
      <div className="h-96 rounded-[20px] bg-ground" />
    </div>
  );
}
