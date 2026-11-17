# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Reporting staff (primary).** Nurses and doctors in Uzbek hospitals. They open a link from a QR code on the wall of the staff room on their own phone, often at night, tired, and afraid of punishment: today an error becomes known only when it turns into a criminal case. Their job: describe what happened in about a minute, in their own words, and see for themselves that their name and the patients' names were removed.
- **Hospital quality lead.** Reviews incidents of their hospital, confirms or corrects the AI classification, runs root-cause analysis and picks corrective actions.
- **Ministry of Health analyst.** Sees the national picture: recurring patterns across hospitals that no single hospital can see on its own.
- **Hackathon audience (now).** Mentors (technical, business, domain) scan the QR and fill in a report on their own phones; the result and the dashboard are also shown on a laptop, read from a distance.

## Product Purpose

Anonymous, blameless reporting of patient-safety incidents and near misses, so errors stop being hidden and stop repeating. AI de-identifies each report, classifies it by the WHO patient-safety taxonomy (ICPS), finds patterns across hospitals, and helps run a root-cause analysis whose corrective actions are ranked by strength (RCA²). Success: more reports and more near misses (trust is growing), stronger corrective actions, fewer repeats in the same cluster after an action.

## Positioning

Aviation-style confidential reporting (NASA ASRS) carried into Uzbek healthcare, with AI instead of forms: free text in, de-identified structured data out; patterns visible only at national scale ("11 insulin mix-ups in 4 hospitals, 9 at night"); and a built-in refusal to close an incident with a weak action like "retrain staff". Main competitor is the status quo (silence); the global incumbent RLDatix is expensive, English-language and form-based.

## Operating Context

- Report flow: QR in the staff room → mobile web page, no login, no app → free text → result screen. Hospital comes from the QR link (`/report?h=A`).
- Reports are written in Russian, Uzbek (Latin or Cyrillic) or mixed, with typos.
- Night shift in a dim staff room: system dark theme must be respected, large type, the submit button within thumb reach.
- Review flow (desktop): Ministry dashboard → pattern → incident → RCA panel.
- Demo: 3-minute pitch + 2-minute live demo; the result screen and dashboard are read from a laptop across a table.

## Capabilities and Constraints

- Privacy is the product: raw report text is never stored or logged; no auth, cookies, IP or user agent in the report flow; date + shift only, never exact time; department breakdown only for groups of ≥ 5 reports. Full rules: CLAUDE.md, docs/SPEC.md.
- The report form requires nothing but the text. Department and shift are optional; shift is pre-filled from the current time.
- AI suggests, a human confirms: every AI classification is editable.
- Russian UI first, all strings in `lib/i18n/ru.ts`; Uzbek UI later.
- Stack and scope are fixed by docs/SPEC.md (Next.js, Supabase, Gemini, Vercel). Out of scope until said otherwise: voice, Telegram bot, auth/roles, Uzbek UI.
- Undecided: final product name («Сигнал» is a working name; the team may propose another).

## Brand Commitments

- No binding name, logo or palette yet.
- **Voice (binding).** Never use frightening or blaming words in staff-facing UI: no «ошибка», «нарушение», «виновный», «жалоба». Use neutral ones: «Что произошло?», «случай», «сообщить». The form's headline speaks about helping the system, e.g. «Помогите сделать работу безопаснее». A frightening word scares people away more than any design.

## Evidence on Hand

- `data/incidents.json`: 120 synthetic incidents with three built-in patterns (P1: 11 insulin mix-ups in 4 hospitals, 9 at night; P2: 7 night falls in Больница В; P3: 5 same-surname misidentifications in Больница Е). Synthetic — must always be labelled as such, never presented as real data.
- `docs/briefing.pdf`: real Uzbek cases (Fergana amputation, Bukinsky district, Samarkand), WHO statistics, legal analysis, business model assumptions.
- No real reports, testimonials, customers or pilot results exist. Do not fabricate them.

## Product Principles

1. **Safety is felt before it is promised.** The reporter sees, before submitting, that name, IP and original text are not kept — and after submitting, exactly what was removed.
2. **Systems, not people.** Every word and screen points at causes and fixes, never at a culprit. Nothing should feel like a complaint or a denunciation.
3. **One field is enough.** Free text in your own language; everything else is optional or automatic.
4. **Readable at a glance, from a distance.** The result, the pattern alert and the RCA warning must land in a second on a phone and across a table on a laptop.
5. **AI proposes, people decide.** Classifications and actions are always visible as suggestions and editable.

## Accessibility & Inclusion

- Large type and high contrast for tired eyes at night; respect `prefers-color-scheme` (dark) and reduced motion.
- Primary action within thumb reach on phones.
- Mixed Russian/Uzbek input; Cyrillic and Uzbek Latin (oʻ, gʻ) must render correctly.
