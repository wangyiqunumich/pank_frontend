import React, { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import PersistentGraphViewport from '../components/PersistentGraphViewport';
import BrowserImagePlot from './BrowserImagePlot';
import BrowserToolbar from './BrowserToolbar';
import { sitePath } from './api';
import { BROWSER_FILL_SX } from './browserLayout';
import './browserChrome.css';

const TRACES = {
  ins_ieq: 'Insulin · per IEQ', ins_content: 'Insulin · % content',
  gcg_ieq: 'Glucagon · per IEQ', gcg_content: 'Glucagon · % content',
};

// Native PanKgraph result-page rendering/data, with the shared browser chrome.
export default function PanKgraphFunctionalPlot({ isVisible = false }) {
  const [trace, setTrace] = useState('ins_ieq');
  const [count, setCount] = useState(null);
  const [tab,setTab]=useState('Response'), [fullscreen,setFullscreen]=useState(false);
  useEffect(() => {
    if (!isVisible) return undefined;
    const controller = new AbortController();
    fetch(sitePath('/api/functional/api/data/summary'), { signal: controller.signal, credentials: 'same-origin' })
      .then(response => { if (!response.ok) throw new Error('Summary unavailable'); return response.json(); })
      .then(value => setCount(value.summary?.available_donors ?? null)).catch(() => {});
    return () => controller.abort();
  }, [isVisible]);
  if (!isVisible) return null;
  const url = sitePath(`/api/functional/api/charts/cohort-traces.png?trace_type=${trace}&result_page=Yes`);
  return <PersistentGraphViewport fullscreen={fullscreen} onExit={()=>setFullscreen(false)} label="PanKgraph functional plot"><Box className="browser-chrome" sx={BROWSER_FILL_SX}>
    <div className="browser-navigation functional-navigation"><nav className="browser-tabs" aria-label="Functional views">{['Response','Source'].map(value=><button key={value} aria-pressed={tab===value} onClick={()=>setTab(value)}>{value}</button>)}</nav><label className="browser-select">Response<select value={trace} onChange={event=>setTrace(event.target.value)}>{Object.entries(TRACES).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label></div>
    <div className="browser-functional-stage">
      <div style={{display:tab==='Response'?'flex':'none',height:'100%',minHeight:0}}><BrowserImagePlot key={trace} url={url} title={`PanKgraph functional response · ${TRACES[trace]}`} fullscreen={fullscreen} onFullscreen={()=>setFullscreen(value=>!value)}/></div>
      {tab==='Source'&&<section className="browser-source"><h2>Source &amp; methods</h2><p>The native PanKgraph functional service renders the HIPP response curves with responsive axes and legends using the original service data.</p><p>Individual donor traces and their average, stimulus windows, time coordinates and source units are preserved. This independent functional cohort is not inferred from the graph selection.</p><p>IEQ-normalized and content-normalized responses have different units. The response selector retains all four insulin/glucagon modes.</p><a href="https://functional.pankgraph.org" target="_blank" rel="noopener noreferrer">Original PanKgraph functional service ↗</a></section>}
      {tab==='Source'&&<BrowserToolbar navigationOnly fullscreen={fullscreen} onFullscreen={()=>setFullscreen(value=>!value)}/>}
    </div>
    <footer className="browser-footer"><span>All available donors{count!==null?` · ${count} donors`:''}</span><span>{TRACES[trace]}</span><p className="description">Independent functional cohort · Native PanKgraph plot · Faint: first 24 donor traces · Bold: cohort mean</p></footer>
    <footer className="browser-source-footer" aria-label="Module source"><span>PanKgraph functional data</span><a href="https://pankbase.org/functional.html" target="_blank" rel="noopener noreferrer">PanKbase functional browser ↗</a></footer>
  </Box></PersistentGraphViewport>;
}
