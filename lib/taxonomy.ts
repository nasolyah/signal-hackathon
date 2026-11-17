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
