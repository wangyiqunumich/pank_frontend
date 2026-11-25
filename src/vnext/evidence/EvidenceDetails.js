// Reused from the source-pinned 1024 demo; network access is supplied by the host.
import React,{createContext,useCallback,useContext,useEffect,useId,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {annotationValue} from './sourceAnnotations';
import {fieldLabel} from './presentation';
import './evidenceDetails.css';
import './expandedEvidence.css';
import {usePanelSchema,PanelSchemaContext} from './panelSchema';
import {evidencePanelModel} from './panelModel';
import {ProductionValue,RecordFooter,ProductionFrequencies} from './ProductionRecord';
import {GraphInfoPanelBody,GraphInfoPanelHeader,useGraphInfoPanel} from '../GraphInfoPanel';
import {valueText,EvidenceRequestContext} from './api';
import {publicId,displayText} from './displayPolicy';
import {CardValue,cardValueLayout,formatCardNumber} from './CardValue';
import {resourceLink} from './resourceLinks';
import TableDownloads from './TableDownloadControls';
import {sourcePageUrl} from './tableDownloads';
import EvidenceTableCard from './EvidenceTableCard';
import {CccDotMatrix,CccSummary,useCccContexts} from './CccContexts';
export {currentPresets} from './panelModel';

const DisplayContext=createContext(null);
const isSourceAnnotation = value => value && typeof value === 'object' && value.row;

function SourceAnnotations({values, field}) {
  const display = useContext(DisplayContext);
  const entries = new Map();
  values.forEach((item,index) => {
    if (!isSourceAnnotation(item)) {
      entries.set(index,{rows:[item]});
      return;
    }
    const {data_source,data_version,data_source_url,license,license_url} = item;
    const provenance = display.provenance({data_source,data_version,data_source_url,license,license_url});
    const key = JSON.stringify(provenance);
    if (!entries.has(key)) entries.set(key,{provenance,rows:[]});
    entries.get(key).rows.push(item.row);
  });
  return <div className="xe-source-annotations">{[...entries].map(([key,{provenance,rows}]) => <section key={key} className="xe-source-annotation">
    {provenance && <h4>{provenance.data_source || 'Source annotations'}</h4>}
    {rows.map((row,index) => <div className="xe-source-annotation-record" key={index}><Datum value={row} field={field}/></div>)}
    {provenance && <RecordFooter provenance={{...provenance,data_source:undefined}} schema={display.schema}/>}
  </section>)}</div>;
}

function Datum({value, format, field = '', spec, layout = 'auto', quantity = false, displayReady = false}) {
  const panelPolicy=usePanelSchema();
  const display = useContext(DisplayContext);
  value=annotationValue(displayReady ? value : display.value(field,value,spec));
  if (Array.isArray(value) && value.some(isSourceAnnotation)) return <SourceAnnotations values={value} field={field}/>;
  if (Array.isArray(value) && value.some(item=>item && typeof item==='object')) return <div className="xe-source-annotations">
    {value.map((item,index) => <section key={index}><Datum value={item} field={field}/></section>)}
  </div>;
  if (isSourceAnnotation(value)) return <SourceAnnotations values={[value]} field={field}/>;
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

function EvidenceTableViewport({label, children}) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const scroller = ref.current;
    const update = () => {
      const moreColumns = scroller.scrollWidth - scroller.clientWidth - scroller.scrollLeft > 1;
      scroller.parentElement.toggleAttribute('data-more-columns', moreColumns);
    };
    update();
    scroller.addEventListener('scroll', update, {passive:true});
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(update) : null;
    observer?.observe(scroller);
    observer?.observe(scroller.firstElementChild);
    return () => {
      scroller.removeEventListener('scroll', update);
      observer?.disconnect();
    };
  }, []);
  return <div className="xe-evidence-table-frame">
    <div ref={ref} className="xe-table-scroll" tabIndex={0} role="region" aria-label={label}>{children}</div>
  </div>;
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
  const resultPage = result?.page;
  const resultError = result?.error || (resultPage?.state && !['available','no_records'].includes(resultPage.state)
    ? resultPage.message || 'These records are temporarily unavailable.' : null);
  const error = busy ? null : resultError;
  const records = !resultError && Array.isArray(page?.records) ? page.records : [];
  const relatedLinks = table.component === 'node_alt_id' || table.id === 'accessions';
  // Membership rows can share every other field while referring to different files.
  const requestedColumns = table.id === 'metadata_sample_source' ? new Set([...table.columns,'data_version']) : table.columns;
  const columns = [...requestedColumns].filter(key => !(table.comparison === 'disease' && key === 'reference_condition')
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
  const canChangeSelection = index > 0 || hasSetPicker || table.presets?.length > 1;
  const hasRows = visibleGroups.length > 0;
  const status = hasRows || resultError || canChangeSelection ? 'visible' : busy ? 'loading' : 'empty';
  useLayoutEffect(() => { onState(tableKey, status); }, [tableKey, status, onState]);
  if (status !== 'visible') return null;

  const selectFilters = next => setPosition({filters: next, cursors: [null], index: 0});
  const setIds = Object.keys(sets);
  const setName = (id, set = {}) => {
    const index = setIds.indexOf(id);
    const name = index < 0 ? 'Credible set' : `Set ${index + 1}`;
    const gene = publicId(set.gene_id,policy);
    return gene ? `${name} (${gene})` : name;
  };
  const groupType = group => {
    const role = String(group.role).toUpperCase();
    const type = displayText(sets[group.set]?.qtl_type || sets[group.set]?.signal_role,policy);
    return type && String(type).toLowerCase() !== role.toLowerCase() ? `${type} (${role})` : role;
  };
  const describedSets = Object.entries(page?.credible_sets || {})
    .filter(([id]) => !filters.credible_set_id || filters.credible_set_id === id);
  const describedGroups = new Map(describedSets.map(([id]) => [id, visibleGroups.filter(group => group.set === id)]));
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
      <option value="">All linked sets</option>{Object.entries(sets).map(([id, data]) => <option key={id} value={id}>
        {[setName(id,data), displayText(data.signal_role || data.qtl_type,policy)].filter(Boolean).join(', ')}
      </option>)}
    </select></label>}
    {describedSets.length > 0 && <div className="xe-set-descriptions">{describedSets.map(([id, data]) => {
      const matching = describedGroups.get(id);
      const groupRole = matching.length === 1 ? String(matching[0].role || '').toUpperCase() : '';
      const sourceRole = String(displayText(data.signal_role,policy) || '');
      const signalType = String(displayText(data.qtl_type,policy) || '');
      const roles = [groupRole, sourceRole].filter((role,index) => role
        && role.toLowerCase() !== signalType.toLowerCase()
        && (index === 0 || role.toLowerCase() !== groupRole.toLowerCase()));
      return <section key={id}>
        <h4>{setName(id,data)}</h4>
        <dl>
          {['tissue_name','qtl_type','method','n_members','purity'].filter(key => data[key] != null).map(key =>
            <div className="kg-card-field" key={key}><dt>{key === 'qtl_type' ? 'Signal type' : fieldLabel(key, table.field_specs)}</dt><dd><Datum value={data[key]} field={key}/></dd></div>)}
          {roles.length > 0 && <div className="kg-card-field"><dt>Role</dt><dd>{roles.join(', ')}</dd></div>}
        </dl>
      </section>;
    })}</div>}
  </>;
  return <EvidenceTableCard card={card} table={table} schema={schema} display={display} filters={scopedFilters} records={hasRows ? records : []}
    recordCount={index === 0 && page?.has_more === false ? records.length : undefined}
    sets={page?.credible_sets} pageIndex={index} hasNext={Boolean(page?.has_more && page.next_cursor && !cursors.slice(0, index + 1).includes(page.next_cursor))}
    onPrevious={() => setPosition(previous => ({...previous, index: previous.index - 1}))}
    onNext={() => setPosition(previous => ({...previous, cursors: [...previous.cursors.slice(0, index + 1), page.next_cursor], index: index + 1}))}
    onRetry={() => setPosition(previous => ({...previous}))}
    versionsInRows={visibleGroups.some(group => group.columns.includes('data_version'))}
    busy={busy} error={error} controls={controls}>
    {visibleGroups.map(group => <section key={group.key} className="xe-evidence-record-group">
      {group.role && describedGroups.get(group.set)?.length !== 1 && <h4>
        {setName(group.set,sets[group.set])} <span className="xe-small">{groupType(group)}</span>
      </h4>}
      <EvidenceTableViewport label={table.title}>
        <table aria-label={table.title} className={group.columns.length === 1 && group.columns[0] === 'source_records' ? 'xe-annotation-table' : undefined}>
          <thead><tr>{group.columns.map(key => <th key={key} scope="col" title={table.field_specs[key]?.description}
            data-quantity={table.field_specs[key]?.kind === 'quantity' || undefined}>
            {key === 'data_version' ? 'Source version' : table.comparison === 'disease' && key === 'condition' ? 'Comparison' : (relatedLinks ? {source_name:'Database',alt_id:'Open record'}[key] : null) || fieldLabel(key,table.field_specs)}
          </th>)}</tr></thead>
          <tbody>{group.rows.map((row,i) => <tr key={row.record_id || row.relationship_id || i}>
            {group.columns.map(key => <td key={key} data-quantity={table.field_specs[key]?.kind === 'quantity' || undefined}>{renderCell(row,key)}</td>)}
          </tr>)}</tbody>
        </table>
      </EvidenceTableViewport>
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
    {!visible && <p role="status" className="xe-evidence-placeholder" data-loading={loading || undefined}>{loading ? 'Loading records…' : emptyMessage}</p>}
  </>;
}

function PanelSection({title, prose, className = '', children}) {
  return <section className={`xe-card-section ${className}`.trim()} data-prose={prose || undefined}>
    {title && <h3>{title}</h3>}{children}
  </section>;
}

function FieldSections({sections, specs, paired = false, hideTitle = false}) {
  return sections.map((section,index) => <PanelSection key={`${section.title}:${index}`} title={hideTitle ? undefined : section.title} prose={section.prose}>
    {paired ? <PairedFieldRows fields={section.fields} specs={specs}/> :
      <dl className="xe-field-list"><RecordFields fields={section.fields} specs={specs}/></dl>}
  </PanelSection>);
}

function PairedFieldRows({fields, specs = {}}) {
  const rows = [];
  for (const field of fields) {
    const layout = cardValueLayout(field.value, field.layout || specs[field.key]?.layout);
    const singleToken = Array.isArray(field.value) && field.value.length === 1 && typeof field.value[0] !== 'object';
    const wide = layout === 'prose' || (layout === 'tokens' && !singleToken);
    const previous = rows[rows.length - 1];
    if (!wide && previous && !previous.wide && previous.fields.length === 1) previous.fields.push(field);
    else rows.push({wide, fields:[field]});
  }
  return <div className="xe-field-rows">
    {rows.map(row => <dl className="xe-field-row" data-paired={!row.wide || undefined} key={row.fields[0].key}>
      <RecordFields fields={row.fields} specs={specs}/>
    </dl>)}
  </div>;
}

function RelationshipSection({context, panel, compact = false, cccRows = []}) {
  if (!context.endpoints.length) return null;
  return <PanelSection className="xe-relationship-context"><dl>
    {context.endpoints.map(({id,name,label,accession},index) => {
      const cellNames = [...new Set(cccRows.map(row => index === 0
        ? row.sender_cell_name || row.source : row.receiver_cell_name || row.target).filter(Boolean))];
      return <div className="kg-card-field" key={`${index}:${id}`}>
        <dt>{label}</dt><dd>{name}{accession && <small>{accession}</small>}
          {cellNames.length > 0 && <small>{index === 0 ? 'Sender' : 'Receiver'} · {cellNames.join(', ')}</small>}
        </dd>
      </div>;
    })}
    {compact && context.method && <div className="kg-card-field"><dt>{panel.context.method_label}</dt><dd>{context.method}</dd></div>}
    {compact && context.data && <div className="kg-card-field"><dt>Data</dt><dd>{context.data}</dd></div>}
  </dl></PanelSection>;
}

function VariantDetails({card, schema, panel}) {
  const table = {id:'population_frequencies', title:'Population frequencies', columns:['population','allele','frequency'],
    ...schema.tables?.population_frequencies};
  const hasFrequencies = Boolean(card.frequencies?.length);
  const footerSourceHref = panel.footer.fields.some(field => field.kind === 'source_link')
    ? sourcePageUrl({href:card.provenance?.data_source_url},schema) : undefined;
  return <PanelSection title={hasFrequencies ? undefined : 'Frequency'} className="xe-variant-details">
    {hasFrequencies ? <TableDownloads title="Frequency" card={card} table={table} schema={schema} records={card.frequencies} localRecords={card.frequencies}
      footerSourceHref={footerSourceHref}>
      <ProductionFrequencies card={card}/>
    </TableDownloads> : <p className="xe-empty">Not recorded</p>}
    {card.consequences?.length > 0 && <>
      <h3>Functional annotations</h3><div className="xe-chips muted">{card.consequences.map(value => <span key={value}>{value}</span>)}</div>
    </>}
    {card.hgvs && <p className="xe-hgvs">{card.hgvs}</p>}
  </PanelSection>;
}

function supportedCellRows(card, state) {
  return card.ccc_context ? [card.ccc_context]
    : (state?.records || []).filter(row => row.selection_status === 'supporting');
}

function PanelBlock({block, model, schema, cccState, dense}) {
  const {card, panel, context, display} = model;
  switch (block.kind) {
    case 'relationship': return <RelationshipSection context={context} panel={panel} cccRows={supportedCellRows(card,cccState)}/>;
    case 'fields': return <FieldSections sections={block.sections} specs={card.field_specs} paired={dense}/>;
    case 'tables': return <EvidenceTables card={card} schema={schema} tables={block.entries} emptyMessage={block.emptyMessage}/>;
    case 'variant_details': return <>
      <VariantDetails card={card} schema={schema} panel={panel}/>
      <FieldSections sections={block.sections} specs={card.field_specs} paired={dense}/>
    </>;
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
  const [focused, setFocused] = useState(null);
  const id = useId();
  const singleView = views.length === 1;
  const view = views.find(entry => entry.id === selected) || views[0];
  const viewIndex = views.indexOf(view);
  const layout = panel.expanded_layout;
  const hasContent = view.blocks.some(block => block.kind !== 'fields' || block.sections.length);
  const dense = view.blocks.some(block => block.kind === 'fields' && block.sections.some(section => section.fields.length >= 9));
  const moveTabFocus = event => {
    const tabs = [...event.currentTarget.querySelectorAll('[role="tab"]')];
    const index = tabs.indexOf(event.target);
    if (index === -1) return;
    const next = {
      ArrowLeft: (index - 1 + tabs.length) % tabs.length,
      ArrowRight: (index + 1) % tabs.length,
      Home: 0,
      End: tabs.length - 1,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    // Keep focus navigation separate from activation, which may request data.
    tabs[next].focus();
  };
  return <>
    {!singleView && <nav className="xe-card-tabs" aria-label="Record views">
      <div className="xe-tab-list" role="tablist" aria-label="Record views" onKeyDown={moveTabFocus}
        onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(null); }}>
        {views.map((entry,index) => <button type="button" role="tab" key={entry.id} id={`${id}-tab-${index}`}
          aria-controls={`${id}-view-${index}`} aria-selected={view.id === entry.id}
          tabIndex={(focused || view.id) === entry.id ? 0 : -1}
          onFocus={() => setFocused(entry.id)} onClick={() => setSelected(entry.id)}>{entry.title}</button>)}
      </div>
    </nav>}
    <GraphInfoPanelBody key={view.id} role={singleView ? 'region' : 'tabpanel'} tabIndex={0}
      data-single-view={singleView || undefined} aria-label={singleView ? view.title : undefined}
      id={`${id}-view-${viewIndex}`} aria-labelledby={singleView ? undefined : `${id}-tab-${viewIndex}`}>
      <div className={`xe-expanded-details xe-${view.layout}-view`} data-dense={dense || undefined}>
        <div className="xe-card-body" style={{'--panel-columns':layout.columns,'--panel-narrow-columns':layout.narrow_columns,'--panel-gap':`${layout.gap_px}px`}}>
          {view.blocks.map(block => <PanelBlock key={block.kind} block={block} model={model} schema={schema} cccState={cccState} dense={dense}/>)}
          {!hasContent && <p className="xe-evidence-placeholder">No details recorded.</p>}
        </div>
      </div>
    </GraphInfoPanelBody>
    {view.layout === 'record' && <RecordFooter provenance={card.provenance} schema={schema} className="graph-info-panel-footer" chips/>}
    {views.map((entry,index) => entry !== view && <div key={entry.id} hidden role="tabpanel"
      id={`${id}-view-${index}`} aria-labelledby={`${id}-tab-${index}`}/>)}
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

export function InspectedInformationPanel({card, schema, request, releaseId, compactOnly = false, loading = false, notice, onReady}) {
  const surface = useGraphInfoPanel();
  const model = useMemo(() => evidencePanelModel(card,schema), [card,schema]);
  const {card:shown, panel, compact, context, display} = model;
  const expanded = surface?.large && !compactOnly;
  const cccTable = !compactOnly && !surface?.large ? model.cccTable : null;
  const cccState = useCccContexts(shown,cccTable,schema,{request,supportingOnly:true});
  const canExpand = !compactOnly && model.canExpand;
  const empty = !compact.sections.length && !context.endpoints.length && !cccTable;
  const message = notice || (empty ? loading ? 'Loading details…' : canExpand ? 'Enlarge for complete record' : 'No details recorded.' : null);
  const ready = releaseId === schema.release_id && card.release_id === releaseId && !loading;
  const type = shown.production_design === 'Variant' ? 'Sequence variant'
    : shown.subtitle || schema.profiles?.[`${shown.ref.kind}:${shown.ref.type_id}`]?.title;
  const recordType = type?.toLowerCase() === shown.title?.toLowerCase() ? undefined : type;
  const hideCompactTitle = compact.sections.length === 1 && compact.sections[0].title === type;
  useLayoutEffect(() => {
    if (ready) onReady?.();
  }, [ready,onReady]);
  if (releaseId !== schema.release_id || card.release_id !== releaseId) return null;
  return <EvidencePanelProvider model={model} request={request}>
    <GraphInfoPanelHeader canExpand={canExpand} title={shown.title} record recordType={recordType}>{shown.title}</GraphInfoPanelHeader>
    {expanded ? <ExpandedDetails key={JSON.stringify([releaseId,card.ref])} model={model} schema={schema}/> : <>
      <GraphInfoPanelBody loading={loading}>
        <div className="xe-expanded-details xe-compact-details">
          {cccTable && <PanelSection title="Supporting cell pairs" className="xe-ccc-hover"><CccSummary state={cccState} display={display} compact/></PanelSection>}
          <RelationshipSection context={context} panel={panel} compact cccRows={supportedCellRows(shown,cccState)}/>
          <FieldSections sections={compact.sections} specs={shown.field_specs} hideTitle={hideCompactTitle}/>
          {message && <p className="graph-info-panel-message" role={loading || notice ? 'status' : undefined}>{message}</p>}
        </div>
      </GraphInfoPanelBody>
      <RecordFooter provenance={shown.provenance} schema={schema} className="graph-info-panel-footer" chips/>
    </>}
  </EvidencePanelProvider>;
}
