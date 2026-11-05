import {useEffect,useState} from 'react';
import {request as apiRequest} from '../api';

// Use the existing authenticated site API, never a database/private endpoint.
export async function loadViewerService(releaseId, signal, send=apiRequest) {
  const schema=await send(`/viewer/v1/schema?release_id=${encodeURIComponent(releaseId)}`,{signal});
  if(schema.release_id!==releaseId || !schema.profiles || !schema.tables) throw new Error('Evidence schema version mismatch');
  const cards=new Map(), pending=new Map();
  const keyOf=ref=>JSON.stringify([ref?.kind,ref?.type_id,ref?.id]);
  const sendRequest=async(path,body={},requestSignal)=>{
    if(!['/inspect','/table'].includes(path)) throw new Error('Unknown evidence operation');
    if(body.release_id && body.release_id!==releaseId) throw new Error('Evidence request version mismatch');
    const response=await send(`/viewer/v1${path}`,{method:'POST',body:JSON.stringify({...body,release_id:releaseId}),signal:requestSignal,timeoutMs:60000});
    if(response.release_id && response.release_id!==releaseId) throw new Error('Evidence response version mismatch');
    return response;
  };
  const request=(path,body={},requestSignal)=>{
    if(path!=='/inspect' || (body.release_id && body.release_id!==releaseId)) return sendRequest(path,body,requestSignal);
    const key=keyOf(body.ref);
    if(cards.has(key)) return Promise.resolve(cards.get(key));
    if(!pending.has(key)) {
      // Shared reads survive pointer changes; the service lifetime owns cancellation.
      const work=sendRequest(path,body,signal).then(card=>{
        if(!card?.ref || ['kind','type_id','id'].some(k=>card.ref[k]!==body.ref?.[k])) throw new Error('Evidence identity mismatch');
        const value={...card,release_id:releaseId};
        cards.set(key,value);
        if(cards.size>128) cards.delete(cards.keys().next().value);
        return value;
      }).finally(()=>pending.delete(key));
      pending.set(key,work);
    }
    return pending.get(key);
  };
  return {schema,request,peek:ref=>cards.get(keyOf(ref))};
}

export function useViewerService(releaseId,enabled) {
  const [state,setState]=useState(null);
  useEffect(()=>{
    if(!enabled || !releaseId) return undefined;
    const controller=new AbortController();let active=true;
    loadViewerService(releaseId,controller.signal).then(service=>{
      if(active) setState({releaseId,service});
    }).catch(()=>{if(active) setState({releaseId,service:null});});
    return ()=>{active=false;controller.abort();};
  },[releaseId,enabled]);
  if(!enabled || !releaseId) return null;
  return state?.releaseId===releaseId ? state.service : {loading:true};
}
