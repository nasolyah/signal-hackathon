import Link from "next/link";
import { t } from "@/lib/i18n";

/** The ring mark of the landing (public/favicon.svg). */
export function RingMark({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0 5.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z"
      />
    </svg>
  );
}

export type Role = "staff" | "analyst" | "hospital" | "district" | "ministry";

// HACK: no auth — the five roles are plain links for the demo; in production every role is a login.
const ROLE_LINKS: [Role, string][] = [
  ["staff", "/report?h=A"],
  ["analyst", "/analyst"],
  ["hospital", "/hospital/A"],
  ["district", "/district/SAM-1"],
  ["ministry", "/dashboard"],
];

/** The demo role switcher: who is looking at the system right now. */
function RoleNav({ role }: { role?: Role }) {
  return (
    <nav aria-label="Роль" className="hidden items-center gap-1 rounded-full bg-ground p-1 lg:flex">
      {ROLE_LINKS.map(([r, href]) => (
        <Link
          key={r}
          href={href}
          aria-current={r === role ? "page" : undefined}
          className={`rounded-full px-3 py-1.5 text-sm transition-colors focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none ${
            r === role ? "bg-page font-medium text-ink shadow-[0_1px_2px_rgb(0_0_0/0.08)]" : "text-ink-muted hover:text-ink"
          }`}
        >
          {t.roles[r]}
        </Link>
      ))}
    </nav>
  );
}

/**
 * The product's top bar, matching the landing's nav: the mark and name on the left, the current place,
 * the role switcher, and the one action on the right. White, one hairline under it, nothing else.
 */
export function AppBar({ place, wide = false, role, children }: { place?: string; wide?: boolean; role?: Role; children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-20 border-b border-rule bg-page/90 backdrop-blur supports-[backdrop-filter]:bg-page/80 print:hidden">
      <div className={`mx-auto flex h-16 w-full items-center justify-between gap-6 px-5 lg:px-10 ${wide ? "" : "max-w-[76rem]"}`}>
        <div className="flex min-w-0 items-center gap-5">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 text-[1.0625rem] font-medium tracking-tight text-ink focus-visible:rounded-md focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
          >
            <RingMark className="size-5 text-mint-deep" />
            {t.app.name}
          </Link>
          {place && <span className="hidden truncate text-sm text-ink-muted sm:inline">{place}</span>}
        </div>
        <RoleNav role={role} />
        {children && <div className="flex shrink-0 items-center gap-3">{children}</div>}
      </div>
    </header>
  );
}

/** Solid graphite button as a link — the landing's primary button. */
export function PrimaryLink({ href, children, className = "" }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={`inline-flex h-10 items-center gap-2 rounded-lg bg-pen px-4 text-sm font-medium text-pen-ink transition-[transform,background-color] duration-150 hover:bg-[#3a3a3a] active:scale-[0.98] focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none ${className}`}
    >
      {children}
    </Link>
  );
}

/** Quiet outlined button as a link — the landing's secondary button. */
export function SecondaryLink({ href, children, className = "" }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={`inline-flex h-10 items-center gap-2 rounded-lg border border-rule-strong bg-page px-4 text-sm font-medium text-ink transition-[transform,background-color] duration-150 hover:bg-ground active:scale-[0.98] focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none ${className}`}
    >
      {children}
    </Link>
  );
}
