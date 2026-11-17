---
name: Сигнал
description: Anonymous, blameless incident reporting written into the shift handover journal.
colors:
  page: "#eef1ee"
  ground: "#e1e6e3"
  rule: "#c9d3d6"
  rule-strong: "#a9b7bc"
  ink: "#1d2a4a"
  ink-muted: "#56627a"
  pen: "#3557a8"
  pen-ink: "#ffffff"
  margin-red: "#c43b2f"
  pen-light: "#5f7fc4"
  pen-pale: "#8aa0cf"
  page-night: "#10151f"
  ground-night: "#0b0f16"
  rule-night: "#24304a"
  rule-strong-night: "#3a4866"
  ink-night: "#e6ebf2"
  ink-muted-night: "#9aa6bb"
  pen-night: "#8aa4f2"
  pen-ink-night: "#0b0f16"
  margin-red-night: "#e0675c"
  pen-light-night: "#6f8fe0"
  pen-pale-night: "#4f68a8"
typography:
  display:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  display-wide:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  entry:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: "2rem"
  entry-read:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 400
    lineHeight: "2.75rem"
  value:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.375
  value-wide:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: 1.375
  title:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.5
  body:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "\"tnum\" 1"
  note:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
  column-head:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.33
rounded:
  redaction: "2px"
  sheet: "3px"
  control: "4px"
  button: "6px"
spacing:
  hairline: "1px"
  cell-y: "10px"
  gutter: "20px"
  line: "32px"
  margin-rule: "36px"
  entry-indent: "48px"
  line-read: "44px"
components:
  button-primary:
    backgroundColor: "{colors.pen}"
    textColor: "{colors.pen-ink}"
    typography: "{typography.title}"
    rounded: "{rounded.button}"
    height: "56px"
    width: "100%"
  button-secondary:
    backgroundColor: "{colors.page}"
    textColor: "{colors.ink}"
    typography: "{typography.title}"
    rounded: "{rounded.button}"
    height: "56px"
    width: "100%"
  shift-choice:
    backgroundColor: "{colors.page}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "36px"
  shift-choice-checked:
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
  column-cell:
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    padding: "10px 20px"
  redaction-box:
    textColor: "{colors.margin-red}"
    rounded: "{rounded.redaction}"
    padding: "0 6px"
  text-link:
    textColor: "{colors.pen}"
    typography: "{typography.note}"
  journal-head:
    textColor: "{colors.ink}"
    typography: "{typography.note}"
    padding: "12px 20px"
---

# Design System: Сигнал

## Overview

**Creative North Star: "The Shift Handover Journal" («Журнал передачи смены»)**

Every surface is a page of the ward's own handover journal: cool ledger paper, printed column heads in small muted ink, writing sitting on ruled hairlines behind a red margin rule, entries in ballpoint blue. Reporting an incident is one more line in that journal, except this entry needs no signature. The world refuses two neighbours equally: the white SaaS form with a shield badge, and the state blank with numbered fields.

The system is flat paper. Structure comes from 1px rules, column dividers and the ruled pitch, not from boxes or shadows. Colour is spent with discipline: ink for writing, blue pen for the one thing you can act on, red pencil for what was removed and what needs attention. Type is a single family, Geist, set large for tired eyes at night and read across a table on a laptop; numerals are tabular everywhere. The night shift is the same journal, not a different product: a deep blue page with pale ink.

Density is allowed. The journal is a working document; columns, rows and hairlines carry information without airy cards around it.

**Key Characteristics:**
- Cool ledger paper (never cream), ruled at a 2rem pitch with a red margin rule 2.25rem from the left.
- One family (Geist, with Cyrillic), tabular numerals globally, column heads small and muted.
- Blue pen is the only action colour; red pencil only for removals and attention.
- Flat: 1px rules and column dividers instead of cards; one soft sheet shadow on desktop only.
- Marks of the journal (struck-through column, red-pencil boxed blanks, round ink stamp) carry meaning, never decoration.
- Light and dark follow `prefers-color-scheme`; both palettes are first-class.

