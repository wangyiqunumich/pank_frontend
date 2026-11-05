import React, {useEffect, useState} from 'react';
import schema from './schema/result_page_schema.json';
import {firstAvailableExpression} from './singleCellContext';
import {qtlContexts} from './qtlContext';
import {pankbaseContexts} from './pankbaseContext';
import {DEV_MODULES} from './hosting';
import SingleCellBrowser from './SingleCellBrowser';
import PanKbaseModule from './PanKbaseModule';
import PanKgraphFunctionalPlot from './PanKgraphFunctionalPlot';
import QtlBrowser from './QtlBrowser';
import GuideExploration, {explorationContext, explorationAtlasContext} from './moduleGuide/GuideExploration';

// Schema owns eligibility and ordering. Context adapters only interpret records.
export function firstModuleContexts(result) {
  const graph=result?.combined_query_result;
  const adapters={expression:()=>firstAvailableExpression(graph),qtl:()=>qtlContexts(result).find(c=>c.available)};
  const related=pankbaseContexts(graph);
  const contexts={};
  for(const id of schema.main_visuals.default_order){
    const d=schema.main_visuals.items[id];
    if(!d?.extension || !d.enabled || d.hidden)continue;
    const context=d.context_adapter==='pankbase'?related[id]:adapters[d.context_adapter]?.();
    if(context?.available)contexts[id]=context;
  }
  return contexts;
}

export function captureModules(previous,scope,candidates) {
  let next=previous?.scope===scope?previous:{scope,entries:{}};
  for(const [id,context] of Object.entries(candidates)){
    if(next.entries[id])continue;
    // Own the snapshot: later graph mutation must not change module provenance.
    next={scope,entries:{...next.entries,[id]:JSON.parse(JSON.stringify(context))}};
  }
  return next;
}

function renderModule(id,context,scope){
  const key=`${scope}:${id}`;
  if(id==='single_cell_browser')return <SingleCellBrowser key={key} context={context}/>;
  if(id==='qtl_browser')return <QtlBrowser key={key} contexts={context.match==='independent'?[]:[context]}/>;
  if(id==='functional_browser')return <PanKgraphFunctionalPlot key={key}/>;
  return <PanKbaseModule key={key} moduleId={id} context={context}/>;
}

// Each answer owns one registry. A streamed revision never replaces an entry.
export function useResultModules({result,scope,baseTabs=[],enabled=DEV_MODULES,guideEnabled=true}) {
  const [stored,setStored]=useState({scope:null,entries:{}});
  const [request,setRequest]=useState(null);
  const snapshot=captureModules(stored,scope,enabled?firstModuleContexts(result):{});
  if(snapshot!==stored)setStored(snapshot);
  const ids=Object.keys(snapshot.entries);
  useEffect(()=>{
    if(!enabled || !guideEnabled)return undefined;
    const open=event=>{
      const detail=event.detail, definition=schema.main_visuals.items[detail?.module];
      if(!detail || detail.opened || !definition?.enabled || definition.hidden || !definition.guide_open)return;
      if(detail.module==='graph_viewer' && !baseTabs.some(t=>t.id==='graph_viewer'))return;
      if(definition.extension)setStored(previous=>captureModules(previous,scope,{[detail.module]:detail.module==='single_cell_browser'?explorationAtlasContext:explorationContext(detail.module)}));
      setRequest({scope,id:detail.module,nonce:Date.now()});detail.opened=true;
    };
    window.addEventListener('pank-guide-open',open);return()=>window.removeEventListener('pank-guide-open',open);
  },[enabled,guideEnabled,scope,baseTabs.map(t=>t.id).join('|')]);
  const tabs=enabled?[...baseTabs.filter(t=>!schema.main_visuals.items[t.id]?.extension && !schema.main_visuals.items[t.id]?.replaced_by),...ids.map(id=>{
    const context=snapshot.entries[id],definition=schema.main_visuals.items[id];
    const content=renderModule(id,context,scope);
    return {id,label:definition.title,minHeight:definition.layout?.min_height,content:context.match==='independent'?<GuideExploration>{content}</GuideExploration>:content};
  })]:baseTabs;
  return {tabs,scopeKey:scope,requestedTab:request?.scope===scope?request:null};
}
