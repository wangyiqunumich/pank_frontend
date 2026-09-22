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

### Dialog anatomy (all recovery states)

One anatomy serves clarification, timeout, rate limit, validation, planning and operator-error states. Only the copy, the presence of options, and the action set change; the frame, order and spacing do not.

1. **Header group** — eyebrow (L0) naming the state ("Needs clarification", "Timeout", "Rate limited" …), title (L1), reason (L4). Close icon button top-right.
2. **Original question** — tinted `primary-container` block, corner-medium, 16px padding, containing the L4 caption and the L3 question text.
3. **Suggested options** *(clarification only)* — L2 label, then single-select option cards (56px, corner-medium, 1px outline; selected = 2px primary outline + `primary-container` fill; optional "Recommended" badge inline after the label).
4. **Free text** — L2 label ("Or describe it yourself" / "Tell us what to change"), then outlined multiline field (96px min, corner-medium, 1px neutral border in all states (`outline`, `outline-hover` on hover, `error` only when invalid), placeholder in L4 placeholder color).
5. **Actions** — right-aligned, 40px, corner-small, label-large. Three variants, always in this order: **text** for dismiss (Cancel / Cancel query), **outlined** for an alternative primary action (Retry original question), **filled** for the primary action (Continue / Apply changes; disabled state = 12 % on-surface fill, 38 % text).

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
| Empty / error state panel | Available for empty / error pages (`.pk-empty-state`); the current "Feature unavailable" and "no QTL records" captures keep their original design by request | 800px max (same as dialogs), corner-large, elevation-1, 32 × 24 padding, centered; 160px illustration → L1 title → L4 supporting text (4px below title) → actions (filled + text, 40px) |
| Outlined text input | Every MUI outlined field on message pages and in dialogs | 1px `outline` border; `outline-hover` on hover; unchanged on focus/typing; `error` when invalid. Sizes come from the field's own component token |
| Inline error block | Chart failed to load | `error-container` fill, 1px `error-outline`, corner-medium, 16px padding; title-small in `error`, body-small in `on-error-container` |

## Spacing, shape, elevation

| Token | Value | Use |
| --- | --- | --- |
| spacing-1 … -6 | 4, 8, 12, 16, 20, 24 | Internal gaps and padding |
| spacing-8 / -10 / -12 / -16 | 32, 40, 48, 64 | Dialog margins, page-level gaps |
| corner-extra-small | 4 | Chips, badges |
| corner-small | 8 | Buttons |
| corner-medium | 12 | Cards, option rows, text fields |
| corner-large | 16 | Dialogs, sheets |
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
| Alert padding | `--md-comp-alert-padding-y` / `-x` | 12 / 16 |
| Empty-state illustration | `--md-comp-empty-state-illustration` | 160 |

## Color roles

Material color roles mapped to the PanKbase palette: `primary` teal `rgb(33 145 151)`, `section-label` `#5d6d74`, `on-primary` white, `primary-container` `rgb(240 247 248)`, `secondary-container` `rgb(227 240 241)` (hover tint), `on-surface` `rgb(15 23 42)`, `on-surface-variant` `rgb(89 99 110)`, `outline` `rgb(203 213 225)`, `outline-variant` `rgb(226 232 240)`, `outline-hover` `rgb(148 163 184)`, `scrim` 40 % on-surface; `error` `rgb(186 26 26)`, `error-container` `rgb(254 242 242)`, `on-error-container` `rgb(153 27 27)`, `error-outline` `rgb(252 165 165)`. Always pair a container with its `on-` role.

## Adding a new design

1. Link `../styles/design-tokens.css` first, then the component sheets the page needs: `recovery-dialog.css` for any recovery dialog, `message-states.css` for any page with alerts, empty/error panels or text inputs, or a new `styles/<component>.css` for a new component.
2. Reuse existing component sheets where the component already exists; extend a token rather than adding a literal.
3. Run `python3 scripts/check_tokens.py` and `python3 scripts/check.py` before committing.
4. Regenerate the page's preview with `python3 scripts/capture.py <screen-id>` so the gallery and navigation-tree thumbnails show the current design.
