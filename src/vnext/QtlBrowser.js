import React, { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import PersistentGraphViewport from '../components/PersistentGraphViewport';
import BrowserImagePlot from './BrowserImagePlot';
import BrowserToolbar from './BrowserToolbar';
import BrowserSelect from './BrowserSelect';
import { BROWSER_FILL_SX } from './browserLayout';
import { browserTabIcon } from './browserTabIcons';
import { moduleApiPath } from './hosting';
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
    fetch(moduleApiPath(`/qtl/sets?${query}`),{signal:abort.signal,credentials:'same-origin'})
      .then(async r=>{if(!r.ok)throw new Error('The QTL catalogue could not load.');return r.json();})
      .then(value=>{if(!abort.signal.aborted){setCatalog(value);setSelected(value.items[0]?.key||'');}})
      .catch(e=>{if(!abort.signal.aborted)setError(e.message);});
    return()=>abort.abort();
  },[isVisible,query,retry]);
  useEffect(()=>{
    setFacts(null);setFactsError('');if(!isVisible||!selected)return undefined;
    const abort=new AbortController();
    fetch(moduleApiPath(`/qtl/data?key=${encodeURIComponent(selected)}`),{signal:abort.signal,credentials:'same-origin'})
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
  const url=selected?moduleApiPath(`/qtl/plot.jpg?key=${encodeURIComponent(selected)}`):'';
  return <PersistentGraphViewport fullscreen={fullscreen} onExit={()=>setFullscreen(false)} label="QTL Browser"><Box className="browser-chrome" sx={BROWSER_FILL_SX}>
    <div className="browser-navigation"><nav className="browser-tabs" aria-label="QTL views">{['Manhattan','Source'].map(value=><button key={value} aria-pressed={tab===value} onClick={()=>setTab(value)}><img src={browserTabIcon(value)} alt="" aria-hidden="true"/>{value==='Manhattan'?'Manhattan plot':value}</button>)}</nav></div>
    <form className="browser-filters" onSubmit={event=>{event.preventDefault();setOffset(0);setGene(draft.trim());}}>
      <label className="browser-select">Source<BrowserSelect label="QTL source" value={source} onChange={value=>{setSource(value);setOffset(0);}} options={Object.entries(SOURCES).map(([value,label])=>({value,label}))}/></label>
      <label className="browser-input"><span>Gene / set</span><input aria-label="QTL gene or full credible-set ID" value={draft} maxLength={512} pattern="[A-Za-z0-9_.:-]*" onChange={e=>setDraft(e.target.value)} placeholder="Gene or complete credible-set ID"/><button type="submit">View</button></label>
      <label className="browser-select qtl-set-select">Credible set<BrowserSelect label="QTL credible set" value={selected} onChange={setSelected} disabled={!catalog?.items.length} placeholder={catalog?'No matching sets':'Loading…'} options={(catalog?.items||[]).map(item=>({value:item.key,label:item.credible_set}))}/></label>
      {catalog?.total>LIMIT&&<div className="qtl-pagination"><button type="button" disabled={!offset} onClick={()=>setOffset(v=>Math.max(0,v-LIMIT))}>Previous</button><span>{offset+1}–{offset+catalog.items.length} of {catalog.total} sets</span><button type="button" disabled={!catalog.truncated} onClick={()=>setOffset(v=>v+LIMIT)}>Next</button></div>}
    </form>
    <div className="browser-functional-stage">
      {tab==='Manhattan'&&(error?<p role="alert" className="browser-source">{error} <button onClick={()=>setRetry(v=>v+1)}>Retry</button></p>:!catalog?<p role="status" className="browser-source">Loading QTL catalogue…</p>:!selected?<p role="status" className="browser-source">No matching credible sets. Try another source or gene, or clear Gene to browse all sets.</p>:factsError?<p role="alert" className="browser-source">{factsError} <button onClick={()=>setRetry(v=>v+1)}>Retry</button></p>:<BrowserImagePlot key={selected} url={url} title={`QTL fine-mapping · ${current?.symbol} · ${SOURCES[source]}`} fullscreen={fullscreen} onFullscreen={()=>setFullscreen(v=>!v)} downloadName="PanKgraph-QTL.jpg" errorLabel="The QTL plot could not load."/>)}
      {tab==='Source'&&<section className="browser-source"><h2>Source &amp; plot details</h2><p>Credible-set SNPs plotted by −log₁₀(P), PIP and LBF, colored by LD R² to the lead SNP.</p><p>The lead SNP is the first maximum-PIP row. The dashed red line identifies that row. Equal SNP spacing represents source order, not genomic distance.</p><p>Source: {SOURCES[source]}<br/>Credible set: {current?.credible_set||'None selected'}<br/>Lead SNP: {facts?.lead_snp||'Unavailable'}</p>{selected&&<a href={moduleApiPath(`/qtl/table.tsv?key=${encodeURIComponent(selected)}`)} download>Download original credible-set table ↗</a>}<p>Snapshot: 2026-11-04 · PanKgraph production v6.</p></section>}
      {tab==='Source'&&<BrowserToolbar navigationOnly fullscreen={fullscreen} onFullscreen={()=>setFullscreen(v=>!v)}/>}
    </div>
    <footer className="browser-footer"><span>{current?.symbol||gene||'All genes'}{facts?` · ${facts.records.length} SNPs`:''}</span><span>{facts?`Lead: ${facts.lead_snp}`:SOURCES[source]}</span></footer>
    <footer className="browser-source-footer" aria-label="Module source"><span>PanKgraph QTL · production v6 · 2026-11-04</span><a href="https://dev.pankgraph.org/qtl-explorer" target="_blank" rel="noopener noreferrer">PanKgraph QTL tool ↗</a></footer>
  </Box></PersistentGraphViewport>;
}
