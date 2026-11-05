import defaultPolicy from '../../schema/graph_viewer_panel_schema.json';
import defaultLayout from '../../schema/card_layout_schema.json';
import {fieldLabel} from './presentation';
import {formatCardNumber} from './CardValue';
import {valueText} from './api';
// Sections already follow the selected modality profile's compact priorities.
// Select whole fields only; expanded content always retains the complete record.
export function compactSummary(card, policy=defaultPolicy) {
  const spec=policy.compact_summaries?.[card.widget];
  const rows=spec && card[spec.rows];
  if(!rows?.length) return null;
  const columns=spec.columns.filter(c=>rows.some(row=>Object.hasOwn(row[spec.values] || {},c.key))).slice(0,spec.max_columns);
  return columns.length ? {spec,rows,columns} : null;
}
export function compactSections(card, suppliedSections=null, policy=defaultPolicy) {
  const layout=policy.layout || defaultLayout; const b=layout.compact;
  const summary=suppliedSections ? null : compactSummary(card, policy);
  let remaining=b.content_budget_px-(card.endpoints?.length ? 50 : 0)-(summary ? 38+summary.rows.length*28 : 0), omitted=0;
  const sections=[];
  const original=suppliedSections || card.sections || [];
  const priority=policy.compact_section_priority?.[card.production_design] || [];
  const rank=s=>priority.includes(s.title)?priority.indexOf(s.title):priority.length;
  const ordered=priority.length ? [...original].sort((a,b)=>rank(a)-rank(b)) : original;
  for(const section of ordered) {
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
  sections.sort((a,b)=>original.findIndex(s=>s.title===a.title)-original.findIndex(s=>s.title===b.title));
  return {sections,omitted};
}
