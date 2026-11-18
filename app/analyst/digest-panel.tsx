"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StrengthBadge } from "@/components/strength-badge";
import { t } from "@/lib/i18n";
import type { HospitalCode } from "@/lib/taxonomy";
import { formatSpanRu, formatStampRu } from "@/lib/time";
import type { Digest } from "@/lib/v2";
import { buildDigest, sendDigest } from "./actions";

type Pattern = { id: string; title: string; incident_count: number; hospital_count: number };

const field =
  "w-full rounded-lg border border-rule-strong bg-page px-3.5 py-2.5 text-base text-ink outline-none focus-visible:border-mint-deep focus-visible:ring-3 focus-visible:ring-ring/30";

export function DigestPanel({ hospital, digest, inboxCount, patterns }: { hospital: HospitalCode; digest: Digest | null; inboxCount: number; patterns: Pattern[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!digest) {
    return (
      <div className="mt-4 rounded-[20px] bg-ground px-6 py-6">
        <button
          type="button"
          disabled={pending || inboxCount === 0}
          onClick={() =>
            start(async () => {
              const r = await buildDigest(hospital);
              setError(r.ok ? null : r.reason === "busy" ? t.v2.busy : r.reason === "empty" ? t.v2.inboxEmpty : t.v2.buildFailed);
              if (r.ok) router.refresh();
            })
          }
          className="flex h-12 items-center rounded-lg bg-pen px-5 text-base font-medium text-pen-ink transition-[transform,background-color] duration-150 hover:bg-[#3a3a3a] active:scale-[0.98] focus-visible:ring-4 focus-visible:ring-ring/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-rule-strong disabled:text-ink-muted"
        >
          {pending ? t.v2.building : t.v2.build}
        </button>
        {pending && (
          <div className="mt-4 h-1 max-w-[28rem] overflow-hidden rounded-full bg-page" aria-hidden>
            <div className="h-full origin-left scale-x-90 rounded-full bg-mint-deep motion-safe:animate-[pen-stroke_18s_cubic-bezier(0.16,1,0.3,1)_forwards]" />
          </div>
        )}
        {inboxCount === 0 && <p className="mt-3 text-sm text-ink-muted">{t.v2.inboxEmpty}</p>}
        {error && <p className="mt-3 text-sm text-margin-red">{error}</p>}
      </div>
    );
  }

  if (digest.status === "draft") return <Editor digest={digest} patterns={patterns} />;
  return <SentView digest={digest} patterns={patterns} />;
}

function Stats({ digest }: { digest: Digest }) {
  const s = digest.stats;
  return <p className="text-sm text-ink-muted">{t.v2.stats(s.reports ?? 0, Math.round((s.near_miss_share ?? 0) * 100), s.severe ?? 0)}</p>;
}

function PatternLine({ id, patterns }: { id: string | null; patterns: Pattern[] }) {
  const p = patterns.find((x) => x.id === id);
  if (!p) return null;
  return <p className="mt-2 inline-flex rounded-full bg-accent px-3 py-1 text-sm text-ink">{t.v2.pattern(p.title, p.incident_count, p.hospital_count)}</p>;
}

function Actions({ actions }: { actions: Digest["items"][number]["actions"] }) {
  return (
    <ul className="mt-3 flex flex-col gap-2">
      {actions.map((a, i) => (
        <li key={i} className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-start gap-3 text-[0.9375rem]">
          <StrengthBadge strength={a.strength} />
          <span>
            <span className="text-ink">{a.text}</span>
            <span className={`block text-sm ${a.strength === "weak" ? "text-margin-red" : "text-ink-muted"}`}>{a.rationale}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function Editor({ digest, patterns }: { digest: Digest; patterns: Pattern[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(false);
  const [headline, setHeadline] = useState(digest.headline ?? "");
  const [note, setNote] = useState(digest.analyst_note ?? "");
  const [items, setItems] = useState(digest.items.map((i) => ({ id: i.id, title: i.title, what: i.what, why: i.why })));
  const set = (id: string, k: "title" | "what" | "why", v: string) => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, [k]: v } : x)));

  return (
    <div className="mt-4 rounded-[20px] border border-rule px-5 py-6 sm:px-7">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="inline-flex items-center gap-2 rounded-full bg-ground px-3 py-1 text-sm text-ink">
          <span className="size-2 rounded-full bg-mint-deep" aria-hidden />
          {t.v2.draftNote}
        </span>
        <Stats digest={digest} />
      </div>

      <label className="mt-6 flex flex-col gap-1.5">
        <span className="text-sm text-ink-muted">{t.v2.headline}</span>
        <textarea rows={2} value={headline} onChange={(e) => setHeadline(e.target.value)} className={`${field} resize-y text-lg font-medium`} />
      </label>

      <ol className="mt-6 flex flex-col gap-6">
        {digest.items.map((it, n) => {
          const ed = items.find((x) => x.id === it.id)!;
          return (
            <li key={it.id} className="rounded-xl bg-ground px-4 py-4 sm:px-5">
              <p className="text-sm text-ink-muted">{n + 1}</p>
              <input value={ed.title} onChange={(e) => set(it.id, "title", e.target.value)} className={`${field} mt-1 font-medium`} aria-label={`${n + 1}`} />
              <PatternLine id={it.pattern_id} patterns={patterns} />
              <label className="mt-3 flex flex-col gap-1.5">
                <span className="text-sm text-ink-muted">{t.v2.what}</span>
                <textarea rows={2} value={ed.what} onChange={(e) => set(it.id, "what", e.target.value)} className={`${field} resize-y`} />
              </label>
              <label className="mt-3 flex flex-col gap-1.5">
                <span className="text-sm text-ink-muted">{t.v2.why}</span>
                <textarea rows={2} value={ed.why} onChange={(e) => set(it.id, "why", e.target.value)} className={`${field} resize-y`} />
              </label>
              <p className="mt-4 text-sm text-ink-muted">{t.v2.suggested}</p>
              <Actions actions={it.actions} />
            </li>
          );
        })}
      </ol>

      <label className="mt-6 flex flex-col gap-1.5">
        <span className="text-sm text-ink-muted">{t.v2.note}</span>
        <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} className={`${field} resize-y`} />
      </label>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await sendDigest(digest.id, { headline, analyst_note: note, items });
              setFailed(!r.ok);
              if (r.ok) router.refresh();
            })
          }
          className="flex h-12 items-center rounded-lg bg-pen px-5 text-base font-medium text-pen-ink transition-[transform,background-color] duration-150 hover:bg-[#3a3a3a] active:scale-[0.98] focus-visible:ring-4 focus-visible:ring-ring/40 focus-visible:outline-none disabled:cursor-progress disabled:bg-[#3a3a3a]"
        >
          {pending ? t.v2.sending : t.v2.send}
        </button>
        {failed && <span className="text-sm text-margin-red">{t.v2.sendFailed}</span>}
      </div>
    </div>
  );
}

