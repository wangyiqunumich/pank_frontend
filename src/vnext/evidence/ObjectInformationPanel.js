import React, {useEffect, useLayoutEffect, useMemo, useState} from 'react';
import {GraphInfoPanelBody,GraphInfoPanelHeader} from '../GraphInfoPanel';
import {recordedText} from '../recordedPresentation';
import {recordedCard} from './recordedCard';
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

export default function ObjectInformationPanel({data, endpointNodes=[], releaseId, service, renderFallback, onReady}) {
  const request=service?.request, schema=service?.schema;
  const ref=useMemo(() => exactGraphRef(data,schema?.release_id===releaseId ? schema : null), [data,schema,releaseId]);
  const key=JSON.stringify([releaseId,ref]);
  const [state,setState]=useState(null);
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
  const inspected=eligible && (service.peek?.(ref) || selected?.card);
  const recorded=useMemo(() => eligible && recordedCard(data,ref,schema), [data,eligible,ref,schema]);
  const source=inspected || recorded;
  const [first, second]=endpointNodes;
  const card=useMemo(() => source && ({
    ...source,
    ccc_context: data.ccc_context,
    endpoints: source.endpoints?.map(endpoint => {
      const node = first?.id===endpoint.ref.id ? first : second?.id===endpoint.ref.id ? second : null;
      return {...endpoint,display_name:node?.HGNC_symbol || node?.name || node?.label || endpoint.display_name};
    }),
  }), [source,first,second,data.ccc_context]);
  const loading = service?.loading || (eligible && !inspected && !selected?.error);
  const notice = selected?.error ? 'Detailed evidence is temporarily unavailable.' : null;
  useLayoutEffect(() => {
    if (!card && !loading) onReady?.();
  }, [card,loading,onReady]);
  if(card) return <InspectedInformationPanel compactOnly={!inspected} loading={loading} notice={notice} card={card} schema={schema} request={request} releaseId={releaseId} onReady={onReady}/>;
  if (loading) {
    const title = recordedText(data?.HGNC_symbol || data?.name || data?.label || data?.id);
    return <>
      <GraphInfoPanelHeader title={title}>{title}</GraphInfoPanelHeader>
      <GraphInfoPanelBody loading><p className="graph-info-panel-message" role="status">Loading details…</p></GraphInfoPanelBody>
    </>;
  }
  return renderFallback(notice);
}
