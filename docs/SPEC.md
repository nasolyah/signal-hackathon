# SPEC — «Сигнал» (working name)

Read together with `/CLAUDE.md`. This file is the single source of truth for scope. If something is not here, it is out of scope until Mark says otherwise.

> **v2 (18 Nov):** `docs/SPEC_V2_FLOW.md` overrides the screens (§2), build order (§6) and out-of-scope list of this file. Sections 3–5 (enums, AI pipeline, data) still apply. The local name heuristic in step 0 from the v2 kit was **not** adopted (Mark, 18 Nov: too risky on deadline day).

---

## 1. Stack

| Layer | Choice |
|---|---|
| App | Next.js (App Router, TypeScript), server actions / route handlers |
| UI | Tailwind + shadcn/ui, Recharts for charts, lucide icons |
| DB | Supabase Postgres + `pgvector` (schema in `supabase/schema.sql`) |
| AI | Google Gemini via `@google/genai` (server only) |
| Deploy | Vercel |

### Env vars (`.env.local`, never committed)
```
GEMINI_API_KEY=
GEMINI_MODEL_FAST=      # current Gemini Flash model — check exact name in Google AI Studio
GEMINI_MODEL_SMART=     # current Gemini Pro model — used for RCA and pattern naming
GEMINI_EMBED_MODEL=     # current Gemini embedding model
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=   # server only
```
Embedding size: request `outputDimensionality: 768` if the model supports it. If it does not, change `vector(768)` in `schema.sql` to the model's size.

---

## 2. Screens

No auth. A role switcher in the header (Сотрудник / Больница / Минздрав) just links between screens.

### 2.1 `/report?h=<hospital_code>` — mobile-first, role «Сотрудник»
- Hospital comes from the QR link (`h=A`…`F`), shown as a read-only chip. No hospital picker.
- Fields: department (optional select), shift (День / Ночь, default by current time), free-text textarea (placeholder: «Опишите, что произошло. Имена и номера палат система удалит автоматически.»).
- Trust line under the form: «Отчёт анонимный: мы не сохраняем ваше имя, IP-адрес и исходный текст».
- Submit → loading state (~3–6 s) → **result view**:
  - De-identified text with placeholders (`[ПАЦИЕНТ]`, `[СОТРУДНИК]`, `[ПАЛАТА]`, `[НОМЕР]`, `[ДАТА]`) highlighted.
  - «Удалено персональных данных: N».
  - Classification chips: type, stage, harm, near miss, factors.
  - If the report joined a pattern: «Похожие случаи уже есть в других больницах — это поможет найти системную причину».
  - Button «Отправить ещё один отчёт».

### 2.2 `/dashboard` — desktop, role «Минздрав»
- KPI row (4 tiles): всего отчётов · доля почти-ошибок · тяжёлые и смерти · открытые закономерности.
- **Pattern alerts** (top, most prominent): card per pattern → title, «N случаев · M больниц · X% ночью», top factors, link to `/pattern/[id]`. When a new incident joins a pattern, the counter animates.
- Charts: incidents by type (bar), by hospital (bar), day vs night (simple split).
- Incident feed table: date, hospital, type, harm, near miss, status; filters by hospital/type/harm. Row → `/incident/[id]`.
- Optional filter «Больница» turns it into the hospital-level view (role «Больница»).

### 2.3 `/pattern/[id]`
- Title + AI description of the common thread, stats (incidents, hospitals, night share, top factors), list of incidents in the cluster, button «Начать разбор» → RCA on the pattern.

### 2.4 `/incident/[id]` — incident + RCA
- Left: de-identified text, editable classification (human_verified flips to true on save).
- Right: RCA panel:
  1. «5 почему» chain (AI draft, each step editable).
  2. Causes grouped by 6 categories: Люди · Процессы · Оборудование · Среда · Материалы · Коммуникация.
  3. Actions list: text, strength badge (Сильная / Средняя / Слабая), owner, due date. User can add own action → Gemini classifies its strength.
  4. **Warning banner, computed in code (not by AI):** if there is no action with strength `strong` or `medium` → «Все меры слабые. Инструктаж и предупреждения редко предотвращают повтор — добавьте меру, которая меняет систему».
