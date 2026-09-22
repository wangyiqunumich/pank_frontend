# PanKgraph design system — Material Design 3, strictly

Every redesigned screen in this atlas follows the Material Design 3 specification without custom deviations, and draws all values from one token sheet: **[`styles/design-tokens.css`](styles/design-tokens.css)**. Component stylesheets ([`styles/recovery-dialog.css`](styles/recovery-dialog.css) for every recovery dialog, [`styles/message-states.css`](styles/message-states.css) for alerts, empty/error panels, inline errors and outlined text inputs) contain no literal sizes or colors; they reference tokens only. This keeps typography, spacing, dimensions and color identical across screens and across future work.

## Rules

1. **Material 3 values only.** Component dimensions, shapes, type roles, color roles and state layers are the M3 specification values encoded in the token sheet. No custom radii, heights or palettes per component.
2. **Tokens only.** Use `var(--md-sys-*)` / `var(--md-comp-*)`. `python3 scripts/check_tokens.py` fails on any literal.
3. **4dp grid.** Every length is a multiple of 4px (`--md-sys-spacing-1 … -16`).
4. **One type scale.** Pick an M3 role, never a size. Headlines are regular weight (400); titles and labels medium (500); body regular.
5. **Structure before style.** Keep the app's Material UI component structure. Restyle; do not rebuild.
6. **States.** Hover 8 %, focus/pressed 10 % state layers; disabled 12 % container / 38 % content; keyboard focus = 3dp primary ring, 2dp offset. Text fields: 1dp `outline`, `on-surface` on hover, **2dp `primary` when focused**, `error` when invalid.

## Type scale (M3)

| Role | Size / line | Weight | Use |
| --- | --- | --- | --- |
| headline-medium | 28 / 36 | 400 | Full-page state panel title |
| headline-small | 24 / 32 | 400 | Dialog headline |
| title-medium | 16 / 24 | 500 | Section labels inside dialogs |
| title-small | 14 / 20 | 500 | Inline error title |
| body-large | 16 / 24 | 400 | Primary content: original question, option text, input text |
| body-medium | 14 / 20 | 400 | Dialog supporting text, messages, helper copy |
| body-small | 12 / 16 | 400 | Text-field floating label and supporting text |
| label-large | 14 / 20 | 500 | Buttons, chips, snackbar action |
| label-medium | 12 / 16 | 500 | Category label above a dialog headline, card captions |

No uppercase text (M3 has no overline role); no bold headlines; no custom grey label color — labels use `on-surface` or `on-surface-variant`.

## Components (M3 specification)

| Component | Spec |
| --- | --- |
| Basic dialog | 280–560dp wide, `surface-container-high`, corner extra-large 28dp, 24dp padding, elevation 3, scrim 32 %; headline-small; supporting body-medium `on-surface-variant`; actions right-aligned, 8dp apart |
| Common buttons | 40dp, corner full, label-large; filled = `primary` / `on-primary`; outlined = 1dp `outline`, `primary` text; text = `primary`, 12dp side padding; filled/outlined 24dp side padding; min width 48dp |
| Icon button | 40dp state layer, 24dp icon, corner full |
| Outlined text field | 56dp (multiline min 96dp), corner extra-small 4dp, 16dp padding, floating label body-small in the notch, supporting text body-small below; states per rule 6 |
| Radio button | 20dp, 2dp ring `on-surface-variant`; selected = `primary` ring + 8dp dot |
| List item / option | 56dp, 16dp side / 8dp vertical padding; selected = `secondary-container` fill |
| Suggestion chip | 32dp, corner small 8dp, 1dp `outline`, label-large |
| Cards | corner medium 12dp; filled = `surface-container-highest`; elevated = `surface-container-low` + elevation 1 |
| Snackbar | 48dp min, corner extra-small, `inverse-surface` / `inverse-on-surface`, action `inverse-primary` label-large, bottom-center |
| Inline message | filled card, 16dp padding, 24dp `primary` icon, body-medium |
| Error container | `error-container` / `on-error-container`, corner medium |

### Recovery dialog — one shared component

All 12 recovery variants are rendered by [`recovery-dialog.js`](recovery-dialog.js) from [`recovery-dialog-config.js`](recovery-dialog-config.js); pages hold only `<div data-recovery-dialog="<variant>" data-atlas-interactive>`.

**Structure:** category label (label-medium, `primary`) → headline → supporting text → original-question filled card → outlined text field (if `editable`; label "Tell us what to change (Optional)" in the notch, supporting text below, variant placeholder) → error-container banner after a failed retry → `[Cancel query] [primary]`. Clarification adds radio list items with a "Recommended" suggestion chip; picking one fills the field.

**Behaviour:** primary never disabled for empty input unless `editRequired`; typed change → "Apply & try again" (except when `editRequired`); loading = 18dp circular progress + "Trying…" + disabled; Cancel / ✕ / Esc close with an M3 snackbar "Query cancelled · Undo"; failure banner "Still unavailable. Try again shortly." then "…after N attempts. Contact the demo operator."; rate limited and timeout add a 12 s countdown; non-retryable variants' primary is "Contact operator". `role="alertdialog"`, `aria-labelledby` / `aria-describedby`, focus to primary (textarea when `editRequired`), focus trapped.

**Variant matrix (checked against `inventories/error-catalog.json`):**

