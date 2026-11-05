import React, { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import PersistentGraphViewport from '../components/PersistentGraphViewport';
import BrowserImagePlot from './BrowserImagePlot';
import BrowserToolbar from './BrowserToolbar';
import { BROWSER_FILL_SX } from './browserLayout';
import { sitePath } from './api';
import { registerGuideModule } from './moduleGuide/bridge';
import './browserChrome.css';

const SOURCES={PKBDS6689QROA:'GTEx · pancreatic eQTL',PKBDS8062GYOQ:'INSPIRE · islet eQTL',PKBDS2105PCON:'GTEx · pancreatic splicing QTL',PKBDS9837ORWK:'INSPIRE · islet exon QTL'};
const LIMIT=50;
export default function QtlBrowser({isVisible=false,contexts=[]}) {
  const [tab,setTab]=useState('Manhattan'),[fullscreen,setFullscreen]=useState(false);
  const [source,setSource]=useState(contexts.find(c=>c.available)?.sourceId||'PKBDS2105PCON'),[gene,setGene]=useState(contexts.find(c=>c.available)?.credibleSet||'CFTR'),[draft,setDraft]=useState(contexts.find(c=>c.available)?.credibleSet||'CFTR'),[offset,setOffset]=useState(0);
  const [catalog,setCatalog]=useState(null),[selected,setSelected]=useState(''),[error,setError]=useState(''),[retry,setRetry]=useState(0);
  const [facts,setFacts]=useState(null),[factsError,setFactsError]=useState('');
  const query=new URLSearchParams({source,...(gene.includes('__')?{credible_set_id:gene}:{gene}),offset:String(offset),limit:String(LIMIT)}).toString();
  useEffect(()=>{
    if(!isVisible)return undefined;
    const abort=new AbortController();setCatalog(null);setError('');setSelected('');
    fetch(sitePath(`/api/qtl/sets?${query}`),{signal:abort.signal,credentials:'same-origin'})
      .then(async r=>{if(!r.ok)throw new Error('The QTL catalogue could not load.');return r.json();})
      .then(value=>{if(!abort.signal.aborted){setCatalog(value);setSelected(value.items[0]?.key||'');}})
      .catch(e=>{if(!abort.signal.aborted)setError(e.message);});
    return()=>abort.abort();
  },[isVisible,query,retry]);
  useEffect(()=>{
    setFacts(null);setFactsError('');if(!isVisible||!selected)return undefined;
    const abort=new AbortController();
    fetch(sitePath(`/api/qtl/data?key=${encodeURIComponent(selected)}`),{signal:abort.signal,credentials:'same-origin'})
      .then(async r=>{if(!r.ok)throw new Error('Source values are unavailable for this set.');return r.json();})
      .then(value=>{if(!abort.signal.aborted)setFacts(value);}).catch(e=>{if(!abort.signal.aborted)setFactsError(e.message);});
    return()=>abort.abort();
  },[isVisible,selected,retry]);
  useEffect(()=>{
    if(!isVisible)return undefined;
    return registerGuideModule('qtl_browser',async action=>{
      if(action.type!=='open_module')throw new Error('Use the QTL source, gene and credible-set controls to configure the plot.');
      const inverse={...action,params:{view:tab}};setTab(action.params.view||'Manhattan');return inverse;
    });
  },[isVisible,tab]);
  if(!isVisible)return null;
  const current=catalog?.items.find(item=>item.key===selected);
  const url=selected?sitePath(`/api/qtl/plot.jpg?key=${encodeURIComponent(selected)}`):'';
  return <PersistentGraphViewport fullscreen={fullscreen} onExit={()=>setFullscreen(false)} label="QTL Browser"><Box className="browser-chrome" sx={BROWSER_FILL_SX}>
    <div className="browser-navigation"><nav className="browser-tabs" aria-label="QTL views">{['Manhattan','Source'].map(value=><button key={value} aria-pressed={tab===value} onClick={()=>setTab(value)}>{value==='Manhattan'?'Manhattan plot':value}</button>)}</nav></div>
    <form className="browser-filters" onSubmit={event=>{event.preventDefault();setOffset(0);setGene(draft.trim());}}>
      <label className="browser-select">Source<select aria-label="QTL source" value={source} onChange={e=>{setSource(e.target.value);setOffset(0);}}>{Object.entries(SOURCES).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
      <label className="browser-input"><span>Gene / set</span><input aria-label="QTL gene or full credible-set ID" value={draft} maxLength={512} pattern="[A-Za-z0-9_.:-]*" onChange={e=>setDraft(e.target.value)} placeholder="Gene or complete credible-set ID"/><button type="submit">View</button></label>
      <label className="browser-select qtl-set-select">Credible set<select aria-label="QTL credible set" value={selected} onChange={e=>setSelected(e.target.value)} disabled={!catalog?.items.length}>
        {!catalog?.items.length&&<option value="">{catalog?'No matching sets':'Loading…'}</option>}
        {catalog?.items.map(item=><option key={item.key} value={item.key}>{item.credible_set}</option>)}
      </select></label>
      {catalog?.total>LIMIT&&<div className="qtl-pagination"><button type="button" disabled={!offset} onClick={()=>setOffset(v=>Math.max(0,v-LIMIT))}>Previous</button><span>{offset+1}–{offset+catalog.items.length} of {catalog.total} sets</span><button type="button" disabled={!catalog.truncated} onClick={()=>setOffset(v=>v+LIMIT)}>Next</button></div>}
    </form>
    <div className="browser-functional-stage">
      {tab==='Manhattan'&&(error?<p role="alert" className="browser-source">{error} <button onClick={()=>setRetry(v=>v+1)}>Retry</button></p>:!catalog?<p role="status" className="browser-source">Loading QTL catalogue…</p>:!selected?<p role="status" className="browser-source">No matching credible sets in this source snapshot. Try another source or gene; clear Gene to browse all sets. This does not establish absence of a QTL.</p>:factsError?<p role="alert" className="browser-source">{factsError} <button onClick={()=>setRetry(v=>v+1)}>Retry</button></p>:<BrowserImagePlot key={selected} url={url} title={`QTL fine-mapping · ${current?.symbol} · ${SOURCES[source]}`} fullscreen={fullscreen} onFullscreen={()=>setFullscreen(v=>!v)} downloadName="PanKgraph-QTL.jpg" errorLabel="The QTL plot could not load."/>)}
      {tab==='Source'&&<section className="browser-source"><h2>Source &amp; plot details</h2><p>The original PanKgraph production renderer shows −log₁₀(P), PIP, LBF, and LD R² to the lead SNP. Colors, markers, source values and SNP order are preserved; only canvas proportions adapt to the available space.</p><p>The lead SNP is the first maximum-PIP row. The dashed red line identifies that row. Equal SNP spacing represents source order, not genomic distance. This is a credible-set plot, not a genome-wide association scan.</p><p>Missing LD remains missing. PIP is not proof of causality. Different QTL sources are not assumed to share donors or an LD reference panel.</p><p>Source: {SOURCES[source]}<br/>Credible set: {current?.credible_set||'None selected'}<br/>Lead SNP: {facts?.lead_snp||'Unavailable'}</p>{selected&&<a href={sitePath(`/api/qtl/table.tsv?key=${encodeURIComponent(selected)}`)} download>Download original credible-set table ↗</a>}<p>Identity: exact PanKbase dataset ID + full credible-set ID. Generic source labels do not identify a set. Snapshot: 2026-11-04 · Production Lambda version 6. This catalogue copies the existing production QTL collections; it does not rerun fine-mapping.</p></section>}
      {tab==='Source'&&<BrowserToolbar navigationOnly fullscreen={fullscreen} onFullscreen={()=>setFullscreen(v=>!v)}/>}
    </div>
    <footer className="browser-footer"><span>{current?.symbol||gene||'All genes'}{facts?` · ${facts.records.length} SNPs`:''}</span><span>{facts?`Lead: ${facts.lead_snp}`:SOURCES[source]}</span><p className="description">Source-order SNPs · −log₁₀(P), PIP, LBF · Color: LD R² · Dashed line: maximum-PIP SNP</p></footer>
    <footer className="browser-source-footer" aria-label="Module source"><span>PanKgraph QTL · production v6 · 2026-11-04</span><a href="https://dev.pankgraph.org/qtl-explorer" target="_blank" rel="noopener noreferrer">PanKgraph QTL tool ↗</a></footer>
  </Box></PersistentGraphViewport>;
}
