---
version: 1
slug: "app-dashboard-page-tsx"
primary_target: "app/dashboard/page.tsx"
related_targets: []
---

# Surface brief: /dashboard (Ministry of Health)

**Mode:** Operate. **Audience:** Ministry analyst at a desk; in the demo the screen is shown on a laptop across a table, right after a mentor files a report from a phone. **Task:** see which problems repeat across hospitals, open a pattern, scan the register; optional hospital filter turns it into the hospital view. **Proof:** the insulin pattern counter moves 11 → 12 live; «N случаев · M больниц · X% ночью». **Constraints:** de-identified data only; no department breakdown (rule 4); data is synthetic and must say so; inherits DESIGN.md (journal world) without changing it.

## Direction contract

THESIS: The national picture is an open journal on the analyst's desk: conclusions on the left page, the register they come from on the right. It refuses the SaaS grid of KPI cards over a chart wall.

OWN-WORLD: Inherited from DESIGN.md — ledger paper, hairline rules, journal ink, ballpoint blue only for actions, red pencil only for attention (pattern counters, severe harm), Geist with tabular numerals. Spine between the pages is a soft fold shadow on the page itself, not a card border.

STORY: The analyst reads the totals line, sees four patterns written on the left page with the insulin one first, watches its counter turn 11 → 12 when a new report lands, scans the register on the right, filters by hospital, and opens the pattern.

FIRST VIEWPORT: Laptop 1440×900. Running head «Журнал Минздрава · все больницы», hospital filter, «данные синтетические». Totals line as one ruled row of four columns. Left page (5/12): «Закономерности», the first entry large with a 3.5rem red counter, title, «случаев · больниц · % ночью» with night share as a to-scale bar, top factors, «Разобрать». Right page (7/12): filters, to-scale bars by type and hospital, day/night split, register rows.

FORM: «Разворот журнала» (two-page spread); dealt lead (THE ROLL) of 3; seed: none (unavailable) — this roll printed no SEED REFERENCE line. Signature interaction: when a new case joins a pattern, the old count slides up, the new one rises in, and a red-pencil underline draws once under it. Reduced motion: instant swap.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Intentional type extension (reported, not yet in DESIGN.md)
- Pattern counters: 3.5rem (lead) and 2.25rem (others), red pencil, tabular numerals. The signature live counter needs to read across a room; no existing step carries that role. Fold into DESIGN.md as a "counter" step when the system is next documented.
