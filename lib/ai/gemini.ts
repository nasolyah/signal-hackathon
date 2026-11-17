import "server-only";
import { GoogleGenAI, type GenerateContentParameters, type GenerateContentResponse } from "@google/genai";
import { env } from "@/lib/env";

let client: GoogleGenAI | null = null;

export function gemini(): GoogleGenAI {
  client ??= new GoogleGenAI({
    apiKey: env.geminiApiKey(),
    // Short per-attempt timeout so a fallback model gets its turn quickly.
    httpOptions: { timeout: 20_000 },
  });
  return client;
}

/** Overload / quota / timeout → try the next model. Bad request (400, 403, 404) → stop. */
function isRetryable(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  const code = Number(msg.match(/"code":\s*(\d{3})/)?.[1] ?? NaN);
  if ([429, 500, 502, 503, 504].includes(code)) return true;
  return /timed? ?out|abort|deadline|ECONNRESET|fetch failed/i.test(msg);
}

/**
 * Try each model in order (env var holds a comma-separated list, e.g.
 * "gemini-3.5-flash,gemini-3.5-flash-lite"). The demo must survive a model being overloaded.
 */
export async function withModelFallback<T>(models: string[], fn: (model: string) => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (const model of models) {
    try {
      return await fn(model);
    } catch (e) {
      lastError = e;
      if (!isRetryable(e)) break;
    }
  }
  throw lastError;
}

export function generate(
  models: string[],
  params: Omit<GenerateContentParameters, "model">,
): Promise<GenerateContentResponse> {
  return withModelFallback(models, (model) => gemini().models.generateContent({ ...params, model }));
}
