import policy from '../../schema/information_panel_schema.json';
import layout from '../../schema/card_layout_schema.json';
import {fieldLabel} from './presentation';
import {formatCardNumber} from './CardValue';
import {valueText} from './api';
// Sections already follow the selected modality profile's compact priorities.
// Select whole fields only; expanded content always retains the complete record.
export function compactSummary(card) {
  const spec=policy.compact_summaries?.[card.widget];
  const rows=spec && card[spec.rows];
  if(!rows?.length) return null;
  const columns=spec.columns.filter(c=>rows.some(row=>Object.hasOwn(row[spec.values] || {},c.key))).slice(0,spec.max_columns);
  return columns.length ? {spec,rows,columns} : null;
}
export function compactSections(card) {
  const b=layout.compact;
  const summary=compactSummary(card);
  let remaining=b.content_budget_px-(card.endpoints?.length ? 50 : 0)-(summary ? 38+summary.rows.length*28 : 0), omitted=0;
  const sections=[];
  for(const section of card.sections || []) {
    const fields=[];
    for(const field of section.fields) {
      if(summary?.spec.replaces.includes(field.key)) continue;
      const label=fieldLabel(field,card.field_specs);
      const text=field.kind==='quantity' && typeof field.value==='number' && !Number.isInteger(field.value)
        ? formatCardNumber(field.value) : valueText(field.value);
      const lines=Math.max(1,Math.ceil(label.length/b.label_characters_per_line),Math.ceil(String(text).length/b.value_characters_per_line));
      const cost=Math.max(b.row_min_px,lines*b.line_height_px)+(fields.length ? 0:b.section_height_px);
      if(cost<=remaining){fields.push(field);remaining-=cost;}else omitted++;
    }
    if(fields.length)sections.push({...section,fields});
  }
  return {sections,omitted};
}
