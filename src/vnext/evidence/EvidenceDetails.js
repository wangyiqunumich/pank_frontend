// Reused from the source-pinned 1024 demo; network access is supplied by the host.
import React,{createContext,useCallback,useContext,useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {annotationValue} from './sourceAnnotations';
import {fieldLabel} from './presentation';
import './evidenceDetails.css';
import {usePanelSchema,PanelSchemaContext} from './panelSchema';
import {evidencePanelModel} from './panelModel';
import {ProductionValue,RecordFooter,ProductionFrequencies} from './ProductionRecord';
import {GraphInfoPanelBody,GraphInfoPanelHeader,useGraphInfoPanel} from '../GraphInfoPanel';
import {valueText,EvidenceRequestContext} from './api';
import {publicId,displayText} from './displayPolicy';
import {CardValue,cardValueLayout,formatCardNumber} from './CardValue';
import {resourceLink} from './resourceLinks';
import TableDownloads from './TableDownloadControls';
import EvidenceTableCard from './EvidenceTableCard';
import {CccDotMatrix,CccSummary,useCccContexts} from './CccContexts';
export {currentPresets} from './panelModel';

const DisplayContext=createContext(null);
function Datum({value, format, field = '', spec, layout = 'auto', quantity = false, displayReady = false}) {
  const panelPolicy=usePanelSchema();
  const display = useContext(DisplayContext);
  value=annotationValue(displayReady ? value : display.value(field,value,spec));
  if (Array.isArray(value) && value.some(item=>item && typeof item==='object')) return <div className="xe-source-annotations">{value.map((item,i)=><section key={i}><Datum value={item} field={field}/></section>)}</div>;
  if (value && typeof value==='object' && value.row) return <section className="xe-source-annotation"><strong>{display.value('data_source',value.data_source) || 'Source annotations'}</strong><Datum value={value.row}/><RecordFooter provenance={display.provenance(value)} schema={display.schema}/></section>;
  if (value && typeof value === 'object' && !Array.isArray(value)) return <dl className="xe-nested-fields"><RecordFields fields={Object.entries(value)
    .filter(([key])=>!(panelPolicy.source_annotation_hidden_fields || []).includes(key))
    .map(([key,raw])=>({key,label:fieldLabel(key),value:display.value(key,raw),displayReady:true})).filter(item=>item.value!==undefined)} /></dl>;
  const empty = value === undefined || value === null || value === '';
  if (typeof value === 'string' && /^https:\/\//.test(value)) return <a href={value} target="_blank" rel="noreferrer">Source ↗</a>;
  return <span className={empty ? 'xe-empty' : undefined}><CardValue value={value} layout={layout} format={item => quantity ? (item !== null && item !== '' && typeof item !== 'boolean' && Number.isInteger(Number(item)) ? Number(item).toLocaleString('en-US') : formatCardNumber(item,panelPolicy.layout)) : valueText(item,format)} /></span>;
}

function RecordFields({ fields, specs = {} }) {
  return fields.map(f => <div key={f.key} className="kg-card-field" data-layout={cardValueLayout(f.value,f.layout || specs[f.key]?.layout)}>
    <dt title={f.description || specs[f.key]?.description}>{fieldLabel(f,specs)}</dt><dd><ProductionValue field={f}><Datum value={f.value} format={f.format} field={f.key} spec={specs[f.key]} displayReady={f.displayReady} quantity={(f.kind || specs[f.key]?.kind)==='quantity' && !Number.isInteger(f.value)} layout={f.layout || specs[f.key]?.layout} /></ProductionValue></dd>
  </div>);
}

function EvidenceTable({card, schema, table, tableKey, onState}) {
  const panelPolicy = usePanelSchema();
  const display = useContext(DisplayContext);
  const {policy} = display;
  const request = useContext(EvidenceRequestContext);
  const defaultFilters = useRef(table.default_filters || table.presets?.[0]?.filters || {});
  const [position, setPosition] = useState(() => ({filters: defaultFilters.current, cursors: [null], index: 0}));
  const [result, setResult] = useState(null);
  const [knownSets, setKnownSets] = useState(null);
  const {filters, cursors, index} = position;
  const scopedFilters = useMemo(() => ({...filters, ...table.fixed_filters}), [filters, table.fixed_filters]);

  useEffect(() => {
    const controller = new AbortController();
    request('/table', {ref:card.ref, table_id:table.id, filters:scopedFilters, limit:20, cursor:cursors[index], fields:table.requestFields}, controller.signal)
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
  const shownValue = (row,key) => display.value(key,row[key],table.field_specs[key]);
  const visibleGroups = [...groups].map(([key, group]) => ({...group, key, columns: columns.filter(column => group.rows.some(row => {
    const value = shownValue(row,column);
    return value != null && value !== '' && (!Array.isArray(value) || value.length > 0);
  }))})).filter(group => group.columns.length);
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
    const value = shownValue(row,key);
    if (value === undefined) return <Datum displayReady />;
    if (relatedLinks) {
      const provider = schema.resource_links?.[row.source_name];
      if (key === 'source_name') return <>{provider?.title || value}{provider?.category === 'annotation' && <small className="xe-resource-category">Annotation</small>}</>;
      if (key === 'alt_id') {
        const link = resourceLink(row,card,schema.resource_links);
        return link ? <a href={link.href} target="_blank" rel="noopener noreferrer" title={link.href}>{link.record} ↗</a>
          : <>{value}<small className="xe-resource-category">Direct link unavailable</small></>;
      }
    }
    if (table.comparison === 'disease' && key === 'condition') {
      const reference = shownValue(row,'reference_condition');
      return value && reference ? `${value} vs ${reference}` : 'Comparison not recorded';
    }
    return <Datum value={value} field={key} displayReady quantity={table.field_specs[key]?.kind === 'quantity'} />;
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
  return <EvidenceTableCard card={card} table={table} schema={schema} display={display} filters={scopedFilters} records={hasRows ? records : []}
    recordCount={index === 0 && page?.has_more === false ? records.length : undefined}
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

function PanelSection({title, prose, className = '', children}) {
  return <section className={`xe-card-section ${className}`.trim()} data-prose={prose || undefined}>
    {title && <h3>{title}</h3>}{children}
  </section>;
}

function FieldSections({sections, specs}) {
  return sections.map((section,index) => <PanelSection key={`${section.title}:${index}`} title={section.title} prose={section.prose}>
    <dl><RecordFields fields={section.fields} specs={specs} /></dl>
  </PanelSection>);
}

function RelationshipSection({context, panel, compact = false}) {
  if (!context.endpoints.length) return null;
  return <PanelSection className="xe-relationship-context"><dl>
    {context.endpoints.map(({id,name,label,accession},index) => <div className="kg-card-field" key={`${index}:${id}`}>
      <dt>{label}</dt><dd>{name}{accession && <small>{accession}</small>}</dd>
    </div>)}
    {compact && context.method && <div className="kg-card-field"><dt>{panel.context.method_label}</dt><dd>{context.method}</dd></div>}
    {compact && context.data && <div className="kg-card-field"><dt>Data</dt><dd>{context.data}</dd></div>}
  </dl></PanelSection>;
}

function VariantDetails({card, schema}) {
  const table = {id:'population_frequencies', title:'Population frequencies', columns:['population','allele','frequency'],
    ...schema.tables?.population_frequencies};
  return <PanelSection title="Frequency">
    {card.frequencies?.length ? <>
      <ProductionFrequencies card={card}/>
      <TableDownloads card={card} table={table} schema={schema} records={card.frequencies} localRecords={card.frequencies}/>
    </> : <p className="xe-empty">Not recorded</p>}
    {card.consequences?.length > 0 && <>
      <h3>Functional annotations</h3><div className="xe-chips muted">{card.consequences.map(value => <span key={value}>{value}</span>)}</div>
    </>}
    {card.hgvs && <p className="xe-hgvs">{card.hgvs}</p>}
  </PanelSection>;
}

function PanelBlock({block, model, schema, cccState}) {
  const {card, panel, context, display} = model;
  switch (block.kind) {
    case 'relationship': return <RelationshipSection context={context} panel={panel}/>;
    case 'fields': return <FieldSections sections={block.sections} specs={card.field_specs}/>;
    case 'tables': return <EvidenceTables card={card} schema={schema} tables={block.entries} emptyMessage={block.emptyMessage}/>;
    case 'variant_details': return <VariantDetails card={card} schema={schema}/>;
    case 'ccc_summary': return <PanelSection title="Overall description" className="xe-ccc-overview">
      <CccSummary state={cccState} display={display} interaction={card.object_title || context.endpoints.map(endpoint => endpoint.name).join(' → ') || 'This ligand–receptor pair'}/>
    </PanelSection>;
    case 'ccc_dot_matrix': return <CccDotMatrix state={cccState} display={display} endpoints={context.endpoints.map(endpoint => endpoint.name)}/>;
    default: return null;
  }
}

function ExpandedDetails({model, schema}) {
  const {card, panel, views, defaultView, cccTable} = model;
  const cccState = useCccContexts(card, cccTable, schema);
  const [selected, setSelected] = useState(defaultView);
  const view = views.find(entry => entry.id === selected) || views[0];
  const layout = panel.expanded_layout;
  const hasContent = view.blocks.some(block => block.kind !== 'fields' || block.sections.length);
  return <>
    <nav className="xe-card-tabs" aria-label="Record views">
      <div className="xe-tab-list">
        {views.map(entry => <button type="button" key={entry.id}
          aria-current={view.id === entry.id ? 'page' : undefined} onClick={() => setSelected(entry.id)}>{entry.title}</button>)}
      </div>
    </nav>
    <GraphInfoPanelBody key={view.id}>
      <div className={`xe-expanded-details xe-${view.layout}-view`}>
        <div className="xe-card-body" style={{'--panel-columns':layout.columns,'--panel-narrow-columns':layout.narrow_columns,'--panel-gap':`${layout.gap_px}px`}}>
          {view.blocks.map(block => <PanelBlock key={block.kind} block={block} model={model} schema={schema} cccState={cccState}/>)}
          {!hasContent && <p className="xe-small">No details recorded.</p>}
        </div>
      </div>
    </GraphInfoPanelBody>
    {view.layout === 'record' && <RecordFooter provenance={card.provenance} schema={schema} className="graph-info-panel-footer"/>}
  </>;
}

function EvidencePanelProvider({model, request, children}) {
  return <PanelSchemaContext.Provider value={model.panel}>
    <EvidenceRequestContext.Provider value={request}>
      <DisplayContext.Provider value={model.display}>{children}</DisplayContext.Provider>
    </EvidenceRequestContext.Provider>
  </PanelSchemaContext.Provider>;
}

export default function EvidenceDetails({card, schema, request, releaseId}) {
  const eligible = releaseId && releaseId === schema.release_id && card.release_id === releaseId;
  const model = useMemo(() => eligible ? evidencePanelModel(card,schema) : null, [card,schema,eligible]);
  if (!model) return <p role="status">Detailed evidence is unavailable for this graph version.</p>;
  return <EvidencePanelProvider model={model} request={request}>
    <ExpandedDetails key={JSON.stringify([releaseId,card.ref])} model={model} schema={schema}/>
  </EvidencePanelProvider>;
}

export function InspectedInformationPanel({card, schema, request, releaseId, compactOnly = false, loading = false, notice}) {
  const surface = useGraphInfoPanel();
  const model = useMemo(() => evidencePanelModel(card,schema), [card,schema]);
  const {card:shown, panel, compact, context, display} = model;
  const expanded = surface?.large && !compactOnly;
  const cccTable = !compactOnly && !surface?.large ? model.cccTable : null;
  const cccState = useCccContexts(shown,cccTable,schema,{request,supportingOnly:true});
  const canExpand = !compactOnly && model.canExpand;
  const empty = !compact.sections.length && !context.endpoints.length && !cccTable;
  const message = notice || (empty ? loading ? 'Loading details…' : canExpand ? 'Enlarge for complete record' : 'No details recorded.' : null);
  if (releaseId !== schema.release_id || card.release_id !== releaseId) return null;
  return <EvidencePanelProvider model={model} request={request}>
    <GraphInfoPanelHeader canExpand={canExpand} title={shown.title}>{shown.title}</GraphInfoPanelHeader>
    {expanded ? <ExpandedDetails key={JSON.stringify([releaseId,card.ref])} model={model} schema={schema}/> : <>
      <GraphInfoPanelBody loading={loading}>
        <div className="xe-expanded-details xe-compact-details">
          {cccTable && <PanelSection title="Supporting cell pairs" className="xe-ccc-hover"><CccSummary state={cccState} display={display} compact/></PanelSection>}
          <RelationshipSection context={context} panel={panel} compact/>
          <FieldSections sections={compact.sections} specs={shown.field_specs}/>
          {message && <p className="graph-info-panel-message" role={loading || notice ? 'status' : undefined}>{message}</p>}
        </div>
      </GraphInfoPanelBody>
      <RecordFooter provenance={shown.provenance} schema={schema} className="graph-info-panel-footer"/>
    </>}
  </EvidencePanelProvider>;
}
