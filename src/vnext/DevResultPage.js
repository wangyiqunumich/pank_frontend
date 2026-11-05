import React from 'react';
import LegacyQuestionAnswerPage from '../components/ResultComponent';
import QuestionAnswerPage from './ResultComponent';
import schema from './schema/result_page_schema.json';
import {DEV_MODULES} from './hosting';
import {useResultModules} from './ResultModules';

// Compatibility adapter: keep legacy answer/stream ownership; only replace its
// visual module tabs. Both chat paths use the same schema and lifecycle hook.
export default function DevResultPage({data,contentAnchorPrefix,...props}) {
  const definitions=schema.main_visuals.items;
  const baseTabs=(data?.visualMaterial?.tabs||[]).map(tab=>({...tab,id:tab.id||Object.keys(definitions).find(id=>definitions[id].title===tab.label)||tab.label}));
  const scope=data?.moduleScope||`${contentAnchorPrefix}:${data?.questionId}:${data?.title}`;
  const modules=useResultModules({result:{combined_query_result:data?.graphData},scope,baseTabs,guideEnabled:data?.guideEnabled===true});
  if(!DEV_MODULES)return <LegacyQuestionAnswerPage data={data} contentAnchorPrefix={contentAnchorPrefix} {...props}/>;
  const evidenceTabs=[...(data?.evidences?.tabs||[]),...baseTabs.filter(tab=>tab.id==='functional_data').map(tab=>({...tab,label:'Recorded functional response'}))];
  return <QuestionAnswerPage data={{...data,evidences:evidenceTabs.length?{...data?.evidences,title:'Supporting Material',tabs:evidenceTabs}:undefined,visualMaterial:modules.tabs.length?{...data?.visualMaterial,title:'Visual Material',...modules}:undefined}} contentAnchorPrefix={contentAnchorPrefix} {...props}/>;
}
