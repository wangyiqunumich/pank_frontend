import React,{useEffect,useRef,useState} from 'react';
import {IconButton} from '@mui/material';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import {sitePath} from '../api';
import {applyGuideAction,getGuideActiveModule} from './bridge';
import {MODULE_LABELS,validAction,actionSummary} from './actions.mjs';
import manual from './manual.json';
import './guide.css';
const storageKey='pank-module-guide:v1';
const STARTERS=['How do I choose fewer genome tracks?','Highlight 和 Selected 有什么区别？','How do I read the heatmap sample labels?'];
const examples=[{type:'genome_tracks',module:'genome_browser',params:{cell_types:['beta','alpha','ductal'],track_types:['signal','peaks'],height:'auto'}},{type:'genome_tracks',module:'genome_browser',params:{cell_types:['acinar','alpha','beta','delta','ductal','gamma'],track_types:['signal'],height:'80'}}];
function readSaved(){try{const saved=JSON.parse(sessionStorage.getItem(storageKey));return Array.isArray(saved)?saved.filter(m=>['user','assistant'].includes(m.role)&&typeof m.content==='string').slice(-24):[];}catch(_){return[];}}
function ActionCard({action,onApplied}){
  const [status,setStatus]=useState(''),[busy,setBusy]=useState(false),[undo,setUndo]=useState(null);
  if(!validAction(action))return null;
  const apply=async reverting=>{setBusy(true);setStatus('Opening module…');try{const inverse=await applyGuideAction(reverting?undo:action);setUndo(reverting?null:inverse);setStatus(reverting?'Previous settings restored.':'Settings applied. Check the module for data loading.');onApplied?.(action.module);}catch(error){setStatus(error.message);}finally{setBusy(false);}};
  return <div className="guide-action"><strong>{MODULE_LABELS[action.module]}</strong><p>{actionSummary(action)}</p><div className="guide-action-buttons"><button disabled={busy} onClick={()=>apply(false)}>Apply configuration</button>{undo&&<button disabled={busy} onClick={()=>apply(true)}>Undo</button>}</div>{status&&<p role="status">{status}</p>}</div>;
}
export default function ModuleGuide(){
  const [open,setOpen]=useState(false),[tab,setTab]=useState('Chat'),[module,setModule]=useState(getGuideActiveModule);
  const [messages,setMessages]=useState(readSaved),[input,setInput]=useState(''),[busy,setBusy]=useState(false),[article,setArticle]=useState(null),[search,setSearch]=useState(''),[available,setAvailable]=useState(null),[bottom,setBottom]=useState(88);
  const launcher=useRef(),panel=useRef(),textarea=useRef(),end=useRef(),abort=useRef(),requestGeneration=useRef(0);
  useEffect(()=>{const changed=e=>setModule(e.detail);window.addEventListener('pank-guide-active',changed);setModule(getGuideActiveModule());return()=>window.removeEventListener('pank-guide-active',changed);},[]);
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
      const response=await fetch(sitePath('/api/module-guide/chat'),{method:'POST',credentials:'same-origin',signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({request_id:crypto.randomUUID(),module,message:question,history})});
      const data=await response.json();if(!response.ok)throw new Error(typeof data.detail==='string'?data.detail:'The guide is unavailable. Use the manual.');
      if(typeof data.answer!=='string')throw new Error('The guide response was incomplete.');
      if(generation===requestGeneration.current)setMessages(previous=>[...previous,{role:'assistant',content:data.answer,citations:data.citations||[],actions:(data.actions||[]).filter(validAction)}]);
    }catch(error){if(generation===requestGeneration.current)setMessages(previous=>[...previous,{role:'assistant',error:true,content:error.name==='AbortError'?'The reply timed out. It may still be billed; no automatic retry was made. The manual is available.':error.message}]);}
    finally{clearTimeout(timeout);if(generation===requestGeneration.current)setBusy(false);}
  };
  const clear=()=>{requestGeneration.current++;abort.current?.abort();setMessages([]);setBusy(false);setArticle(null);setInput('');};
  const section=manual.find(d=>d.id===article);
  return <>
    <button ref={launcher} className="guide-launcher" style={{bottom}} aria-label="Open module guide" aria-expanded={open} aria-controls="pank-module-guide" onClick={()=>setOpen(value=>!value)}><HelpOutlineRoundedIcon/><span>Module guide</span></button>
    {open&&<aside ref={panel} id="pank-module-guide" role="dialog" aria-label="PanKgraph module guide" className="module-guide" style={{bottom,maxHeight:`calc(100dvh - ${bottom+16}px)`}}>
      <header><div><strong>Module guide</strong><small>Learn · Configure · Explore</small></div><IconButton aria-label="Close module guide" onClick={()=>{setOpen(false);launcher.current?.focus();}} size="small"><CloseRoundedIcon/></IconButton></header>
      <nav aria-label="Guide views"><div>{['Chat','Manual'].map(t=><button key={t} aria-pressed={tab===t&&!article} onClick={()=>{setTab(t);setArticle(null);}}>{t}</button>)}</div><button className="guide-new" onClick={clear} disabled={busy}>New conversation</button></nav>
      <label className="guide-module">Module<select value={module} onChange={e=>setModule(e.target.value)}>{Object.entries(MODULE_LABELS).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
      <div className="guide-scroll">
        {section?<article className="guide-manual-article"><button onClick={()=>setArticle(null)}>← Back</button><h3>{section.title}</h3>{section.body.split('\n').map((p,i)=><p key={i}>{p}</p>)}{section.id==='genome-tracks'&&<><h4>Ready-to-use comparisons</h4>{examples.map((a,i)=><ActionCard key={i} action={a} onApplied={setModule}/>)}</>}</article>:tab==='Manual'?<div className="guide-manual"><label>Find a topic<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="tracks / 缩放 / heatmap"/></label>{manual.filter(d=>(d.title+' '+d.body).toLowerCase().includes(search.toLowerCase())).map(d=><button key={d.id} onClick={()=>setArticle(d.id)}>{d.title}<span>→</span></button>)}{!manual.some(d=>(d.title+' '+d.body).toLowerCase().includes(search.toLowerCase()))&&<p>No matching section. Try a module name or a shorter term.</p>}</div>:<>
          {!messages.length&&<div className="guide-welcome"><h3>What would you like to do?</h3><p>Ask how to use a module or describe the configuration you want. 我也可以用中文解释。</p>{STARTERS.map(q=><button key={q} onClick={()=>setInput(q)}>{q}</button>)}<button className="guide-manual-shortcut" onClick={()=>setArticle('genome-tracks')}>Browse the track configuration guide →</button></div>}
          {messages.map((m,i)=><div key={i} className={`guide-message ${m.role}${m.error?' error':''}`}><strong>{m.role==='user'?'You':'Module guide'}</strong><p>{m.content}</p>{m.citations?.length>0&&<div className="guide-citations" aria-label="Manual sources">{m.citations.filter(c=>manual.some(d=>d.id===c.id)).map(c=><button key={c.id} onClick={()=>setArticle(c.id)}>{c.title}</button>)}</div>}{m.actions?.map((a,j)=><ActionCard key={j} action={a} onApplied={setModule}/>)}</div>)}
          {busy&&<p role="status" className="guide-pending">Reading the module manual…</p>}<div ref={end}/>
        </>}
      </div>
      {tab==='Chat'&&!article&&<form onSubmit={e=>{e.preventDefault();send();}} className="guide-composer"><label htmlFor="guide-question" className="guide-sr-only">Ask about module usage</label><textarea ref={textarea} id="guide-question" value={input} maxLength={2000} rows={2} placeholder="Ask about controls or configuration…" onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();send();}}}/><IconButton type="submit" disabled={busy||!input.trim()} aria-label="Send guide question"><SendRoundedIcon/></IconButton></form>}
      <footer>{available===false?<span>AI is currently unavailable. <button onClick={()=>{setTab('Manual');setArticle(null);}}>Use manual</button> · <button onClick={check}>Check again</button></span>:<span>Documentation help only · Changes require Apply</span>}<small>Messages go to the AI provider. Do not paste private data. Saved in this tab; New conversation clears it.</small></footer>
    </aside>}
  </>;
}
