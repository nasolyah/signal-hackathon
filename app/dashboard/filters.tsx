"use client";

import { ChevronDown } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** A native select in the landing's style that writes its value into the URL (filters survive reloads and links). */
export function FilterSelect({
  name,
  label,
  value,
  options,
  anyLabel,
}: {
  name: string;
  label: string;
  value: string;
  options: [string, string][];
  anyLabel: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  return (
    <label className="flex max-w-full min-w-0 items-center gap-2.5">
      <span className="text-sm text-ink-muted">{label}</span>
      <span className="relative min-w-0">
        <select
          value={value}
          onChange={(e) => {
            const next = new URLSearchParams(params);
            if (e.target.value) next.set(name, e.target.value);
            else next.delete(name);
            const qs = next.toString();
            router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
          }}
          className="h-10 w-full max-w-full appearance-none rounded-lg border border-rule-strong bg-page pr-9 pl-3.5 text-sm text-ink hover:bg-ground outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          <option value="">{anyLabel}</option>
          {options.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-muted" aria-hidden />
      </span>
    </label>
  );
}
