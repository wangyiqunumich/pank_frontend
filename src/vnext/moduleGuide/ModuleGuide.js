import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {IconButton} from '@mui/material';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import {moduleApiPath} from '../hosting';
import {applyGuideAction} from './bridge';
import {MODULE_LABELS,validAction,actionSummary} from './actions.mjs';
import topics from './manual.json';
import schema from '../schema/activeResultPage';
import {TECH_DEMO} from '../hosting';
import '../../components/floatingAction.css';
import './guide.css';
const storageKey = TECH_DEMO ? 'pank-module-guide:techdemo:v2-en' : 'pank-module-guide:v2-en';
function guideAvailable(id) {
  const definition = schema.main_visuals.items[id];
  return definition?.enabled && !definition.hidden && definition.guide_open;
}
const manual = topics.filter(topic => topic.module === 'all' || guideAvailable(topic.module));
const STARTERS = [
  {module: 'genome_browser', label: 'Compare alpha and beta tracks', prompt: 'Open Genome Browser with alpha and beta signal tracks at compact height.'},
  {module: 'functional_browser', label: 'Explore functional responses', prompt: 'Open Functional Browser for female donors with T1D.'},
  {module: 'pca_explorer', label: 'Plot PC2 against PC3', prompt: 'Open PCA Explorer and set X to PC2 and Y to PC3.'},
].filter(item => guideAvailable(item.module));
const examples=[{type:'genome_tracks',module:'genome_browser',params:{cell_types:['beta','alpha','ductal'],track_types:['signal','peaks'],height:'auto'}},{type:'genome_tracks',module:'genome_browser',params:{cell_types:['acinar','alpha','beta','delta','ductal','gamma'],track_types:['signal'],height:'80'}}];
function readSaved(){try{const saved=JSON.parse(sessionStorage.getItem(storageKey));return Array.isArray(saved)?saved.filter(m=>['user','assistant'].includes(m.role)&&typeof m.content==='string').slice(-24):[];}catch(_){return[];}}
function ActionCard({action,state={},onState}){
  const {status='',busy=false,undo=null,applied=false}=state;
  if(!validAction(action) || !guideAvailable(action.module))return null;
  const apply=async reverting=>{
    if(busy||(!reverting&&applied))return;
    onState({busy:true,status:'Applying…'});
    try{const inverse=await applyGuideAction(reverting?undo:action);onState({applied:!reverting,undo:reverting?null:inverse,status:reverting?'Previous settings restored.':'Settings applied.'});}
    catch(error){onState({status:error.message});}
    finally{onState({busy:false});}
  };
  return <div className="guide-action"><strong>{MODULE_LABELS[action.module]}</strong><p>{actionSummary(action)}</p><div className="guide-action-buttons"><button disabled={busy||applied} onClick={()=>apply(false)}>{applied?'Applied':'Apply'}</button>{undo&&<button disabled={busy} onClick={()=>apply(true)}>Undo</button>}</div>{status&&<p role="status">{status}</p>}</div>;
}
export default function ModuleGuide(){
  const [open,setOpen]=useState(false),[tab,setTab]=useState('Chat');
  const [messages,setMessages]=useState(readSaved),[input,setInput]=useState(''),[busy,setBusy]=useState(false),[article,setArticle]=useState(null),[search,setSearch]=useState(''),[available,setAvailable]=useState(null);
  const [actionStates,setActionStates]=useState({});
  const actionCard=(action,id)=><ActionCard key={id} action={action} state={actionStates[id]} onState={patch=>setActionStates(previous=>({...previous,[id]:{...previous[id],...patch}}))}/>;
  const applying=Object.values(actionStates).some(state=>state.busy);
  const launcher=useRef(),panel=useRef(),textarea=useRef(),end=useRef(),abort=useRef(),requestGeneration=useRef(0);
  useEffect(()=>{try{sessionStorage.setItem(storageKey,JSON.stringify(messages.slice(-24)));}catch(_){}},[messages]);
  useEffect(()=>()=>abort.current?.abort(),[]);
  useLayoutEffect(()=>{
    if(!open)return undefined;
    // The shared action container positions both buttons in the same frame.
    // Only the open panel's available height needs a viewport measurement.
    const measure=()=>{
      const rect=launcher.current.getBoundingClientRect();
      const viewport=window.visualViewport;
      const top=viewport?.offsetTop||0,left=viewport?.offsetLeft||0;
      const height=viewport?.height||window.innerHeight,width=viewport?.width||window.innerWidth;
      const bottom=Math.min(rect.bottom,top+height-12);
      const maxWidth=Math.max(0,width-24);
      const right=Math.min(left+width-12,Math.max(rect.right,left+12+Math.min(400,maxWidth)));
      if(panel.current)Object.assign(panel.current.style,{
        right:`${Math.max(0,window.innerWidth-right)}px`,
        bottom:`${Math.max(0,window.innerHeight-bottom)}px`,
        maxHeight:`${Math.max(0,bottom-top-16)}px`,
        maxWidth:`${maxWidth}px`,
      });
    };
    const footer=launcher.current.closest('.pank-result-footer');
    const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(measure);
    if(footer)observer?.observe(footer);
    measure();window.addEventListener('resize',measure);window.addEventListener('scroll',measure,true);
    window.visualViewport?.addEventListener('resize',measure);window.visualViewport?.addEventListener('scroll',measure);
    return()=>{observer?.disconnect();window.removeEventListener('resize',measure);window.removeEventListener('scroll',measure,true);window.visualViewport?.removeEventListener('resize',measure);window.visualViewport?.removeEventListener('scroll',measure);};
  },[open]);
  useEffect(()=>{if(open){if(window.matchMedia?.('(pointer:coarse)').matches)panel.current?.focus({preventScroll:true});else textarea.current?.focus();const escape=e=>{if(e.key==='Escape'){e.stopPropagation();setOpen(false);launcher.current?.focus();}};const node=panel.current;node?.addEventListener('keydown',escape);return()=>node?.removeEventListener('keydown',escape);}},[open]);
  useEffect(()=>{if(open&&tab==='Chat')end.current?.scrollIntoView({block:'nearest'});},[messages,busy,open,tab]);
  const check=()=>fetch(moduleApiPath('/module-guide/health'),{credentials:'same-origin'}).then(r=>{if(!r.ok)throw new Error();return r.json();}).then(value=>setAvailable(value.status==='ready')).catch(()=>setAvailable(false));
  useEffect(()=>{if(open)check();},[open]);
  const send=async text=>{
    const question=(text||input).trim();if(!question||question.length>2000||busy)return;
    const generation=++requestGeneration.current;
    const history=messages.filter(m=>!m.error).slice(-6).map(m=>({role:m.role,content:m.content.slice(0,4000)}));
    setMessages(previous=>[...previous,{role:'user',content:question}]);setInput('');setBusy(true);setArticle(null);setTab('Chat');
    const controller=new AbortController();abort.current=controller;const timeout=setTimeout(()=>controller.abort(),80000);
    try{
      const response=await fetch(moduleApiPath('/module-guide/chat'),{method:'POST',credentials:'same-origin',signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({request_id:crypto.randomUUID(),message:question,history})});
      const data=await response.json();if(!response.ok)throw new Error(typeof data.detail==='string'?data.detail:'The guide is unavailable. Use the manual.');
      if(typeof data.answer!=='string'||/[\u3400-\u9fff]/.test(data.answer))throw new Error('The guide response was incomplete.');
      if(generation===requestGeneration.current)setMessages(previous=>[...previous,{role:'assistant',content:data.answer,citations:data.citations||[],entities:data.entities||[],actions:(data.actions||[]).filter(validAction)}]);
    }catch(error){if(generation===requestGeneration.current)setMessages(previous=>[...previous,{role:'assistant',error:true,content:error.name==='AbortError'?'The guide took too long to reply. Try again or open the manual.':error.message}]);}
    finally{clearTimeout(timeout);if(generation===requestGeneration.current)setBusy(false);}
  };
  const clear=()=>{requestGeneration.current++;abort.current?.abort();setMessages([]);setActionStates({});setBusy(false);setArticle(null);setInput('');};
  const section=manual.find(d=>d.id===article);
  return <div className="module-guide-anchor">
    <button ref={launcher} className="guide-launcher pank-floating-action" aria-label="Open module guide" aria-expanded={open} aria-controls="pank-module-guide" onClick={()=>setOpen(value=>!value)}><HelpOutlineRoundedIcon/><span className="pank-floating-action-label">Module guide</span></button>
    {open&&createPortal(<aside ref={panel} id="pank-module-guide" role="dialog" tabIndex={-1} aria-label="PanKgraph module guide" className="module-guide">
      <header><strong>Module guide</strong><IconButton aria-label="Close module guide" onClick={()=>{setOpen(false);launcher.current?.focus();}} size="small"><CloseRoundedIcon/></IconButton></header>
      <nav aria-label="Guide views"><div>{['Chat','Manual'].map(t=><button key={t} aria-pressed={tab===t&&!article} onClick={()=>{setTab(t);setArticle(null);}}>{t}</button>)}</div><button className="guide-new" aria-label="New conversation" onClick={clear} disabled={busy||applying}>New chat</button></nav>
      <div className="guide-scroll">
        {section?<article className="guide-manual-article"><button onClick={()=>setArticle(null)}>← Back</button><h3>{section.title}</h3>{section.body.split('\n').map((p,i)=><p key={i}>{p}</p>)}{section.id==='genome-tracks'&&<><h4>Ready-to-use comparisons</h4>{examples.map((a,i)=>actionCard(a,`manual-${i}`))}</>}</article>:tab==='Manual'?<div className="guide-manual"><label>Find a topic<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="tracks / zoom / heatmap"/></label>{manual.filter(d=>(d.title+' '+d.body).toLowerCase().includes(search.toLowerCase())).map(d=><button key={d.id} onClick={()=>setArticle(d.id)}>{d.title}<span>→</span></button>)}{!manual.some(d=>(d.title+' '+d.body).toLowerCase().includes(search.toLowerCase()))&&<p>No matching section. Try a module name or a shorter term.</p>}</div>:<>
          {!messages.length&&<div className="guide-welcome"><h3>Explore your data</h3><p>Open a view or adjust its settings.</p>{STARTERS.map(q=><button key={q.label} onClick={()=>{setInput(q.prompt);textarea.current?.focus();}}>{q.label}<span aria-hidden="true">↗</span></button>)}<button className="guide-manual-shortcut" onClick={()=>{setTab('Manual');setArticle(null);}}>Browse the manual →</button></div>}
          {messages.map((m,i)=><div key={i} className={`guide-message ${m.role}${m.error?' error':''}`}><strong>{m.role==='user'?'You':'Module guide'}</strong><p>{m.content}</p>{m.citations?.length>0&&<div className="guide-citations" aria-label="Manual sources">{m.citations.filter(c=>manual.some(d=>d.id===c.id)).map(c=><button key={c.id} onClick={()=>setArticle(c.id)}>{manual.find(d=>d.id===c.id)?.title}</button>)}</div>}{m.entities?.map((result,j)=><details className="guide-entity" key={j}><summary>{result.query} · {result.status.replaceAll('_',' ')}</summary>{result.records?.map(entity=><div key={entity.id}><strong>{entity.name||entity.id}</strong><p>{entity.id} · {entity.kind}</p>{entity.description&&<p>{entity.description}</p>}{entity.placements?.map((p,k)=><p key={k}>{p.assembly} · chr{p.chromosome}:{p.start}–{p.end}<br/>0-based, half-open</p>)}{entity.ref&&<p>Reference: {entity.ref} · Alternate: {Array.isArray(entity.alt)?entity.alt.join(', '):entity.alt}</p>}{entity.navigation_padding_bp&&<p>Navigation adds {entity.navigation_padding_bp} bp on each side.</p>}<p>Source: {entity.data_source||'Not provided'} · {entity.data_version||result.release}</p>{entity.license&&<p>License: {entity.license}</p>}{/^https:\/\//.test(entity.data_source_url||'')&&<a href={entity.data_source_url} target="_blank" rel="noopener noreferrer">Source reference ↗</a>}</div>)}{result.coverage&&<p>{result.coverage}</p>}{result.truncated&&<p>More matches available. Refine your search.</p>}{result.status==='not_found'&&<p>No exact match in this release. Try a stable ID.</p>}{result.status==='unavailable'&&<p>Lookup is temporarily unavailable.</p>}{result.status==='ambiguous'&&<p>Multiple matches. Specify a stable ID before navigating.</p>}</details>)}{m.actions?.map((a,j)=>actionCard(a,`message-${i}-${j}`))}</div>)}
          {busy&&<p role="status" className="guide-pending">Thinking…</p>}<div ref={end}/>
        </>}
      </div>
      {tab==='Chat'&&!article&&<form onSubmit={e=>{e.preventDefault();send();}} className="guide-composer"><label htmlFor="guide-question" className="guide-sr-only">Ask about module usage</label><textarea ref={textarea} id="guide-question" value={input} maxLength={2000} rows={2} placeholder="Ask about a module…" onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();send();}}}/><IconButton type="submit" disabled={busy||!input.trim()} aria-label="Send guide question"><SendRoundedIcon/></IconButton></form>}
      {available===false&&<footer><span>Guide unavailable. <button onClick={()=>{setTab('Manual');setArticle(null);}}>Use manual</button> · <button onClick={check}>Check again</button></span></footer>}
    </aside>,document.body)}
  </div>;
}
