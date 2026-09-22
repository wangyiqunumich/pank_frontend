# PanKgraph design system (Material Design 3)

Every redesigned screen in this atlas follows Material Design 3 and draws all values from one token sheet: **[`styles/design-tokens.css`](styles/design-tokens.css)**. Component stylesheets ([`styles/recovery-dialog.css`](styles/recovery-dialog.css) for every recovery dialog, [`styles/message-states.css`](styles/message-states.css) for alerts, empty/error panels, inline errors and outlined text inputs) contain no literal sizes or colors; they reference tokens only. This keeps typography, spacing, dimensions and color identical across screens and across future work.

## Rules

1. **Tokens only.** Use `var(--md-sys-*)` / `var(--md-comp-*)`. If a value is missing, add a token first, then use it. `python3 scripts/check_tokens.py` fails on any hardcoded value.
2. **4px grid.** Every length is a multiple of 4px. Spacing comes from `--md-sys-spacing-1 … -16` (4 → 64px).
3. **One type scale.** Pick a level (0–4, see below), never a size. Do not invent sizes between steps.
4. **Standard dimensions.** Controls share heights and radii (see table). Do not size a component to its content.
5. **Structure before style.** Keep the app's Material UI component structure (Dialog → DialogTitle / DialogContent / DialogActions, RadioGroup → FormControlLabel + Radio, TextField, Chip, IconButton). Restyle; do not rebuild.
6. **Fixed frames, flexible content.** Every desktop dialog is 800px wide regardless of content; height follows content up to the viewport, then the content region scrolls while header and actions stay pinned. Never vary width per scenario.
7. **States.** Hover, focus, pressed and disabled use the state-layer tokens. Keyboard focus on buttons and option cards is a 2px primary ring with 2px offset. Text inputs keep a 1px neutral border in every normal state: `outline` by default, `outline-hover` (slightly darker neutral) on hover, and the same `outline` when focused or while typing. No teal border, thicker border or focus ring on inputs: the caret and the entered text show that the field is active. Only an error state changes the color, to the semantic `error` role.

## Type scale and hierarchy

Every dialog reads in five levels. Pick the level, never a size.

| Level | Role | Size / line | Weight | Color | Use |
| --- | --- | --- | --- | --- | --- |
| 0 | label-medium, uppercase | 12 / 16 | 700 | primary | Status eyebrow above the title ("Needs clarification"). The only uppercase text in a dialog. |
| 1 | headline-small | 24 / 32 | 700 | on-surface | The single dialog / page title ("Let's clarify this search") |
| 2 | section-label | 16 / 24 | 700 | section-label `#5d6d74` | Section labels that introduce a group of controls, sentence case ("Suggested options — select one to continue:", "Or describe it yourself") |
| 3 | body-large | 16 / 24 | 400 | on-surface | Primary content: the quoted question, option text, user input |
| 4 | body-medium | 14 / 20 | 400 | on-surface-variant | Supporting text: the reason under the title, the "Your original question" caption inside its container, helper copy |
| 4 | label-small | 11 / 16 | 500 | on-secondary-container | Tertiary badges ("Recommended"), sentence case |
| — | label-large | 14 / 20 | 500 | — | Buttons |
| — | title-large | 22 / 28 | 700 | on-surface | Dialog title below 600px |

Inline annotations inside primary content (for example "(stage 3)") keep the level-3 size and take the level-4 color. Captions that merely name a piece of content (such as "Your original question") are level 4, not level 2; level 2 is reserved for labels that introduce controls. No divider rules under labels: hierarchy comes from type, color and spacing.

Typeface: Roboto stack (the existing MUI theme face).

### Recovery dialog — one shared component (spec 2026-09-22)

All 12 recovery variants are rendered by **one component**, [`recovery-dialog.js`](recovery-dialog.js), from the per-variant table in [`recovery-dialog-config.js`](recovery-dialog-config.js). Pages contain only a mount: `<div data-recovery-dialog="<variant>" data-atlas-interactive>`. Do not restyle a variant separately; change the config or the component.

**Structure, fixed order:** eyebrow (category, uppercase, teal) → title (what happened) → description (why, who acts, whether the question needs changing) → original-question card (read-only, always) → edit field (only if `editable`) → inline status banner (only after a failed retry) → actions `[Cancel query] [primary]`, right-aligned. Clarification additionally shows suggestions between the card and the edit field; picking one fills the field.

