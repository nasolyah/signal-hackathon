"use client";

import { Printer } from "lucide-react";

export function PrintButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-10 items-center gap-2 rounded-lg bg-pen px-4 text-sm font-medium text-pen-ink transition-[transform,background-color] duration-150 hover:bg-[#3a3a3a] active:scale-[0.98] focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
    >
      <Printer className="size-4" aria-hidden /> {label}
    </button>
  );
}