## Colors

A cool, low-chroma paper and ink palette with exactly two marking colours: ballpoint blue and red pencil.

### Primary
- **Ballpoint Blue** (pen): the single action colour. Primary button fill, links, focus ring, caret, checked state of a choice, the processing stroke along the ruled line, and the ink of the stamp. In the night journal it lightens to Night Ballpoint (pen-night) with dark ink on it (pen-ink-night).

### Secondary
- **Red Pencil** (margin-red): the margin rule, boxed-out personal data, the removed count, the struck-through «Подпись» column, and attention text (a too-short entry, a failed send). Night: Night Red Pencil (margin-red-night). Its redaction fill is a 9% (night 16%) red wash in hatch stripes.

### Neutral
- **Ledger Paper** (page): the journal page and every surface that is "on the page".
- **Desk Ground** (ground): what the page lies on; visible around the sheet on desktop and as the sidebar ground.
- **Ruled Hairline** (rule): ruled lines, row and column dividers, every border by default.
- **Pressed Rule** (rule-strong): input and choice outlines, secondary button outline, scrollbar.
- **Journal Ink** (ink): all writing and values.
- **Faded Ink** (ink-muted): column heads, hints, placeholders, the product mark in the running head, the struck word.
- **Pen Tints** (pen-light, pen-pale): the second and third chart series, so a series of data reads as shades of the one pen. Defined, not yet drawn on a built surface.
- Derived surfaces in the shadcn mapping are mixes, not new colours: accent = 10% pen into page (checked choice, a margin note), muted = 35% rule into page (skeleton blocks), secondary = 45% rule into page.

### Named Rules
**The One Pen Rule.** Blue means "you can act on this" or "the pen wrote this". No other hue may be used for a button, link, focus or selection.

**The Red Pencil Rule.** Red is only for what was removed and what needs attention. It never encodes an ordinary category, a brand accent, a heading or a decorative stripe. The chart token chart-5 (red) may only mark an attention series, such as a detected pattern.

**The Ledger Paper Rule.** The page is cool grey-green paper, never cream, never pure white.

## Typography

**Display Font:** Geist (latin, latin-ext, cyrillic), system sans fallback
**Body Font:** Geist
**Label/Mono Font:** Geist Mono is loaded (latin, cyrillic) but not used on a built surface yet.

**Character:** One workmanlike grotesk in a few weights, like the printed heads and handwriting of one journal; hierarchy comes from size and weight, never from a second family. Tabular numerals are on for the whole body (`font-variant-numeric: tabular-nums`), so dates, counts and times align in columns.

### Hierarchy
- **Display** (600, 1.75rem phone / 2rem from md, 1.15, -0.01em, balanced wrap): one page headline per surface. The result headline steps to 1.625rem on phones.
- **Entry** (400, 1.125rem on a 2rem line; 1.1875rem from md): writing on the ruled page. The kept entry reads at 1.1875rem on phones and 1.75rem on a 2.75rem line on desktop, so it lands across a table.
- **Value** (600, 1.125rem phone / 1.75rem desktop, 1.375): the content of a journal column (classification, factors). The removed count uses the same scale in red.
- **Title** (600, 1.125rem): section labels («Что произошло?», «Так случай сохранён»), button labels.
- **Body** (400, 1rem): column values like date and shift, trust line, margin notes.
- **Note** (400, 0.875rem): hints under the ruled area, links, running head.
- **Column head** (400, 0.75rem, ink-muted; 0.875rem on desktop result): the printed head over a column. Sentence case, no tracking, no uppercase.

### Named Rules
**The Printed Head Rule.** Column heads are small, muted and sentence case, sitting directly over their value inside the cell. They name a column; they are never kickers or eyebrows above a headline.

**The Large Ink Rule.** Writing a person will read at night or from across a table is never below 1.125rem; the trust line and values are never below 1rem.

## Layout

The page is a single journal sheet. On phones it is full-bleed (min-height 100dvh); from md it becomes one sheet on the desk ground, 40rem wide for writing and 48rem for reading the result, centred with 2.5rem of desk above and below.

