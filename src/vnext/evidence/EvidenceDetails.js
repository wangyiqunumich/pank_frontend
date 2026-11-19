// Reused from the source-pinned 1024 demo; network access is supplied by the host.
import React,{createContext,useCallback,useContext,useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {annotationValue} from './sourceAnnotations';
import {conditionGroups,contextFilters} from './evidenceComponents';
import {fieldLabel} from './presentation';
import './evidenceDetails.css';
import {panelTabs} from './panelTabs';
import {usePanelSchema,panelSchema,PanelSchemaContext,bundled} from './panelSchema';
import {compactSections} from './compactSections';
import {recordDesign,objectSections,hasExtraRecord,expandedSections} from './recordDesign';
import {ProductionValue,RecordFooter,ProductionFrequencies} from './ProductionRecord';
import {GraphInfoPanelBody,GraphInfoPanelHeader,useGraphInfoPanel} from '../GraphInfoPanel';
import {valueText,EvidenceRequestContext} from './api';
import {publicId,visibleField,displayValue,displayText,presentCard} from './displayPolicy';
import {CardValue,cardValueLayout,formatCardNumber} from './CardValue';
import {resourceLink} from './resourceLinks';
import TableDownloads from './TableDownloadControls';
import EvidenceTableCard from './EvidenceTableCard';
import {CccDotMatrix,CccSummary,useCccContexts} from './CccContexts';
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

function EvidenceTable({card, schema, table: sourceTable, tableKey, onState}) {
  const panelPolicy = usePanelSchema();
  const {policy} = useContext(DisplayContext);
  const request = useContext(EvidenceRequestContext);
  const table = useMemo(() => {
    const allFields = sourceTable.all_fields || schema.tables?.[sourceTable.id]?.all_fields || sourceTable.columns;
    const columns = (panelPolicy.table_columns[sourceTable.id] || sourceTable.columns).filter(key => allFields.includes(key));
    const fieldSpecs = {...sourceTable.field_specs};
    for (const [key, label] of Object.entries(panelPolicy.field_labels)) {
      fieldSpecs[key] = {...fieldSpecs[key], label, short_label: label, show_unit: false};
    }
    return {...sourceTable, allFields, columns, field_specs: fieldSpecs};
  }, [sourceTable, panelPolicy, schema.tables]);
  const defaultFilters = useRef(table.default_filters || table.presets?.[0]?.filters || {});
  const [position, setPosition] = useState(() => ({filters: defaultFilters.current, cursors: [null], index: 0}));
  const [result, setResult] = useState(null);
  const [knownSets, setKnownSets] = useState(null);
  const {filters, cursors, index} = position;
  const scopedFilters = useMemo(() => ({...filters, ...table.fixed_filters}), [filters, table.fixed_filters]);

  useEffect(() => {
    const controller = new AbortController();
    const fields = table.request_fields || [...new Set([...table.columns,
      ...(table.id === 'credible_members' ? ['credible_set_id', 'signal_role'] : []),
      'data_source', 'data_source_url', 'data_version', 'license', 'license_url'])].filter(key => table.allFields.includes(key));
    request('/table', {ref: card.ref, table_id: table.id, filters: scopedFilters, limit: 20, cursor: cursors[index], fields}, controller.signal)
      .then(page => {
        if (controller.signal.aborted) return;
        if (!filters.credible_set_id && page.credible_sets) setKnownSets(page.credible_sets);
        setResult({position, page});
      }).catch(error => {
        if (!controller.signal.aborted && error.name !== 'AbortError') setResult({position, error: error.message || 'These records are temporarily unavailable.'});
      });
    return () => controller.abort();
  }, [request, card.ref, table, scopedFilters, position, cursors, index, filters.credible_set_id]);

  const busy = result?.position !== position;
  const page = result?.position.filters === filters ? result.page : null;
  const records = page?.records || [];
  const error = busy ? null : result.error || (page?.state === 'temporarily_unavailable'
    ? page.message || 'These records are temporarily unavailable.' : null);
  const relatedLinks = table.component === 'node_alt_id' || table.id === 'accessions';
  const columns = table.columns.filter(key => !(table.comparison === 'disease' && key === 'reference_condition')
    && key !== 'data_source_url' && !panelPolicy.table_hidden_fields?.includes(key) && !panelPolicy.hidden_internal_fields.includes(key)
    && !policy.hidden_fields?.includes(key));
  const groups = new Map();
  for (const row of records) {
    const key = table.id === 'credible_members' ? JSON.stringify([row.signal_role, row.credible_set_id]) : 'records';
    if (!groups.has(key)) groups.set(key, {role: row.signal_role, set: row.credible_set_id, rows: []});
    groups.get(key).rows.push(row);
  }
  const visibleGroups = [...groups].map(([key, group]) => ({...group, key, columns: columns.filter(column =>
    group.rows.some(row => row[column] != null && row[column] !== '' && visibleField(column, row[column], policy, table.field_specs[column]))
  )})).filter(group => group.columns.length);
  const sets = knownSets || page?.credible_sets || {};
  const hasSetPicker = Object.keys(sets).length > 1;
  const canReset = index > 0 || (hasSetPicker && Boolean(filters.credible_set_id)) ||
    Boolean(table.presets?.length > 1 && filters !== defaultFilters.current);
  const hasRows = visibleGroups.length > 0;
  const status = hasRows || error || canReset ? 'visible' : busy ? 'loading' : 'empty';
  useLayoutEffect(() => { onState(tableKey, status); }, [tableKey, status, onState]);
  if (status !== 'visible') return null;

  const selectFilters = next => setPosition({filters: next, cursors: [null], index: 0});
  const setLabel = (set, i) => [displayText(set.signal_role || set.qtl_type || 'Credible set',policy),
    publicId(set.gene_id,policy), `Set ${i + 1}`].filter(Boolean).join(' · ');
  const renderCell = (row, key) => {
    if (relatedLinks) {
      const provider = schema.resource_links?.[row.source_name];
      if (key === 'source_name') return <>{provider?.title || displayText(row[key],policy)}{provider?.category === 'annotation' && <small className="xe-resource-category">Annotation</small>}</>;
      if (key === 'alt_id') {
        const link = resourceLink(row,card,schema.resource_links);
        return link ? <a href={link.href} target="_blank" rel="noopener noreferrer" title={link.href}>{link.record} ↗</a>
          : <>{row[key]}<small className="xe-resource-category">Direct link unavailable</small></>;
      }
    }
    if (table.comparison === 'disease' && key === 'condition') return row.condition && row.reference_condition ? `${row.condition} vs ${row.reference_condition}` : 'Comparison not recorded';
    return <Datum value={row[key]} field={key} quantity={table.field_specs[key]?.kind === 'quantity'} />;
  };
  const controls = <>
    {table.presets?.length > 0 && <div className="xe-source-presets">{table.presets.map(preset => <button type="button" key={preset.title}
      aria-pressed={JSON.stringify(filters) === JSON.stringify(preset.filters)} onClick={() => selectFilters(preset.filters)}>{preset.title}</button>)}</div>}
    {hasSetPicker && <label className="xe-set-selector">Credible set <select aria-label="Credible set" value={filters.credible_set_id || ''} onChange={e => {
      const next = {...filters};
      if (e.target.value) next.credible_set_id = e.target.value;
      else delete next.credible_set_id;
      selectFilters(next);
    }}>
      <option value="">All linked sets</option>{Object.entries(sets).map(([id, data], i) => <option key={id} value={id}>{setLabel(data, i)}</option>)}
    </select></label>}
    {page?.credible_sets && <div className="xe-set-descriptions">{Object.entries(page.credible_sets)
      .filter(([id]) => !filters.credible_set_id || filters.credible_set_id === id).map(([id, data], i) => <section key={id}>
        <strong>{setLabel(data, i)}</strong><dl>{['tissue_name','qtl_type','method','n_members','purity'].filter(key => data[key] != null).map(key =>
          <div className="kg-card-field" key={key}><dt>{key === 'qtl_type' ? 'Signal type' : fieldLabel(key, table.field_specs)}</dt><dd><Datum value={data[key]} field={key}/></dd></div>)}</dl>
      </section>)}</div>}
  </>;
  return <EvidenceTableCard card={card} table={table} schema={schema} filters={scopedFilters} records={hasRows ? records : []}
    sets={page?.credible_sets} pageIndex={index} hasNext={Boolean(page?.has_more && page.next_cursor && !cursors.slice(0, index + 1).includes(page.next_cursor))}
    onPrevious={() => setPosition(previous => ({...previous, index: previous.index - 1}))}
    onNext={() => setPosition(previous => ({...previous, cursors: [...previous.cursors.slice(0, index + 1), page.next_cursor], index: index + 1}))}
    busy={busy} error={error} controls={controls}>
    {visibleGroups.map(group => <section key={group.key} className="xe-evidence-record-group">
      {group.role && <h4>{String(group.role).toUpperCase()} · {setLabel(sets[group.set] || {}, Object.keys(sets).indexOf(group.set))}</h4>}
      <div className="xe-table-scroll" tabIndex={0} aria-label={table.title}>
        <table aria-label={table.title}>
          <thead><tr>{group.columns.map(key => <th key={key} scope="col" title={table.field_specs[key]?.description}>
            {table.comparison === 'disease' && key === 'condition' ? 'Comparison' : (relatedLinks ? {source_name:'Database',alt_id:'Open record'}[key] : null) || fieldLabel(key,table.field_specs)}
          </th>)}</tr></thead>
          <tbody>{group.rows.map((row,i) => <tr key={row.record_id || row.relationship_id || i}>
            {group.columns.map(key => <td key={key}>{renderCell(row,key)}</td>)}
          </tr>)}</tbody>
        </table>
      </div>
    </section>)}
    {!hasRows && !busy && !error && <p role="status" className="xe-evidence-message">No matching records.</p>}
  </EvidenceTableCard>;
}

function EvidenceTables({card, schema, tables, emptyMessage = 'No matching records.'}) {
  const [states, setStates] = useState({});
  const reportState = useCallback((key, state) => {
    setStates(previous => previous[key] === state ? previous : {...previous, [key]: state});
  }, []);
  const visible = tables.some(({key}) => states[key] === 'visible');
  const loading = tables.some(({key}) => !states[key] || states[key] === 'loading');
  return <>
    <div className="xe-evidence-list">
      {tables.map(({key, table}) => <EvidenceTable key={key} tableKey={key} card={card} table={table} schema={schema} onState={reportState}/>)}
    </div>
    {!visible && <p role="status" className="xe-evidence-placeholder">{loading ? 'Loading records…' : emptyMessage}</p>}
  </>;
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
  const cccRoles=panelPolicy.relationship_labels?.[card.ref.type_id.split('__')[0]] ? ['Ligand','Receptor'] : [];
  const method=(card.fields || []).find(f=>f.key==='method')?.value || context?.method;
  const description=(card.fields || []).find(f=>f.key==='description')?.value;
  return <section className="xe-card-section xe-relationship-context"><dl>
    {card.endpoints.map((e,i)=><div className="kg-card-field" key={e.ref.id}><dt>{cccRoles[i] || panelPolicy.endpoint_labels?.[e.ref.type_id] || e.role || panelPolicy.context.endpoint_fallback_labels[i]}</dt><dd>{endpointName(card,e)}{panelPolicy.context.show_public_accessions && endpointName(card,e)!==(e.display_id || e.ref.id) && <small>{e.display_id || e.ref.id}</small>}</dd></div>)}
    {compact && method && <div className="kg-card-field"><dt>{panelPolicy.context.method_label}</dt><dd>{method}</dd></div>}
    {compact && !cccRoles.length && (context?.data || description) && <div className="kg-card-field"><dt>Data</dt><dd>{context?.data || description}</dd></div>}
  </dl></section>;
}

function ConditionEvidenceSummary({card,schema,component}) {
  const panelPolicy = usePanelSchema();
  const view = component.view;
  const registry = schema.tables;
  const cell = card.endpoints?.find(e => ['Cell','anatomical_structure'].includes(e.ref.type_id));
  const cellName = cell ? endpointName(card,cell) : 'Selected cell type';
  const tables = useMemo(() => {
    const result = [];
    for (const group of conditionGroups(component,card,panelPolicy)) {
      for (const preset of currentPresets(group.presets,panelPolicy)) {
        const source = card.tables.find(table => table.id === preset.table_id);
        const context = contextFilters({...component,view:{...view,context_filters:preset.context_filters ?? view.context_filters}},card);
        if (!source || !context) continue;
        const fields = source.all_fields || registry?.[source.id]?.all_fields || [];
        const labels = {...view.field_labels,...panelPolicy.field_labels,...preset.field_labels};
        const fieldSpecs = {...source.field_specs};
        for (const [key,label] of Object.entries(labels)) fieldSpecs[key] = {...fieldSpecs[key],label,short_label:label,show_unit:false};
        result.push({key:`${group.id}:${preset.id}`, table:{...source,
          title:(preset.title || group.title).replace('{cell}',cellName), methodLabel:preset.method_label || preset.method,
          comparison:preset.comparison, columns:preset.columns, presets:undefined,
          default_filters:Object.fromEntries(Object.entries(preset.default_filters || view.default_filters || {status:'all'})
            .filter(([key]) => component.legacy || source.filters.includes(key))),
          fixed_filters:{...preset.fixed_filters,...context}, pipeline_links:preset.pipeline_links,
          request_fields:preset.request_all_fields || (component.legacy && preset.table_id === 'ruv_condition_summary') ? fields
            : [...new Set([...preset.columns,'data_source','data_source_url','data_version','license','license_url'])].filter(key => fields.includes(key)),
          field_specs:fieldSpecs,
        }});
      }
    }
    return result;
  }, [card, cellName, component, panelPolicy, registry, view]);
  const emptyMessage = card.evidence_state === 'temporarily_unavailable' ? view.unavailable_message || 'These records are temporarily unavailable.'
    : tables.length ? undefined : view.unlinked_message;
  return <div className="xe-expression-evidence-summary">
    <RelationshipContext card={card}/>
    <EvidenceTables card={card} schema={schema} tables={tables} emptyMessage={emptyMessage}/>
  </div>;
}

function ExpandedDetails({ card, schema }) {
  const panelPolicy=usePanelSchema();
  const tabs=panelTabs(card,schema);
  const cccTab=tabs.find(t=>t.table && panelPolicy.tables[t.id]?.visualization==='ccc_dot_matrix');
  const cccState=useCccContexts(card,cccTab?.table,schema);
  const [tab, setTab] = useState(cccTab?.id || 'record');
  const selected=tabs.find(t=>t.id===tab);
  const active = selected?.id || 'record';
  const sections = active === 'record' ? expandedSections(card, panelPolicy) : [];
  const hasVariantDetails = card.widget === 'variant' || card.production_design === 'Variant';
  const evidenceTables = selected?.component
    ? selected.component.table_ids.map(id => card.tables.find(table => table.id === id)).filter(Boolean)
    : selected ? [selected.table] : [];
  return <>
    <nav className="xe-card-tabs" aria-label="Record views">
      <div className="xe-tab-list">
        {[{id:'record',title:'Complete record'}, ...tabs].map(view => <button type="button" key={view.id}
          aria-current={active === view.id ? 'page' : undefined} onClick={() => setTab(view.id)}>{view.title}</button>)}
      </div>
    </nav>
    <GraphInfoPanelBody key={active}>
    <div className={`xe-expanded-details ${active === 'record' ? 'xe-record-view' : 'xe-table-view'}`}>
    <div className="xe-card-body" style={{'--panel-columns':panelPolicy.expanded_layout.columns,'--panel-narrow-columns':panelPolicy.expanded_layout.narrow_columns,'--panel-gap':`${panelPolicy.expanded_layout.gap_px}px`}}>
      {cccTab && <section className="xe-card-section xe-ccc-overview">
        <h3>Overall description</h3>
        <CccSummary state={cccState} interaction={card.object_title ||
          (card.endpoints || []).map(endpoint=>endpointName(card,endpoint)).join(' → ') || 'This ligand–receptor pair'}/>
      </section>}
      {active === 'record' && <>
        <RelationshipContext card={card}/>
        {sections.map((section,i)=><section className="xe-card-section" data-prose={section.prose || undefined} key={i}><h3>{section.title}</h3><dl><RecordFields fields={section.fields} specs={card.field_specs}/></dl></section>)}
        {hasVariantDetails && <section className="xe-card-section"><h3>Frequency</h3>{card.frequencies?.length ? <><ProductionFrequencies card={card}/><TableDownloads card={card} table={{id:"population_frequencies",...schema.tables?.population_frequencies}} schema={schema} records={card.frequencies}/></> : <p className="xe-empty">Not recorded</p>}{card.consequences?.length>0 && <><h3>Functional annotations</h3><div className="xe-chips muted">{card.consequences.map(c=><span key={c}>{c}</span>)}</div></>}{card.hgvs && <p className="xe-hgvs">{card.hgvs}</p>}</section>}
        {!sections.length && !card.endpoints?.length && !hasVariantDetails && !cccTab && <p className="xe-small">No details recorded.</p>}
      </>}
      {selected && selected.component?.renderer!=='condition_tables' && <RelationshipContext card={card}/>}
      {cccTab && active === cccTab.id && <CccDotMatrix state={cccState} endpoints={(card.endpoints || []).map(endpoint=>endpointName(card,endpoint))}/>}
      {selected && (selected.component?.renderer === 'condition_tables'
        ? <ConditionEvidenceSummary card={card} schema={schema} component={selected.component}/>
        : !selected.component || ['table','credible_set'].includes(selected.component.renderer)
          ? <EvidenceTables card={card} schema={schema} tables={evidenceTables.map(table => ({key:table.id,table}))}/>
          : <p className="xe-evidence-placeholder">No matching records.</p>)}
    </div>
    </div>
    </GraphInfoPanelBody>
    {active === 'record' && <RecordFooter provenance={card.provenance} schema={schema} className="graph-info-panel-footer"/>}
  </>;
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

export function InspectedInformationPanel({card,schema,request,releaseId,compactOnly=false,loading=false,notice}) {
  const panel=useGraphInfoPanel();
  const panelPolicy=panelSchema(schema);
  const shown=useMemo(()=>recordDesign(presentCard(card,{...schema.display_policy,panel_presentation:panelPolicy,field_labels:{...schema.display_policy?.field_labels,...panelPolicy.field_labels},unit_labels:{...schema.display_policy?.unit_labels,...panelPolicy.unit_labels},field_descriptions:{...schema.display_policy?.field_descriptions,...panelPolicy.field_descriptions}}),card,panelPolicy),[card,schema,panelPolicy]);
  const compact=useMemo(()=>compactSections(shown,objectSections(shown,panelPolicy),panelPolicy),[shown,panelPolicy]);
  const cccTable=!compactOnly && !panel?.large && shown.tables.find(table=>panelPolicy.tables[table.id]?.visualization==='ccc_dot_matrix');
  const cccState=useCccContexts(shown,cccTable,schema,{request,supportingOnly:true});
  const canExpand=!compactOnly && hasExtraRecord(shown,compact,panelTabs(shown,schema),panelPolicy);
  const empty = !compact.sections.length && !shown.endpoints?.length && !cccTable;
  const message = notice || (empty ? loading ? 'Loading details…' : canExpand ? 'Enlarge for complete record' : 'No details recorded.' : null);
  if(releaseId!==schema.release_id || card.release_id!==releaseId) return null;
  return <PanelSchemaContext.Provider value={panelPolicy}>
    <GraphInfoPanelHeader canExpand={canExpand} title={shown.title}>{shown.title}</GraphInfoPanelHeader>
    {panel?.large && !compactOnly ? <EvidenceDetails card={shown} schema={schema} request={request} releaseId={releaseId}/> :
      <DisplayContext.Provider value={{policy:{...schema.display_policy,panel_presentation:panelSchema(schema)},profileKey:`${card.ref.kind}:${card.ref.type_id}`}}>
        <GraphInfoPanelBody loading={loading}>
          <div className="xe-expanded-details xe-compact-details">
            {cccTable && <section className="xe-card-section xe-ccc-hover">
              <h3>Supporting cell pairs</h3><CccSummary state={cccState} compact/>
            </section>}
            <RelationshipContext card={shown} schema={schema} compact/>
            {compact.sections.map((section,i)=><section className="xe-card-section" data-prose={section.prose || undefined} key={i}><h3>{section.title}</h3><dl><RecordFields fields={section.fields} specs={shown.field_specs}/></dl></section>)}
            {message && <p className="graph-info-panel-message" role={loading || notice ? 'status' : undefined}>{message}</p>}
          </div>
        </GraphInfoPanelBody>
        <RecordFooter provenance={shown.provenance} schema={schema} className="graph-info-panel-footer"/>
      </DisplayContext.Provider>}
  </PanelSchemaContext.Provider>;
}
