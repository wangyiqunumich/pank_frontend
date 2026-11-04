import layout from '../schema/card_layout_schema.json';
import catalog from './schema/recorded_fields.json';

// A presentation budget, never a mutation or truncation of the source record.
// Browser height limits and scrolling remain the final viewport guard.
export function compactCardModel(model) {
  if (!model?.schema) return model;
  const budget=layout.compact;
  let remaining=budget.content_budget_px, omitted=0;
  const sections=[];
  for (const [title,content,config] of model.schema) {
    if (title==='Title' || title==='Footer') { sections.push([title,content,config]); continue; }
    if (!Array.isArray(content)) {
      const text=String(model.data[content] ?? '');
      const cost=budget.section_height_px+Math.ceil(text.length/42)*budget.line_height_px;
      if (cost<=remaining) { sections.push([title,content,config]); remaining-=cost; }
      else omitted++;
      continue;
    }
    const rows=[];
    for (const [label,key,format,sourceKey] of content) {
      const short=catalog.fields[sourceKey]?.short_label || label;
      const value=String(model.data[key] ?? '');
      const lines=Math.max(Math.ceil(short.length/budget.label_characters_per_line),Math.ceil(value.length/budget.value_characters_per_line));
      const cost=Math.max(budget.row_min_px,lines*budget.line_height_px)+(rows.length ? 0 : budget.section_height_px);
      if (cost<=remaining) { rows.push([short,key,format,sourceKey]); remaining-=cost; }
      else omitted++;
    }
    if (rows.length) sections.push([title,rows]);
  }
  return {...model,schema:sections,omitted};
}
