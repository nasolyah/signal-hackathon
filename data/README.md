# Seed data

`incidents.json` — 120 synthetic incidents from teammate C (Aug 3 – Oct 31 2026, all Russian).
`report_text` is fed through the real pipeline by `scripts/seed.ts` and is **never stored** (same rule as live reports).

## Built-in patterns (checked 17 Nov)
| Seed | Records | Hospitals | Night | What |
|---|---|---|---|---|
| P1 | 11 | А, Б, Г, Д | 9 | insulin mix-ups (Aug 3 – Oct 5) — demo alert, live report makes it 12 |
| P2 | 7 | В only | 7 | falls, building 2, burnt-out light |
| P3 | 5 | Е only | 1 | same-surname misidentification |

Risk: #55, #93, #112 mention insulin but are not P1 — watch that they don't leak into the P1 cluster when tuning `SIM_THRESHOLD`.

## Label → key mapping (dataset uses lowercase Russian)
- `hospital`: «Больница А (Ташкент)» → `A`, Б → `B`, В → `C`, Г → `D`, Д → `E`, Е → `F` (by the letter).
- `shift`: день → `day`, ночь → `night`. `date` → `incident_date`. `pattern_id` → `seed_pattern`.
- `expected_type`: лекарства → medication · падение → fall · идентификация пациента → patient_identification · коммуникация и передача пациента → communication_handover · инфекции → infection · **хирургия → surgery** · диагностика → diagnosis · оборудование → equipment · выписка → discharge.
- `expected_harm`: без вреда → none · лёгкий → mild · умеренный → moderate · тяжёлый → severe · смерть → death.
- `expected_factors` (not in schema, eval only if needed): усталость → fatigue · нехватка персонала → staffing_shortage · нарушение пересменки → handover_failure · **похожие упаковки → similar_packaging** · сбой оборудования → equipment_failure · неразборчивое назначение → illegible_prescription · плохое освещение → poor_lighting.
- `department` values (use as the /report select): терапия, хирургия, кардиология, эндокринология, травматология, родильное, реанимация.
