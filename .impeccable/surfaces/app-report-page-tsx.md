---
version: 1
slug: "app-report-page-tsx"
primary_target: "app/report/page.tsx"
related_targets: []
---

# Surface brief: /report (staff report)

**Mode:** Operate. **Audience:** nurse or doctor on their own phone, often at night in a dim staff room, tired and afraid of punishment; in the demo a mentor on their phone, the result also read from a laptop across a table. **Task:** describe what happened in one field, in any language, and see that identity was removed. **Proof:** removed parts visible in place, count of removed items, WHO classification. **Constraints:** voice rules in PRODUCT.md (no «ошибка», «нарушение», «виновный», «жалоба»); only the text is required; shift auto from time; system dark theme; submit in thumb zone; raw text never stored or logged.

This world (the shift handover journal) is the product's visual world: dashboard, pattern and incident screens inherit it (cases as journal rows on ruled hairlines; the red margin rule and red pencil reserved for what was removed and what needs attention; the stamp only for human confirmation).

## Direction contract

THESIS: Reporting is one more shift handover, written into the nurses' own journal — except this entry needs no signature. It refuses the white SaaS form with a shield badge, and equally the state blank with numbered fields.

OWN-WORLD: Cool ledger paper, never cream (light: page #eef1ee, rules #c9d3d6, ink #1d2a4a, ballpoint blue #3557a8, margin red #c43b2f; dark: page #10151f, rules #24304a, ink #e6ebf2, blue #8aa4f2, red #e0675c). Writing sits on ruled lines with a red margin rule on the left. Column heads in small muted ink. Removed personal data is a red-pencil boxed blank with a tiny label. Blue is the only action colour; red is only for removals and the margin. Geist throughout, tabular numerals.

STORY: The reporter sees the journal's «Подпись» column already struck through: not required. They write in their own words on the ruled page, tap «Сообщить», and read their entry as it was kept: names boxed out in red pencil, a margin note «удалено: N», classification written into the columns.

FIRST VIEWPORT: Phone 390×844. Journal head: «Журнал · Больница А · Ташкент», headline «Помогите сделать работу безопаснее». Row: Дата (today, read-only) · Смена (День/Ночь, auto). Ruled «Что произошло?» area with margin rule, ~45% of height, 18px. «Подпись — не требуется» struck through, trust line under it. «Сообщить» full-width blue slab, sticky at the bottom.

FORM: shift handover journal; position 1 on the ordered list (IMPECCABLE’S PICK, chosen over the roll); seed key 1437336f — the roll printed «DIRECTION CONCEPT SEED (key: 1437336f; mode: operate; source: api; approved pool: c3b204a1eed6 …)» and no separate SEED REFERENCE line (Impeccable v4.3.1). Signature interaction: while processing, a ballpoint stroke runs along the ruled line; on success a round stamp «принято анонимно» lands once on the kept entry. Reduced motion: instant states.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Raises (kept from declined challengers)
- Dense modules: the dashboard tolerates density — cases as journal rows on hairlines, no airy cards.
- Labanotation: time drawn to scale — night share and pattern dates as proportional length.
- Acetate manual: one state vocabulary — Новый / На разборе / Закрыт = plain row / margin note / ruled-off with stamp.
- Doujin catalog: human confirmation is a visible stamp «проверено», distinct from AI-proposed entries in pencil-grey.
- Type specimen: one control remaps the whole text — «Мой текст ↔ что сохранено» on the result; the original lives only in the browser tab.

## Open decisions
- Final product name («Сигнал» is a working name).
