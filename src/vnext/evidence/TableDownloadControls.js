import React,{useContext,useEffect,useRef,useState} from 'react';
import {EvidenceRequestContext} from './api';
import {collectTable,downloadCsv,tableCsv,tableSources} from './tableDownloads';
import {publicId} from './displayPolicy';

export default function TableDownloads({card,table,schema,filters={},records=[],sets={},localRecords}) {
  const viewer=useContext(EvidenceRequestContext);
  const [state,setState]=useState({}),controller=useRef(null);
  const scope=JSON.stringify([card.ref,table.id,filters]);
  useEffect(()=>{setState({});return()=>controller.current?.abort();},[scope]);
  const wording=schema.table_downloads?.labels || {};
  const sources=state.sources || tableSources(card,table,records,sets,schema);
  const start=async()=>{
    controller.current?.abort();const current=new AbortController();controller.current=current;setState({busy:true,rows:0});
    try {
      const available=table.all_fields || schema.tables?.[table.id]?.all_fields || table.columns;
      const wanted=[...(table.columns || []),...(table.id==='credible_members'?['credible_set_id','signal_role']:[]),'data_source','data_source_url','data_version','license'];
      const fields=[...new Set(wanted)].filter(key=>available.includes(key));
      const out=localRecords ? {records:localRecords,sets} : await collectTable(viewer,{ref:card.ref,table_id:table.id,filters,fields},current.signal,rows=>{if(!current.signal.aborted)setState({busy:true,rows});});
      if(current.signal.aborted)return;
      const identity=card.title || publicId(card.ref.id,schema.display_policy) || '';
      const filename=`${table.title || table.id}-${identity}`.replace(/[^a-z0-9.-]+/gi,'-').slice(0,150)+'.csv';
      downloadCsv(tableCsv(out.records,table,card,schema,out.sets),filename);setState({rows:out.records.length,ready:true,sources:tableSources(card,table,out.records,out.sets,schema)});
    } catch(e) {if(!current.signal.aborted)setState({error:e.message});}
  };
  return <div className="xe-table-downloads">
    <div className="xe-download-actions"><button type="button" onClick={start} disabled={state.busy}>{state.busy ? `Preparing ${state.rows || 0} rows…` : wording.table || 'Download table (CSV)'}</button>
      {state.busy && <button type="button" onClick={()=>{controller.current?.abort();setState({});}}>Cancel</button>}
      {!table.simple_list && <span className="xe-small">{localRecords ? 'All rows in this table' : wording.scope || 'All matching rows · current filters'}</span>}
    </div>
    <div className="xe-full-sources">{sources.map(source=><span key={source.id}>
      <a href={source.href} target="_blank" rel="noopener noreferrer">{source.kind==='library' ? 'Data Library' : 'Source'}: {source.title} ↗</a>
    </span>)}</div>

    {state.ready && <span className="xe-small" role="status">CSV ready · {state.rows} rows</span>}{state.error && <p role="alert" className="xe-warning">{state.error}</p>}
  </div>;
}