**Config per variant:** `eyebrow, title, description, userFixable, editable, editRequired, retryable, primaryLabel, secondaryLabel, placeholder, countdownSeconds?, suggestions?`.

**Action rules:** primary is never disabled for empty input unless `editRequired`; with text in the field the label becomes "Apply & try again" (except when `editRequired`, where the configured label already means apply); loading = 16px spinner + "Trying…" + disabled; Cancel, ✕ and Esc close and show a bottom-center snackbar "Query cancelled · Undo" that reopens; non-retryable variants' primary is not a retry ("Contact operator"). Failed retry: banner `role="status"` (#FDECEC / #8A1C1C, 10px radius) reading "Still unavailable. Try again shortly." then "Still unavailable after N attempts. Contact the demo operator."; rate limited and timeout add a 12s countdown in the button and disable it until 0.

**Edit field:** label "Tell us what to change" + "Optional" tag (hidden when required), helper "Describe only the change. We'll keep the rest of your question." linked by `aria-describedby`, variant-specific placeholder, 12px radius, 96px min, focus = teal border + 3px ring rgba(11,127,119,.18).

**Accessibility:** `role="alertdialog"`, `aria-labelledby` / `aria-describedby`, focus moves to the primary on open (textarea when `editRequired`), focus trapped inside.

**Recovery tokens (`--md-comp-recovery-*`, 8px grid):** max-width 720, padding 32, section gap 24, shadow 0 24px 48px rgba(15,23,42,.18); radii from the corner-radius hierarchy (dialog 20, cards/fields 12, buttons 12, chips full); buttons 44px / 12px gap, primary #0B7F77 (hover #086660, active #065550), Cancel is a text button; close ✕ 40px round; text #0F172A / body #475569 / secondary #5B6878; card #F1F5F7.

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
| rate limited | no | no | no | yes, 12s countdown | Try again |
| timeout | partly | yes | no | yes, 12s countdown | Try again |
| unknown failure | no | yes | no | yes | Try again |

The catalog lists "Operator correction or explicit clarification" for authentication, authorization, billing, budget exhausted and graph identity, so none of them retries; the optional edit field carries an explicit clarification to the operator. Query validation is "You can retry the same question", so its edit is optional. Graph release mismatch's page copy asks for a fresh search, so its primary starts one.

### Vertical rhythm (dialogs)

| Relationship | Token | Value |
| --- | --- | --- |
| Eyebrow → title | spacing-2 | 8 |
| Title → reason (header group) | spacing-1 | 4 |
| Header group → first section, and section → section | spacing-4 | 16 |
| Section label or caption → its content | section-label-gap | 8 |
| Option → option | spacing-2 | 8 |
| Last section → actions | dialog-padding | 24 |
| Container padding (dialog, tinted block) | dialog-padding / spacing-4 | 24 (compact 16) / 16 |

## Message components

Inline messages share the dialog's tokens so a banner, an empty state and a recovery dialog read as one system.

| Component | Where | Spec |
| --- | --- | --- |
| Info alert (MuiAlert standard) | "Reconnecting to the saved result…" banners, plan / streaming notices | `primary-container` fill, corner-medium, 12 × 16 padding, 24px primary icon, body-medium on-surface text, no border |
| Outlined alert (MuiAlert outlined) | Selection hints on credible-set pages | Same, but `surface` fill with 1px `outline`; action icon button 40px |
| Full-page state panel (`.pk-state-panel`) | Feature unavailable, no QTL records | Card, illustration and typography keep the page's own styles. Rhythm on tokens: illustration → title 16, title → description 8, description → actions 32; actions are system buttons (40px, corner-small, label-large), filled primary + outlined secondary, 12px apart |
| Outlined text input | Every MUI outlined field on message pages and in dialogs | 1px `outline` border; `outline-hover` on hover; unchanged on focus/typing; `error` when invalid. Sizes come from the field's own component token |
| Inline error block | Chart failed to load | `error-container` fill, 1px `error-outline`, corner-medium, 16px padding; title-small in `error`, body-small in `on-error-container` |

## Corner-radius hierarchy

Aligned with the PanKgraph homepage's rounded language, translated into Material component types. Components reference these semantic tokens, never the raw shape scale, so every current and future Message / Recovery page inherits them.

