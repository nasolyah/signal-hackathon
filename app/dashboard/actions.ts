"use server";

import { liveCounts, type LiveCounts } from "@/lib/dashboard";
import { HOSPITAL_CODES, type HospitalCode } from "@/lib/taxonomy";

// Polled by the dashboard every few seconds so the pattern counter moves live (11 → 12).
// Returns de-identified aggregates only.
export async function pollCounts(hospital: string | null): Promise<LiveCounts | null> {
  const h = hospital && (HOSPITAL_CODES as readonly string[]).includes(hospital) ? (hospital as HospitalCode) : undefined;
  try {
    return await liveCounts({ hospital: h });
  } catch {
    return null;
  }
}
