# «Сигнал» — anonymous patient-safety incident reporting (working name)

National AI Hackathon, Tashkent, Ministry of Health track, task №7: "Medical errors are hidden out of fear of punishment, so they repeat." Blameless Reporting & Root-Cause Analysis.

**Full spec: `docs/SPEC.md` — read it before starting any feature.** DB schema: `supabase/schema.sql`.

## Hard facts about this project
- **Deadline: 18 Nov 2026, 18:00 (Asia/Tashkent).** Mentors (technical, business, domain) judge the project separately before that. Final (if we qualify) is 19 Nov: 3 min pitch + 2 min live demo + 2 min Q&A.
- **One developer (Mark)** does all code and design. Scope is cut hard — do not add features that are not in SPEC.md.
- UI language: **Russian** first. Uzbek only if time is left. Keep all UI strings in one dictionary file so Uzbek can be added later.
- AI provider: **Google Gemini only** (`@google/genai`). Model names live in env vars, never hardcoded.

## Product in one paragraph
A medical worker scans a QR code in the staff room, opens a mobile web page (no login, no app), and describes an error or near miss in free text. Gemini de-identifies the text, classifies it by the WHO patient-safety taxonomy (ICPS), and stores only the de-identified version. A Ministry dashboard finds recurring patterns across hospitals (e.g. "11 insulin mix-ups in 4 hospitals, 9 at night") and an RCA assistant helps the quality lead find root causes and pick strong corrective actions (RCA² hierarchy), warning when only weak actions like "retrain staff" are proposed.

## Non-negotiable rules (privacy is the product)
1. **Never store the raw report text.** It exists only in memory during the request. No `console.log` of raw text, no raw text in error messages, no raw text in DB columns.
2. **No auth, no cookies, no IP or user-agent stored** for the report flow.
3. Store date + shift (day/night) only, never exact time.
4. Dashboard breakdown by department only when ≥ 5 reports in that group.
5. Secrets (`GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) are server-only. Never import them into client components.
6. AI suggests, human confirms: every AI classification is editable in the UI.

## The demo path (everything serves this)
1. Mentor scans QR → `/report?h=A` on their phone → types a report about an insulin mix-up.
2. Result screen: de-identified text with removed parts highlighted + classification.
3. Laptop: `/dashboard` → the insulin pattern alert counter goes 11 → 12.
4. Open the pattern → open an incident → RCA: 5 whys, causes by category, actions ranked strong/medium/weak; "retrain staff" gets flagged as weak.

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
- Product UI (all screens here) → `impeccable` (`/impeccable shape` before a new screen). Final pass → `/impeccable critique` and `polish`. No landing page, so `design-taste-frontend` is not used.
- Motion only where it helps the demo (`emil-design-eng`, `animate`): the alert counter change, the redaction highlight.
- Before submission → `security-reviewer` agent on API routes, then `break-ui` on demo screens (long texts, empty states).
- Backup demo video → `ui-demo` skill.
