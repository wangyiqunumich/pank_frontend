/* Authoring-only export: render the actual components against saved real records.
 * Run through scripts/render-information-panels.cjs; no API/model calls. */
import React from 'react';
import fs from 'fs';
import path from 'path';
import {renderToStaticMarkup} from 'react-dom/server';
import {render,cleanup} from '@testing-library/react';
import {GraphInfoPanelSurface} from './GraphInfoPanel';
import {InfocardMenu} from './KnowledgeGraph';
import {InspectedInformationPanel} from './evidence/EvidenceDetails';

(process.env.PANK_PANEL_RECORDS ? test : test.skip)('export actual information panel components',()=>{
 const input=JSON.parse(fs.readFileSync(process.env.PANK_PANEL_RECORDS,'utf8'));
 const cards=Array.isArray(input)?input:[input];
 const schema=process.env.PANK_PANEL_SCHEMA ? JSON.parse(fs.readFileSync(process.env.PANK_PANEL_SCHEMA,'utf8')) : null;
 const out=process.env.PANK_PANEL_OUTPUT;
 fs.mkdirSync(out,{recursive:true});
 cards.forEach((record,index)=>{
  const data=record.evidence_properties ? record : {
   id:record.ref.id,element_kind:record.ref.kind,raw_type:record.ref.type_id,
   raw_labels:[record.ref.type_id],
   evidence_properties:Object.fromEntries((record.fields || []).map(f=>[f.key,f.value])),
   ...(record.endpoints?.length ? {source:record.endpoints[0].display_id || record.endpoints[0].ref.id,target:record.endpoints[1]?.display_id || record.endpoints[1]?.ref.id} : {}),
  };
  ['hover','expanded'].forEach(mode=>{
   const element=<GraphInfoPanelSurface visible mode={mode} position={{x:24,y:24}} onEnlarge={()=>{}} onMinimize={()=>{}} onClose={()=>{}}>
    {schema ? <InspectedInformationPanel card={{...record,release_id:schema.release_id}} schema={schema} releaseId={schema.release_id} request={()=>Promise.reject(new Error("Static preview has no network transport"))}/> : <InfocardMenu hoveredData={data}/>}
   </GraphInfoPanelSurface>;
   render(element);
   const markup=renderToStaticMarkup(element);
   const authoredCss=['src/vnext/evidence/evidenceDetails.css','src/vnext/evidence/cardLayout.css'].map(file=>fs.readFileSync(path.resolve(file),'utf8')).join('\n');
   const css=authoredCss+'\n'+[...document.styleSheets].flatMap(sheet=>{try{return [...sheet.cssRules].map(rule=>rule.cssText);}catch(_){return [];}}).join('\n');
   const html='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Information panel render</title><style>body{margin:0;background:#f6f8fa;font-family:Arial,sans-serif}'+css+'</style></head><body>'+markup+'</body></html>';
   fs.writeFileSync(path.join(out,`${index}-${mode}.html`),html);
   cleanup();

  });
 });
});