| variant | userFixable | editable | editRequired | retryable | primary |
| --- | --- | --- | --- | --- | --- |
| authentication | no | yes (optional) | no | no | Contact operator |
| authorization | no | yes (optional) | no | no | Contact operator |
| billing | no | yes (optional) | no | no | Contact operator |
| budget exhausted | no | yes (optional) | no | no | Contact operator |
| clarification required | yes | yes | yes | yes | Send clarification |
| graph identity | no | yes (optional) | no | no | Contact operator |
| graph release mismatch | no | no | no | yes | Start a fresh search |
| planning failure | yes | yes | no | yes | Try again |
| query validation | yes | yes | no | yes | Try again |
| rate limited | no | no | no | yes, 12 s countdown | Try again |
| timeout | partly | yes | no | yes, 12 s countdown | Try again |
| unknown failure | no | yes | no | yes | Try again |

### Vertical rhythm (dialogs)

| Relationship | Token | Value |
| --- | --- | --- |
| Category label → headline | spacing-1 | 4 |
| Headline → supporting text, and section → section | spacing-4 | 16 |
| Section label → its content | spacing-2 | 8 |
| Option → option | spacing-2 | 8 |
| Container padding | dialog-padding | 24 |

## Message components

| Component | Where | Spec |
| --- | --- | --- |
| Inline message (MuiAlert standard) | "Reconnecting to the saved result…" banners, plan / streaming notices | filled card `surface-container-high`, corner medium, 16dp padding, 24dp `primary` icon, body-medium |
| Inline message (MuiAlert outlined) | Selection hints on credible-set pages | `surface` + 1dp `outline-variant`; action icon button 40dp |
| Full-page state panel (`.pk-state-panel`) | Feature unavailable, no QTL records | elevated card (corner medium, elevation 1, `surface-container-low`) at the existing 460dp + 76dp size; 200dp illustration → headline-medium → body-medium → filled + outlined common buttons, 8dp apart |
| Inline error container | Chart failed to load | `error-container` / `on-error-container`, corner medium, 16dp padding; title-small + body-small |
| Outlined text input | Every MUI outlined field | rule 6 states |

## Spacing, shape, elevation

| Token | Value | Use |
| --- | --- | --- |
| spacing-1 … -6 | 4, 8, 12, 16, 20, 24 | Internal gaps and padding |
| spacing-8 / -10 / -12 / -16 | 32, 40, 48, 64 | Dialog margins, page-level gaps |
| corner-extra-small | 4 | Text fields, snackbar |
| corner-small | 8 | Chips |
| corner-medium | 12 | Cards, list options, message containers |
| corner-large | 16 | Sheets |
| corner-extra-large | 28 | Dialogs |
| corner-full | pill | Buttons, icon buttons, radios |
| elevation-1 / -2 / -3 | M3 levels 1–3 | Elevated cards / raised buttons on hover / dialogs, snackbar |

## Component dimensions

| Component | Token | Value |
| --- | --- | --- |
| Button height / min width | `--md-comp-button-height` / `-min-width` | 40 / 48 |
| Button side padding | `--md-comp-button-padding-x` / `-text-padding-x` | 24 / 12 |
| Icon button / touch target | `--md-comp-touch-target` | 40 |
| Standard icon | `--md-comp-icon-size` | 24 |
| Radio / checkbox | `--md-comp-selection-control-size` | 20 |
| List item | `--md-comp-list-item-height` | 56 (16 × 8 padding) |
| Chip | `--md-comp-chip-height` | 32 |
| Text field / multiline min | `--md-comp-text-field-height` / `-multiline-min-height` | 56 / 96 |
| Dialog | `--md-comp-dialog-min-width` / `-max-width` / `-padding` | 280 / 560 / 24 |
| Snackbar | `--md-comp-snackbar-min-height` | 48 |
| Outline | `--md-comp-outline-width` / `-focus` | 1 / 2 |
| State panel (existing size) | `--md-comp-state-panel-content-width` / `-padding` / `-illustration` | 460 / 76 / 200 |

## Color roles

M3 scheme seeded from PanKbase teal: `primary` `rgb(33 145 151)`, `on-primary` white, `primary-container` `rgb(240 247 248)`, `on-primary-container` `rgb(24 118 123)`, `secondary-container` `rgb(227 240 241)`, `surface` white, `surface-container-low/‑/high/highest` `rgb(246 248 250)` / `rgb(241 245 247)` / `rgb(236 241 244)` / `rgb(230 236 239)`, `on-surface` `rgb(15 23 42)`, `on-surface-variant` `rgb(89 99 110)`, `outline` `rgb(148 163 184)`, `outline-variant` `rgb(203 213 225)`, `inverse-surface` `rgb(32 58 72)`, `inverse-primary` `rgb(140 210 214)`, `error` `rgb(179 38 30)`, `error-container` `rgb(249 222 220)`, `on-error-container` `rgb(65 14 11)`, `scrim` black 32 %. Always pair a container with its `on-` role.

## Adding a new design

1. Link `../styles/design-tokens.css` first, then the component sheets the page needs: `recovery-dialog.css` for any recovery dialog, `message-states.css` for any page with alerts, empty/error panels or text inputs, or a new `styles/<component>.css` for a new component.
2. Reuse existing component sheets where the component already exists; extend a token rather than adding a literal.
3. Run `python3 scripts/check_tokens.py` and `python3 scripts/check.py` before committing.
4. Regenerate the page's preview with `python3 scripts/capture.py <screen-id>` so the gallery and navigation-tree thumbnails show the current design.