The horizontal gutter is 20px everywhere. Rows are separated by 1px rules running the full width of the sheet; columns are separated by 1px vertical rules, with cells padded 10px vertically and 20px horizontally. The ruled area has a 2rem pitch (`--line`), the red margin rule sits at 2.25rem, and text on the ruled page starts at 3rem (48px) so it sits right of the margin; hints and the removed count share that 48px indent. On the desktop result the pitch widens to 2.75rem.

The primary action lives in a sticky footer at the bottom of the sheet, inside the thumb zone, with the safe-area inset honoured; the trust line sits directly above the button so safety is read before submitting. The footer is page-coloured at 95% with a hairline above it.

Time is a column, not a timestamp: date and shift (День / Ночь), never an exact time.

See Components, "Not yet built: the dense desktop journal", for how this grammar extends to review screens.

## Elevation & Depth

The journal is flat. Depth inside a page is expressed by rules and tonal mixes only: no card shadows, no raised panels, no glass. The one shadow in the system is the sheet itself lying on the desk ground on desktop (radius 3px); on phones the sheet is the screen and has no shadow.

### Shadow Vocabulary
- **Sheet on desk** (`box-shadow: 0 1px 2px rgb(0 0 0 / 0.06), 0 18px 40px -16px rgb(0 0 0 / 0.22)`): the journal page on md and up. Nothing on the page casts a shadow.

### Named Rules
**The Flat Page Rule.** Anything written on the page lies on the page. If an element seems to need a shadow, it needs a rule or a column instead.

## Shapes

Shapes are those of paper and office tools: nearly square. The sheet has a 3px corner, a red-pencil box 2px, choices and select 4px, full-width buttons 6px. Nothing is pill-shaped, nothing is circular except the stamp. Lines are 1px hairlines; the red pencil box is 1.5px (2px from md) because it is drawn by hand on top of the writing; the ruler strike is 1.5px.

The shadcn radius scale (derived from `--radius: 0.375rem`) exists in the theme, but the built surface uses the four literal values above; future surfaces should use those four.

## Components

### Buttons
- **Shape:** gently squared (6px), full width of the footer, 56px tall, 1.125rem label.
- **Primary («Сообщить»):** Ballpoint Blue slab with pen-ink label, semibold. One per surface.
- **Hover / Focus / Active:** hover brightens (`brightness 1.1`, 150ms); focus is a 4px pen ring at 40%; active nudges down 1px. While processing the label changes to the in-progress wording and the button dims (`brightness 0.95`) with a progress cursor.
- **Secondary («Сообщить ещё об одном случае»):** page-coloured with a Pressed Rule outline and ink label, medium weight; hover fills with the accent tint.

### Choices (shift)
- **Style:** a row of small outlined boxes (36px min height, 4px, Pressed Rule outline) inside a journal column, the radio itself visually hidden.
- **Checked:** the outline turns pen and the box fills with the accent tint; a pen-coloured check mark appears before the label. Focus is a 3px pen ring.

### Journal columns
- **Style:** a grid of cells divided by 1px rules, each cell a printed column head over a value. The date cell is read-only text, never an input. A select row («Отделение») is a full-width ruled row: head on the left, borderless value on the right with a muted chevron.
- **Result columns:** two-up cells with values at the Value scale; a full-width row closes the set.

### The ruled page (signature)
The one field that matters. A borderless, background-less textarea on the ruled utility: hairlines at the line pitch and the red margin rule, text indented to sit right of the margin, 10 lines on phones and 11 on desktop. Placeholder in Faded Ink. While processing, a 2px pen stroke grows along the bottom line to 90% over 5s and holds there, so it never claims completion before the result arrives. The kept entry is drawn on the same ruled page.

### Red-pencil redaction (signature)
Removed personal data stays in place as a boxed blank: red pencil outline (1.5px, 2px from md), 2px corner, hatched red wash, a lowercase word naming what was there (пациент, сотрудник, палата, номер, дата) in semibold red at 0.85em, with "удалено:" for screen readers. A red removed count sits above the entry and a muted hint below it.

