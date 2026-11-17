import Link from "next/link";
import { t } from "@/lib/i18n";

// HACK: temporary entry page with role links until the real header/role switcher exists.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-16">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{t.app.name}</h1>
        <p className="mt-2 text-muted-foreground">{t.app.tagline}</p>
      </div>
      <nav className="flex flex-col gap-2">
        <Link className="rounded-lg border px-4 py-3 hover:bg-muted" href="/report?h=A">
          {t.roles.staff} → /report?h=A
        </Link>
        <Link className="rounded-lg border px-4 py-3 hover:bg-muted" href="/dashboard">
          {t.roles.ministry} → /dashboard
        </Link>
        <Link className="rounded-lg border px-4 py-3 hover:bg-muted" href="/qr">
          {t.qr.title} → /qr
        </Link>
      </nav>
    </main>
  );
}
