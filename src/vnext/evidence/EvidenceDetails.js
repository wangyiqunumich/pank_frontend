// Reused from the source-pinned 1024 demo; network access is supplied by the host.
import React,{createContext,useContext,useEffect,useMemo,useRef,useState} from 'react';
import {annotationValue} from './sourceAnnotations';
import {conditionGroups,contextFilters} from './evidenceComponents';
import {fieldLabel} from './presentation';
import './evidenceDetails.css';
import {panelTabs} from './panelTabs';
import {usePanelSchema,panelSchema,PanelSchemaContext,bundled} from './panelSchema';
import {compactSections} from './compactSections';
import {recordDesign,objectSections,hasExtraRecord,expandedSections} from './recordDesign';
import {ProductionValue,RecordFooter,ProductionFrequencies} from './ProductionRecord';
import {GraphInfoPanelHeader,useGraphInfoPanel} from '../GraphInfoPanel';
import {valueText,EvidenceRequestContext} from './api';
import {publicId,visibleField,displayValue,displayText,presentCard} from './displayPolicy';
import {CardValue,cardValueLayout,formatCardNumber} from './CardValue';
import {resourceLink} from './resourceLinks';
import TableDownloads from './TableDownloadControls';
import {safeSourceUrl} from './tableDownloads';
const DisplayContext=createContext({policy:{},profileKey:null});
function Datum({ value, format, field = '', layout = 'auto', quantity = false }) {
  const panelPolicy=usePanelSchema();
  const {policy,profileKey} = useContext(DisplayContext);
  value=annotationValue(value);
  if (Array.isArray(value) && value.some(item=>item && typeof item==='object')) return <div className="xe-source-annotations">{value.map((item,i)=><section key={i}><Datum value={item} field={field}/></section>)}</div>;
  if (value && typeof value==='object' && value.row) return <section className="xe-source-annotation"><strong>{value.data_source || 'Source annotations'}</strong><Datum value={value.row}/><RecordFooter provenance={value}/></section>;
  if (value && typeof value === 'object' && !Array.isArray(value)) return <dl className="xe-nested-fields"><RecordFields fields={Object.entries(value).filter(([key,v])=>!(panelPolicy.source_annotation_hidden_fields || []).includes(key) && visibleField(key,v,policy)).map(([key,value])=>({key,label:fieldLabel(key,{}, { [key]:value }),value}))} /></dl>;
  const empty = value === undefined || value === null || value === '';
  if (typeof value === 'string' && /^https:\/\//.test(value)) return <a href={value} target="_blank" rel="noreferrer">Source ↗</a>;
  return <span className={empty ? 'xe-empty' : undefined}><CardValue value={displayValue(field,value,policy,profileKey)} layout={layout} format={item => quantity ? (item !== null && item !== '' && typeof item !== 'boolean' && Number.isInteger(Number(item)) ? Number(item).toLocaleString('en-US') : formatCardNumber(item,panelPolicy.layout)) : valueText(item,format)} /></span>;
}

function RecordFields({ fields, specs = {} }) {
  return fields.map(f => <div key={f.key} className="kg-card-field" data-layout={cardValueLayout(f.value,f.layout || specs[f.key]?.layout)}>
    <dt title={f.description || specs[f.key]?.description}>{fieldLabel(f,specs)}</dt><dd><ProductionValue field={f}><Datum value={f.value} format={f.format} field={f.key} quantity={(f.kind || specs[f.key]?.kind)==='quantity' && !Number.isInteger(f.value)} layout={f.layout || specs[f.key]?.layout} /></ProductionValue></dd>
  </div>);
}

function EvidenceTable({ card, table: sourceTable, schema }) {
  const panelPolicy=usePanelSchema();
  const table=useMemo(()=>({...sourceTable,columns:(panelPolicy.table_columns[sourceTable.id] || sourceTable.columns).filter(k=>(sourceTable.all_fields || schema.tables[sourceTable.id]?.all_fields || sourceTable.columns).includes(k)),simple_list:true,hide_empty_columns:true,hide_filter_chips:true,field_specs:{...sourceTable.field_specs,...Object.fromEntries(Object.entries(panelPolicy.field_labels).map(([key,label])=>[key,{...sourceTable.field_specs?.[key],label,short_label:label,show_unit:false}]))}}),[sourceTable,panelPolicy]);
  const {policy} = useContext(DisplayContext);
  const viewer = useContext(EvidenceRequestContext);
  const [page, setPage] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [filters, setFilters] = useState(table.default_filters || table.presets?.[0]?.filters || {}), [key, setKey] = useState(table.filters?.[0] || ''), [input, setInput] = useState('');
  const scopedFilters=useMemo(()=>({...filters,...table.fixed_filters}),[filters,table.fixed_filters]);
  const [history, setHistory] = useState([null]), [index, setIndex] = useState(0), [detail, setDetail] = useState(null);
  const previousFilters=useRef(filters);
  useEffect(() => { if(previousFilters.current===filters)return; previousFilters.current=filters; setHistory([null]); setIndex(0); setDetail(null); }, [filters]);
  useEffect(() => {
    const controller = new AbortController(); setBusy(true); setError(''); setPage(null);
    viewer('/table', { ref: card.ref, table_id: table.id, filters:scopedFilters, limit: 20, cursor: history[index], fields:table.request_fields || [...new Set([...table.columns,...(table.id==='credible_members'?['credible_set_id','signal_role']:[]),'data_source','data_source_url','data_version','license'])].filter(k=>(table.all_fields || schema.tables[table.id]?.all_fields || table.columns).includes(k)) }, controller.signal)
      .then(value => { if (!controller.signal.aborted) setPage(value); }).catch(e => { if (!controller.signal.aborted && e.name !== 'AbortError') setError(e.message); }).finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [viewer, card.ref, table.id, table.all_fields, table.component, table.request_fields, schema.tables, scopedFilters, history, index]);
  const relatedLinks = table.component === 'node_alt_id' || table.id === 'accessions';
  const columns = table.columns.filter(k=>!(table.comparison==='disease' && k==='reference_condition')).filter(k=>!(panelPolicy.table_hidden_fields || []).includes(k)).filter(k=>!panelPolicy.hidden_internal_fields.includes(k) && !(policy.hidden_fields || []).includes(k) && (relatedLinks || !page?.records?.length || page.records.some(row=>visibleField(k,row[k],policy,table.field_specs?.[k]))))
    .filter(k=>!table.hide_empty_columns || !page?.records?.length || page.records.some(row=>row[k]!==null && row[k]!==undefined && row[k]!==''));
  const renderCell = (row,k) => {
    if (relatedLinks) {
      const link=resourceLink(row,card,schema.resource_links);
      const provider=schema.resource_links?.[row.source_name];
      if (k === 'source_name') return <>{provider?.title || displayText(row[k],policy)}{provider?.category === 'annotation' && <small className="xe-resource-category">Annotation</small>}</>;
      if (k === 'alt_id') return link ? <a href={link.href} target="_blank" rel="noopener noreferrer" title={link.href}>{link.record} ↗</a> : <>{row[k]}<small className="xe-resource-category">Direct link unavailable</small></>;
    }
    if(table.comparison==='disease' && k==='condition')return row.condition && row.reference_condition ? `${row.condition} vs ${row.reference_condition}` : 'Comparison not recorded';
    return <Datum value={row[k]} field={k} quantity={table.field_specs?.[k]?.kind === 'quantity'} />;
  };
  const setLabel = (data,i) => [displayText(data.signal_role || data.qtl_type || 'Credible set',policy), publicId(data.gene_id,policy), `Set ${i+1}`].filter(Boolean).join(' · ');
  const rowGroups=useMemo(()=>{
    if(table.id!=='credible_members')return [{key:'records',rows:page?.records || []}];
    const groups=new Map();
    for(const row of page?.records || []){const key=JSON.stringify([row.signal_role,row.credible_set_id]);if(!groups.has(key))groups.set(key,{key,role:row.signal_role,set:row.credible_set_id,rows:[]});groups.get(key).rows.push(row);}
    return [...groups.values()];
  },[page,table.id]);
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
    <div className="xe-table-intro"><div><strong>{table.title}</strong>{table.comparison==='cell_type' && <p className="xe-small">Within each condition · positive log₂ FC means higher in the selected cell type.</p>}{table.comparison==='disease' && <p className="xe-small">Positive log₂ FC means higher in the first condition than its reference.</p>}</div><span className="xe-small">{busy ? 'Reading…' : `${page?.records?.length || 0} rows on this page`}</span></div>
    {table.pipeline_links?.length > 0 && <div className="xe-processing-links"><span>Processing pipeline</span>{table.pipeline_links.filter(link=>safeSourceUrl(link.href)).map(link=><a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">{link.label} ↗</a>)}</div>}
    {table.presets && <div className="xe-source-presets">{table.presets.map(p => <button key={p.title} className={JSON.stringify(filters) === JSON.stringify(p.filters) ? 'active' : ''} onClick={() => setFilters(p.filters)}>{p.title}</button>)}</div>}
    {!table.simple_list && table.filters.length > 0 && <form className="xe-filters" onSubmit={e => { e.preventDefault(); setFilters(previous => { const next = { ...previous }; if (input.trim()) next[key] = input.trim(); else delete next[key]; return next; }); }}>
      <select aria-label="Filter field" value={key} onChange={e => setKey(e.target.value)}>{table.filters.map(k => <option key={k} value={k}>{fieldLabel(k,table.field_specs)}</option>)}</select>
      {key === 'condition' && (table.filter_values?.condition || table.legacy_condition_options) ? <select aria-label="Condition" value={input} onChange={e => setInput(e.target.value)}><option value="">All recorded</option>{(table.filter_values?.condition || ['ND','T1D','T2D']).map(k => <option key={k}>{k}</option>)}</select> : <input aria-label="Exact filter value" placeholder="Exact value" value={input} onChange={e => setInput(e.target.value)} />}
      <button type="submit">Apply</button><button type="button" onClick={() => { setFilters(table.default_filters || {}); setInput(''); }}>Clear</button>
    </form>}
    {!table.hide_filter_chips && Object.keys(filters).length > 0 && <div className="xe-filter-chips">{Object.entries(filters).filter(([k,v])=>visibleField(k,v,policy)).map(([k,v]) => <span key={k}>{fieldLabel(k,table.field_specs)}: {displayValue(k,v,policy)}</span>)}</div>}
    {page?.credible_sets && Object.keys(page.credible_sets).length>1 && <label className="xe-set-selector">Credible set <select aria-label="Credible set" value={filters.credible_set_id || ''} onChange={e=>setFilters(f=>{const next={...f}; if(e.target.value) next.credible_set_id=e.target.value; else delete next.credible_set_id; return next;})}><option value="">All linked sets</option>{Object.entries(page.credible_sets).map(([id,data],i)=><option key={id} value={id}>{setLabel(data,i)}</option>)}</select></label>}
    {page?.credible_sets && <div className="xe-set-descriptions">{Object.entries(page.credible_sets).filter(([id])=>!filters.credible_set_id || filters.credible_set_id===id).map(([id,data],i)=><section key={id}><strong>{setLabel(data,i)}</strong><dl>{['tissue_name','qtl_type','method','n_members','purity'].filter(k=>data[k]!==undefined && data[k]!==null).map(k=><div className="kg-card-field" key={k}><dt>{k==='qtl_type'?'Signal type':fieldLabel(k,table.field_specs)}</dt><dd><Datum value={data[k]} field={k}/></dd></div>)}</dl></section>)}</div>}
    {error && <p role="alert" className="xe-warning">{error}</p>}
    {page?.state === 'temporarily_unavailable' && <p className="xe-warning">{page.message}</p>}
    {page?.state === 'no_records' && <div className="xe-no-records">No matching records.</div>}
    {page?.records?.length > 0 && <TableDownloads card={card} table={table} schema={schema} filters={scopedFilters} records={page.records} sets={page?.credible_sets} />}
    {page?.records?.length > 0 && rowGroups.map(group=>{const groupColumns=columns.filter(k=>group.rows.some(row=>visibleField(k,row[k],policy,table.field_specs?.[k]))); return <section key={group.key} className="xe-evidence-record-group">{group.role && <h3>{String(group.role).toUpperCase()} · {setLabel(page.credible_sets?.[group.set] || {},Object.keys(page.credible_sets || {}).indexOf(group.set))}</h3>}<div className="xe-table-scroll"><table><thead><tr>{!table.simple_list && <th aria-label="Record details" />}{groupColumns.map(k => <th key={k} title={table.field_specs?.[k]?.description}>{table.comparison==='disease' && k==='condition' ? 'Comparison' : relatedLinks ? ({source_name:'Database',alt_id:'Open record'}[k] || fieldLabel(k,table.field_specs)) : fieldLabel(k,table.field_specs)}</th>)}</tr></thead><tbody>
      {group.rows.map((row, i) => <React.Fragment key={row.record_id || row.relationship_id || `${index}-${i}`}><tr>
        {!table.simple_list && <td><button className="xe-row-button" onClick={() => readDetail(row)} aria-label={`Read row ${i + 1}`}>{detail?.row === row ? '−' : '+'}</button></td>}
        {groupColumns.map(k => <td key={k}>{renderCell(row,k)}</td>)}</tr>
        {!table.simple_list && detail?.row === row && <tr className="xe-detail-row"><td colSpan={groupColumns.length + 1}>{detail.loading ? 'Reading complete record…' : <><span className="xe-small">Complete selected record {detail.error && `· ${detail.error}`}</span><dl><RecordFields fields={Object.entries(detail.record).filter(([k,v])=>visibleField(k,v,policy,table.field_specs?.[k])).map(([key,value])=>({key,label:fieldLabel(key,table.field_specs,detail.record),value}))} /></dl></>}</td></tr>}
      </React.Fragment>)}</tbody></table></div></section>;})}
    {page?.records?.length>0 && [...new Map(page.records.filter(r=>r.data_source || r.data_version).map(r=>{const p={data_source:r.data_source,data_version:r.data_version,data_source_url:r.data_source_url,license:r.license};return [JSON.stringify(p),p];})).values()].map((p,i)=><RecordFooter key={i} provenance={p} schema={schema}/>)}
    {(index > 0 || page?.has_more) && <div className="xe-pagination"><span>Page {index + 1} · 20 rows maximum</span><div><button disabled={index === 0 || busy} onClick={() => setIndex(i => i - 1)}>Previous</button><button disabled={!page?.has_more || busy} onClick={() => { setHistory(h => [...h.slice(0, index + 1), page.next_cursor]); setIndex(i => i + 1); }}>Next</button></div></div>}
  </div>;
}


export function currentPresets(presets,panelPolicy=bundled) {
  const rules=panelPolicy.expression_display;
  return presets.filter(p=>!rules.excluded_presets.includes(p.id) && !presets.some(other=>other.id===rules.superseded_presets[p.id]));
}
function endpointName(card,e) {
  if(e.display_name)return e.display_name;
  const keys=e.ref.type_id==='Gene' ? ['HGNC_symbol','gene_name','gene_symbol'] : ['Cell','anatomical_structure'].includes(e.ref.type_id) ? ['cell_type_name','cell_name'] : [];
  // Own-record names are safe only when this endpoint type is unambiguous.
  if(card.endpoints.filter(x=>x.ref.type_id===e.ref.type_id).length===1){
    for(const key of keys){const value=card.fields?.find(f=>f.key===key)?.value;if(typeof value==='string'&&value)return value;}
  }
  return e.display_id || e.ref.id;
}
function RelationshipContext({card,compact=false}) {
  const panelPolicy=usePanelSchema();
  if(!card.endpoints?.length)return null;
  const context=panelPolicy.expression_display.compact_context?.[card.ref.type_id];
  const method=(card.fields || []).find(f=>f.key==='method')?.value || context?.method;
  const description=(card.fields || []).find(f=>f.key==='description')?.value;
  return <section className="xe-card-section xe-relationship-context"><dl>
    {card.endpoints.map((e,i)=><div className="kg-card-field" key={e.ref.id}><dt>{panelPolicy.endpoint_labels?.[e.ref.type_id] || e.role || panelPolicy.context.endpoint_fallback_labels[i]}</dt><dd>{endpointName(card,e)}{panelPolicy.context.show_public_accessions && endpointName(card,e)!==(e.display_id || e.ref.id) && <small>{e.display_id || e.ref.id}</small>}</dd></div>)}
    {compact && method && <div className="kg-card-field"><dt>{panelPolicy.context.method_label}</dt><dd>{method}</dd></div>}
    {compact && (context?.data || description) && <div className="kg-card-field"><dt>Data</dt><dd>{context?.data || description}</dd></div>}
  </dl></section>;
}

function ConditionEvidenceGroup({card,group,schema,view,component,preset}) {
  const panelPolicy=usePanelSchema();
  const selected=preset.id;
  const source=card.tables.find(t=>t.id===preset.table_id);
  const context=contextFilters({...component,view:{...view,context_filters:preset.context_filters ?? view.context_filters}},card);
  const labels={...view.field_labels,...panelPolicy.field_labels,...preset.field_labels};
  const cell=card.endpoints?.find(e=>['Cell','anatomical_structure'].includes(e.ref.type_id));
  const cellName=cell ? endpointName(card,cell) : 'Selected cell type';
  const title=(preset.title || group.title).replace('{cell}',cellName);
  const fields=source?.all_fields || schema.tables?.[preset.table_id]?.all_fields || [];
  const table=source && context ? {...source,title,comparison:preset.comparison,simple_list:true,description:preset.description,columns:preset.columns,
    filters:preset.editable_filters || ['condition'],filter_values:{...source.filter_values,condition:preset.condition_values || view.condition_values || source.filter_values?.condition},legacy_condition_options:component.legacy,presets:undefined,hide_filter_chips:true,hide_empty_columns:true,
    default_filters:Object.fromEntries(Object.entries(preset.default_filters || view.default_filters || {status:'all'}).filter(([k])=>component.legacy || source.filters.includes(k))),fixed_filters:{...preset.fixed_filters,...context},
    pipeline_links:preset.pipeline_links,request_fields:preset.request_all_fields || (component.legacy && preset.table_id==='ruv_condition_summary') ? fields : [...new Set([...preset.columns,'data_source','data_source_url','data_version','license'])].filter(k=>fields.includes(k)),
    field_specs:{...source.field_specs,...Object.fromEntries(Object.entries(labels).map(([key,label])=>[key,{...source.field_specs?.[key],label,short_label:label,show_unit:false}]))}} : null;
  return <section className="xe-expression-evidence-group" aria-label={group.title}>
    {table ? <>
      <p className="xe-small xe-method-context">{preset.method_label || preset.method}</p>
      <EvidenceTable key={`${card.ref.id}:${group.id}:${selected}`} card={card} table={table} schema={schema} />
    </> : <><h3>{group.title}</h3><p className="xe-small">{card.evidence_state==='temporarily_unavailable' ? view.unavailable_message : view.unlinked_message}</p></>}
  </section>;
}

function ConditionEvidenceSummary({card,schema,component}) {
  const panelPolicy=usePanelSchema();
  const view={...component.view,groups:conditionGroups(component,card,panelPolicy)};
  const linked=view.groups.some(group=>group.presets.some(p=>card.tables.some(t=>t.id===p.table_id)));
  return <div className="xe-expression-evidence-summary">
    <RelationshipContext card={card}/>
    {!linked ? <><p className="xe-small">{card.evidence_state==='temporarily_unavailable' ? view.unavailable_message : view.unlinked_message}</p><div className="xe-expression-coverage">{view.groups.map(group=><section key={group.id} aria-label={group.title}><h3>{group.title}</h3><span>Not linked</span></section>)}</div></> : view.groups.flatMap(group=>currentPresets(group.presets,panelPolicy).map(preset=><ConditionEvidenceGroup key={`${card.ref.id}:${group.id}:${preset.id}`} card={card} group={group} preset={preset} schema={schema} view={view} component={component} />))}
  </div>;
}

function ExpandedDetails({ card, schema }) {
  const panelPolicy=usePanelSchema();
  const [tab, setTab] = useState('record');
  const wide = true;
  const tabs=panelTabs(card,schema);
  const selected=tabs.find(t=>t.id===tab);
  const active=tab==='record' || !selected ? 'record' : tab;
  return <div className={`xe-expanded-details ${active === 'record' ? 'xe-record-view' : 'xe-table-view'}`}>
    {wide && card && <nav className="xe-card-tabs"><button className={tab === 'record' ? 'active' : ''} onClick={() => setTab('record')}>Complete record</button>{tabs.map(t=><button key={t.id} className={active===t.id ? 'active' : ''} onClick={()=>setTab(t.id)}>{t.title}</button>)}</nav>}
    <div className="xe-card-body" style={{'--panel-columns':panelPolicy.expanded_layout.columns,'--panel-narrow-columns':panelPolicy.expanded_layout.narrow_columns,'--panel-gap':`${panelPolicy.expanded_layout.gap_px}px`}}>
      {card && (!wide || active === 'record') && <>
        <RelationshipContext card={card}/>
        {expandedSections(card,panelPolicy).map((section,i)=><section className="xe-card-section" data-prose={section.prose || undefined} key={i}><h3>{section.title}</h3><dl><RecordFields fields={section.fields} specs={card.field_specs}/></dl></section>)}
        {(card.widget === 'variant' || card.production_design === 'Variant') && <section className="xe-card-section"><h3>Frequency</h3>{card.frequencies?.length ? <><ProductionFrequencies card={card}/><TableDownloads card={card} table={{id:"population_frequencies",...schema.tables?.population_frequencies}} schema={schema} records={card.frequencies}/></> : <p className="xe-empty">Not recorded</p>}{card.consequences?.length>0 && <><h3>Functional annotations</h3><div className="xe-chips muted">{card.consequences.map(c=><span key={c}>{c}</span>)}</div></>}{card.hgvs && <p className="xe-hgvs">{card.hgvs}</p>}</section>}
        <RecordFooter provenance={card.provenance} schema={schema}/>
      </>}
      {card && active !== 'record' && selected.component?.renderer!=='condition_tables' && <RelationshipContext card={card}/>}
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
  return <PanelSchemaContext.Provider value={panelSchema(schema)}><EvidenceRequestContext.Provider value={request}>
    <DisplayContext.Provider value={{policy:{...schema.display_policy,panel_presentation:panelSchema(schema)},profileKey:`${card.ref.kind}:${card.ref.type_id}`}}>
      <ExpandedDetails key={`${releaseId}:${card.ref.kind}:${card.ref.type_id}:${card.ref.id}`} card={card} schema={schema}/>
    </DisplayContext.Provider>
  </EvidenceRequestContext.Provider></PanelSchemaContext.Provider>;
}

export function InspectedInformationPanel({card,schema,request,releaseId,compactOnly=false}) {
  const panel=useGraphInfoPanel();
  const panelPolicy=panelSchema(schema);
  const shown=useMemo(()=>recordDesign(presentCard(card,{...schema.display_policy,panel_presentation:panelPolicy,field_labels:{...schema.display_policy?.field_labels,...panelPolicy.field_labels},unit_labels:{...schema.display_policy?.unit_labels,...panelPolicy.unit_labels},field_descriptions:{...schema.display_policy?.field_descriptions,...panelPolicy.field_descriptions}}),card,panelPolicy),[card,schema,panelPolicy]);
  const compact=useMemo(()=>compactSections(shown,objectSections(shown,panelPolicy),panelPolicy),[shown,panelPolicy]);
  const canExpand=!compactOnly && hasExtraRecord(shown,compact,panelTabs(shown,schema),panelPolicy);
  if(releaseId!==schema.release_id || card.release_id!==releaseId) return null;
  return <PanelSchemaContext.Provider value={panelPolicy}>
    <GraphInfoPanelHeader canExpand={canExpand} title={shown.title}>{shown.title}</GraphInfoPanelHeader>
    {panel?.large && !compactOnly ? <EvidenceDetails card={shown} schema={schema} request={request} releaseId={releaseId}/> :
      <DisplayContext.Provider value={{policy:{...schema.display_policy,panel_presentation:panelSchema(schema)},profileKey:`${card.ref.kind}:${card.ref.type_id}`}}>
        <div className="xe-expanded-details xe-compact-details">
          <RelationshipContext card={shown} schema={schema} compact/>

          {compact.sections.map((section,i)=><section className="xe-card-section" data-prose={section.prose || undefined} key={i}><h3>{section.title}</h3><dl><RecordFields fields={section.fields} specs={shown.field_specs}/></dl></section>)}
          <RecordFooter provenance={shown.provenance} schema={schema}/>
        </div>
      </DisplayContext.Provider>}
  </PanelSchemaContext.Provider>;
}
