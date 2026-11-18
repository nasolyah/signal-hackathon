"use server";

import { liveCounts, type LiveCounts } from "@/lib/dashboard";
import { HOSPITAL_CODES, type HospitalCode } from "@/lib/taxonomy";

// Polled by the dashboard every few seconds so the pattern counter moves live (11 → 12).
// Returns de-identified aggregates only.
// Every open dashboard polls; one DB read per hospital scope per 1.5 s serves them all (per instance).
const memo = new Map<string, { at: number; value: Promise<LiveCounts> }>();
const MEMO_MS = 1500;

export async function pollCounts(hospital: string | null): Promise<LiveCounts | null> {
  const h = hospital && (HOSPITAL_CODES as readonly string[]).includes(hospital) ? (hospital as HospitalCode) : undefined;
  const key = h ?? "all";
  const hit = memo.get(key);
  try {
    if (hit && Date.now() - hit.at < MEMO_MS) return await hit.value;
    const value = liveCounts({ hospital: h });
    memo.set(key, { at: Date.now(), value });
    return await value;
  } catch {
    memo.delete(key);
    return null;
  }
}
