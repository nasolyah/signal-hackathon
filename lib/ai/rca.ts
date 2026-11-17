import "server-only";
import { z } from "zod";
import { env } from "@/lib/env";
import { generate } from "@/lib/ai/gemini";
import { ACTION_STRENGTHS, CAUSE_CATEGORIES, type ActionStrength } from "@/lib/taxonomy";

// Step 5 (SPEC §4): RCA draft with the RCA² action hierarchy. Input is de-identified text only.

const RCA2 = `Иерархия мер RCA² (Национальный фонд безопасности пациентов, США):
- strong (сильная): физические и архитектурные изменения, принудительные функции (forcing functions), стандартизация оборудования или процесса, упрощение процесса, ощутимое участие руководства. Пример: «Хранить инсулины разного действия на разных полках / в разных холодильниках».
- medium (средняя): чек-листы и подсказки, устранение похожих упаковок/названий, изменения в ПО, больше персонала / меньше нагрузки, стандартизированная коммуникация (шаблон передачи смены), симуляционное обучение, снижение отвлечений.
- weak (слабая): двойные проверки, предупреждения, новая политика или приказ, обучение/инструктаж, «быть внимательнее».`;

export const ActionSchema = z.object({
  text: z.string().min(3),
  strength: z.enum(ACTION_STRENGTHS),
  rationale: z.string().min(3),
});

export const RcaDraftSchema = z.object({
  whys: z.array(z.string().min(3)).min(3).max(5),
  causes: z.object(Object.fromEntries(CAUSE_CATEGORIES.map((c) => [c, z.array(z.string())])) as Record<(typeof CAUSE_CATEGORIES)[number], z.ZodArray<z.ZodString>>),
  actions: z.array(ActionSchema).min(3).max(6),
});

export type RcaDraft = z.infer<typeof RcaDraftSchema>;
export type RcaAction = z.infer<typeof ActionSchema> & { owner?: string; due?: string; userAdded?: boolean };

const strengthEnum = { type: "string", enum: [...ACTION_STRENGTHS] };

const RCA_SCHEMA = {
  type: "object",
  properties: {
    whys: {
      type: "array",
      items: { type: "string" },
      minItems: 5,
      maxItems: 5,
      description: "Цепочка «5 почему»: каждый шаг отвечает «почему?» на предыдущий, от события к системной причине.",
    },
    causes: {
      type: "object",
      properties: Object.fromEntries(CAUSE_CATEGORIES.map((c) => [c, { type: "array", items: { type: "string" }, maxItems: 3 }])),
      required: [...CAUSE_CATEGORIES],
    },
    actions: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      items: {
        type: "object",
        properties: { text: { type: "string" }, strength: strengthEnum, rationale: { type: "string" } },
        required: ["text", "strength", "rationale"],
      },
    },
  },
  required: ["whys", "causes", "actions"],
} as const;

const SYSTEM = `Ты помогаешь ответственному за качество в больнице Узбекистана провести разбор первопричин (RCA) обезличенного случая.
Пиши по-русски, коротко, конкретно, без обвинения людей: ищи системные причины, а не виноватых.
1. whys: ровно 5 шагов «почему», каждый — одно предложение, последний — системная причина.
2. causes: по 6 категориям (people — люди, process — процессы, equipment — оборудование, environment — среда, materials — материалы, communication — коммуникация), 0–3 коротких пункта в каждой; пустой массив, если категории нечего сказать.
3. actions: 3–5 мер с силой по иерархии RCA² и одной строкой обоснования. Обязательно хотя бы одна strong мера. Порядок: от сильных к слабым.
${RCA2}
Не выдумывай фактов, которых нет в тексте.`;

export async function draftRca(caseText: string): Promise<RcaDraft> {
  const run = async () => {
    const res = await generate(env.modelSmart(), {
      contents: caseText,
      config: {
        systemInstruction: SYSTEM,
        responseMimeType: "application/json",
        responseJsonSchema: RCA_SCHEMA,
        temperature: 0.3,
      },
    });
    const parsed = RcaDraftSchema.safeParse(JSON.parse(res.text ?? "null"));
    if (!parsed.success) throw new Error("RCA_INVALID_JSON");
    return parsed.data;
  };
  try {
    return await run().catch(() => run());
  } catch {
    throw new Error("RCA_FAILED");
  }
}

/** A user-added action: Gemini classifies its strength (SPEC §2.4.3). */
export async function classifyAction(actionText: string): Promise<{ strength: ActionStrength; rationale: string }> {
  const res = await generate(env.modelFast(), {
    contents: actionText,
    config: {
      systemInstruction: `Определи силу корректирующей меры по иерархии RCA². Ответь strength и одной короткой строкой rationale по-русски.\n${RCA2}`,
      responseMimeType: "application/json",
      responseJsonSchema: {
        type: "object",
        properties: { strength: strengthEnum, rationale: { type: "string" } },
        required: ["strength", "rationale"],
      },
      temperature: 0,
    },
  });
  return z.object({ strength: z.enum(ACTION_STRENGTHS), rationale: z.string() }).parse(JSON.parse(res.text ?? "null"));
}

/** Computed in code, never by AI (SPEC §2.4.4): warn when no action is strong or medium. */
export function onlyWeakActions(actions: { strength: ActionStrength }[]): boolean {
  return actions.length > 0 && !actions.some((a) => a.strength === "strong" || a.strength === "medium");
}
