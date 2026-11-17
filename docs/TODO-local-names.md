# TODO (postponed by Mark, 17 Nov): local name scrubbing before Gemini

**Problem.** Step 0 (`lib/ai/scrub.ts`) removes wards, record numbers, phones and dates locally, but patient/staff **names still reach Gemini** (Google, abroad) and are removed only there. The briefing (S4) claims "two layers: local rules first, then AI — only pre-cleaned text goes to AI", so the technical mentor may ask about this.

**Planned fix — step 0b in `scrub.ts`, decided by context, not by word endings** (drug names like Хумулин, пенициллин also end in -ин):
1. Role word right before a capitalized token → placeholder by role.
   - Staff → `[СОТРУДНИК]`: медсестр*, медбрат*, сестра, врач*, доктор*, хирург*, анестезиолог*, санитар*, акушер*, ординатор*, интерн*, заведующ*, фельдшер*, лаборант*, коллег*, hamshira, shifokor.
   - Patient → `[ПАЦИЕНТ]`: пациент*, больн*, бабушк*, дедушк*, рожениц*, bemor.
2. Surname + initials: `Каримов Б.`, `Рахимов А.К.`, `Юлдашева К.` (also `Б. Каримов`).
3. «с фамилией / по фамилии / два(е) X-овых» constructions.
4. First-name dictionary (Uzbek + Russian, Cyrillic + Latin) with case endings (Гульнора/Гульноры/Гульноре…); a first name alone defaults to `[СОТРУДНИК]`, a surname alone to `[ПАЦИЕНТ]`.
5. Standalone capitalized mid-sentence token with -ов/-ев/-ова/-ева/-ский (+ case endings) and not in the stop-list → `[ПАЦИЕНТ]`. `-ин/-ина` only with context 1–4.
6. Stop-list (seen in `data/incidents.json`): Хумулин (Р, НПХ, Регуляр), Новорапид, Актрапид, Протафан, Левемир, Лантус, Тресиба, Апидра, мешок Амбу, отёк Квинке, аппарат Илизарова, ЭхоКГ.

**Dataset check (17 Nov).** Names in the seed are almost all covered by rules 1–2: «медсестра Зарина», «Дедушка Каримов Б.», «пациента Ахмедова», «Пациенту Назарову», «Больной Турсунов М.», «коллега Шахноза», «Сестра Гульноза», plus same-surname cases (#3, #11, #20, #31, #40, #50 — P3 depends on these).

**Measure when done.** Add a "reaches Gemini" column to `npm run smoke` (names left after step 0) and count, over the 120 seed texts, how many `[ПАЦИЕНТ]/[СОТРУДНИК]` Gemini still had to add → "локальный слой убирает X% имён до ИИ".

**Mentor answer meanwhile.** «Модель заменяема: в продакшене — открытая Gemma 4 на сервере в Узбекистане, текст не покидает страну».
