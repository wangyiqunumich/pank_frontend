import React,{useEffect,useRef,useState} from 'react';
import {IconButton} from '@mui/material';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import {sitePath} from '../api';
import {applyGuideAction} from './bridge';
import {MODULE_LABELS,validAction,actionSummary} from './actions.mjs';
import manual from './manual.json';
import './guide.css';
const storageKey='pank-module-guide:v2-en';
const STARTERS=['Open Genome Browser with alpha and beta signal tracks at compact height.','Open Functional Browser and show T1D female donors, even if this answer has no functional module.','Open PCA Explorer and set X to PC2 and Y to PC3.'];
const examples=[{type:'genome_tracks',module:'genome_browser',params:{cell_types:['beta','alpha','ductal'],track_types:['signal','peaks'],height:'auto'}},{type:'genome_tracks',module:'genome_browser',params:{cell_types:['acinar','alpha','beta','delta','ductal','gamma'],track_types:['signal'],height:'80'}}];
function readSaved(){try{const saved=JSON.parse(sessionStorage.getItem(storageKey));return Array.isArray(saved)?saved.filter(m=>['user','assistant'].includes(m.role)&&typeof m.content==='string').slice(-24):[];}catch(_){return[];}}
function ActionCard({action,state={},onState}){
  const {status='',busy=false,undo=null,applied=false}=state;
  if(!validAction(action))return null;
  const apply=async reverting=>{
    if(busy||(!reverting&&applied))return;
    onState({busy:true,status:'Opening module…'});
    try{const inverse=await applyGuideAction(reverting?undo:action);onState({applied:!reverting,undo:reverting?null:inverse,status:reverting?'Previous settings restored.':'Settings applied. Check the module for data loading.'});}
    catch(error){onState({status:error.message});}
    finally{onState({busy:false});}
  };
  return <div className="guide-action"><strong>{MODULE_LABELS[action.module]}</strong><p>{actionSummary(action)}</p><div className="guide-action-buttons"><button disabled={busy||applied} onClick={()=>apply(false)}>{applied?'Applied':'Apply configuration'}</button>{undo&&<button disabled={busy} onClick={()=>apply(true)}>Undo</button>}</div>{status&&<p role="status">{status}</p>}</div>;
}
export default function ModuleGuide(){
  const [open,setOpen]=useState(false),[tab,setTab]=useState('Chat');
  const [messages,setMessages]=useState(readSaved),[input,setInput]=useState(''),[busy,setBusy]=useState(false),[article,setArticle]=useState(null),[search,setSearch]=useState(''),[available,setAvailable]=useState(null),[bottom,setBottom]=useState(88);
  const [actionStates,setActionStates]=useState({});
  const actionCard=(action,id)=><ActionCard key={id} action={action} state={actionStates[id]} onState={patch=>setActionStates(previous=>({...previous,[id]:{...previous[id],...patch}}))}/>;
  const applying=Object.values(actionStates).some(state=>state.busy);
  const launcher=useRef(),panel=useRef(),textarea=useRef(),end=useRef(),abort=useRef(),requestGeneration=useRef(0);
  useEffect(()=>{try{sessionStorage.setItem(storageKey,JSON.stringify(messages.slice(-24)));}catch(_){}},[messages]);
  useEffect(()=>()=>abort.current?.abort(),[]);
  useEffect(()=>{
    const element=document.querySelector('[data-pank-feedback-launcher]');
    const measure=()=>{if(element)setBottom(Math.max(76,window.innerHeight-element.getBoundingClientRect().top+10));};
    measure();const observer=new ResizeObserver(measure);if(element)observer.observe(element);window.addEventListener('resize',measure);return()=>{observer.disconnect();window.removeEventListener('resize',measure);};
  },[]);
  useEffect(()=>{if(open){textarea.current?.focus();const escape=e=>{if(e.key==='Escape'){e.stopPropagation();setOpen(false);launcher.current?.focus();}};const node=panel.current;node?.addEventListener('keydown',escape);return()=>node?.removeEventListener('keydown',escape);}},[open]);
  useEffect(()=>{if(open&&tab==='Chat')end.current?.scrollIntoView({block:'nearest'});},[messages,busy,open,tab]);
  const check=()=>fetch(sitePath('/api/module-guide/health'),{credentials:'same-origin'}).then(r=>{if(!r.ok)throw new Error();return r.json();}).then(value=>setAvailable(value.status==='ready')).catch(()=>setAvailable(false));
  useEffect(()=>{if(open)check();},[open]);
  const send=async text=>{
    const question=(text||input).trim();if(!question||question.length>2000||busy)return;
    const generation=++requestGeneration.current;
    const history=messages.filter(m=>!m.error).slice(-6).map(m=>({role:m.role,content:m.content.slice(0,4000)}));
    setMessages(previous=>[...previous,{role:'user',content:question}]);setInput('');setBusy(true);setArticle(null);setTab('Chat');
    const controller=new AbortController();abort.current=controller;const timeout=setTimeout(()=>controller.abort(),80000);
    try{
      const response=await fetch(sitePath('/api/module-guide/chat'),{method:'POST',credentials:'same-origin',signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({request_id:crypto.randomUUID(),message:question,history})});
      const data=await response.json();if(!response.ok)throw new Error(typeof data.detail==='string'?data.detail:'The guide is unavailable. Use the manual.');
      if(typeof data.answer!=='string'||/[\u3400-\u9fff]/.test(data.answer))throw new Error('The guide response was incomplete.');
      if(generation===requestGeneration.current)setMessages(previous=>[...previous,{role:'assistant',content:data.answer,citations:data.citations||[],entities:data.entities||[],actions:(data.actions||[]).filter(validAction)}]);
    }catch(error){if(generation===requestGeneration.current)setMessages(previous=>[...previous,{role:'assistant',error:true,content:error.name==='AbortError'?'The reply timed out. It may still be billed; no automatic retry was made. The manual is available.':error.message}]);}
    finally{clearTimeout(timeout);if(generation===requestGeneration.current)setBusy(false);}
  };
  const clear=()=>{requestGeneration.current++;abort.current?.abort();setMessages([]);setActionStates({});setBusy(false);setArticle(null);setInput('');};
  const section=manual.find(d=>d.id===article);
  return <>
    <button ref={launcher} className="guide-launcher" style={{bottom}} aria-label="Open module guide" aria-expanded={open} aria-controls="pank-module-guide" onClick={()=>setOpen(value=>!value)}><HelpOutlineRoundedIcon/><span>Module guide</span></button>
    {open&&<aside ref={panel} id="pank-module-guide" role="dialog" aria-label="PanKgraph module guide" className="module-guide" style={{bottom,maxHeight:`calc(100dvh - ${bottom+16}px)`}}>
      <header><div><strong>Module guide</strong><small>Learn · Configure · Explore</small></div><IconButton aria-label="Close module guide" onClick={()=>{setOpen(false);launcher.current?.focus();}} size="small"><CloseRoundedIcon/></IconButton></header>
      <nav aria-label="Guide views"><div>{['Chat','Manual'].map(t=><button key={t} aria-pressed={tab===t&&!article} onClick={()=>{setTab(t);setArticle(null);}}>{t}</button>)}</div><button className="guide-new" onClick={clear} disabled={busy||applying}>New conversation</button></nav>
      <div className="guide-scroll">
        {section?<article className="guide-manual-article"><button onClick={()=>setArticle(null)}>← Back</button><h3>{section.title}</h3>{section.body.split('\n').map((p,i)=><p key={i}>{p}</p>)}{section.id==='genome-tracks'&&<><h4>Ready-to-use comparisons</h4>{examples.map((a,i)=>actionCard(a,`manual-${i}`))}</>}</article>:tab==='Manual'?<div className="guide-manual"><label>Find a topic<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="tracks / zoom / heatmap"/></label>{manual.filter(d=>(d.title+' '+d.body).toLowerCase().includes(search.toLowerCase())).map(d=><button key={d.id} onClick={()=>setArticle(d.id)}>{d.title}<span>→</span></button>)}{!manual.some(d=>(d.title+' '+d.body).toLowerCase().includes(search.toLowerCase()))&&<p>No matching section. Try a module name or a shorter term.</p>}</div>:<>
          {!messages.length&&<div className="guide-welcome"><h3>What would you like to do?</h3><p>Ask to open a module, including one missing from this answer, or describe the settings you want. Review the proposal and use Apply; Undo restores supported settings. Ask about a gene or rsID for verified identity and coordinates.</p>{STARTERS.map(q=><button key={q} onClick={()=>setInput(q)}>{q}</button>)}<button className="guide-manual-shortcut" onClick={()=>setArticle('genome-tracks')}>Browse the track configuration guide →</button></div>}
          {messages.map((m,i)=><div key={i} className={`guide-message ${m.role}${m.error?' error':''}`}><strong>{m.role==='user'?'You':'Module guide'}</strong><p>{m.content}</p>{m.citations?.length>0&&<div className="guide-citations" aria-label="Manual sources">{m.citations.filter(c=>manual.some(d=>d.id===c.id)).map(c=><button key={c.id} onClick={()=>setArticle(c.id)}>{manual.find(d=>d.id===c.id)?.title}</button>)}</div>}{m.entities?.map((result,j)=><details className="guide-entity" key={j}><summary>Verified lookup: {result.query} · {result.status.replaceAll('_',' ')}</summary>{result.records?.map(entity=><div key={entity.id}><strong>{entity.name||entity.id}</strong><p>{entity.id} · {entity.kind}</p>{entity.description&&<p>{entity.description}</p>}{entity.placements?.map((p,k)=><p key={k}>{p.assembly} · chr{p.chromosome}:{p.start}–{p.end}<br/>0-based, half-open</p>)}{entity.ref&&<p>Reference: {entity.ref} · Alternate: {Array.isArray(entity.alt)?entity.alt.join(', '):entity.alt}</p>}{entity.navigation_padding_bp&&<p>Navigation adds {entity.navigation_padding_bp} bp on each side.</p>}<p>Source: {entity.data_source||'Not provided'} · {entity.data_version||result.release}</p>{entity.license&&<p>License: {entity.license}</p>}{/^https:\/\//.test(entity.data_source_url||'')&&<a href={entity.data_source_url} target="_blank" rel="noopener noreferrer">Source reference ↗</a>}</div>)}{result.coverage&&<p>{result.coverage}</p>}{result.truncated&&<p>Showing a bounded subset. Narrow the query for more specific results.</p>}{result.status==='not_found'&&<p>No exact match in this release. Try a stable ID.</p>}{result.status==='unavailable'&&<p>Lookup is temporarily unavailable. No coordinates were inferred.</p>}{result.status==='ambiguous'&&<p>Multiple matches. Specify a stable ID before navigating.</p>}</details>)}{m.actions?.map((a,j)=>actionCard(a,`message-${i}-${j}`))}</div>)}
          {busy&&<p role="status" className="guide-pending">Checking the manual and entity references…</p>}<div ref={end}/>
        </>}
      </div>
      {tab==='Chat'&&!article&&<form onSubmit={e=>{e.preventDefault();send();}} className="guide-composer"><label htmlFor="guide-question" className="guide-sr-only">Ask about module usage</label><textarea ref={textarea} id="guide-question" value={input} maxLength={2000} rows={2} placeholder="Ask about controls or configuration…" onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();send();}}}/><IconButton type="submit" disabled={busy||!input.trim()} aria-label="Send guide question"><SendRoundedIcon/></IconButton></form>}
      <footer>{available===false?<span>AI is currently unavailable. <button onClick={()=>{setTab('Manual');setArticle(null);}}>Use manual</button> · <button onClick={check}>Check again</button></span>:<span>Module help and verified entities · Changes require Apply</span>}<small>Messages go to the AI provider. Do not paste private data. Saved in this tab; New conversation clears it.</small></footer>
    </aside>}
  </>;
}
