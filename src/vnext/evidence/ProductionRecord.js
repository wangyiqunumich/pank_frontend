import React from 'react';
import {safeSourceUrl} from './tableDownloads';
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
export function RecordFooter({provenance={}}){
 const url=safeSourceUrl(provenance.data_source_url);
 return <footer className="xe-provenance xe-production-footer">
  <span>Data Source: {provenance.data_source||'Not recorded'}</span>
  <span>Data Version: {provenance.data_version||'Not recorded'}</span>
  {url && <a href={url} target="_blank" rel="noreferrer">Open Link ↗</a>}
  {provenance.license && <span>License: {safeSourceUrl(provenance.license_url)?<a href={provenance.license_url} target="_blank" rel="noreferrer">{provenance.license}</a>:provenance.license}</span>}
 </footer>;
}
export function ProductionFrequencies({card}){
 const populations=new Map();
 for(const row of card.frequencies||[]){const rows=populations.get(row.population)||[];rows.push(row);populations.set(row.population,rows);}
 return <div className="xe-production-frequencies">{[...populations].map(([population,rows])=><div className="xe-population" key={population}><div><span>{population}</span><span>{rows.map((r,i)=><small key={i} style={{color:i?'#94A3B8':'#0FB47D'}} title={String(r.frequency)}>{r.allele} {typeof r.frequency==='number'?`${(r.frequency*100).toFixed(2)}%`:'Not recorded'}</small>)}</span></div>{typeof rows[0]?.frequency==='number' && <div className="xe-frequency-bar"><i style={{width:`${Math.max(0,Math.min(100,rows[0].frequency*100))}%`}}/></div>}</div>)}</div>;
}
