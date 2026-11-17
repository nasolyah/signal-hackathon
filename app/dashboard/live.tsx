"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { LiveCounts } from "@/lib/dashboard";
import { t } from "@/lib/i18n";
import { pollCounts } from "./actions";

const POLL_MS = 2000;
const LiveContext = createContext<LiveCounts | null>(null);

/**
 * Polls aggregate counts. Counters read from here, so a new report shows up without a reload.
 * When the totals change, the server-rendered register and bars are refreshed in the background.
 */
export function LiveCountsProvider({
  initial,
  hospital,
  children,
}: {
  initial: LiveCounts;
  hospital: string | null;
  children: React.ReactNode;
}) {
  const [counts, setCounts] = useState(initial);
  const router = useRouter();
  const lastTotal = useRef(initial.total);

  useEffect(() => {
    let stop = false;
    const tick = async () => {
      if (document.hidden) return;
      const next = await pollCounts(hospital);
      if (stop || !next) return;
      setCounts(next);
      if (next.total !== lastTotal.current) {
        lastTotal.current = next.total;
        router.refresh();
      }
    };
    const id = setInterval(tick, POLL_MS);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [hospital, router]);

  return <LiveContext.Provider value={counts}>{children}</LiveContext.Provider>;
}

export function useLiveCounts() {
  return useContext(LiveContext);
}

/**
 * A number that, when it changes, slides the old value up and the new one in,
 * then draws a red-pencil underline once (the dashboard's signature moment).
 */
export function LiveNumber({
  value,
  className = "",
  underline = false,
}: {
  value: number;
  className?: string;
  underline?: boolean;
}) {
  const [shown, setShown] = useState(value);
  const [prev, setPrev] = useState<number | null>(null);
  const [bump, setBump] = useState(0);

  if (value !== shown) {
    // Derived-state update during render (React-sanctioned): start the transition.
    setPrev(shown);
    setShown(value);
    setBump((b) => b + 1);
  }

  return (
    <span className={`relative inline-flex align-baseline ${underline ? "pb-[0.14em]" : ""} ${className}`}>
      <span className="sr-only" aria-live="polite">
        {shown}
      </span>
      <span aria-hidden className="relative inline-block overflow-hidden">
        {prev !== null && (
          <span
            key={`out-${bump}`}
            className="absolute inset-0 motion-safe:animate-[count-out_420ms_cubic-bezier(0.22,1,0.36,1)_forwards] motion-reduce:hidden"
          >
            {prev}
          </span>
        )}
        <span
          key={`in-${bump}`}
          className={`inline-block ${prev !== null ? "motion-safe:animate-[count-in_420ms_cubic-bezier(0.22,1,0.36,1)_both]" : ""}`}
        >
          {shown}
        </span>
      </span>
      {underline && bump > 0 && (
        <span
          key={`ul-${bump}`}
          aria-hidden
          className="absolute right-0 bottom-0 left-0 h-[max(4px,0.08em)] origin-left rounded-full bg-margin-red motion-safe:animate-[pencil-underline_700ms_cubic-bezier(0.22,1,0.36,1)_both]"
        />
      )}
    </span>
  );
}

/** Pattern counter bound to the live poll. */
export function LivePatternCount({ id, initial, className, underline }: { id: string; initial: number; className?: string; underline?: boolean }) {
  const live = useLiveCounts();
  return <LiveNumber value={live?.patterns[id]?.count ?? initial} className={className} underline={underline} />;
}

export function LiveTotal({ initial, className }: { initial: number; className?: string }) {
  const live = useLiveCounts();
  return <LiveNumber value={live?.total ?? initial} className={className} />;
}

/** «12 случаев · 4 больницы · 83% ночью» + night share drawn to scale; follows the live poll. */
export function LivePatternStats({
  id,
  initial,
  size = "lg",
  bar = true,
}: {
  id: string;
  initial: { count: number; hospitals: number; night: number };
  size?: "lg" | "sm";
  bar?: boolean;
}) {
  const live = useLiveCounts()?.patterns[id] ?? initial;
  const nightPct = Math.round(live.night * 100);
  return (
    <div className={size === "lg" ? "mt-2" : "mt-1"}>
      <p className={size === "lg" ? "text-base text-ink" : "text-sm text-ink"}>
        {live.count} {t.plural.cases(live.count)} · {live.hospitals} {t.plural.hospitals(live.hospitals)} ·{" "}
        <span className="font-semibold">
          {nightPct}% {t.dashboard.night}
        </span>
      </p>
      {/* Night share to scale: the whole bar is every case of the pattern */}
      {bar && (
      <div
        className={`mt-1.5 flex w-full max-w-[22rem] overflow-hidden rounded-[2px] bg-rule ${size === "lg" ? "h-2" : "h-1.5"}`}
        role="img"
        aria-label={`${nightPct}% ${t.dashboard.night}`}
      >
        <div className="h-full bg-pen transition-[width] duration-500 ease-out" style={{ width: `${nightPct}%` }} />
      </div>
      )}
    </div>
  );
}
