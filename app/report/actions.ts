"use server";

import { z } from "zod";
import { analyzeReport, embed, embeddingInput } from "@/lib/ai/analyze";
import { db } from "@/lib/db";
import { attachToPattern } from "@/lib/patterns";
import { DEPARTMENTS, HOSPITAL_CODES, SHIFTS, type Factor, type Harm, type IncidentType, type Stage } from "@/lib/taxonomy";
import { tashkentDate } from "@/lib/time";
import { allow, LIMITS } from "@/lib/rate-limit";

// PRIVACY (CLAUDE.md): the raw text lives only in this request's memory.
// Never log it, never return it, never put it in an error. No IP / UA / cookies read here.

const Input = z.object({
  hospital: z.enum(HOSPITAL_CODES),
  text: z.string().trim().min(20).max(4000),
  department: z.enum(DEPARTMENTS).nullable(),
  shift: z.enum(SHIFTS),
  shiftTouched: z.boolean(),
});

export type KeptEntry = {
  date: string;
  shift: "day" | "night";
  redactedText: string;
  removed: number;
  incidentType: IncidentType;
  stage: Stage;
  harm: Harm;
  nearMiss: boolean;
  factors: Factor[];
  summary: string;
  joinedPattern: boolean;
};

export type ReportState =
  | { status: "idle" }
  | { status: "too_short" }
  | { status: "too_long" }
  | { status: "failed" }
  | { status: "kept"; entry: KeptEntry };

export async function submitReport(_prev: ReportState, formData: FormData): Promise<ReportState> {
  const dept = formData.get("department");
  const parsed = Input.safeParse({
    hospital: formData.get("hospital"),
    text: formData.get("text"),
    department: typeof dept === "string" && dept !== "" ? dept : null,
    shift: formData.get("shift"),
    shiftTouched: formData.get("shift_touched") === "1",
  });
  if (!parsed.success) {
    const textIssue = parsed.error.issues.find((i) => i.path[0] === "text");
    if (textIssue) return { status: textIssue.code === "too_big" ? "too_long" : "too_short" };
    return { status: "failed" };
  }
  const { hospital, text, department, shiftTouched } = parsed.data;
  if (!allow("report", LIMITS.report)) return { status: "failed" }; // cost guard: no Gemini call

  try {
    const a = await analyzeReport(text);
    const embedding = await embed(embeddingInput(a));
    const date = tashkentDate();
    // The form pre-fills the shift from the clock; if the reporter did not change it and the
    // text says when it happened («ночью»), the text wins — night share drives pattern alerts.
    const shift = !shiftTouched && a.shift_in_text !== "unknown" ? a.shift_in_text : parsed.data.shift;

    const { data, error } = await db()
      .from("incidents")
      .insert({
        hospital_id: hospital,
        department,
        shift,
        incident_date: date,
        redacted_text: a.redacted_text,
        redaction_count: a.total_redactions,
        incident_type: a.incident_type,
        stage: a.stage,
        harm: a.harm,
        near_miss: a.near_miss,
        factors: a.factors,
        summary: a.summary,
        embedding,
        // Rule 3: never the exact time. Overrides the column default now(), which would
        // let anyone match a report to the shift roster.
        created_at: `${date}T00:00:00+05:00`,
      })
      .select("id")
      .single();
    if (error || !data) throw new Error("INSERT_FAILED");

    // The report is already safely stored; a failed pattern lookup must not fail the reporter.
    const patternId = await attachToPattern(data.id, embedding).catch(() => null);

    return {
      status: "kept",
      entry: {
        date,
        shift,
        redactedText: a.redacted_text,
        removed: a.total_redactions,
        incidentType: a.incident_type,
        stage: a.stage,
        harm: a.harm,
        nearMiss: a.near_miss,
        factors: a.factors,
        summary: a.summary,
        joinedPattern: patternId !== null,
      },
    };
  } catch {
    return { status: "failed" };
  }
}
