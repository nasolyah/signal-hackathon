"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

// HACK: dev-only break-ui switch. Callers render it only when NODE_ENV !== "production".
// Plain chrome on purpose: a grey track, a white pill on the active segment, system font.
export function DevDataToggle({ states }: { states: [value: string, label: string][] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get("data") ?? "";
  return (
    <div
      role="radiogroup"
      aria-label="Dev data"
      style={{ fontFamily: "system-ui, sans-serif" }}
      className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 gap-0.5 rounded-full bg-neutral-200 p-1 text-xs shadow-sm print:hidden"
    >
      {states.map(([value, label]) => {
        const on = current === value;
        return (
          <button
            key={value || "demo"}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => {
              const next = new URLSearchParams(params);
              if (value) next.set("data", value);
              else next.delete("data");
              const qs = next.toString();
              router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
            }}
            className={`rounded-full px-3 py-1.5 ${on ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-600"}`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
