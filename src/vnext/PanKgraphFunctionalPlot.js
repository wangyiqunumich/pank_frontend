import React, { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import PersistentGraphViewport from '../components/PersistentGraphViewport';
import BrowserImagePlot from './BrowserImagePlot';
import BrowserToolbar from './BrowserToolbar';
import { sitePath } from './api';
import { BROWSER_FILL_SX } from './browserLayout';
import './browserChrome.css';
import { FUNCTIONAL_FILTER_LABELS, functionalQuery, validFunctionalFilters } from './functionalConfig.mjs';
import { registerGuideModule } from './moduleGuide/bridge';

const TRACES = {
  ins_ieq: 'Insulin · per IEQ', ins_content: 'Insulin · % content',
  gcg_ieq: 'Glucagon · per IEQ', gcg_content: 'Glucagon · % content',
};

// Native PanKgraph result-page rendering/data, with the shared browser chrome.
export default function PanKgraphFunctionalPlot({ isVisible = false }) {
  const [trace, setTrace] = useState('ins_ieq');
  const [filters,setFilters]=useState({});
  const [cohort,setCohort]=useState(null),[cohortError,setCohortError]=useState(''),[retry,setRetry]=useState(0);
  const query=functionalQuery(trace,filters);
  const activeCohort=cohort?.query===query?cohort.payload:null;
  const [tab,setTab]=useState('Response'), [fullscreen,setFullscreen]=useState(false);
  useEffect(() => {
    if (!isVisible) return undefined;
    const controller = new AbortController();setCohort(null);setCohortError('');
    fetch(sitePath(`/api/functional/api/charts/cohort-traces?${query}`), { signal: controller.signal, credentials: 'same-origin' })
      .then(response => { if (!response.ok) throw new Error('The plotted cohort could not be verified.'); return response.json(); })
      .then(payload => {
        if(payload.trace_type!==trace||!Array.isArray(payload.series)||!payload.series.every(row=>typeof row.donor_id==='string'))throw new Error('The plotted cohort could not be verified.');
        if(!controller.signal.aborted)setCohort({query,payload});
      }).catch(error => {if(!controller.signal.aborted)setCohortError(error.message);});
    return () => controller.abort();
  }, [isVisible,query,trace,retry]);
  useEffect(()=>{
    if(!isVisible)return undefined;
    return registerGuideModule('functional_browser', async action=>{
      if(action.type==='functional_filters'){if(!validFunctionalFilters(action.params.filters))throw new Error('Unsupported cohort filters.');const undo={...action,params:{filters:JSON.parse(JSON.stringify(filters))}};setFilters(JSON.parse(JSON.stringify(action.params.filters)));setTab('Response');return undo;}
      if(action.type==='functional_response'){const undo={...action,params:{trace}};setTrace(action.params.trace);setTab('Response');return undo;}
      if(action.type==='open_module'){const undo={...action,params:{view:tab}};setTab(action.params.view);return undo;}
      throw new Error('Unsupported functional configuration.');
    });
  },[isVisible,trace,tab,filters]);
  if (!isVisible) return null;
  const url = sitePath(`/api/functional/api/charts/cohort-traces.png?${query}`);
  const ids=activeCohort?.series.map(row=>row.donor_id)||[];
  const status=cohortError?<p role="alert">{cohortError} <button onClick={()=>setRetry(v=>v+1)}>Retry</button></p>:!activeCohort?<p role="status">Loading plotted cohort…</p>:!ids.length?<p role="status">No donors have this response under the applied filters. No plot is generated.</p>:null;
  return <PersistentGraphViewport fullscreen={fullscreen} onExit={()=>setFullscreen(false)} label="PanKgraph functional plot"><Box className="browser-chrome" sx={BROWSER_FILL_SX}>
    <div className="browser-navigation functional-navigation"><nav className="browser-tabs" aria-label="Functional views">{['Response','Source'].map(value=><button key={value} aria-pressed={tab===value} onClick={()=>setTab(value)}>{value}</button>)}</nav><label className="browser-select">Response<select value={trace} onChange={event=>setTrace(event.target.value)}>{Object.entries(TRACES).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label></div>
    <div className="browser-functional-stage">
      <div style={{display:tab==='Response'?'flex':'none',height:'100%',minHeight:0}}>{status||<BrowserImagePlot key={query} url={url} title={`PanKgraph functional response · ${TRACES[trace]}`} fullscreen={fullscreen} onFullscreen={()=>setFullscreen(value=>!value)}/>}</div>
      {tab==='Source'&&<section className="browser-source"><h2>Source &amp; methods</h2><p><strong>Agent-configured cohort.</strong> Ask the module guide to change cohort filters or donor IDs, then use Apply; Undo restores the previous configuration. This compact module has no manual cohort filter controls. The Response selector changes the measurement, not the cohort filters.</p><h3>Configuration used for this plot</h3><p>Response: {TRACES[trace]}</p><dl className="functional-filter-summary">{Object.entries(FUNCTIONAL_FILTER_LABELS).map(([key,label])=><React.Fragment key={key}><dt>{label}</dt><dd>{filters[key]===undefined?(['ids','donor_ids','hpap_ids'].includes(key)?'No explicit ID restriction':'Not restricted'):Array.isArray(filters[key])?filters[key].join(', '):String(filters[key])}</dd></React.Fragment>)}</dl><p>{Object.keys(filters).some(key=>['ids','donor_ids','hpap_ids'].includes(key))?'Selection uses only the explicit ID list; metadata filters are not applied.':'All listed metadata filters are combined (AND). Unrestricted fields do not filter the cohort.'}</p>{status}{activeCohort&&<><h3>Donor IDs used to generate this figure</h3><p>{ids.length} response-bearing donors in the cohort mean. The individual lines show the first {Math.min(24,ids.length)} in source order. Donors without this response are excluded; contributions at individual time points may vary where values are missing.</p><details><summary>Cohort mean donor IDs ({ids.length})</summary><pre className="functional-donor-ids">{ids.join('\n')||'None'}</pre></details><details><summary>Individual trace donor IDs ({Math.min(24,ids.length)})</summary><pre className="functional-donor-ids">{ids.slice(0,24).join('\n')||'None'}</pre></details><p>These IDs come from the cohort-traces response using the same trace and filter parameters as the image. They are not inferred from graph selection.</p></>}<p>The native PanKgraph functional service renders the HIPP response curves with responsive axes and legends using the original service data.</p><p>Individual donor traces and their average, stimulus windows, time coordinates and source units are preserved. This independent functional cohort is not inferred from the graph selection.</p><p>IEQ-normalized and content-normalized responses have different units. The response selector retains all four insulin/glucagon modes.</p><a href="https://functional.pankgraph.org" target="_blank" rel="noopener noreferrer">Original PanKgraph functional service ↗</a></section>}
      {tab==='Source'&&<BrowserToolbar navigationOnly fullscreen={fullscreen} onFullscreen={()=>setFullscreen(value=>!value)}/>}
    </div>
    <footer className="browser-footer"><span>{Object.keys(filters).length?'Agent-configured cohort':'All available donors'}{activeCohort?` · ${ids.length} donors with this response`:''}</span><span>{TRACES[trace]}</span><p className="description">Independent functional cohort · Native PanKgraph plot · Faint: first 24 donor traces · Bold: cohort mean</p></footer>
    <footer className="browser-source-footer" aria-label="Module source"><span>PanKgraph functional data</span><a href="https://dev.pankgraph.org/functional-data" target="_blank" rel="noopener noreferrer">PanKgraph functional browser tool ↗</a></footer>
  </Box></PersistentGraphViewport>;
}
