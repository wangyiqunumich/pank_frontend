import React from 'react';
import {panelSchema} from './panelSchema';
import {safeSourceUrl,sourcePageUrl} from './tableDownloads';
// Keep production's chromosome/GC pills and population frequency bars.
// Zero is a valid frequency; absent values never become a fabricated zero.
export function ProductionValue({field,children}){
 const format=field.design_format||'';
 const color=format.match(/\(([^)]+)\)/)?.[1];
 if(format.startsWith('label_chr')||format.startsWith('label_percentage'))return <span className="xe-production-pill" style={{backgroundColor:color}}>{format.startsWith('label_chr')?`Chr${field.value}`:`${Number(field.value).toFixed(1)}%`}</span>;
 if(format==='int' && Number.isFinite(Number(field.value)))return <span title={String(field.value)}>{Number(field.value).toLocaleString('en-US')}</span>;
 if(format==='link' && safeSourceUrl(field.value))return <a href={field.value} target="_blank" rel="noreferrer">Open Link ↗</a>;
 return children;
}
export function RecordFooter({provenance={},schema={}}){
 const url=sourcePageUrl({href:provenance.data_source_url},schema);
 const config=panelSchema(schema);
 return <footer className="xe-provenance xe-production-footer">{config.footer.fields.map(field=>{
  const value=provenance[field.key];
  if(field.kind==='source_link')return url ? <a key={field.key} href={url} target="_blank" rel="noreferrer">{field.label} ↗</a> : null;
  if(value===undefined || value===null || value==='')return null;
  return <span key={field.key}>{field.label}: {field.key==='license' && safeSourceUrl(provenance.license_url)?<a href={provenance.license_url} target="_blank" rel="noreferrer">{value}</a>:value}</span>;
 })}</footer>;
}
export function ProductionFrequencies({card}){
 const populations=new Map();
 for(const row of card.frequencies||[]){const rows=populations.get(row.population)||[];rows.push(row);populations.set(row.population,rows);}
 return <div className="xe-production-frequencies">{[...populations].map(([population,rows])=><div className="xe-population" key={population}><div><span>{population}</span><span>{rows.map((r,i)=><small key={i} style={{color:i?'#94A3B8':'#0FB47D'}} title={String(r.frequency)}>{r.allele} {typeof r.frequency==='number'?`${(r.frequency*100).toFixed(2)}%`:'Not recorded'}</small>)}</span></div>{typeof rows[0]?.frequency==='number' && <div className="xe-frequency-bar"><i style={{width:`${Math.max(0,Math.min(100,rows[0].frequency*100))}%`}}/></div>}</div>)}</div>;
}
