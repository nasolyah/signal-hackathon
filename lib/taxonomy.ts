// Enum keys from docs/SPEC.md §3. Store English keys, show Russian labels (lib/i18n).

export const INCIDENT_TYPES = [
  "medication",
  "fall",
  "patient_identification",
  "communication_handover",
  "infection",
  "surgery",
  "diagnosis",
  "equipment",
  "discharge",
  "other",
] as const;

export const STAGES = [
  "prescribing",
  "dispensing",
  "administration",
  "monitoring",
  "diagnosis",
  "procedure",
  "transfer",
  "discharge",
  "other",
] as const;

export const HARMS = ["none", "mild", "moderate", "severe", "death"] as const;

export const FACTORS = [
  "fatigue",
  "similar_packaging",
  "staffing_shortage",
  "poor_lighting",
  "illegible_prescription",
  "equipment_failure",
  "handover_failure",
  "communication",
  "missing_protocol",
  "training_gap",
  "patient_factors",
  "environment",
  "other",
] as const;

export const ACTION_STRENGTHS = ["strong", "medium", "weak"] as const;

export const SHIFTS = ["day", "night"] as const;

export const CAUSE_CATEGORIES = [
  "people",
  "process",
  "equipment",
  "environment",
  "materials",
  "communication",
] as const;

export const HOSPITAL_CODES = ["A", "B", "C", "D", "E", "F"] as const;
/** v2: two districts of Samarkand region (supabase/migration_v2.sql). */
export const DISTRICTS = { "SAM-1": ["A", "B", "C"], "SAM-2": ["D", "E", "F"] } as const;
export type DistrictId = keyof typeof DISTRICTS;
export const DISTRICT_IDS = Object.keys(DISTRICTS) as DistrictId[];

/** Departments seen in the seed dataset (data/README.md); used by the /report select. */
export const DEPARTMENTS = [
  "therapy",
  "surgery",
  "cardiology",
  "endocrinology",
  "traumatology",
  "maternity",
  "icu",
] as const;
export type Department = (typeof DEPARTMENTS)[number];

/** v2: who was involved, as a role — never a name (CLAUDE.md rule 7). */
export const INVOLVED_ROLES = ["nurse", "doctor", "junior_staff", "pharmacist", "lab", "other", "unknown"] as const;
export type InvolvedRole = (typeof INVOLVED_ROLES)[number];

export type IncidentType = (typeof INCIDENT_TYPES)[number];
export type Stage = (typeof STAGES)[number];
export type Harm = (typeof HARMS)[number];
export type Factor = (typeof FACTORS)[number];
export type ActionStrength = (typeof ACTION_STRENGTHS)[number];
export type Shift = (typeof SHIFTS)[number];
export type CauseCategory = (typeof CAUSE_CATEGORIES)[number];
export type HospitalCode = (typeof HOSPITAL_CODES)[number];

/** Placeholders that replace personal data in the stored text. */
export const PLACEHOLDERS = ["[ПАЦИЕНТ]", "[СОТРУДНИК]", "[ПАЛАТА]", "[НОМЕР]", "[ДАТА]"] as const;
