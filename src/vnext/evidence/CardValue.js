import React from 'react';
import {bundled,usePanelSchema} from './panelSchema';
import './cardLayout.css';
const layoutSchema=bundled.layout;

export function cardLayoutVariables() {
  const h=layoutSchema.height_limits;
  return {'--kg-compact-height':`${h.compact_px}px`,'--kg-compact-vh':`${h.compact_vh}vh`,
    '--kg-expanded-height':`${h.expanded_px}px`,'--kg-expanded-vh':`${h.expanded_vh}vh`,'--kg-card-margin':`${h.viewport_margin_px}px`};
}
export function cardHeightLimit(expanded=false,viewportHeight=window.innerHeight) {
  const h=layoutSchema.height_limits;
  return Math.min(expanded?h.expanded_px:h.compact_px,viewportHeight*(expanded?h.expanded_vh:h.compact_vh)/100,viewportHeight-h.viewport_margin_px);
}
export function formatCardNumber(value,layout=layoutSchema) {
  const n=Number(value);
  if (value === null || value === undefined || value === '') return 'Not recorded';
  if (typeof value === 'boolean' || !Number.isFinite(n)) return String(value);
  if (n === 0) return '0';
  const digits=layout.quantity_significant_digits;
  if (Math.abs(n)<0.001 || Math.abs(n)>=1e6) {
    const [m,e]=n.toExponential(digits-1).split('e');
    const superscript={'-':'⁻','0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹'};
    return `${Number(m)} × 10${String(Number(e)).split('').map(c=>superscript[c] || c).join('')}`;
  }
  return String(Number(n.toPrecision(digits)));
}

// Shared by compact cards, expanded records and table details. Layout is a
// property of the content, never of a particular modality or field name.
export function cardValueLayout(value, hint = 'auto',layout=layoutSchema) {
  if (layout.layouts.includes(hint) && hint !== 'auto') return hint;
  if (Array.isArray(value)) return 'tokens';
  if (typeof value === 'string' && (/\n/.test(value) ||
      (value.length >= layout.prose_min_characters && /\s/.test(value)))) return 'prose';
  return 'inline';
}

export function CardValue({ value, layout = 'auto', format = String }) {
  const config=usePanelSchema();
  const kind = cardValueLayout(value, layout,config.layout);
  if (Array.isArray(value) && value.length) return <span className="kg-value kg-value-tokens" role="list">
    {value.map((item, i) => <span className="kg-value-token" role="listitem" key={i}>{format(item)}</span>)}
  </span>;
  const rendered=format(value);
  return <span className={`kg-value kg-value-${kind}`} title={rendered !== String(value) && value !== null && value !== undefined ? String(value) : undefined}>{rendered}</span>;
}
