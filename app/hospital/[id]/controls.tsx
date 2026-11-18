"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StrengthBadge } from "@/components/strength-badge";
import { t } from "@/lib/i18n";
import type { ActionStrength } from "@/lib/taxonomy";
import { formatDateRu } from "@/lib/time";
import { acknowledge, decide, markDone } from "../actions";

const field =
  "w-full rounded-lg border border-rule-strong bg-page px-3.5 py-2.5 text-base text-ink outline-none focus-visible:border-mint-deep focus-visible:ring-3 focus-visible:ring-ring/30";
const primary =
  "flex h-11 items-center rounded-lg bg-pen px-5 text-base font-medium text-pen-ink transition-[transform,background-color] duration-150 hover:bg-[#3a3a3a] active:scale-[0.98] focus-visible:ring-4 focus-visible:ring-ring/40 focus-visible:outline-none disabled:cursor-progress disabled:bg-[#3a3a3a]";
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
    <p role="status" className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-sm text-ink">
      <span className="size-2 rounded-full bg-mint-deep" aria-hidden />
      {t.v2.ackNote}
    </p>
  );
}

const inTwoWeeks = () => new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);

type Option = { text: string; strength: ActionStrength; rationale: string };
type Decision = { decision: "accepted" | "rejected"; action: string | null; reason: string | null; due: string | null } | null;

/**
 * One digest item as a decision: the suggested measures are choices. Undecided → pick one, set a due date,
 * accept (or reject with a reason). Decided → the accepted one is highlighted, the rest step back.
 */
export function ItemDecision({ digestId, itemId, options, decision }: { digestId: string; itemId: string; options: Option[]; decision: Decision }) {
  const router = useRouter();
  const [sel, setSel] = useState(0);
  const [text, setText] = useState(options[0]?.text ?? "");
  const [due, setDue] = useState(inTwoWeeks);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();

  const accepted = decision?.decision === "accepted" ? decision : null;
  const run = (input: Parameters<typeof decide>[2]) =>
    start(async () => {
      const r = await decide(digestId, itemId, input);
      setFailed(!r.ok);
      if (r.ok) router.refresh();
    });

  return (
    <div className="mt-5">
      {!decision && <p className="text-sm font-medium text-ink">{t.v2.chooseMeasure}</p>}
      {decision && <p className="text-sm text-ink-muted">{t.v2.suggested}</p>}
      <div role={decision ? undefined : "radiogroup"} className="mt-2 flex flex-col gap-2">
        {options.map((o, i) => {
          const isAccepted = accepted?.action?.trim() === o.text.trim();
          const chosen = !decision && sel === i;
          const body = (
            <>
              <StrengthBadge strength={o.strength} />
              <span className="min-w-0">
                <span className="block text-[0.9375rem] leading-snug text-ink">{o.text}</span>
                <span className={`block text-sm ${o.strength === "weak" ? "text-margin-red" : "text-ink-muted"}`}>{o.rationale}</span>
                {isAccepted && accepted?.due && (
                  <span className="mt-1.5 inline-flex items-center gap-2 text-sm font-medium text-ink">
                    <span className="size-2 rounded-full bg-mint-deep" aria-hidden />
                    {t.v2.acceptedUntil(formatDateRu(accepted.due))}
                  </span>
                )}
              </span>
            </>
          );
          if (decision) {
            return (
              <div
                key={i}
                className={`grid grid-cols-[6.5rem_minmax(0,1fr)] items-start gap-3 rounded-xl border px-4 py-3 ${isAccepted ? "border-mint-deep bg-accent" : "border-transparent opacity-50"}`}
              >
                {body}
              </div>
            );
          }
          return (
            <label
              key={i}
              className={`grid cursor-pointer grid-cols-[1.25rem_6.5rem_minmax(0,1fr)] items-start gap-3 rounded-xl border px-4 py-3 transition-colors ${chosen ? "border-ink bg-page" : "border-rule hover:bg-ground"}`}
            >
              <input
                type="radio"
                name={`m-${itemId}`}
                checked={chosen}
                onChange={() => {
                  setSel(i);
                  setText(o.text);
                }}
                className="mt-1 size-4 accent-[#232323]"
              />
              {body}
            </label>
          );
        })}
      </div>

      {accepted && !options.some((o) => o.text.trim() === accepted.action?.trim()) && (
        <p className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-mint-deep bg-accent px-4 py-3 text-[0.9375rem] text-ink">
          <span className="size-2 rounded-full bg-mint-deep" aria-hidden />
          {accepted.action}
          {accepted.due && <span className="text-ink-muted">· {t.v2.acceptedUntil(formatDateRu(accepted.due))}</span>}
        </p>
      )}
      {decision?.decision === "rejected" && (
        <p className="mt-3 rounded-xl bg-ground px-4 py-3 text-[0.9375rem] text-ink">
          <span className="font-medium">{t.v2.rejected}:</span> {decision.reason}
        </p>
      )}

      {!decision && !rejecting && (
        <div className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-ink-muted">{t.v2.wording}</span>
            <textarea rows={2} maxLength={300} value={text} onChange={(e) => setText(e.target.value)} className={`${field} resize-y`} />
          </label>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm text-ink-muted">{t.v2.due}</span>
              <input type="date" required value={due} onChange={(e) => setDue(e.target.value)} className={`${field} w-48`} />
            </label>
            <button type="button" disabled={pending || text.trim().length < 3} className={primary} onClick={() => run({ decision: "accepted", action_text: text.trim(), due_date: due })}>
              {t.v2.acceptChosen}
            </button>
            <button type="button" disabled={pending} className={secondary} onClick={() => setRejecting(true)}>
              {t.v2.reject}
            </button>
          </div>
        </div>
      )}

      {!decision && rejecting && (
        <form
          className="mt-4 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            run({ decision: "rejected", reject_reason: reason.trim() });
          }}
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-ink-muted">{t.v2.reason}</span>
            <textarea rows={2} required minLength={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} className={`${field} resize-y`} />
          </label>
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={pending} className={primary}>
              {t.v2.reject}
            </button>
            <button type="button" disabled={pending} className={secondary} onClick={() => setRejecting(false)}>
              {t.v2.cancel}
            </button>
          </div>
        </form>
      )}
      {failed && <p className="mt-2 text-sm text-margin-red">{t.v2.decideFailed}</p>}
    </div>
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
