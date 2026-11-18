"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { t } from "@/lib/i18n";
import { formatDateRu } from "@/lib/time";
import { acknowledge, decide, markDone } from "../actions";

const field =
  "w-full rounded-lg border border-rule-strong bg-page px-3.5 py-2.5 text-base text-ink outline-none focus-visible:border-mint-deep focus-visible:ring-3 focus-visible:ring-ring/30";
const primary =
  "flex h-11 items-center rounded-lg bg-pen px-4 text-base font-medium text-pen-ink transition-[transform,background-color] duration-150 hover:bg-[#3a3a3a] active:scale-[0.98] focus-visible:ring-4 focus-visible:ring-ring/40 focus-visible:outline-none disabled:cursor-progress disabled:bg-[#3a3a3a]";
const secondary =
  "flex h-11 items-center rounded-lg border border-rule-strong bg-page px-4 text-base font-medium text-ink transition-colors hover:bg-ground focus-visible:ring-4 focus-visible:ring-ring/40 focus-visible:outline-none disabled:opacity-50";

/** First open of an unread digest marks it read — the district sees the reaction time. */
export function Acknowledge({ digestId, unread }: { digestId: string; unread: boolean }) {
  const router = useRouter();
  const done = useRef(false);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!unread || done.current) return;
    done.current = true;
    acknowledge(digestId).then((r) => {
      if (r.ok) {
        setShown(true);
        router.refresh();
      }
    });
  }, [digestId, unread, router]);
  if (!shown) return null;
  return (
    <p role="status" className="mb-5 inline-flex items-center gap-2 rounded-full bg-page px-3 py-1 text-sm text-ink">
      <span className="size-2 rounded-full bg-mint-deep" aria-hidden />
      {t.v2.ackNote}
    </p>
  );
}

const inTwoWeeks = () => new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);

export function ItemDecision({
  digestId,
  itemId,
  suggestion,
  decision,
}: {
  digestId: string;
  itemId: string;
  suggestion: string;
  decision: { decision: "accepted" | "rejected"; action: string | null; reason: string | null; due: string | null } | null;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "accept" | "reject">("idle");
  const [text, setText] = useState(suggestion);
  const [due, setDue] = useState(inTwoWeeks);
  const [reason, setReason] = useState("");
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();

  if (decision) {
    return decision.decision === "accepted" ? (
      <p className="mt-5 flex flex-wrap items-center gap-2 rounded-xl bg-accent px-4 py-3 text-[0.9375rem] text-ink">
        <span className="size-2 rounded-full bg-mint-deep" aria-hidden />
        <span className="font-medium">{t.v2.accepted}:</span> {decision.action}
        {decision.due && <span className="text-ink-muted">· {t.v2.dueBy(formatDateRu(decision.due))}</span>}
      </p>
    ) : (
      <p className="mt-5 rounded-xl bg-ground px-4 py-3 text-[0.9375rem] text-ink">
        <span className="font-medium">{t.v2.rejected}:</span> {decision.reason}
      </p>
    );
  }

  const run = (input: Parameters<typeof decide>[2]) =>
    start(async () => {
      const r = await decide(digestId, itemId, input);
      setFailed(!r.ok);
      if (r.ok) router.refresh();
    });

  if (mode === "idle") {
    return (
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" className={primary} onClick={() => setMode("accept")}>
          {t.v2.accept}
        </button>
        <button type="button" className={secondary} onClick={() => setMode("reject")}>
          {t.v2.reject}
        </button>
      </div>
    );
  }

  return (
    <form
      className="mt-5 flex flex-col gap-3 rounded-xl border border-rule px-4 py-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (mode === "accept") run({ decision: "accepted", action_text: text.trim(), due_date: due });
        else run({ decision: "rejected", reject_reason: reason.trim() });
      }}
    >
      {mode === "accept" ? (
        <>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-ink-muted">{t.v2.actionText}</span>
            <textarea rows={2} required minLength={3} maxLength={300} value={text} onChange={(e) => setText(e.target.value)} className={`${field} resize-y`} />
          </label>
          <label className="flex flex-col gap-1.5 sm:w-56">
            <span className="text-sm text-ink-muted">{t.v2.due}</span>
            <input type="date" required value={due} onChange={(e) => setDue(e.target.value)} className={field} />
          </label>
        </>
      ) : (
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-ink-muted">{t.v2.reason}</span>
          <textarea rows={2} required minLength={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} className={`${field} resize-y`} />
        </label>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={primary}>
          {t.v2.save}
        </button>
        <button type="button" disabled={pending} className={secondary} onClick={() => setMode("idle")}>
          {t.v2.cancel}
        </button>
        {failed && <span className="text-sm text-margin-red">{t.v2.decideFailed}</span>}
      </div>
    </form>
  );
}

export function DoneButton({ actionId }: { actionId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className={secondary}
      onClick={() =>
        start(async () => {
          const r = await markDone(actionId);
          if (r.ok) router.refresh();
        })
      }
    >
      {t.v2.markDone}
    </button>
  );
}
