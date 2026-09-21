# PanKgraph design system (Material Design 3)

Every redesigned screen in this atlas follows Material Design 3 and draws all values from one token sheet: **[`styles/design-tokens.css`](styles/design-tokens.css)**. Component stylesheets (for example [`styles/recovery-dialog.css`](styles/recovery-dialog.css)) contain no literal sizes or colors; they reference tokens only. This keeps typography, spacing, dimensions and color identical across screens and across future work.

## Rules

1. **Tokens only.** Use `var(--md-sys-*)` / `var(--md-comp-*)`. If a value is missing, add a token first, then use it. `python3 scripts/check_tokens.py` fails on any hardcoded value.
2. **4px grid.** Every length is a multiple of 4px. Spacing comes from `--md-sys-spacing-1 … -16` (4 → 64px).
3. **One type scale.** Pick a role, never a size: headline / title / body / label. Do not invent sizes between steps.
4. **Standard dimensions.** Controls share heights and radii (see table). Do not size a component to its content.
5. **Structure before style.** Keep the app's Material UI component structure (Dialog → DialogTitle / DialogContent / DialogActions, RadioGroup → FormControlLabel + Radio, TextField, Chip, IconButton). Restyle; do not rebuild.
6. **Fixed frames, flexible content.** Every desktop dialog is 800px wide regardless of content; height follows content up to the viewport, then the content region scrolls while header and actions stay pinned. Never vary width per scenario.
7. **States.** Hover, focus, pressed and disabled use the state-layer tokens; focus is a 2px primary ring with 2px offset.

## Type scale and hierarchy

Every dialog reads in four levels. Pick the level, never a size.

| Level | Role | Size / line | Weight | Color | Use |
| --- | --- | --- | --- | --- | --- |
| 1 | headline-small | 24 / 32 | 700 | on-surface | The single dialog / page title |
| 2 | section-label | 16 / 24 | 700 | section-label `#5d6d74` | Section labels, sentence case ("Your original question", "Why it didn't work", "Suggested options — select one to continue:", "Or describe it yourself") |
| 3 | body-large | 16 / 24 | 400 | on-surface | Primary content: quoted question, option text, user input |
| 4 | body-medium | 14 / 20 | 400 | on-surface-variant | Supporting text: explanations, helper copy |
| 4 | label-small | 11 / 16 | 500 | on-secondary-container | Tertiary badges ("Recommended"), sentence case |
| — | label-large | 14 / 20 | 500 | — | Buttons |
| — | title-large | 22 / 28 | 700 | on-surface | Dialog title below 600px |

Inline annotations inside primary content (for example "(stage 3)") keep the level-3 size and take the level-4 color. No uppercase labels, no divider rules for labels: hierarchy comes from type, color and spacing.

Typeface: Roboto stack (the existing MUI theme face).

### Vertical rhythm (dialogs)

| Relationship | Token | Value |
| --- | --- | --- |
| Title → supporting text (header group) | spacing-2 | 8 |
| Section → section | spacing-6 | 24 |
| Section label → its content | section-label-gap | 8 |
| Option → option | spacing-2 | 8 |
| Container padding | dialog-padding | 24 (compact 16) |

## Spacing, shape, elevation

| Token | Value | Use |
| --- | --- | --- |
| spacing-1 … -6 | 4, 8, 12, 16, 20, 24 | Internal gaps and padding |
| spacing-8 / -10 / -12 / -16 | 32, 40, 48, 64 | Section gaps, dialog margins |
| corner-extra-small | 4 | Chips, badges |
| corner-small | 8 | Buttons, single-line inputs |
| corner-medium | 12 | Cards, option rows, text areas |
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
| Outline | `--md-comp-outline-width` / `-focus` | 1 / 2 |

## Color roles

Material color roles mapped to the PanKbase palette: `primary` teal `rgb(33 145 151)`, `section-label` `#5d6d74`, `on-primary` white, `primary-container` `rgb(240 247 248)`, `secondary-container` `rgb(227 240 241)` (hover tint), `on-surface` `rgb(15 23 42)`, `on-surface-variant` `rgb(89 99 110)`, `outline` `rgb(203 213 225)`, `outline-variant` `rgb(226 232 240)`, `scrim` 40 % on-surface. Always pair a container with its `on-` role.

## Adding a new design

1. Link `../styles/design-tokens.css` first, then a component sheet named for the component (`styles/<component>.css`).
2. Reuse existing component sheets where the component already exists; extend a token rather than adding a literal.
3. Run `python3 scripts/check_tokens.py` and `python3 scripts/check.py` before committing.
