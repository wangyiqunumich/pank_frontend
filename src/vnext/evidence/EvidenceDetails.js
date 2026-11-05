// Reused from the source-pinned 1024 demo; network access is supplied by the host.
import React,{createContext,useContext,useEffect,useMemo,useRef,useState} from 'react';
import {conditionGroups,contextFilters} from './evidenceComponents';
import {fieldLabel} from './presentation';
import './evidenceDetails.css';
import {panelTabs} from './panelTabs';
import panelPolicy from '../../schema/information_panel_schema.json';
import {compactSections} from './compactSections';
import {recordDesign,objectSections,hasExtraRecord} from './recordDesign';
import {ProductionValue,RecordFooter,ProductionFrequencies} from './ProductionRecord';
import {GraphInfoPanelHeader,useGraphInfoPanel} from '../GraphInfoPanel';
import {valueText,EvidenceRequestContext} from './api';
import {publicId,visibleField,displayValue,displayText,presentCard} from './displayPolicy';
import {CardValue,cardValueLayout,formatCardNumber} from './CardValue';
import {resourceLink} from './resourceLinks';
import TableDownloads from './TableDownloadControls';
import {safeSourceUrl} from './tableDownloads';
const DisplayContext=createContext({policy:{},profileKey:null});
function Icon({ name, size = 18 }) {
  const paths = {
    search: 'M21 21l-5.2-5.2M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15',
    fit: 'M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6', plus: 'M12 4v16M4 12h16', minus: 'M4 12h16',
    close: 'M5 5l14 14M19 5L5 19', arrow: 'M5 12h14m-6-6l6 6-6 6', chevron: 'M9 5l7 7-7 7',
    download: 'M12 3v12m-5-5l5 5 5-5M4 16v5h16v-5', menu: 'M4 6h16M4 12h16M4 18h16',
    reset: 'M4 10a8 8 0 1 1 1 8M4 3v7h7', graph: 'M6 6l12 12M6 18L18 6M6 6h.1M18 18h.1M6 18h.1M18 6h.1',
    expand: 'M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6', pin: 'M8 3h8l-1 7 4 4H5l4-4-1-7m4 11v7',
    info: 'M12 11v6m0-10v.1M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.info} /></svg>;
}
function Datum({ value, format, field = '', layout = 'auto', quantity = false }) {
  const {policy,profileKey} = useContext(DisplayContext);
  if (value && typeof value === 'object' && !Array.isArray(value)) return <dl className="xe-nested-fields"><RecordFields fields={Object.entries(value).filter(([key,v])=>visibleField(key,v,policy)).map(([key,value])=>({key,label:fieldLabel(key,{}, { [key]:value }),value}))} /></dl>;
  const empty = value === undefined || value === null || value === '';
  if (typeof value === 'string' && /^https:\/\//.test(value)) return <a href={value} target="_blank" rel="noreferrer">Source ↗</a>;
  return <span className={empty ? 'xe-empty' : undefined}><CardValue value={displayValue(field,value,policy,profileKey)} layout={layout} format={item => quantity ? (item !== null && item !== '' && typeof item !== 'boolean' && Number.isInteger(Number(item)) ? Number(item).toLocaleString('en-US') : formatCardNumber(item)) : valueText(item,format)} /></span>;
}

function RecordFields({ fields, specs = {} }) {
  return fields.map(f => <div key={f.key} className="kg-card-field" data-layout={cardValueLayout(f.value,f.layout || specs[f.key]?.layout)}>
    <dt title={f.description || specs[f.key]?.description}>{fieldLabel(f,specs)}</dt><dd><ProductionValue field={f}><Datum value={f.value} format={f.format} field={f.key} quantity={(f.kind || specs[f.key]?.kind)==='quantity' && !Number.isInteger(f.value)} layout={f.layout || specs[f.key]?.layout} /></ProductionValue></dd>
  </div>);
}

function EvidenceTable({ card, table, schema }) {
  const {policy} = useContext(DisplayContext);
  const viewer = useContext(EvidenceRequestContext);
  const [page, setPage] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [filters, setFilters] = useState(table.default_filters || table.presets?.[0]?.filters || {}), [key, setKey] = useState(table.filters[0] || ''), [input, setInput] = useState('');
  const scopedFilters=useMemo(()=>({...filters,...table.fixed_filters}),[filters,table.fixed_filters]);
  const [history, setHistory] = useState([null]), [index, setIndex] = useState(0), [detail, setDetail] = useState(null);
  const previousFilters=useRef(filters);
  useEffect(() => { if(previousFilters.current===filters)return; previousFilters.current=filters; setHistory([null]); setIndex(0); setDetail(null); }, [filters]);
  useEffect(() => {
    const controller = new AbortController(); setBusy(true); setError(''); setPage(null);
    viewer('/table', { ref: card.ref, table_id: table.id, filters:scopedFilters, limit: 20, cursor: history[index], ...(table.request_fields ? {fields:table.request_fields} : (table.component === 'node_alt_id' || table.id === 'accessions') ? {fields:table.all_fields || schema.tables[table.id].all_fields} : {}) }, controller.signal)
      .then(value => { if (!controller.signal.aborted) setPage(value); }).catch(e => { if (!controller.signal.aborted && e.name !== 'AbortError') setError(e.message); }).finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [viewer, card.ref, table.id, table.all_fields, table.component, table.request_fields, schema.tables, scopedFilters, history, index]);
  const relatedLinks = table.component === 'node_alt_id' || table.id === 'accessions';
  const columns = table.columns.filter(k=>!(policy.hidden_fields || []).includes(k) && (relatedLinks || !page?.records?.length || page.records.some(row=>visibleField(k,row[k],policy,table.field_specs?.[k]))))
    .filter(k=>!table.hide_empty_columns || !page?.records?.length || page.records.some(row=>row[k]!==null && row[k]!==undefined && row[k]!==''));
  const renderCell = (row,k) => {
    if (relatedLinks) {
      const link=resourceLink(row,card,schema.resource_links);
      const provider=schema.resource_links?.[row.source_name];
      if (k === 'source_name') return <>{provider?.title || displayText(row[k],policy)}{provider?.category === 'annotation' && <small className="xe-resource-category">Annotation</small>}</>;
      if (k === 'alt_id') return link ? <a href={link.href} target="_blank" rel="noopener noreferrer" title={link.href}>{link.record} ↗</a> : <>{row[k]}<small className="xe-resource-category">Direct link unavailable</small></>;
    }
    return <Datum value={row[k]} field={k} quantity={table.field_specs?.[k]?.kind === 'quantity'} />;
  };
  const setLabel = (data,i) => [displayText(data.signal_role || data.qtl_type || 'Credible set',policy), publicId(data.gene_id,policy), `Set ${i+1}`].filter(Boolean).join(' · ');
  const detailRequest=useRef(null);
  useEffect(()=>()=>{detailRequest.current?.abort();},[viewer,card.ref,table.id,scopedFilters]);
  const readDetail = async row => {
    detailRequest.current?.abort();
    const controller=new AbortController(); detailRequest.current=controller;
    if (detail?.row === row) { setDetail(null); return; }
    setDetail({ row, record: row, loading: !!row.record_id });
    if (row.record_id) {
      try {
        const fullFields = schema.tables[table.id].all_fields;
        const result = await viewer('/table', { ref: card.ref, table_id: table.id, filters:scopedFilters, record_id: row.record_id, fields: fullFields, limit: 1 }, controller.signal);
        if(controller.signal.aborted) return;
        setDetail({ row, record: result.records?.[0] || row });
      } catch (e) { if(!controller.signal.aborted) setDetail({ row, record: row, error: e.message }); }
    }
  };
  return <div className="xe-evidence">
    <div className="xe-table-intro"><div><strong>{table.title}</strong><p>{displayText(table.description,policy) || 'Exact records linked to this object and its paired source release.'}</p></div><span className="xe-small">{busy ? 'Reading…' : `${page?.records?.length || 0} rows on this page`}</span></div>
    {table.pipeline_links?.length > 0 && <div className="xe-processing-links"><span>Processing pipeline</span>{table.pipeline_links.filter(link=>safeSourceUrl(link.href)).map(link=><a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">{link.label} ↗</a>)}</div>}
    {table.presets && <div className="xe-source-presets">{table.presets.map(p => <button key={p.title} className={JSON.stringify(filters) === JSON.stringify(p.filters) ? 'active' : ''} onClick={() => setFilters(p.filters)}>{p.title}</button>)}</div>}
    {table.filters.length > 0 && <form className="xe-filters" onSubmit={e => { e.preventDefault(); setFilters(previous => { const next = { ...previous }; if (input.trim()) next[key] = input.trim(); else delete next[key]; return next; }); }}>
      <select aria-label="Filter field" value={key} onChange={e => setKey(e.target.value)}>{table.filters.map(k => <option key={k} value={k}>{fieldLabel(k,table.field_specs)}</option>)}</select>
      {key === 'condition' && (table.filter_values?.condition || table.legacy_condition_options) ? <select aria-label="Condition" value={input} onChange={e => setInput(e.target.value)}><option value="">All recorded</option>{(table.filter_values?.condition || ['ND','T1D','T2D']).map(k => <option key={k}>{k}</option>)}</select> : <input aria-label="Exact filter value" placeholder="Exact value" value={input} onChange={e => setInput(e.target.value)} />}
      <button type="submit">Apply</button><button type="button" onClick={() => { setFilters(table.default_filters || {}); setInput(''); }}>Clear</button>
    </form>}
    {!table.hide_filter_chips && Object.keys(filters).length > 0 && <div className="xe-filter-chips">{Object.entries(filters).filter(([k,v])=>visibleField(k,v,policy)).map(([k,v]) => <span key={k}>{fieldLabel(k,table.field_specs)}: {displayValue(k,v,policy)}</span>)}</div>}
    {page?.credible_sets && <label className="xe-set-selector">Credible set <select aria-label="Credible set" value={filters.credible_set_id || ''} onChange={e=>setFilters(f=>{const next={...f}; if(e.target.value) next.credible_set_id=e.target.value; else delete next.credible_set_id; return next;})}><option value="">All linked sets</option>{Object.entries(page.credible_sets).map(([id,data],i)=><option key={id} value={id}>{setLabel(data,i)}</option>)}</select></label>}
    {page?.credible_sets && <div className="xe-set-descriptions">{Object.entries(page.credible_sets).map(([id, data],i) => <details key={id}><summary>{setLabel(data,i)}</summary><dl>{Object.entries(data).filter(([k,v])=>visibleField(k,v,policy,table.field_specs?.[k])).map(([k, v]) => <React.Fragment key={k}><dt>{fieldLabel(k,table.field_specs,data)}</dt><dd><Datum value={v} field={k} /></dd></React.Fragment>)}</dl></details>)}</div>}
    {error && <p role="alert" className="xe-warning">{error}</p>}
    {page?.state === 'temporarily_unavailable' && <p className="xe-warning">{page.message}</p>}
    {page?.state === 'no_records' && <div className="xe-no-records">No matching records in this release. This does not mean zero expression or no biological association.</div>}
    <TableDownloads card={card} table={table} schema={schema} filters={scopedFilters} records={page?.records} sets={page?.credible_sets} />
    <div className="xe-table-scroll"><table><thead><tr><th aria-label="Record details" />{columns.map(k => <th key={k} title={table.field_specs?.[k]?.description}>{relatedLinks ? ({source_name:'Database',alt_id:'Open record'}[k] || fieldLabel(k,table.field_specs)) : fieldLabel(k,table.field_specs)}</th>)}</tr></thead><tbody>
      {(page?.records || []).map((row, i) => <React.Fragment key={row.record_id || row.relationship_id || `${index}-${i}`}><tr>
        <td><button className="xe-row-button" onClick={() => readDetail(row)} aria-label={`Read row ${i + 1}`}>{detail?.row === row ? '−' : '+'}</button></td>
        {columns.map(k => <td key={k}>{renderCell(row,k)}</td>)}</tr>
        {detail?.row === row && <tr className="xe-detail-row"><td colSpan={columns.length + 1}>{detail.loading ? 'Reading complete record…' : <><span className="xe-small">Complete selected record {detail.error && `· ${detail.error}`}</span><dl><RecordFields fields={Object.entries(detail.record).filter(([k,v])=>visibleField(k,v,policy,table.field_specs?.[k])).map(([key,value])=>({key,label:fieldLabel(key,table.field_specs,detail.record),value}))} /></dl></>}</td></tr>}
      </React.Fragment>)}</tbody></table></div>
    <div className="xe-pagination"><span>Page {index + 1} · 20 rows maximum</span><div><button disabled={index === 0 || busy} onClick={() => setIndex(i => i - 1)}>Previous</button><button disabled={!page?.has_more || busy} onClick={() => { setHistory(h => [...h.slice(0, index + 1), page.next_cursor]); setIndex(i => i + 1); }}>Next</button></div></div>
  </div>;
}

function ConditionEvidenceGroup({card,group,schema,view,component}) {
  const [selected,setSelected]=useState(group.presets[0].id);
  const preset=group.presets.find(p=>p.id===selected) || group.presets[0];
  const source=card.tables.find(t=>t.id===preset.table_id);
  const context=contextFilters({...component,view:{...view,context_filters:preset.context_filters ?? view.context_filters}},card);
  const labels={...view.field_labels,...preset.field_labels};
  const fields=source?.all_fields || schema.tables?.[preset.table_id]?.all_fields || [];
  const table=source && context ? {...source,title:group.title,description:preset.description,columns:preset.columns,
    filters:preset.editable_filters || ['condition'],filter_values:{...source.filter_values,condition:preset.condition_values || view.condition_values || source.filter_values?.condition},legacy_condition_options:component.legacy,presets:undefined,hide_filter_chips:true,hide_empty_columns:true,
    default_filters:Object.fromEntries(Object.entries(preset.default_filters || view.default_filters || {status:'all'}).filter(([k])=>component.legacy || source.filters.includes(k))),fixed_filters:{...preset.fixed_filters,...context},
    pipeline_links:preset.pipeline_links,request_fields:preset.request_all_fields || (component.legacy && preset.table_id==='ruv_condition_summary') ? fields : [...new Set([...preset.columns,'data_source','data_source_url','data_version','license'])].filter(k=>fields.includes(k)),
    field_specs:{...source.field_specs,...Object.fromEntries(Object.entries(labels).map(([key,label])=>[key,{...source.field_specs?.[key],label,short_label:label}]))}} : null;
  return <section className="xe-expression-evidence-group" aria-label={group.title}>
    {table ? <>
      {group.presets.length>1 && <label className="xe-evidence-view">View <select aria-label={`${group.title} view`} value={selected} onChange={e=>setSelected(e.target.value)}>{group.presets.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label>}
      {!component.legacy && preset.method_label && <p className="xe-small">Method: {preset.method_label}</p>}
      <EvidenceTable key={`${card.ref.id}:${group.id}:${selected}`} card={card} table={table} schema={schema} />
    </> : <><h3>{group.title}</h3><p className="xe-small">{card.evidence_state==='temporarily_unavailable' ? view.unavailable_message : view.unlinked_message}</p></>}
  </section>;
}

function ConditionEvidenceSummary({card,schema,component}) {
  const view={...component.view,groups:conditionGroups(component,card)};
  const linked=view.groups.some(group=>group.presets.some(p=>card.tables.some(t=>t.id===p.table_id)));
  return <div className="xe-expression-evidence-summary">
    <p className="xe-small">{card.ref.type_id==='MARKER_GENE_OF' ? view.marker_note : view.note}</p>
    {!linked ? <><p className="xe-small">{card.evidence_state==='temporarily_unavailable' ? view.unavailable_message : view.unlinked_message}</p><div className="xe-expression-coverage">{view.groups.map(group=><section key={group.id} aria-label={group.title}><h3>{group.title}</h3><span>Not linked</span></section>)}</div></> : view.groups.map(group=><ConditionEvidenceGroup key={`${card.ref.id}:${group.id}`} card={card} group={group} schema={schema} view={view} component={component} />)}
  </div>;
}

function ExpandedDetails({ card, schema }) {
  const [tab, setTab] = useState('record');
  const wide = true;
  const tabs=panelTabs(card,schema);
  const selected=tabs.find(t=>t.id===tab);
  const active=tab==='record' || !selected ? 'record' : tab;
  return <div className={`xe-expanded-details ${active === 'record' ? 'xe-record-view' : 'xe-table-view'}`}>
    {wide && card && <nav className="xe-card-tabs"><button className={tab === 'record' ? 'active' : ''} onClick={() => setTab('record')}>Complete record</button>{tabs.map(t=><button key={t.id} className={active===t.id ? 'active' : ''} onClick={()=>setTab(t.id)}>{t.title}</button>)}</nav>}
    <div className="xe-card-body">
      {card && (!wide || active === 'record') && <>
        {card.endpoints?.length > 0 && <div className="xe-endpoints">{card.endpoints.map((o, i) => <React.Fragment key={`${i}:${o.ref.id}`}>{i > 0 && <Icon name="arrow" />}<span className="xe-endpoint-record">{o.display_id}<small>{o.role} · {o.ref.type_id.replace(/_/g,' ')}</small></span></React.Fragment>)}</div>}
        {card.widget === 'expression' && card.condition_statistics?.length > 0 && <div className="xe-condition-statistics">{card.condition_statistics.map(item => <section key={item.condition}><h3>{item.condition}<span>Supporting measurements</span></h3><div>{Object.entries(item.statistics).map(([key, value]) => <div key={key}><small title={card.field_specs?.[key]?.description}>{fieldLabel({key,label:{cpm:'CPM',pct_expr:'Expressing (%)',log2fc:'log₂ FC',p_adj:'Adj. P',stat:'Test stat.',n_donors:'Donors'}[key]},card.field_specs)}</small><strong>{valueText(value)}</strong></div>)}</div></section>)}</div>}
        {card.widget === 'coloc' && <div className="xe-coloc-posteriors">{['pp_h3_abf','pp_h4_abf'].map((key, i) => { const value = card.sections.flatMap(s => s.fields).find(f => f.key === key)?.value; return <section key={key}><span>{i ? 'H4 · shared signal' : 'H3 · distinct signals'}</span><strong>{typeof value === 'number' ? `${(value * 100).toFixed(2)}%` : 'Not recorded'}</strong>{typeof value === 'number' && <div><i style={{width:`${Math.max(0, Math.min(100, value * 100))}%`}} /></div>}</section>; })}</div>}
        {card.widget !== 'gene_activity' && card.sections.filter(s => !(card.condition_statistics?.length && s.fields.every(f => f.key === 'evidence_summary'))).map((s, i) => s.fields.length > 0 && <section className="xe-card-section" data-prose={s.prose || undefined} key={i}><h3>{s.title}</h3><dl><RecordFields fields={s.fields.filter(f => !(f.key === 'evidence_summary' && card.condition_statistics?.length) && !(card.widget === 'coloc' && ['pp_h3_abf','pp_h4_abf'].includes(f.key)))} specs={card.field_specs} /></dl></section>)}
        {card.widget === 'gene_activity' && <section className="xe-card-section xe-activity-summary"><h3>Gene activity by condition</h3><p className="xe-small">Source units are unspecified. Values retain the original analysis scale; AAB-positive remains a separate group.</p><TableDownloads card={card} table={schema.widget_tables?.gene_activity || {id:"gene_activity",columns:["condition","mean","median"]}} schema={schema} localRecords={card.group_statistics || []} /><table><thead><tr><th>Condition</th><th>Mean</th><th>Median</th></tr></thead><tbody>{(card.group_statistics || []).map(group=><tr key={group.condition}><td>{group.condition}</td><td><Datum value={group.mean} /></td><td><Datum value={group.median} /></td></tr>)}</tbody></table></section>}
        {(card.widget === 'variant' || card.production_design === 'Variant') && <section className="xe-card-section"><h3>Frequency</h3>{card.frequencies?.length ? <><ProductionFrequencies card={card}/><TableDownloads card={card} table={{id:"population_frequencies",...schema.tables?.population_frequencies}} schema={schema} records={card.frequencies}/></> : <p className="xe-empty">Not recorded</p>}{card.consequences?.length>0 && <><h3>Functional annotations</h3><div className="xe-chips muted">{card.consequences.map(c=><span key={c}>{c}</span>)}</div></>}{card.hgvs && <p className="xe-hgvs">{card.hgvs}</p>}</section>}
        {card.widget === 'go_codes' && <div className="xe-callout">{card.sections.flatMap(s => s.fields).filter(f => f.key === 'go_evidence_code').flatMap(f => f.value || []).map(code => <p key={code}><strong>{code}</strong> · {schema.go_evidence_codes[code] || 'Source evidence code'}</p>)}</div>}
        <p className="xe-card-note"><Icon name="info" size={15} />{card.note}</p>
        {wide && <details className="xe-card-section xe-complete"><summary>All recorded fields ({card.fields?.length || 0})</summary><dl><RecordFields fields={card.fields || []} specs={card.field_specs} /></dl></details>}
        <RecordFooter provenance={card.provenance}/>
      </>}
      {card && wide && active !== 'record' && (selected.component ?
        selected.component.renderer==='condition_tables' ? <ConditionEvidenceSummary card={card} schema={schema} component={selected.component} /> :
        ['table','credible_set'].includes(selected.component.renderer) ? selected.component.table_ids.map(tid=><EvidenceTable key={`${card.ref.id}:${tid}`} card={card} table={card.tables.find(t=>t.id===tid)} schema={schema} />) : <p className="xe-small">Unsupported registered component.</p> :
        <EvidenceTable key={`${card.ref.id}:${active}`} card={card} table={selected.table} schema={schema} />)}
    </div>
  </div>;
}


export default function EvidenceDetails({card,schema,request,releaseId}) {
  if (!releaseId || releaseId !== schema.release_id || card.release_id !== releaseId) {
    return <p role="status">Detailed evidence is unavailable for this graph version.</p>;
  }
  return <EvidenceRequestContext.Provider value={request}>
    <DisplayContext.Provider value={{policy:schema.display_policy || {},profileKey:`${card.ref.kind}:${card.ref.type_id}`}}>
      <ExpandedDetails key={`${releaseId}:${card.ref.kind}:${card.ref.type_id}:${card.ref.id}`} card={card} schema={schema}/>
    </DisplayContext.Provider>
  </EvidenceRequestContext.Provider>;
}

export function InspectedInformationPanel({card,schema,request,releaseId}) {
  const panel=useGraphInfoPanel();
  const shown=useMemo(()=>recordDesign(presentCard(card,{...schema.display_policy,field_labels:{...schema.display_policy?.field_labels,...panelPolicy.field_labels},unit_labels:{...schema.display_policy?.unit_labels,...panelPolicy.unit_labels},field_descriptions:{...schema.display_policy?.field_descriptions,...panelPolicy.field_descriptions}}),card),[card,schema]);
  const compact=useMemo(()=>compactSections(shown,objectSections(shown)),[shown]);
  const canExpand=hasExtraRecord(shown,compact,panelTabs(shown,schema));
  if(releaseId!==schema.release_id || card.release_id!==releaseId) return null;
  return <>
    <GraphInfoPanelHeader canExpand={canExpand} title={shown.title}>{shown.title}</GraphInfoPanelHeader>
    {panel?.large ? <EvidenceDetails card={shown} schema={schema} request={request} releaseId={releaseId}/> :
      <DisplayContext.Provider value={{policy:schema.display_policy || {},profileKey:`${card.ref.kind}:${card.ref.type_id}`}}>
        <div className="xe-expanded-details xe-compact-details">
          {shown.endpoints?.length>0 && <div className="xe-compact-endpoints">{shown.endpoints.map((e,i)=><span key={i}>{i>0 && ' → '}{e.display_id}</span>)}</div>}

          {compact.sections.map((section,i)=><section className="xe-card-section" data-prose={section.prose || undefined} key={i}><h3>{section.title}</h3><dl><RecordFields fields={section.fields} specs={shown.field_specs}/></dl></section>)}
          <RecordFooter provenance={shown.provenance}/>
        </div>
      </DisplayContext.Provider>}
  </>;
}