function SentView({ digest, patterns }: { digest: Digest; patterns: Pattern[] }) {
  const hours = digest.sent_at && digest.acknowledged_at ? (Date.parse(digest.acknowledged_at) - Date.parse(digest.sent_at)) / 3_600_000 : null;
  return (
    <div className="mt-4 rounded-[20px] bg-ground px-5 py-6 sm:px-7">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink">
        <span className="inline-flex items-center gap-2 rounded-full bg-page px-3 py-1">
          <span className={`size-2 rounded-full ${digest.status === "acknowledged" ? "bg-mint-deep" : "bg-rule-strong"}`} aria-hidden />
          {t.v2.status[digest.status]}
        </span>
        {digest.sent_at && <span className="text-ink-muted">{t.v2.sentAt(formatStampRu(digest.sent_at))}</span>}
        {hours !== null && <span className="text-ink-muted">· {t.v2.readIn(formatSpanRu(hours))}</span>}
      </p>
      <p className="mt-4 text-lg font-medium text-ink">{digest.headline}</p>
      <Stats digest={digest} />
      <ol className="mt-5 flex flex-col gap-4">
        {digest.items.map((it) => (
          <li key={it.id} className="rounded-xl bg-page px-4 py-4">
            <p className="font-medium text-ink">{it.title}</p>
            <PatternLine id={it.pattern_id} patterns={patterns} />
            <p className="mt-2 text-[0.9375rem] text-ink">{it.what}</p>
            <Actions actions={it.actions} />
          </li>
        ))}
      </ol>
    </div>
  );
}