- Status: Новый → На разборе → Закрыт.

### 2.5 Out of scope for the deadline
Voice input · Telegram bot · auth/roles · Uzbek UI (unless time) · «вы сообщили — мы исправили» feed (only if time) · confidential mode with one-time code (only if time).

---

## 3. Enums (store English keys, show Russian labels)

**incident_type**
| key | RU label |
|---|---|
| medication | Лекарства |
| fall | Падение |
| patient_identification | Идентификация пациента |
| communication_handover | Коммуникация и передача пациента |
| infection | Инфекции |
| surgery | Хирургия и процедуры |
| diagnosis | Диагностика |
| equipment | Оборудование |
| discharge | Выписка |
| other | Другое |

**stage**: prescribing (Назначение) · dispensing (Выдача) · administration (Введение) · monitoring (Наблюдение) · diagnosis (Диагностика) · procedure (Процедура) · transfer (Перевод/пересменка) · discharge (Выписка) · other (Другое)

**harm** (WHO harm levels): none (Без вреда) · mild (Лёгкий) · moderate (Умеренный) · severe (Тяжёлый) · death (Смерть)

**factors** (fixed list, AI must pick only from it): fatigue (Усталость) · similar_packaging (Похожие упаковки/названия) · staffing_shortage (Нехватка персонала) · poor_lighting (Плохое освещение) · illegible_prescription (Неразборчивое назначение) · equipment_failure (Сбой оборудования) · handover_failure (Нарушение пересменки) · communication (Коммуникация) · missing_protocol (Нет протокола/чек-листа) · training_gap (Недостаток подготовки) · patient_factors (Факторы пациента) · environment (Среда/помещение) · other (Другое)

**action_strength** (RCA² hierarchy):
- strong — physical/architectural changes, forcing functions, standardizing equipment or process, simplifying a process, tangible leadership involvement. Example: «Хранить инсулины разного действия на разных полках/в разных холодильниках».
- medium — checklists and cognitive aids, eliminating look-alikes, software changes, more staff / less workload, standardized communication (handover template), simulation training, reducing distractions.
- weak — double checks, warnings, new policy or memo, training/instruction, «быть внимательнее».

Note: the synthetic dataset uses Russian labels in `expected_type` / `expected_harm`; the seed script maps them to keys with the tables above.

---

## 4. AI pipeline (server only)

### Step 0 — local pre-scrub (regex, before any AI call)
Replace with placeholders: ward numbers («палата 12», «12-палата») → `[ПАЛАТА]`; medical record numbers («ИБ-45821», «история болезни №…») → `[НОМЕР]`; phone numbers → `[НОМЕР]`; exact dates/times → `[ДАТА]`. Count replacements.

### Step 1 — analyze (GEMINI_MODEL_FAST, structured output)
One call, `responseMimeType: application/json` + `responseSchema`. Output:
```json
{
  "redacted_text": "string — same text, all remaining names of patients/staff → [ПАЦИЕНТ]/[СОТРУДНИК], indirect identifiers (e.g. 'the only anesthesiologist on the night shift') → generalized; do not change meaning",
  "redaction_count": 0,
  "incident_type": "enum incident_type",
  "stage": "enum stage",
  "harm": "enum harm",
  "near_miss": true,
  "factors": ["enum factors, 1–3 items"],
  "summary": "one neutral sentence in Russian, no names, describing what happened and the likely system factor"
}
```
Prompt rules: text may be Russian, Uzbek or mixed; do not invent facts; harm = what actually happened to the patient; near_miss = error caught before reaching the patient. Total redaction_count shown to user = regex count + AI count.

### Step 2 — embed
Embed `summary + " | " + incident_type + " | " + factors.join(", ")` with GEMINI_EMBED_MODEL → `incidents.embedding`.

