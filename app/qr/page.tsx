import type { Metadata } from "next";
import QRCode from "qrcode";
import { t } from "@/lib/i18n";
import { HOSPITAL_CODES, type HospitalCode } from "@/lib/taxonomy";
import { PrintButton } from "./print-button";
import { AppBar } from "@/components/app-bar";

export const metadata: Metadata = { title: `${t.qr.title} · ${t.app.name}` };

// Codes always point at production: mentors scan them with their own phones.
const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://signal-hackathon.vercel.app").replace(/\/$/, "");
const reportUrl = (h: HospitalCode) => `${SITE}/report?h=${h}`;

/** Graphite on white — always: inverted codes fail on some cameras. */
async function qrSvg(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#232323", light: "#00000000" },
  });
}

export default async function QrPage() {
  "use cache";
  const codes = await Promise.all(HOSPITAL_CODES.map(async (h) => ({ h, svg: await qrSvg(reportUrl(h)) })));
  const lead = codes[0];

  return (
    <main className="flex min-h-dvh flex-1 flex-col bg-page print:bg-white">
      <AppBar place={t.qr.title}>
        <PrintButton label={t.qr.print} />
      </AppBar>
      <div className="mx-auto w-full max-w-[76rem] px-5 pb-20 lg:px-10 print:max-w-none print:p-0">
        <p className="pt-8 text-base text-ink-muted print:hidden">{t.qr.hint}</p>

        {/* The demo sheet: one large code for Hospital A, readable from across a table */}
        <section className="mt-6 rounded-[20px] bg-ground print:hidden">
          <Sheet h={lead.h} svg={lead.svg} size="lg" note={t.qr.demo} />
        </section>

        {/* Printable sheets: one hospital per page */}
        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 print:block">
          {codes.map(({ h, svg }) => (
            <div key={h} className="rounded-[20px] border border-rule print:break-after-page print:rounded-none print:border-0 print:last:break-after-auto">
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
        className={`shrink-0 rounded-2xl bg-white ${lg ? "p-5" : "p-4 print:p-0"}`}
        aria-hidden
      >
        <div
          className={`[&_svg]:block [&_svg]:size-full ${lg ? "size-[min(70vw,20rem)]" : "size-44 print:size-[11cm]"}`}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
      <div className={lg ? "max-w-[30rem]" : "max-w-[22rem] print:max-w-[16cm]"}>
        {note && (
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-page px-3 py-1 text-sm text-ink">
            <span className="size-2 rounded-full bg-mint-deep" aria-hidden />
            {note}
          </p>
        )}
        <h2 className={`leading-[1.15] font-medium tracking-[-0.02em] text-balance ${lg ? "text-[2rem]" : "text-lg print:text-[2rem]"}`}>
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
