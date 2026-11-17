import "server-only";

// Server-only env access. Never import this file from a client component.

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing env var ${name} (see .env.example)`);
  return value;
}

export const env = {
  geminiApiKey: () => required("GEMINI_API_KEY"),
  modelFast: () => required("GEMINI_MODEL_FAST"),
  modelSmart: () => required("GEMINI_MODEL_SMART"),
  embedModel: () => required("GEMINI_EMBED_MODEL"),
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseServiceRoleKey: () => required("SUPABASE_SERVICE_ROLE_KEY"),
  simThreshold: () => Number(process.env.SIM_THRESHOLD ?? "0.80"),
};

/** Must match vector(N) in supabase/schema.sql. */
export const EMBEDDING_DIM = 768;
