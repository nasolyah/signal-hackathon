import "server-only";
import { GoogleGenAI } from "@google/genai";
import { env } from "@/lib/env";

let client: GoogleGenAI | null = null;

export function gemini(): GoogleGenAI {
  client ??= new GoogleGenAI({
    apiKey: env.geminiApiKey(),
    httpOptions: { timeout: 30_000 },
  });
  return client;
}

/** Run fn, retry once on failure (SPEC §4 error handling). */
export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch {
    return await fn();
  }
}
