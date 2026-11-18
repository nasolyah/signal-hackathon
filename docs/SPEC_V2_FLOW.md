# SPEC v2 — operating flow (analyst → hospital → district)

Read with `/CLAUDE.md` and `docs/SPEC.md`. **This file overrides SPEC.md where they disagree** (screens, build order, out-of-scope list). Pipeline steps 0–5, enums and seed rules from SPEC.md stay as they are.

Why v2: the business mentor said chief doctors will not study a dashboard (it is extra work for them), and the Ministry works through districts. So the hospital no longer *pulls* data. Our analyst *pushes* a short weekly digest with 1–3 concrete actions, the chief doctor only decides yes/no, and the district health department sees who reacted and how fast.

---

## 1. The flow

```
Staff (QR) → /report → AI (scrub + classify + pattern) → Analyst inbox
Analyst → «Собрать сводку» (AI draft) → edits → sends → Hospital (chief doctor)
Chief doctor → accept / reject each item, set action + due date → marks done later
             → optional: question to the anonymous author (relayed by analyst)
District → table of its hospitals: reaction time, actions planned/done, overdue → check-in
Ministry → /dashboard (existing): cross-district patterns, aggregates only
Staff → «Что изменилось» feed on /report and on /r/[code]
```

## 2. Hard privacy rules added in v2 (do not break, even if asked in a later prompt)

1. **No name fields anywhere.** Not for the reporter, not for the people involved. The form asks for a *role* (`involved_role`) instead.
2. **No «reveal the author» feature, no name lookup, no admin override.** The system does not know who wrote a report, so it can say so honestly.
3. Voluntary contact lives only in `report_contacts`, is visible **only on analyst screens**, never in hospital / district / ministry screens or API responses for them, and has `delete_after` (30 days). Deleting it is a `// HACK:` manual button for the demo; a cron is production work.
4. The follow-up code is shown once to the reporter. Store only `sha256(code)` in `incidents.followup_code_hash`.
5. District and ministry screens show **aggregates and digest item titles only** — never incident texts, never contacts.
6. Department breakdown still needs ≥ 5 reports (rule from CLAUDE.md).
7. District metrics measure **reaction**, not error counts. Show the line «Больше отчётов — признак доверия, а не плохой работы» on the district screen. Never rank hospitals by number of errors.

## 3. Roles (no auth for the demo)

Header role switcher (replace the old 3-role switcher): **Сотрудник · Аналитик · Больница · Район · Минздрав**. Each just links to its screen. Mark this `// HACK: no auth` in the layout; in production every role is a login.

| Role | Screen | Sees |
|---|---|---|
| Сотрудник | `/report?h=A`, `/r/[code]` | own report result, questions to them, «что изменилось» |
| Аналитик (наш сотрудник) | `/analyst` | all de-identified incidents of its hospitals, flags, contacts, digests, questions |
| Больница (главврач) | `/hospital/[id]` | digests for its hospital, own de-identified incidents, actions |
| Район | `/district/[id]` | reaction stats per hospital, digest titles, check-ins |
| Минздрав | `/dashboard` | existing dashboard + district filter, aggregates only |

## 4. Screens

### 4.1 `/report?h=<code>` — changes to the existing form
Add, in this order, under the free-text field:
- **«Кто участвовал (роль)»** — select: Медсестра · Врач · Младший персонал · Фармацевт · Лаборатория · Другое · Не знаю → `involved_role`. Helper text: «Имена не нужны — нам важна ситуация, а не человек».
- Checkbox **«Я сам(а) участвовал(а) в этой ситуации»** → `reporter_involved`.
- Collapsible **«Можно со мной связаться (необязательно)»** → one input (Telegram или телефон) + note: «Контакт видит только аналитик проекта, не больница. Удаляется через 30 дней».

Result screen additions:
- **Follow-up code** (8 chars, alphabet without 0/O/1/I, formatted `K7P4-QX9M`) + link `/r/<code>` + text «Сохраните код: по нему вы увидите вопросы и что изменилось. Мы не знаем, кто вы, поэтому восстановить код нельзя».
- If `harm` is `severe` or `death`: amber banner «Если пациент серьёзно пострадал, обязательно сообщите и по официальному каналу больницы. Эта система не заменяет служебное расследование.»
- Bottom block **«Что изменилось в вашей больнице»**: last 3 `digest_actions` with `status='done' and show_to_staff` for this hospital (title + action + date). Empty state: «Пока нет — первые меры появятся после первой сводки».