### Struck column («Подпись»)
A column name is crossed out with a ruler: a 1.5px red line-through on Faded Ink text, followed by the plain statement in ink. Used to show something is deliberately not collected.

### Stamp (signature)
A round office stamp in pen ink, 104px, rotated -9deg at 90% opacity: an outer ring, a phrase set around the circle, the product name and the date in the centre. It lands once (480ms, from 1.6x scale and -14deg with a slight blur) and never animates again. On the report surface it is the receipt «принято анонимно». A stamp is a commitment of record; it is never an ornament or a badge.

### Margin note
A short note to the reader in body ink on the accent tint, 4px corner, inset by the gutter. Used for "this case joined others like it". It is a note in the margin of the page, not a card.

### Navigation
- **Running head:** the printed head of the journal page: «Журнал» semibold, then hospital and city in ink, the product mark right-aligned in Faded Ink, all at 0.875rem above a hairline. There is no app bar.

### Not yet built: the dense desktop journal
These are rules for the Ministry dashboard, the pattern page and the incident/RCA page. They extend the built world and are not yet evidenced by shipped code; the first build of each surface must confirm or amend them here.

- **Cases are journal rows.** A list of cases is a table of rows on 1px hairlines under printed column heads, with tabular numerals and the 20px gutter. No airy cards, no tile grids, no per-case shadows; density is expected on desktop.
- **Red only for removals and attention.** A detected pattern, a weak corrective action, or anything needing a person's look is marked in red pencil (a margin mark, an underline, a red count). Red is never a category colour in a chart or table.
- **Blue is the only action colour.** Row actions, filters, links and the one primary button per screen are pen blue; everything else is ink.
- **The stamp is reserved for human confirmation.** On review surfaces a stamp «проверено» appears only when a person confirms a classification or closes a case. AI-proposed values are written in Faded Ink (pencil grey) until a person confirms them, then they turn to ink and may carry the stamp. The report's receipt stamp is the only automatic stamp in the system.
- **One state vocabulary.** Новый is a plain row; На разборе is the same row with a margin note (a short ink or red-pencil remark in the margin column); Закрыт is ruled off (a ruler line under or through the row in ink) with the stamp. No coloured status pills.
- **Time is drawn to scale.** Shares and dates are shown as proportional length: the night share of a pattern as a length of rule, pattern dates placed on a time axis at their true spacing, using pen and its tints, with red only for the attention series.

## Do's and Don'ts

### Do:
- **Do** set every page on Ledger Paper with structure from 1px rules and column dividers, 20px gutter, 10px cell padding.
- **Do** put writing on the ruled utility (2rem pitch, red margin rule at 2.25rem, text from 3rem).
- **Do** use Ballpoint Blue for every action and focus, and only for that and the pen's own marks (check, progress stroke, stamp).
- **Do** keep removed data visible in place as a red-pencil boxed blank with a word naming what was removed.
- **Do** write column heads small, muted and sentence case directly over their value.
- **Do** keep reading text at 1.125rem or more and step the result up to 1.75rem on desktop for reading across a table.
- **Do** design the night journal with the same tokens (page-night, ink-night, pen-night, margin-red-night) and follow the system colour scheme.
- **Do** let motion be single and meaningful (the pen stroke, the stamp landing once) and collapse it to instant states under reduced motion.

### Don't:
- **Don't** use a cream or pure white page.
- **Don't** use red for categories, headings, brand accents or decoration; it is for removals and attention only.
- **Don't** introduce a second action colour or a second type family.
- **Don't** wrap content in floating cards with shadows; the only shadow is the desktop sheet on the desk.
- **Don't** use uppercase tracked kickers or eyebrows over headlines; the printed column head is the only small label.
- **Don't** use coloured status pills or badges; states are rows, margin notes and ruling-off.
- **Don't** use the stamp as decoration or for an AI decision.
- **Don't** show an exact time; date and shift only.
