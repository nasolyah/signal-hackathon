"use client";

import { ChevronDown } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** A journal-styled native select that writes its value into the URL (filters survive reloads and links). */
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
    <label className="flex items-baseline gap-2">
      <span className="text-xs text-ink-muted">{label}</span>
      <span className="relative">
        <select
          value={value}
          onChange={(e) => {
            const next = new URLSearchParams(params);
            if (e.target.value) next.set(name, e.target.value);
            else next.delete(name);
            const qs = next.toString();
            router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
          }}
          className="appearance-none rounded-[4px] border border-rule-strong bg-page py-1 pr-7 pl-2.5 text-sm text-ink outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          <option value="">{anyLabel}</option>
          {options.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-1.5 size-3.5 -translate-y-1/2 text-ink-muted" aria-hidden />
      </span>
    </label>
  );
}
