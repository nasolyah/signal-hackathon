import "server-only";
import { z } from "zod";
import { env, EMBEDDING_DIM } from "@/lib/env";
import { gemini, withRetry } from "@/lib/ai/gemini";
import { countPlaceholders, preScrub } from "@/lib/ai/scrub";
import { FACTORS, HARMS, INCIDENT_TYPES, STAGES } from "@/lib/taxonomy";

// Step 1 (SPEC §4): one structured call → de-identified text + ICPS classification.
// PRIVACY: the raw text only lives in this function's memory. Never log it,
// never put it into an error message, never return it.

export const AnalysisSchema = z.object({
  redacted_text: z.string().min(1),
  redaction_count: z.number().int().min(0),
  incident_type: z.enum(INCIDENT_TYPES),
  stage: z.enum(STAGES),
  harm: z.enum(HARMS),
  near_miss: z.boolean(),
  factors: z.array(z.enum(FACTORS)).min(1).max(3),
  summary: z.string().min(1),
});

export type Analysis = z.infer<typeof AnalysisSchema>;

// Hand-written JSON Schema (plain subset Gemini accepts); output is re-validated with zod.
const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    redacted_text: {
      type: "string",
      description:
        "The same report text with every remaining patient name → [ПАЦИЕНТ], staff name → [СОТРУДНИК]; indirect identifiers generalized. Meaning unchanged.",
    },
    redaction_count: {
      type: "integer",
      description: "How many NEW replacements/generalizations you made (do not count placeholders already in the input).",
    },
    incident_type: { type: "string", enum: [...INCIDENT_TYPES] },
    stage: { type: "string", enum: [...STAGES] },
    harm: { type: "string", enum: [...HARMS] },
    near_miss: { type: "boolean" },
    factors: {
      type: "array",
      items: { type: "string", enum: [...FACTORS] },
      minItems: 1,
      maxItems: 3,
    },
    summary: {
      type: "string",
      description: "One neutral sentence in Russian, no names: what happened and the likely system factor.",
    },
  },
  required: [
    "redacted_text",
    "redaction_count",
    "incident_type",
    "stage",
    "harm",
    "near_miss",
    "factors",
    "summary",
  ],
} as const;

const SYSTEM_INSTRUCTION = `You process anonymous patient-safety incident reports from hospitals in Uzbekistan.
The text may be in Russian, Uzbek (Latin or Cyrillic) or mixed. Always answer in Russian.

1. De-identify. Replace every name of a patient with [ПАЦИЕНТ] and every name of a staff member with [СОТРУДНИК]
   (full names, surnames, first names, initials, nicknames). Generalize indirect identifiers that point to one
   person, e.g. "единственный анестезиолог ночной смены" → "анестезиолог". Keep placeholders already in the
   text ([ПАЛАТА], [НОМЕР], [ДАТА]) as they are. Do not change the meaning, the drugs, doses, departments or sequence of events.
   redacted_text must be the full report, not a summary, in its original language.
2. Classify by the WHO patient-safety taxonomy (ICPS) using ONLY the allowed enum values.
   - harm = what actually happened to the patient (none if the error did not reach the patient or caused no harm).
   - near_miss = true if the error was caught BEFORE it reached the patient.
   - factors: 1–3 contributing system factors from the fixed list.
3. summary: one neutral Russian sentence, no names, no blame, naming the likely system factor.
Do not invent facts that are not in the report.`;

export type AnalyzeResult = Analysis & {
  /** regex count + AI count — what the user sees as «Удалено персональных данных» */
  total_redactions: number;
};

export async function analyzeReport(rawText: string): Promise<AnalyzeResult> {
  const pre = preScrub(rawText);

  const run = async () => {
    const res = await gemini().models.generateContent({
      model: env.modelFast(),
      contents: pre.text,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseJsonSchema: RESPONSE_SCHEMA,
        temperature: 0.1,
      },
    });
    const parsed = AnalysisSchema.safeParse(JSON.parse(res.text ?? "null"));
    if (!parsed.success) throw new Error("ANALYSIS_INVALID_JSON");
    return parsed.data;
  };

  let analysis: Analysis;
  try {
    analysis = await withRetry(run);
  } catch {
    // Deliberately drop the original error: it may echo request content.
    throw new Error("ANALYSIS_FAILED");
  }

  const aiAdded = Math.max(
    analysis.redaction_count,
    countPlaceholders(analysis.redacted_text) - countPlaceholders(pre.text),
    0,
  );

  return { ...analysis, total_redactions: pre.count + aiAdded };
}

/** Step 2: embedding text = summary | type | factors (SPEC §4). */
export function embeddingInput(a: Pick<Analysis, "summary" | "incident_type" | "factors">): string {
  return `${a.summary} | ${a.incident_type} | ${a.factors.join(", ")}`;
}

export async function embed(text: string): Promise<number[]> {
  const res = await withRetry(() =>
    gemini().models.embedContent({
      model: env.embedModel(),
      contents: text,
      config: { outputDimensionality: EMBEDDING_DIM, taskType: "SEMANTIC_SIMILARITY" },
    }),
  );
  const values = res.embeddings?.[0]?.values;
  if (!values?.length) throw new Error("EMBEDDING_FAILED");
  return values;
}
