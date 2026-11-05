import policy from '../../schema/information_panel_schema.json';
import {compactSummary} from './compactSections';
export const nonempty=v=>v!==null && v!==undefined && v!=='' && (!Array.isArray(v)||v.length>0);
// Production section order and visual formats, applied to the selected record's
// current fields. No legacy dataset values or neighbor lookups are introduced.
export function recordDesign(card,source=card) {
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
export function objectSections(card){
 const summary=compactSummary(card);
 const sections=card.sections.map(s=>({...s,fields:s.fields.filter(f=>!policy.provenance_fields.includes(f.key)&&!summary?.spec.replaces.includes(f.key))})).filter(s=>s.fields.length);
 if(!summary)return sections;
 return [...summary.rows.map(row=>({title:row[summary.spec.label],fields:summary.columns.filter(c=>Object.hasOwn(row[summary.spec.values]||{},c.key)).map(c=>({key:`${row[summary.spec.label]}:${c.key}`,label:c.label,value:row[summary.spec.values][c.key],kind:'quantity',layout:'inline'}))})),...sections];
}
export function hasExtraRecord(card,compact,tabs){
 if(tabs.length||compact.omitted>0)return true;
 const shown=new Set(compact.sections.flatMap(s=>s.fields.map(f=>f.key)));
 if((card.fields||[]).some(f=>!shown.has(f.key)&&f.key!=='name'&&!policy.provenance_fields.includes(f.key)&&nonempty(f.value)))return true;
 return Boolean(card.frequencies?.length || card.consequences?.length || card.hgvs || card.group_statistics?.length);
}
