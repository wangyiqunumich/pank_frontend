import React, {useEffect, useState} from 'react';
import {InspectedInformationPanel} from './EvidenceDetails';

// Prefer server-issued refs. Older saved graphs may omit the handle while
// retaining the exact snapshot object ID; recover only an unambiguous profile
// from the same release schema. The API still validates exact object ownership.
export function exactGraphRef(data,schema) {
  const ref=data?.viewer_ref;
  if(ref && ['node','edge'].includes(ref.kind) && ref.kind===data.element_kind &&
    typeof ref.id==='string' && ref.id===data.id && typeof ref.type_id==='string' && ref.type_id)
    return {kind:ref.kind,type_id:ref.type_id,id:ref.id};
  if(ref || !schema?.release_id || typeof data?.id!=='string' || data.evidence_properties?.id!==data.id)return null;
  const candidates=Object.values(schema.profiles || {}).filter(p=>{
    if(p.kind!==data.element_kind || !p.match)return false;
    if(p.kind==='edge')return p.match.relationship_type===data.raw_type;
    const labels=p.match.labels_all;
    return labels?.length>0 && labels.every(label=>data.raw_labels?.includes(label));
  });
  return candidates.length===1 ? {kind:data.element_kind,type_id:candidates[0].id,id:data.id} : null;
}

export default function ObjectInformationPanel({data, endpointNodes=[], releaseId, service, fallback}) {
  const ref=exactGraphRef(data,service?.schema?.release_id===releaseId ? service.schema : null);
  const key=JSON.stringify([releaseId,ref]);
  const [state,setState]=useState(null);
  const request=service?.request, schema=service?.schema;
  const eligible=Boolean(ref && releaseId && schema?.release_id===releaseId && request);
  useEffect(()=>{
    if(!eligible) return undefined;
    const controller=new AbortController(); let current=true;
    setState({key,loading:true});
    const selected=JSON.parse(key)[1];
    Promise.resolve().then(()=>request('/inspect',{release_id:releaseId,ref:selected},controller.signal)).then(card=>{
      if(!card?.ref || ['kind','type_id','id'].some(k=>card.ref[k]!==selected[k]) ||
        (card.release_id && card.release_id!==releaseId)) throw new Error('Evidence identity mismatch');
      // This response belongs to the exact release-scoped request, even when
      // the inspection body omits its redundant release field.
      if(current) setState({key,card:{...card,release_id:releaseId}});
    }).catch(()=>{if(current) setState({key,error:true});});
    return ()=>{current=false;controller.abort();};
  },[eligible,key,releaseId,request]);
  const selected=eligible && state?.key===key ? state : null;
  if(selected?.card) return <InspectedInformationPanel card={{...selected.card,endpoints:selected.card.endpoints?.map(e=>{const node=endpointNodes.find(n=>n.id===e.ref.id);return {...e,display_name:node?.HGNC_symbol || node?.name || node?.label};})}} schema={schema} request={request} releaseId={releaseId}/>;
  return <>{fallback}{eligible && <p role="status" style={{padding:'0 14px',fontSize:12}}>{selected?.error ? 'Detailed evidence is temporarily unavailable. Recorded graph evidence is preserved.' : 'Loading detailed evidence…'}</p>}</>;
}
