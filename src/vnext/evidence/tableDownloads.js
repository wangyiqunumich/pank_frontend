import {resourceLink} from './resourceLinks';

export function safeSourceUrl(value) {
  try { const url=new URL(value); return url.protocol==='https:' && !url.username && !url.password ? url.href : null; }
  catch (_) { return null; }
}

export function tableSources(card,table,records=[],sets={},schema={}) {
  const registry=schema.table_downloads?.sources || [];
  const urls=new Set([...records.map(r=>r.data_source_url),...Object.values(sets).map(s=>s.data_source_url)]);
  const profileKey=`${card.ref.kind}:${card.ref.type_id}`;
  const declared=new Set([...(table.download?.source_ids || []),...(schema.table_downloads?.profile_sources?.[profileKey]?.[table.id] || [])]);
  const sources=registry.filter(s=>(declared.has(s.id) || s.match_urls?.some(url=>urls.has(url))) &&
    (!s.data_versions || s.data_versions.includes(String((card.raw_provenance || card.provenance)?.data_version))));
  const seen=new Set();
  const result=sources.filter(s=>safeSourceUrl(s.href) && !seen.has(s.href) && seen.add(s.href));
  if (!result.length) {
    const fallback=[...urls,card.provenance?.data_source_url].filter(Boolean);
    for (const href of fallback) if (safeSourceUrl(href) && !seen.has(href)) {
      seen.add(href);result.push({id:href,href,kind:'unverified',title:'Source page'});
    }
  }
  return result;
}

export async function collectTable(request,query,signal,onProgress=()=>{}) {
  const records=[],sets={};const seen=new Set();let cursor=null;
  do {
    if (signal?.aborted) throw new DOMException('Export cancelled','AbortError');
    const page=await request('/table',{...query,limit:100,cursor},signal);
    if (signal?.aborted) throw new DOMException('Export cancelled','AbortError');
    if (!['available','no_records'].includes(page.state) || !Array.isArray(page.records)) throw new Error(page.message || 'Table unavailable; no partial file was downloaded.');
    records.push(...page.records);Object.assign(sets,page.credible_sets);onProgress(records.length);
    if (!page.has_more) return {records,sets};
    if (!page.records.length || !page.next_cursor || seen.has(page.next_cursor)) throw new Error('Pagination did not advance; no partial file was downloaded.');
    seen.add(page.next_cursor);cursor=page.next_cursor;
  } while (true);
}

function csvCell(value) {
  let text=value===null || value===undefined ? '' : typeof value==='object' ? JSON.stringify(value) : String(value);
  if (typeof value==='string' && /^[\t\r\n ]*[=+@-]/.test(text) && !/^\s*[-+]?\d+(?:\.\d+)?(?:e[-+]?\d+)?\s*$/i.test(text)) text="'"+text;
  return '"'+text.replace(/"/g,'""')+'"';
}

export function tableCsv(records,table,card,schema={},sets={}) {
  const hidden=new Set(schema.display_policy?.hidden_fields || []);
  const columns=[...new Set([...(table.columns || []),...(table.download?.provenance_fields || ['data_source','data_source_url','data_version','license'])])].filter(k=>!hidden.has(k));
  if (table.component==='node_alt_id' || table.id==='accessions') columns.push('resource_url');
  if (Object.keys(sets).length) columns.unshift('credible_set');
  const rows=records.map(row=>columns.map(key=>key==='resource_url' ? resourceLink(row,card,schema.resource_links)?.href : key==='credible_set' ? sets[row.credible_set_id]?.source_set || sets[row.credible_set_id]?.description : Object.prototype.hasOwnProperty.call(row,key) ? row[key] : (card.raw_provenance || card.provenance)?.[key]));
  return '\uFEFF'+[columns,...rows].map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n';
}

export function downloadCsv(csv,filename) {
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const anchor=document.createElement('a');anchor.href=url;anchor.download=filename;document.body.appendChild(anchor);anchor.click();anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
