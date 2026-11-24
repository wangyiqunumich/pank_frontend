import React from 'react';
import {GraphPanelSymbol} from '../GraphInfoPanel';
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
const licenseLabels = {'CC-BY-4.0':'CC BY 4.0','LicenseRef-NCBI-Data-Usage':'NCBI Data Usage'};

export function RecordFooter({provenance={},schema={},className='',sourceLinks,chips=false}){
 const fields=panelSchema(schema).footer.fields;
  const sourceFields=chips ? fields.filter(field=>['data_source','data_version'].includes(field.key)) : [];
  const detailFields=fields.filter(field=>!sourceFields.includes(field));
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
   const fieldValues=key=>[...new Set(group.map(record=>record[key]).filter(value=>value!=null && value!==''))];
   const items=detailFields.flatMap(field=>{
     if(field.kind==='source_link') {
       return sourceLinks || chips ? [] : group.map(record=>sourcePageUrl({href:record.data_source_url},schema)).filter(Boolean)
         .map(href=>link(href,`${field.label} ↗`,href)).filter(Boolean);
     }
     const values=fieldValues(field.key);
     if(!values.length)return [];
     const value=values.join(', ');
     const licenseUrl=field.key==='license' && safeSourceUrl(group[0].license_url);
     const licenseChip=chips && field.key==='license';
     const label=licenseChip ? values.map(item=>licenseLabels[item] || item).join(', ') : value;
     const anchor=licenseUrl && !pageLinks.has(licenseUrl) && link(licenseUrl,label,licenseUrl);
     if(licenseChip)return [<span key={field.key} className="xe-footer-license" title={value}>{anchor || label}</span>];
     return [<span key={field.key}>{field.label}: {anchor || value}</span>];
   });
   const source=sourceFields.some(field=>field.key==='data_source') && fieldValues('data_source').join(', ');
   const versions=sourceFields.some(field=>field.key==='data_version') && fieldValues('data_version').map(version=>
     source==='dbSNP' && /^\d+$/.test(version) ? `v${version}` : version).join(', ');
   if(source || versions)items.unshift(<span key="source-chip" className="xe-footer-source">
     <GraphPanelSymbol name="database"/>{source && <strong>{source}</strong>}{versions && <span>{versions}</span>}
   </span>);
   return {key,items};
 }).filter(section=>section.items.length>0);
 const links=chips ? [...pageLinks].map(href=>{
   const suppliedLabel=suppliedLinks.get(href);
   const sourceLabel=suppliedLabel==='Source page' ? new URL(href).hostname : suppliedLabel;
   const label=pageLinks.size>1 && sourceLabel ? sourceLabel : 'Open';
   return <a key={href} href={href} title={href} aria-label={label==='Open' && sourceLabel ? `Open ${sourceLabel}` : undefined}
     target="_blank" rel="noopener noreferrer">{label} <GraphPanelSymbol name="open_in_new"/></a>;
 }) : [...suppliedLinks].map(([href,label])=>link(href,`${label} ↗`,href)).filter(Boolean);
 if(!sections.length && !links.length)return null;
  return <footer className={`xe-provenance xe-production-footer${chips ? ' xe-record-footer' : ''} ${className}`.trim()}>
   {sections.length===1 ? sections[0].items : sections.map(({key,items})=><div key={key} className="xe-footer-group">{items}</div>)}
   {chips && links.length > 0 ? <div className="xe-footer-open">{links}</div> : links}
 </footer>;
}
export function ProductionFrequencies({card}){
 const populations=new Map();
 for(const row of card.frequencies||[]){const rows=populations.get(row.population)||[];rows.push(row);populations.set(row.population,rows);}
 return <div className="xe-production-frequencies">{[...populations].map(([population,rows])=><div className="xe-population" key={population}><div><span>{population}</span><span>{rows.map((r,i)=><small key={i} title={String(r.frequency)}>{r.allele} {typeof r.frequency==='number'?`${(r.frequency*100).toFixed(2)}%`:'Not recorded'}</small>)}</span></div>{typeof rows[0]?.frequency==='number' && <div className="xe-frequency-bar"><i style={{width:`${Math.max(0,Math.min(100,rows[0].frequency*100))}%`}}/></div>}</div>)}</div>;
}
