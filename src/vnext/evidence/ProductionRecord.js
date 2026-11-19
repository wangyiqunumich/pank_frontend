import React from 'react';
import {panelSchema} from './panelSchema';
import {safeSourceUrl,sourcePageUrl} from './tableDownloads';
// Keep production's chromosome/GC pills and population frequency bars.
// Zero is a valid frequency; absent values never become a fabricated zero.
export function ProductionValue({field,children}){
 const format=field.design_format||'';
 const color=format.match(/\(([^)]+)\)/)?.[1];
 const chromosome=format.startsWith('label_chr');
 if(chromosome||format.startsWith('label_percentage'))return <span className="xe-production-pill" data-chromosome={chromosome || undefined} style={{'--production-pill-color':color}}>{chromosome?`Chr${field.value}`:`${Number(field.value).toFixed(1)}%`}</span>;
 if(format==='int' && Number.isFinite(Number(field.value)))return <span title={String(field.value)}>{Number(field.value).toLocaleString('en-US')}</span>;
 if(format==='link' && safeSourceUrl(field.value))return <a href={field.value} target="_blank" rel="noreferrer">Open Link ↗</a>;
 return children;
}
export function RecordFooter({provenance={},schema={},className='',sourceLinks}){
 const fields=panelSchema(schema).footer.fields;
 const records=(Array.isArray(provenance) ? provenance : [provenance]).filter(Boolean);
 const commonFields=fields.filter(field=>field.kind!=='source_link' && field.key!=='data_version');
 const groups=new Map();
 for(const record of records) {
   const key=JSON.stringify([...commonFields.map(field=>record[field.key]),safeSourceUrl(record.license_url)]);
   if(!groups.has(key))groups.set(key,[]);
   groups.get(key).push(record);
 }
 const suppliedLinks=new Map();
 for(const [url,label] of sourceLinks || []) {
   const href=safeSourceUrl(url);
   if(href && !suppliedLinks.has(href))suppliedLinks.set(href,label);
 }
 const pageLinks=sourceLinks ? new Set(suppliedLinks.keys()) : new Set(
   fields.some(field=>field.kind==='source_link') ? records.map(record=>sourcePageUrl({href:record.data_source_url},schema)).filter(Boolean) : [],
 );
 const shownLinks=new Set();
 const link=(href,label,key)=>{
   if(shownLinks.has(href))return null;
   shownLinks.add(href);
   return <a key={key} href={href} target="_blank" rel="noopener noreferrer">{label}</a>;
 };
 const sections=[...groups].map(([key,group])=>{
   const items=fields.flatMap(field=>{
     if(field.kind==='source_link') {
       return sourceLinks ? [] : group.map(record=>sourcePageUrl({href:record.data_source_url},schema)).filter(Boolean)
         .map(href=>link(href,`${field.label} ↗`,href)).filter(Boolean);
     }
     const values=[...new Set(group.map(record=>record[field.key]).filter(value=>value!=null && value!==''))];
     if(!values.length)return [];
     const value=values.join(', ');
     const licenseUrl=field.key==='license' && safeSourceUrl(group[0].license_url);
     const anchor=licenseUrl && !pageLinks.has(licenseUrl) && link(licenseUrl,value,licenseUrl);
     return [<span key={field.key}>{field.label}: {anchor || value}</span>];
   });
   return {key,items};
 }).filter(section=>section.items.length>0);
 const links=[...suppliedLinks].map(([href,label])=>link(href,`${label} ↗`,href)).filter(Boolean);
 if(!sections.length && !links.length)return null;
 return <footer className={`xe-provenance xe-production-footer ${className}`.trim()}>
   {sections.length===1 ? sections[0].items : sections.map(({key,items})=><div key={key} className="xe-footer-group">{items}</div>)}
   {links}
 </footer>;
}
export function ProductionFrequencies({card}){
 const populations=new Map();
 for(const row of card.frequencies||[]){const rows=populations.get(row.population)||[];rows.push(row);populations.set(row.population,rows);}
 return <div className="xe-production-frequencies">{[...populations].map(([population,rows])=><div className="xe-population" key={population}><div><span>{population}</span><span>{rows.map((r,i)=><small key={i} title={String(r.frequency)}>{r.allele} {typeof r.frequency==='number'?`${(r.frequency*100).toFixed(2)}%`:'Not recorded'}</small>)}</span></div>{typeof rows[0]?.frequency==='number' && <div className="xe-frequency-bar"><i style={{width:`${Math.max(0,Math.min(100,rows[0].frequency*100))}%`}}/></div>}</div>)}</div>;
}