| Component type | Token | Value |
| --- | --- | --- |
| Dialog / modal container | `--md-comp-dialog-radius` | 20 |
| Cards, contextual containers (original-question card, option cards, banners, alerts, inline errors, empty-state panel, snackbar) | `--md-comp-card-radius` | 12 |
| Text fields / textareas | `--md-comp-text-field-radius` | 12 |
| Standard contained / outlined / text buttons (Try again, Apply changes, Contact operator, Continue, Cancel query, Back to Home …) | `--md-comp-button-radius` | 12 |
| Icon-button interaction area (40 × 40 close ✕, alert dismiss) | `--md-comp-icon-button-radius` | full (20 on 40) |
| Chips / tags / pill controls only (Recommended, Optional; homepage search field and suggestion chips) | `--md-comp-chip-radius` | full |

Standard action buttons are never pills; fully rounded corners are reserved for chip and pill controls.

## Spacing, shape, elevation

| Token | Value | Use |
| --- | --- | --- |
| spacing-1 … -6 | 4, 8, 12, 16, 20, 24 | Internal gaps and padding |
| spacing-8 / -10 / -12 / -16 | 32, 40, 48, 64 | Dialog margins, page-level gaps |
| corner-extra-small … corner-full | 4 / 8 / 12 / 16 / 28 / pill | Raw scale; components use the corner-radius hierarchy above |
| elevation-2 | soft 2/4px shadow | Raised buttons on hover |
| elevation-3 | layered 24/48px shadow | Dialogs |

## Component dimensions

| Component | Token | Value |
| --- | --- | --- |
| Button height | `--md-comp-button-height` | 40 |
| Icon button / touch target | `--md-comp-touch-target` | 40 |
| Standard icon | `--md-comp-icon-size` | 24 |
| Selection control (radio, checkbox) | `--md-comp-selection-control-size` | 20 |
| List item / option card | `--md-comp-list-item-height` | 56 (12 × 16 padding) |
| Text field | `--md-comp-text-field-height` | 56 |
| Multiline field min | `--md-comp-text-field-multiline-min-height` | 96 |
| Inline chip / badge | `--md-comp-badge-height` | 24 |
| Dialog | `--md-comp-dialog-width` / `-padding` | 800 wide on desktop, height follows content (viewport-capped) / 24 (compact: 16) |
| Section label → controls gap | `--md-comp-section-label-gap` | 8 |
| Outline | `--md-comp-outline-width` / `-focus` | 1 / 2 (2 only marks a selected option card; inputs never use it) |
| Radii | `--md-comp-dialog-radius` / `-card-` / `-text-field-` / `-button-` / `-icon-button-` / `-chip-radius` | 20 / 12 / 12 / 12 / full / full |
| Alert padding | `--md-comp-alert-padding-y` / `-x` | 12 / 16 |
| Empty-state illustration | `--md-comp-empty-state-illustration` | 160 |

## Color roles

Material color roles mapped to the PanKbase palette: `primary` teal `rgb(33 145 151)`, `section-label` `#5d6d74`, `on-primary` white, `primary-container` `rgb(240 247 248)`, `secondary-container` `rgb(227 240 241)` (hover tint), `on-surface` `rgb(15 23 42)`, `on-surface-variant` `rgb(89 99 110)`, `outline` `rgb(203 213 225)`, `outline-variant` `rgb(226 232 240)`, `outline-hover` `rgb(148 163 184)`, `scrim` 40 % on-surface; `error` `rgb(186 26 26)`, `error-container` `rgb(254 242 242)`, `on-error-container` `rgb(153 27 27)`, `error-outline` `rgb(252 165 165)`. Always pair a container with its `on-` role.

## Adding a new design

1. Link `../styles/design-tokens.css` first, then the component sheets the page needs: `recovery-dialog.css` for any recovery dialog, `message-states.css` for any page with alerts, empty/error panels or text inputs, or a new `styles/<component>.css` for a new component.
2. Reuse existing component sheets where the component already exists; extend a token rather than adding a literal.
3. Run `python3 scripts/check_tokens.py` and `python3 scripts/check.py` before committing.
4. Regenerate the page's preview with `python3 scripts/capture.py <screen-id>` so the gallery and navigation-tree thumbnails show the current design.
