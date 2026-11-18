import "server-only";

// Cost guard for the public demo: a global sliding window per bucket, per server instance.
// PRIVACY (CLAUDE.md rule 2): deliberately NOT keyed by IP or any request header — it caps total
// Gemini calls so a naive bot loop cannot drain the quota or flood the counters.
// HACK: per instance only; the real limit belongs in the Vercel Firewall and the Gemini quota.

const hits = new Map<string, number[]>();

export function allow(bucket: string, max: number, windowMs = 60_000): boolean {
  const now = Date.now();
  const recent = (hits.get(bucket) ?? []).filter((t) => now - t < windowMs);
  const ok = recent.length < max;
  if (ok) recent.push(now);
  hits.set(bucket, recent);
  return ok;
}

/** Gemini calls per minute per instance. Enough for several judges at once, not for a loop. */
export const LIMITS = { report: 30, rcaAi: 30 } as const;