### 4.2 `/r/[code]` — anonymous follow-up (mobile)
- Hash the code server-side, find the incident; wrong code → neutral «Код не найден».
- Shows: report summary (de-identified), status («Принят → В сводке → Принята мера»), open questions with a textarea to answer (writes `questions.answer`, status `answered`), the «Что изменилось» block.

### 4.3 `/analyst` — our analyst (desktop)
Left column: hospitals of the analyst's districts with counters «новых за неделю».
Main area, tabs-free stacked sections:
1. **Inbox** — this week's incidents (not yet in a digest): date, shift, type, harm, role, summary. Badges: `Есть контакт`, `Обвинительный тон` (blame_flag), `Тяжёлый вред`. Analyst can toggle «Не включать в сводку» for blame-only or junk reports (`incidents.excluded_from_digest`).
2. **«Собрать сводку»** per hospital → calls step 6 → opens the digest editor: headline, 1–3 items (title, what, why, actions with strength badges — reuse the RCA strength badge component), stats line, analyst note. All fields editable. Button **«Отправить главврачу»** → `status='sent'`, `sent_at=now()`, attach incidents (`incidents.digest_id`).
3. **Questions** — list of `questions` with status `open`: shows the question + incident summary. If the incident has a contact → show it with «Связаться вручную» and a «Записать ответ» field; otherwise «Переслать автору» (status `forwarded`; the author sees it on `/r/[code]`). Answers relay back to the hospital as-is.

### 4.4 `/hospital/[id]` — chief doctor (desktop, also usable on phone)
- Top: current digest card (period, headline, stats line). First open sets `acknowledged_at` and `status='acknowledged'`.
- Each item: what / why / suggested actions. Buttons:
  - **«Принять меру»** → editable action text (prefilled with the strongest suggestion), due date, strength (if the doctor edits the text → classify with the existing «classify action strength» call). Weak-only warning from SPEC.md applies here too.
  - **«Отклонить»** → reason (required).
  - **«Задать вопрос автору»** → textarea → creates `questions` row for one incident of the item. Hint: «Имя автора не передаётся. Аналитик перешлёт вопрос анонимно».
- Section **«Меры в работе»**: accepted actions with due dates; «Выполнено» → `status='done'`, `done_at`; checkbox «Показать персоналу» (default on).
- Section **«Ответы»**: answered questions.
- Link to the existing incident views for this hospital (de-identified).

### 4.5 `/district/[id]` — district health department
- Header: district name, period selector (last 4 weeks).
- Line: «Больше отчётов — признак доверия, а не плохой работы».
- Table, one row per hospital: отчётов за неделю · сводка (отправлена / просмотрена через N ч / не просмотрена > 48 ч) · мер принято · выполнено · просрочено · последняя проверка. Sort default = most overdue first, **never by number of errors**.
- Row expand: digest item titles + decisions (no incident texts).
- Button **«Назначить проверку»** → `checkins` row (date + note); mark done later.
- Small block: patterns that span several hospitals of this district (from `patterns`, titles + counts).

### 4.6 `/dashboard` — Ministry (existing)
Add a district filter and a KPI tile «Сводок просмотрено вовремя, %». Nothing else.

## 5. AI changes

### Step 1 (existing analyze call) — add to the JSON schema
```json
{ "blame_language": true, "blame_reason": "short, Russian, why the text looks like blaming a person" }
```
Prompt rule: `blame_language = true` when the text is mainly an accusation of a person (character judgments, «он всегда», demands to punish) rather than a description of what happened. Still scrub all names as before. Store `blame_language` → `incidents.blame_flag`. Do not store `blame_reason` (show it to the analyst only at request time if needed; HACK: can skip).

