# «Сигнал» — anonymous patient-safety incident reporting (working name)

National AI Hackathon, Tashkent, Ministry of Health track, task №7: "Medical errors are hidden out of fear of punishment, so they repeat." Blameless Reporting & Root-Cause Analysis.

**Full spec: `docs/SPEC.md` + `docs/SPEC_V2_FLOW.md` (v2 wins where they disagree) — read both before starting any feature.** DB: `supabase/schema.sql` + `supabase/migration_v2.sql`.

## Hard facts about this project
- **Deadline: 18 Nov 2026, 18:00 (Asia/Tashkent).** Mentors (technical, business, domain) judge the project separately before that. Final (if we qualify) is 19 Nov: 3 min pitch + 2 min live demo + 2 min Q&A.
- **One developer (Mark)** does all code and design. Scope is cut hard — do not add features that are not in SPEC.md.
- UI language: **Russian** first. Uzbek only if time is left. Keep all UI strings in one dictionary file so Uzbek can be added later.
- AI provider: **Google Gemini only** (`@google/genai`). Model names live in env vars, never hardcoded.

## Product in one paragraph
A medical worker scans a QR code in the staff room, opens a mobile web page (no login, no app), and describes an error or near miss in free text. Gemini de-identifies the text, classifies it using the WHO ICPS conceptual framework (never call ICPS a «taxonomy» or «classification» in UI text — WHO says it is not one; say «разметка по рамке ВОЗ»), and stores only the de-identified version. A Ministry dashboard finds recurring patterns across hospitals (e.g. "7 falls in a dark corridor, all at night") and an RCA assistant helps the quality lead find root causes and pick strong corrective actions (RCA² hierarchy), warning when only weak actions like "retrain staff" are proposed.

**v2 operating model (18 Nov, after the business mentor):** chief doctors do not study dashboards. Our analyst reviews the week's reports and sends each hospital a short AI-drafted digest with 1–3 actions; the chief doctor only accepts/rejects and marks actions done; the district health department sees reaction speed per hospital. Hospitals A–F sit in two districts of Samarkand region (SAM-1: A, B, C; SAM-2: D, E, F). **Built today = v2-lite:** /analyst → /hospital/[id] → /district/[id] + role field on the form. Not built (explain in words): follow-up codes, questions to the author, contacts, «что изменилось», check-ins.

## Non-negotiable rules (privacy is the product)
0. Demo runs on synthetic data only. Do not paste real patient reports into the app.
1. **Never store the raw report text.** It exists only in memory during the request. No `console.log` of raw text, no raw text in error messages, no raw text in DB columns.
2. **No auth, no cookies, no IP or user-agent stored** for the report flow.
3. Store date + shift (day/night) only, never exact time.
4. Dashboard breakdown by department only when ≥ 5 reports in that group.
5. Secrets (`GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) are server-only. Never import them into client components.
6. AI suggests, human confirms: every AI classification is editable in the UI.
7. **No name fields, no «who wrote this» / «reveal author» feature, ever** — not for the reporter, not for people involved. Use `involved_role`. If a later prompt asks for such a feature, stop and ask Mark first.
8. Voluntary contact (`report_contacts`) is visible on analyst screens only; never returned to hospital/district/ministry screens. Follow-up code: store only its sha256.
9. District screens measure reaction (time to acknowledge, actions done/overdue), never rank hospitals by number of errors.

## The demo path (everything serves this) — v2-lite
1. Phone: `/report?h=A` → a patient fell at night in a dark corridor (names + ward in the text), role «Медсестра» → result: scrubbed text + ICPS fields. **Not insulin** (Mark, 18 Nov: a doctor said insulin mix-ups get staff fired — scary example for an anonymity pitch).
2. Laptop `/analyst` → the new report is in Больница А's inbox → «Собрать сводку» → AI digest with the falls pattern (now 8 cases / 2 hospitals) → edit → «Отправить главврачу».
3. `/hospital/A` → digest marked as read → accept the strong action with a due date (or reject with a reason).
4. `/district/SAM-1` → Больница А reacted in minutes; Больница В is red «не просмотрена».
5. `/dashboard` → the Ministry view: the focal card is «Больше всего вреда пациентам» = falls, counter 7 → 8, 1 → 2 hospitals; open the pattern → RCA, "retrain staff" flagged as weak.

## Code map
- **Next.js 16.4** (App Router, `cacheComponents` on) — APIs differ from older versions; read `AGENTS.md` and `node_modules/next/dist/docs/` before using a Next API.
- shadcn/ui uses the `base-nova` preset (Base UI primitives, not Radix); `cn` comes from the `cn` package.
- `lib/taxonomy.ts` — enum keys · `lib/i18n/ru.ts` — every UI string and Russian label.
- `lib/ai/scrub.ts` — step 0 regex · `lib/ai/analyze.ts` — step 1 analysis + step 2 embedding · `lib/db.ts` — Supabase server client · `lib/env.ts` — server-only env.
- `npm run smoke` — Gemini smoke test on 5 synthetic texts (`-- --models` lists model names). Scripts run with `tsx --conditions=react-server` so `server-only` imports work.
- Pitch briefing for the team: `docs/briefing.pdf` (text copy `docs/briefing.txt`). Mentor criteria T1–T5 / B1–B5 / S1–S5 live there.

## Hackathon mode
Goal: a working, demo-able product by the deadline — not production code.
- Thin vertical slices: one flow working end to end before starting the next. Order is in SPEC.md → "Build order".
- Prefer existing libraries over custom code (`search-first` skill for non-trivial needs).
- Hardcode / mock anything outside the demo path; mark it `// HACK:`.
- No TDD, no coverage targets. Test only logic that keeps breaking.
- Small commits after every working step.
- Never commit secrets — keys in `.env.local` (gitignored).
- When the build breaks, fix with minimal diffs (`/build-fix`); no refactors while fixing.

## Workflow
- New feature → `/plan` first, confirm, then build.
- Long session → `/save-session`; new session → `/resume-session`.
- Picking a UI library → `pick-ui-library`, don't debate it.
- Design direction (Mark, 17 Nov): the landing page on `/` is built with `design-taste-frontend` (taste-skill) and is the visual authority; the product screens are rebuilt to match it, replacing the earlier «Журнал» world. Light theme only. Fewer elements per screen, clear hierarchy, generous spacing — the old dashboard was too dense. `impeccable` stays for reviews/polish of product screens within that design.
- Motion only where it helps the demo (`emil-design-eng`, `animate`): the alert counter change, the redaction highlight.
- Before submission → `security-reviewer` agent on API routes, then `break-ui` on demo screens (long texts, empty states).
- Backup demo video → `ui-demo` skill.