### Step 3 — pattern matching (on every new report)
- Find nearest neighbors by cosine similarity (pgvector `<=>`), threshold `SIM_THRESHOLD` (start at 0.80, tune on seed data so P1/P2/P3 come out clean).
- If ≥ 3 of the top-5 neighbors share a `pattern_id` → attach the new incident to that pattern, recompute pattern stats (incident_count, hospital_count, night_share, top_factors).
- New patterns are not created live; they come from the batch job (step 4). Keep the demo deterministic.

### Step 4 — batch pattern discovery (`scripts/patterns.ts`, run after seeding; also a hidden admin button)
- Build graph: edge if similarity ≥ SIM_THRESHOLD; clusters = connected components.
- Keep clusters with ≥ 5 incidents (P2 and P3 are single-hospital patterns, so do NOT require multiple hospitals).
- For each kept cluster: GEMINI_MODEL_SMART names it → `{ title, description }` in Russian (title like «Путаница инсулинов короткого и длительного действия»), stats computed in code.
- Expected on seed: 3 patterns (insulin night shift ×11 in 4 hospitals; falls in Больница В building 2 at night ×7; same-surname misidentification in Больница Е ×5). If clustering is noisy, it is acceptable to `// HACK:` assign by `pattern_id` from the dataset for the demo — but try the real thing first.

### Step 5 — RCA draft (GEMINI_MODEL_SMART, structured output)
Input: incident (or all incidents of a pattern, de-identified). Output:
```json
{
  "whys": ["5 short steps, each answers 'why' to the previous"],
  "causes": { "people": [], "process": [], "equipment": [], "environment": [], "materials": [], "communication": [] },
  "actions": [{ "text": "string", "strength": "strong|medium|weak", "rationale": "one line why this strength" }]
}
```
Rules in prompt: focus on systems, never blame a person; propose at least one strong action; use the RCA² hierarchy from section 3.
Classify a user-added action: separate small call → `{ "strength": "...", "rationale": "..." }`.

### Error handling
If Gemini fails or times out: return a friendly error, do not store anything, do not log raw text. Retry once.

---

## 5. Data

### Seed
- `data/incidents.json` — 120 synthetic incidents from teammate C (fields: id, hospital, department, date, shift, report_text, expected_type, expected_harm, expected_near_miss, expected_factors, pattern_id). Until it arrives, use 10 hand-written stubs.
- `scripts/seed.ts`: for each record → run the real pipeline (steps 0–2) on `report_text` → insert. `report_text` itself is NOT stored (same rule as live). Store expected_* for eval only. Then run `scripts/patterns.ts`.
- 6 hospitals: A Ташкент · Б Самарканд · В Фергана · Г Андижан · Д Бухара · Е Наманган. Codes A–F in QR links map to these.

### Eval (`scripts/eval.ts`)
Compare AI output vs expected_* on the seed: accuracy for incident_type, harm, near_miss; print a table. Mark uses the number with the technical mentor («тип определяется верно в X% случаев»).

---

## 6. Build order (tick as you go)

Today, 17 Nov
- [ ] Next.js + Tailwind + shadcn scaffold, deploy to Vercel, env vars set
- [ ] Gemini smoke test: step 1 on 5 sample texts, check Russian output and JSON validity
- [ ] Supabase: run `schema.sql`, hospitals inserted
- [ ] `/report` + steps 0–2 → first end-to-end slice (report → stored de-identified incident)
- [ ] Seed with stubs (then real dataset from C)
- [ ] `/dashboard`: KPIs, feed, charts
- [ ] Batch pattern discovery + alert cards + live attach (step 3)

Tomorrow, 18 Nov (before 12:00)
- [ ] `/incident/[id]` with RCA (step 5) + weak-actions warning
- [ ] `/pattern/[id]`
- [ ] Eval script → accuracy number
- [ ] Polish: `/impeccable polish`, `break-ui`, QR code generation for `/report?h=A`
- [ ] Backup demo video
- Buffer 12:00–17:00 for bugs and mentor meetings. Submit well before 18:00.
