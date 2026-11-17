import type { Metadata } from "next";
import QRCode from "qrcode";
import { t } from "@/lib/i18n";
import { HOSPITAL_CODES, type HospitalCode } from "@/lib/taxonomy";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: `${t.qr.title} · ${t.app.name}` };

// Codes always point at production: mentors scan them with their own phones.
const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://signal-hackathon.vercel.app").replace(/\/$/, "");
const reportUrl = (h: HospitalCode) => `${SITE}/report?h=${h}`;

/** Dark journal ink on light paper — always, even in dark mode: inverted codes fail on some cameras. */
async function qrSvg(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#1d2a4a", light: "#00000000" },
  });
}

export default async function QrPage() {
  "use cache";
  const codes = await Promise.all(HOSPITAL_CODES.map(async (h) => ({ h, svg: await qrSvg(reportUrl(h)) })));
  const lead = codes[0];

  return (
    <main className="flex min-h-dvh flex-1 flex-col bg-ground print:bg-white lg:px-6 lg:py-8 print:p-0">
      <div className="mx-auto w-full max-w-[72rem] bg-page lg:rounded-[3px] lg:shadow-[0_1px_2px_rgb(0_0_0/0.06),0_18px_40px_-16px_rgb(0_0_0/0.22)] print:max-w-none print:bg-white print:shadow-none">
        <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-rule px-5 py-3 text-sm lg:px-8 print:hidden">
          <p className="text-ink">
            <span className="font-semibold">{t.qr.title}</span>
            <span className="ml-3 text-ink-muted">{t.qr.hint}</span>
          </p>
          <div className="flex items-baseline gap-5">
            <PrintButton label={t.qr.print} />
            <span className="font-semibold tracking-tight text-ink-muted">{t.app.name}</span>
          </div>
        </header>

        {/* The demo sheet: one large code for Hospital A, readable from across a table */}
        <section className="print:hidden">
          <Sheet h={lead.h} svg={lead.svg} size="lg" note={t.qr.demo} />
        </section>

        {/* Printable sheets: one hospital per page */}
        <section className="grid border-t border-rule sm:grid-cols-2 lg:grid-cols-3 print:block print:border-0">
          {codes.map(({ h, svg }) => (
            <div key={h} className="border-r border-b border-rule print:break-after-page print:border-0 print:last:break-after-auto">
              <Sheet h={h} svg={svg} size="sm" />
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}

function Sheet({ h, svg, size, note }: { h: HospitalCode; svg: string; size: "lg" | "sm"; note?: string }) {
  const hospital = t.hospitals[h];
  const lg = size === "lg";
  return (
    <article
      className={`flex flex-col items-center text-center ${lg ? "gap-5 px-6 py-10 md:flex-row md:items-center md:gap-12 md:px-12 md:text-left" : "gap-4 px-6 py-8 print:min-h-[95vh] print:justify-center print:gap-8"}`}
    >
      {/* Light paper behind the code in every theme */}
      <div
        className={`shrink-0 rounded-[6px] bg-[#f6f8f6] ${lg ? "p-5" : "p-4 print:p-0"}`}
        aria-hidden
      >
        <div
          className={`[&_svg]:block [&_svg]:size-full ${lg ? "size-[min(70vw,20rem)]" : "size-44 print:size-[11cm]"}`}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
      <div className={lg ? "max-w-[30rem]" : "max-w-[22rem] print:max-w-[16cm]"}>
        {note && <p className="pb-2 text-sm font-semibold text-margin-red">{note}</p>}
        <h2 className={`leading-[1.15] font-semibold text-balance ${lg ? "text-[2rem]" : "text-lg print:text-[2rem]"}`}>
          {t.qr.sheetTitle}
        </h2>
        <p className={`mt-2 text-ink ${lg ? "text-lg" : "text-sm print:text-xl"}`}>
          {hospital.name} · {hospital.region}
        </p>
        <p className={`mt-3 text-ink ${lg ? "text-base" : "hidden print:block print:text-lg"}`}>{t.qr.sheetText}</p>
        <p className={`mt-1 text-ink-muted ${lg ? "text-base" : "hidden print:block print:text-lg"}`}>{t.qr.sheetTrust}</p>
        <p className={`mt-3 font-mono text-xs break-all text-ink-muted ${lg ? "" : "print:text-sm"}`}>
          {reportUrl(h).replace(/^https:\/\//, "")}
        </p>
      </div>
    </article>
  );
}
