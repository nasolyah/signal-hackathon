---
version: 1
slug: "app-pattern-id-page-tsx"
primary_target: "app/pattern/[id]/page.tsx"
related_targets: ["app/incident/[id]/page.tsx"]
---

# Surface brief: /pattern/[id] and /incident/[id] (root-cause analysis)

**Mode:** Operate. **Audience:** hospital quality lead or Ministry analyst at a desk; in the demo, read from a laptop across a table. **Task:** understand the case or the pattern, run «5 почему», see causes by six categories, choose corrective actions ranked by RCA² strength, add their own; confirm the AI classification. **Proof:** «инструктаж» is visibly ranked weak with a reason; the strong action (separate insulin storage) leads; when only weak actions remain, a red-pencil warning computed in code appears. **Constraints:** de-identified text only; AI suggests, a human confirms (classification editable; «проверено» stamp only after a person confirms); statuses Новый → На разборе → Закрыт; inherits DESIGN.md.

## Direction contract

THESIS: The analysis is written on the facing page of the same journal: the case on the left, its reasons and fixes on the right. It refuses the generic form wizard and the wall of AI text.

OWN-WORLD: Inherited from DESIGN.md. Whys are numbered ruled lines with the red margin rule; causes are six ruled columns with printed heads; actions are rows ranked strong → weak. Strength: «Сильная» is a pen-filled tag, «Средняя» a pen outline, «Слабая» a red-pencil outline with its reason. AI-proposed classification is in faded ink until a person confirms; then the «проверено» stamp lands.

STORY: The quality lead opens the insulin pattern, reads eleven de-identified cases on the left, presses «Начать разбор» (or finds it pre-drafted), reads five whys down to the system cause, sees «Хранить инсулины раздельно» ranked strong and «инструктаж» ranked weak with the reason, adds an owner and a date, and closes the analysis.

FIRST VIEWPORT: Laptop 1440×900. Running head with back link and status. Left page (5/12): pattern title 1.75rem, stats, regions, then case rows with red-pencil redactions. Right page (7/12): «Пять почему» as five ruled lines, «Причины» in six columns, «Меры» ranked, the add-action field at the end.

FORM: «Разбор на развороте» (two-page spread); dealt lead (THE ROLL) of 3; seed: none (unavailable) — this roll printed no SEED REFERENCE line. Signature interaction: a newly added action slides into its rank position (strong rows above, weak below) and its strength tag stamps in once. Reduced motion: instant.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