### Step 6 — weekly digest draft (GEMINI_MODEL_SMART, structured output)
Input: the hospital's not-yet-digested incidents for the period (summary, type, stage, harm, near_miss, factors, involved_role, shift — **never contacts**), plus patterns these incidents belong to (title, incident_count, hospital_count).
Output:
```json
{
  "headline": "one sentence, Russian, the main thing this week",
  "items": [
    {
      "title": "short, e.g. «Путаница инсулинов на ночной смене»",
      "what": "1–2 sentences, no names, no ward numbers",
      "why": "likely system factor(s)",
      "incident_ids": ["uuid"],
      "pattern_id": "uuid or null",
      "actions": [{ "text": "...", "strength": "strong|medium|weak", "rationale": "one line" }]
    }
  ]
}
```
Rules in prompt: 1–3 items max, ordered by risk (harm, then repetition, then cross-hospital pattern); focus on systems, never on a person; every item has at least one strong or medium action; plain language a busy chief doctor reads in 2 minutes. Stats (`reports`, `near_miss_share`, `severe`) are computed in code, not by AI.
Error handling as in SPEC.md.

### District numbers — code only, no AI
`hours_to_ack = acknowledged_at - sent_at`; overdue = `status='planned' and due_date < today`; «не просмотрена» = `sent` and `now() - sent_at > 48h`.

## 6. Seed additions (`scripts/seed-v2.ts`)
Run after the existing seed. Deterministic, so the demo screens look alive:
- Give seed incidents a random `involved_role` (weighted: nurse 50%, doctor 25%, junior_staff 15%, other 10%) and `reporter_involved` true for ~30%.
- Mark ~5 incidents `blame_flag = true` with texts that clearly blame a person (add them to the stubs if C's dataset has none).
- Create digests for the **previous two weeks** for all 6 hospitals with realistic states:
  - A: sent → acknowledged in 5 h, 2 actions accepted, 1 done (shown to staff).
  - B: acknowledged in 20 h, 1 accepted, 1 rejected with reason.
  - C: sent 3 days ago, **not acknowledged** (shows red on district screen).
  - D: acknowledged, 1 action **overdue**.
  - E, F: acknowledged, actions planned.
  - Leave **this week** undigested for hospital A, so the live demo can build a fresh digest with the insulin pattern.
- 1 open question for hospital A, 1 answered question for hospital B.
- 1 contact on one incident of hospital A (fake Telegram `@demo_nurse`).
- 1 scheduled check-in for hospital C.

## 7. Demo path v2 (replaces the one in CLAUDE.md)
1. Phone: `/report?h=A` → insulin mix-up, role «Медсестра», «я участвовал(а)» → result: scrubbed text, code `K7P4-QX9M`, «что изменилось» block already shows a done action from last week.
2. Laptop `/analyst` → new report in the inbox → «Собрать сводку» for Больница А → AI draft with the insulin item (pattern 12 cases / 4 hospitals) → send.
3. `/hospital/A` → accept the strong action («разные полки для инсулинов»), due date → «Задать вопрос автору».
4. Phone `/r/K7P4-QX9M` → the question is there → answer.
5. `/district/SAM-1` → Больница А acknowledged in minutes, 1 action planned; Больница C red «не просмотрена».
6. (If asked) `/incident/[id]` → full RCA as before.

## 8. Build order for 18 Nov (stop at the line if time runs out)

**P0 — must have before mentors see it**
- [ ] Run `migration_v2.sql`; update DB types.
- [ ] Role switcher (5 roles).
- [ ] `/report` form fields + follow-up code + severe-harm banner.
- [ ] Step 6 digest generation + `/analyst` inbox and digest editor + send.
- [ ] `/hospital/[id]`: digest view, accept/reject, mark done.
- [ ] `/district/[id]`: table with reaction metrics.
- [ ] `seed-v2.ts`.

**P1 — the trust loop**
- [ ] Questions: hospital → analyst → `/r/[code]` → answer back.
- [ ] «Что изменилось» block on `/report` and `/r/[code]`.
- [ ] `blame_flag` in step 1 + badge in inbox.

**P2 — only if everything above works**
- [ ] Check-ins on district screen.
- [ ] District filter + KPI tile on `/dashboard`.
- [ ] Contact delete button.

## 9. Out of scope (unchanged + new)
Auth · Telegram bot / auto-sending digests to Telegram (show a «Отправить в Telegram» button that copies text — `// HACK:`) · email · cron jobs · Uzbek UI (unless time) · any feature that identifies a person.
