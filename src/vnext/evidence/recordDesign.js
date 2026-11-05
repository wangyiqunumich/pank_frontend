import defaultPolicy from '../../schema/graph_viewer_panel_schema.json';
import {compactSummary} from './compactSections';
export const nonempty=v=>v!==null && v!==undefined && v!=='' && (!Array.isArray(v)||v.length>0);
// Production section order and visual formats, applied to the selected record's
// current fields. No legacy dataset values or neighbor lookups are introduced.
export function recordDesign(card,source=card,policy=defaultPolicy) {
 card={...card,provenance:{...Object.fromEntries((card.fields||[]).filter(f=>policy.provenance_fields.includes(f.key)).map(f=>[f.key,f.value])),...card.provenance}};
 const design=policy.record_design_types?.[card.ref?.type_id];
 const rules=policy.record_designs?.[design];
 if(!rules) return card;
 const fields=new Map([...(card.fields||[]),...card.sections.flatMap(s=>s.fields)].map(f=>[f.key,f]));
 const consumed=new Set(['name',...(design==='Variant'?['id']:[]),...policy.provenance_fields]); const sections=[];
 for(const [title,content,format] of rules) {
  if(['Title','Footer'].includes(title))continue;
  if(format?.startsWith('freq_list'))continue;
  const rows=Array.isArray(content)?content:[[null,content,'prose']];
  const selected=[];
  for(const [label,key,display] of rows){
   let field=fields.get(key);
   const template=policy.record_design_links?.[design]?.[key];
   if(!field && template && card.ref?.kind==='node')field={key,value:template.replace('{id}',encodeURIComponent(card.ref.id))};
   if(!field || !nonempty(field.value))continue;
   consumed.add(key);
   selected.push({...field,label:label||title,short_label:label||title,design_format:display,layout:display==='prose'?'prose':'inline',show_unit:false});
  }
  if(selected.length)sections.push({title,fields:selected,prose:!Array.isArray(content)});
 }
 for(const s of card.sections){const rest=s.fields.filter(f=>!consumed.has(f.key)&&nonempty(f.value));if(rest.length)sections.push({...s,fields:rest});}
 let frequencies=card.frequencies;
 const raw=(source.fields||[]).find(f=>f.key==='freq')?.value ?? fields.get('freq')?.value;
 if(design==='Variant' && typeof raw==='string'){
  const alleles=[fields.get('ref')?.value,...String(fields.get('alt')?.value||'').split(',')];
  const parsed=raw.split('|').flatMap(group=>{
   const split=group.indexOf(':'); if(split<0)return [];
   const population=group.slice(0,split).trim();
   return group.slice(split+1).split(',').flatMap((v,i)=>{
    const frequency=Number(v.trim());
    return v.trim()!=='' && Number.isFinite(frequency) && frequency>=0 && frequency<=1 && alleles[i]
     ? [{population,allele:alleles[i],frequency}] : [];
   });
  });
  if(parsed.length)frequencies=parsed;
 }
 return {...card,sections,frequencies,production_design:design};
}
export function objectSections(card,policy=defaultPolicy){
 const summary=compactSummary(card,policy);
 const sections=card.sections.map(s=>({...s,fields:s.fields.filter(f=>!policy.provenance_fields.includes(f.key)&&!summary?.spec.replaces.includes(f.key))})).filter(s=>s.fields.length);
 if(!summary)return sections;
 return [...summary.rows.map(row=>({title:row[summary.spec.label],fields:summary.columns.filter(c=>Object.hasOwn(row[summary.spec.values]||{},c.key)).map(c=>({key:`${row[summary.spec.label]}:${c.key}`,label:c.label,value:row[summary.spec.values][c.key],kind:'quantity',layout:'inline'}))})),...sections];
}
export function hasExtraRecord(card,compact,tabs,policy=defaultPolicy){
 if(tabs.length||compact.omitted>0)return true;
 const shown=new Set(compact.sections.flatMap(s=>s.fields.map(f=>f.key)));
 if((card.fields||[]).some(f=>!shown.has(f.key)&&!(policy.complete_record.omit_fields||[]).includes(f.key)&&!policy.hidden_internal_fields.includes(f.key)&&!policy.provenance_fields.includes(f.key)&&nonempty(f.value)))return true;
 return Boolean(card.frequencies?.length || card.consequences?.length || card.hgvs || card.group_statistics?.length);
}

// One section layout for every modality. Source values are never recalculated.
export function expandedSections(card,policy=defaultPolicy) {
 const summary=compactSummary(card,policy);
 const consumed=new Set([...policy.provenance_fields,...(policy.complete_record.omit_fields||[]),...(summary?.spec.replaces||[])]);
 if(card.production_design==='Variant')for(const key of ['freq','consequence','hgvs'])consumed.add(key);
 const genes=card.endpoints?.filter(e=>e.ref.type_id==='Gene') || [];
 if(genes.length===1){
  const names=(card.fields||[]).filter(f=>['HGNC_symbol','gene_name','gene_symbol'].includes(f.key));
  const shown=genes[0].display_name || ['HGNC_symbol','gene_name','gene_symbol'].map(k=>names.find(f=>f.key===k)?.value).find(Boolean);
  for(const f of names)if(f.value===shown)consumed.add(f.key);
 }
 const excluded=f=>(policy.complete_record.omit_value_patterns||[]).some(pattern=>typeof f.value==='string' && new RegExp(pattern,'i').test(f.value));
 const sections=[];
 if(summary)for(const row of summary.rows){
  const values=row[summary.spec.values]||{};
  sections.push({title:row[summary.spec.label],fields:Object.entries(values).map(([key,value])=>({key:`${row[summary.spec.label]}:${key}`,label:summary.spec.columns.find(c=>c.key===key)?.label || policy.field_labels[key] || key,value,kind:'quantity'}))});
 }
 for(const section of card.sections||[]){
  const fields=section.fields.filter(f=>{if(consumed.has(f.key)||excluded(f)||!nonempty(f.value))return false;consumed.add(f.key);return true;});
  if(fields.length)sections.push({...section,fields});
 }
 const remaining=(card.fields||[]).filter(f=>{if(consumed.has(f.key)||excluded(f)||!nonempty(f.value))return false;consumed.add(f.key);return true;});
 if(remaining.length)sections.push({title:'Additional details',fields:remaining});
 return sections;
}
