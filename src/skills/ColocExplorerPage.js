import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AgentSidebar from '../components/AgentSidebar';
import KnowledgeGraph from '../vnext/KnowledgeGraph';
import { request } from '../vnext/api';
import { LocusTracks, PosteriorPlot, VariantMatrix } from '../coloc/ColocPlots';
import { downloadBlob, filterRecords, focusedGraph, formatNumber, h4Color, matrixGroups, membershipLabel, probability, provenance, safeUrl, sourceTsv, validateCatalog, validateDetail } from '../coloc/data';
import '../coloc/coloc.css';

const emptyFilters = { gene: '', dataset: '', tissue: '', qtl_type: '' };
const text = value => value === null || value === undefined || value === '' ? 'Not recorded' : String(value);
const notes = value => (Array.isArray(value) ? value : []).map(item => typeof item === 'string' ? item : item?.message || item?.detail || JSON.stringify(item));

function Overview({ records, selectedId, onSelect }) {
  const groups = useMemo(() => matrixGroups(records), [records]);
  return <div className="coloc-table-scroll"><table className="coloc-overview">
    <caption>Each mark is one recorded analysis. Rows pair a gene with a GWAS signal; columns retain dataset, tissue and QTL type. Marks are ordered by H4.</caption>
    <thead><tr><th scope="col">Gene · GWAS signal</th>{groups.columns.map(([key, record]) => <th scope="col" key={key}><strong>{text(record.dataset)}</strong><span>{text(record.tissue)}</span><small>{text(record.qtl_type)}</small></th>)}</tr></thead>
    <tbody>{groups.rows.map(([key, record]) => <tr key={key}><th scope="row"><strong>{record.gene_name || record.gene_id}</strong><span>{record.gwas_signal_id}</span></th>{groups.columns.map(([column]) => <td key={column}><div className="coloc-marks">{(groups.cells.get(`${key}|${column}`) || []).map(item => <button key={item.id} type="button" className={`coloc-mark ${selectedId === item.id ? 'is-selected' : ''}`}
      style={{ backgroundColor: h4Color(item.posteriors.h4), color: probability(item.posteriors.h4) > 0.55 ? '#fff' : '#234c49' }}
      onClick={() => onSelect(item.id)} aria-pressed={selectedId === item.id}
      aria-label={`Inspect ${item.gene_name || item.gene_id}, ${item.dataset}, ${item.tissue}, ${item.qtl_type}, QTL signal ${item.qtl_signal_id}, H4 ${formatNumber(item.posteriors.h4)}`}
      title={`QTL signal: ${item.qtl_signal_id}\nH4: ${formatNumber(item.posteriors.h4)}\nSource version: ${text(item.data_version)}`}>
      {probability(item.posteriors.h4) === null ? '—' : `${Math.round(item.posteriors.h4 * 100)}%`}
    </button>)}</div></td>)}</tr>)}</tbody>
  </table></div>;
}

function VariantEvidence({ detail, activeVariant, selectedVariant, onHover, onSelect }) {
  const [search, setSearch] = useState(''), [page, setPage] = useState(0), pageSize = 50;
  const variants = detail.variants.filter(variant => variant.id.toLowerCase().includes(search.trim().toLowerCase()));
  const activeIndex = variants.findIndex(variant => variant.id === selectedVariant);
  const currentPage = activeIndex >= 0 ? Math.floor(activeIndex / pageSize) : Math.min(page, Math.max(0, Math.ceil(variants.length / pageSize) - 1));
  const visible = variants.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  return <section className="coloc-card"><div className="coloc-panel-heading"><div><h3>Variant evidence table</h3><p>Membership, PIP and raw association statistics remain source specific.</p></div><label className="coloc-filter">Find variant<input value={search} onChange={event => { setSearch(event.target.value); setPage(0); }} placeholder="Variant ID" /></label></div>
    <div className="coloc-pagination"><span>{variants.length} matching variants · Page {currentPage + 1} of {Math.max(1, Math.ceil(variants.length / pageSize))}</span><button disabled={!currentPage} onClick={() => { onSelect(null); setPage(currentPage - 1); }}>Previous rows</button><button disabled={(currentPage + 1) * pageSize >= variants.length} onClick={() => { onSelect(null); setPage(currentPage + 1); }}>Next rows</button></div>
    <div className="coloc-table-scroll"><table className="coloc-evidence"><caption>Missing values are shown as “Not recorded”; zero is a recorded value. Effect estimates retain source allele coding without harmonization.</caption><thead><tr><th scope="col">Variant</th><th scope="col">Position</th>{['GWAS', 'QTL'].flatMap(side => ['Membership', 'PIP', 'Nominal P', 'Effect / other allele', 'Slope'].map(label => <th key={`${side}-${label}`} scope="col">{side}<br />{label}</th>))}</tr></thead>
      <tbody>{visible.map(variant => <tr key={variant.id} className={activeVariant === variant.id ? 'is-active' : ''} onMouseEnter={() => onHover(variant.id)} onMouseLeave={() => onHover(null)}><th scope="row"><button onClick={() => onSelect(variant.id)} aria-pressed={selectedVariant === variant.id}>{variant.id}</button></th><td>{variant.chromosome && variant.position ? `${variant.chromosome}:${variant.position}` : 'Not recorded'}</td>
        {['gwas', 'qtl'].map(side => <React.Fragment key={side}><td>{membershipLabel(variant[side], detail.coverage?.[`${side}_complete`])}{(detail.record[`${side}_leads`] || []).includes(variant.id) && <span className="coloc-lead">★ Lead</span>}</td><td>{formatNumber(variant[side]?.pip)}</td><td>{formatNumber(variant[side]?.nominal_p)}</td><td>{variant[side]?.effect_allele || variant[side]?.other_allele ? `${text(variant[side]?.effect_allele)} / ${text(variant[side]?.other_allele)}` : 'Not recorded'}</td><td>{formatNumber(variant[side]?.slope)}</td></React.Fragment>)}
      </tr>)}</tbody></table></div>
    {!variants.length && <p>No returned variants match this search.</p>}
  </section>;
}

function Sources({ detail }) {
  return <section className="coloc-card"><h3>Sources & coverage</h3><div className="coloc-source-list">{(detail.sources || []).map((source, index) => {
    const href = safeUrl(source.url), download = safeUrl(source.download_url, true);
    const graphMembership = source.coverage?.scope === 'recorded_signal_membership';
    const coverageState = graphMembership
      ? (source.coverage.complete === true ? 'All recorded graph rows retrieved' : 'Graph retrieval incomplete or unconfirmed')
      : (source.coverage?.complete === true ? 'Complete recorded credible set' : 'Completeness not confirmed');
    return <article className="coloc-source" key={`${source.label}-${index}`}><div className="coloc-panel-heading"><strong>{source.label || 'Recorded source'}</strong><span className="coloc-badge">{text(source.status)}</span></div>
      {source.coverage && <p>{typeof source.coverage === 'string' ? source.coverage : `Coverage: ${graphMembership ? 'Recorded graph membership' : source.coverage.scope || 'not recorded'} · ${source.coverage.returned ?? 'Unknown'} returned · ${coverageState}`}</p>}
      <div className="coloc-actions">{href && <a href={href} target="_blank" rel="noreferrer">Source ↗</a>}{download && <a href={download} download>Download source data</a>}</div>
      {source.sha256 && <details><summary>SHA-256 checksum</summary><code>{source.sha256}</code></details>}
    </article>;
  })}</div>{!detail.sources?.length && <p>Additional raw-source provenance was not returned.</p>}</section>;
}

export default function ColocExplorerPage() {
  const [catalog, setCatalog] = useState(null), [catalogLoading, setCatalogLoading] = useState(true), [catalogError, setCatalogError] = useState(''), [catalogAttempt, setCatalogAttempt] = useState(0);
  const [filters, setFilters] = useState(emptyFilters), [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null), [detailLoading, setDetailLoading] = useState(false), [detailError, setDetailError] = useState(''), [detailAttempt, setDetailAttempt] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(null), [hoveredVariant, setHoveredVariant] = useState(null);
  useEffect(() => {
    const controller = new AbortController(); let current = true;
    setCatalogLoading(true); setCatalogError('');
    request('/coloc/records', { signal: controller.signal, timeoutMs: 60000 }).then(validateCatalog).then(value => { if (current) setCatalog(value); })
      .catch(error => { if (current && error.name !== 'AbortError') setCatalogError(error.message || 'The coloc catalog could not be loaded.'); })
      .finally(() => { if (current) setCatalogLoading(false); });
    return () => { current = false; controller.abort(); };
  }, [catalogAttempt]);
  useEffect(() => {
    setDetail(null); setDetailError(''); setSelectedVariant(null); setHoveredVariant(null);
    if (!selectedId) { setDetailLoading(false); return undefined; }
    const controller = new AbortController(); let current = true; setDetailLoading(true);
    request(`/coloc/records/${encodeURIComponent(selectedId)}`, { signal: controller.signal, timeoutMs: 60000 }).then(value => validateDetail(value, selectedId)).then(value => { if (current) setDetail(value); })
      .catch(error => { if (current && error.name !== 'AbortError') setDetailError(error.message || 'The selected evidence could not be loaded.'); })
      .finally(() => { if (current) setDetailLoading(false); });
    return () => { current = false; controller.abort(); };
  }, [selectedId, detailAttempt]);
  const records = catalog?.records || [], filtered = useMemo(() => filterRecords(catalog?.records || [], filters), [catalog, filters]);
  const record = records.find(item => item.id === selectedId), currentDetail = detail?.record.id === selectedId ? detail : null;
  const activeVariant = hoveredVariant || selectedVariant;
  const metadata = record ? provenance(currentDetail || { record, coverage: { scope: 'credible_set' } }, catalog) : null;
  const selectRecord = id => { setSelectedId(id); setSelectedVariant(null); setHoveredVariant(null); };
  const onGraphSelection = useCallback(ids => {
    const variantIds = new Set((detail?.variants || []).map(item => item.id));
    const selected = ids.map(id => {
      const node = detail?.graph?.nodes?.find(item => item['~id'] === id);
      return node?.['~properties']?.id || id;
    }).find(id => variantIds.has(id));
    if (selected) setSelectedVariant(selected);
  }, [detail]);
  const completeness = currentDetail?.coverage;
  const coverageNotes = [...notes(currentDetail?.notices), ...notes(completeness?.notes)];
  const active = currentDetail?.variants.find(variant => variant.id === activeVariant);
  const graphView = useMemo(() => focusedGraph(currentDetail, selectedVariant), [currentDetail, selectedVariant]);
  return <div className="coloc-shell"><AgentSidebar activeNav="skills" /><main className="coloc-main"><div className="coloc-content">
    <Link className="coloc-back" to="/skills">← Back to Tools</Link>
    <header className="coloc-header"><div><div className="coloc-eyebrow">T1D · Recorded evidence</div><h1>Coloc Explorer</h1><p>Explore shared genetic signals across GWAS and molecular traits.</p></div><span className="coloc-badge">Browse · Compare · Inspect</span></header>
    <p className="coloc-intro">Start with all recorded analyses, then select a signal pair to inspect posteriors, variants and linked graph evidence.</p>
    <section className="coloc-card" aria-labelledby="coloc-catalog-title">
      <div className="coloc-panel-heading"><div><h2 id="coloc-catalog-title">Recorded colocalizations</h2><p>{catalog ? `${filtered.length} of ${records.length} returned analyses · All H4 values included` : 'Reading the current T1D catalog'}</p></div><button onClick={() => setCatalogAttempt(value => value + 1)} disabled={catalogLoading}>{catalogLoading ? 'Loading catalog…' : 'Refresh catalog'}</button></div>
      {catalogError && <div className="coloc-error" role="alert">{catalogError} <button onClick={() => setCatalogAttempt(value => value + 1)}>Retry catalog</button></div>}
      {catalogLoading && <p role="status" className="coloc-loading">Loading recorded colocalizations…</p>}
      {catalog && <>
        <div className="coloc-filters"><label className="coloc-filter">Gene<input value={filters.gene} placeholder="Search symbol or Ensembl ID" onChange={event => setFilters({ ...filters, gene: event.target.value })} /></label>{[['dataset', 'Dataset'], ['tissue', 'Tissue'], ['qtl_type', 'QTL type']].map(([key, label]) => <label className="coloc-filter" key={key}>{label}<select value={filters[key]} onChange={event => setFilters({ ...filters, [key]: event.target.value })}><option value="">All {label.toLowerCase()}s</option>{[...new Set(records.map(item => item[key]).filter(Boolean))].sort().map(value => <option key={value} value={value}>{value}</option>)}</select></label>)}<button onClick={() => setFilters(emptyFilters)}>Reset filters</button></div>
        <div className="coloc-overview-key"><span>H4</span><span className="coloc-gradient" aria-hidden="true" /><span>0 → 1</span><span>One mark per analysis · Select to inspect</span></div>
        {filtered.length ? <Overview records={filtered} selectedId={selectedId} onSelect={selectRecord} /> : <p className="coloc-empty">{records.length ? 'No recorded analyses match these filters.' : 'No T1D colocalization records were returned by this graph release.'}</p>}
        <div className="coloc-catalog-footer"><span>Graph: {text(catalog.graph_version)} · Retrieved: {text(catalog.checked_at)}</span>{['ADCY3', 'GSDMB'].filter(gene => records.some(item => item.gene_name === gene)).map(gene => <button key={gene} onClick={() => setFilters({ ...emptyFilters, gene })}>Explore {gene}</button>)}</div>
        {catalog.coverage?.complete !== true && <p className="coloc-notice">Catalog retrieval is incomplete or not confirmed complete. The displayed count describes returned analyses only.</p>}{notes(catalog.coverage?.notes).map((note, index) => <p key={index} className="coloc-footnote">{note}</p>)}
      </>}
    </section>
    {!record && <section className="coloc-start"><span aria-hidden="true">◎</span><h2>Select a recorded signal pair</h2><p>The overview remains visible while its evidence loads.</p></section>}
    {record && <section className="coloc-detail" aria-labelledby="coloc-detail-title">
      <div className="coloc-panel-heading"><div><div className="coloc-eyebrow">Selected analysis</div><h2 id="coloc-detail-title">{record.gene_name || record.gene_id} · {text(record.dataset)} · {text(record.tissue)}</h2><p>{text(record.qtl_type)} · {text(record.data_source)} · Version: {text(record.data_version)}</p></div><button onClick={() => selectRecord(null)}>Close details</button></div>
      <div className="coloc-signal-pair"><div><span>GWAS signal</span><strong>{text(record.gwas_signal_id)}</strong></div><div><span>QTL signal</span><strong>{text(record.qtl_signal_id)}</strong></div></div>
      <PosteriorPlot record={record} metadata={metadata} />
      {detailLoading && <div role="status" className="coloc-card coloc-loading">Loading graph and variant evidence for this signal pair…</div>}
      {detailError && <div className="coloc-card coloc-error" role="alert"><strong>Variant and graph evidence could not be loaded.</strong><p>{detailError} Recorded catalog posteriors remain available above.</p><button onClick={() => setDetailAttempt(value => value + 1)}>Retry selected evidence</button></div>}
      {currentDetail && <>
        <div className="coloc-card"><div className="coloc-panel-heading"><h3>Returned evidence</h3><div className="coloc-actions"><button onClick={() => downloadBlob(new Blob([sourceTsv(currentDetail, catalog)], { type: 'text/tab-separated-values;charset=utf-8' }), `coloc-${record.id}-variants.tsv`)}>Download variant TSV</button><button onClick={() => downloadBlob(new Blob([JSON.stringify({ ...currentDetail, export_provenance: metadata }, null, 2)], { type: 'application/json' }), `coloc-${record.id}-evidence.json`)}>Download evidence JSON</button></div></div>
          <div className="coloc-counts">{[['GWAS members', completeness?.gwas_count], ['QTL members', completeness?.qtl_count], ['Observed in both', completeness?.shared_count], ['Returned variants', currentDetail.variants.length]].map(([label, value]) => <div key={label}><strong>{text(value)}</strong><span>{label}</span></div>)}</div>
          {(completeness?.gwas_complete !== true || completeness?.qtl_complete !== true) && <p className="coloc-notice">Membership coverage: GWAS {completeness?.gwas_complete === true ? 'complete recorded set' : 'incomplete or unconfirmed'}; QTL {completeness?.qtl_complete === true ? 'complete recorded set' : 'incomplete or unconfirmed'}. An unobserved variant is not evidence of exclusion.</p>}
          {coverageNotes.map((note, index) => <p className="coloc-footnote" key={index}>{note}</p>)}
        </div>
        <div className="coloc-linked-selection" aria-live="polite">{active ? <><strong>{active.id}</strong><span>GWAS PIP {formatNumber(active.gwas?.pip)} · QTL PIP {formatNumber(active.qtl?.pip)}</span><button onClick={() => { setSelectedVariant(null); setHoveredVariant(null); }}>Clear variant</button></> : <span>Hover or select a variant to link the plots and evidence table.</span>}</div>
        {currentDetail.variants.length > 0 ? <><VariantMatrix key={record.id} detail={currentDetail} metadata={metadata} activeVariant={activeVariant} onHover={setHoveredVariant} onSelect={setSelectedVariant} /><LocusTracks key={`${record.id}-locus`} detail={currentDetail} metadata={metadata} activeVariant={activeVariant} onHover={setHoveredVariant} onSelect={setSelectedVariant} /><VariantEvidence key={`${record.id}-table`} detail={currentDetail} activeVariant={activeVariant} selectedVariant={selectedVariant} onHover={setHoveredVariant} onSelect={setSelectedVariant} /></> : <div className="coloc-card"><h3>Variant statistics unavailable</h3><p>No variant rows were returned for this recorded analysis. This does not imply that its original analysis had no variants.</p></div>}
        <section className="coloc-card"><h3>Linked evidence graph</h3><p>Showing {graphView.graph.nodes.length} of {graphView.total} recorded graph nodes: gene, disease, recorded leads and selected variant. Full returned memberships remain in the table.</p>{graphView.graph.nodes.length > 0 ? <div style={{ height: 430, minHeight: 430 }}><KnowledgeGraph graphData={graphView.graph} coordData={graphView.positions} edgeRoutes={{}} selectable setSelectedNode={onGraphSelection} containerHeight="430px" defaultLegendVisible={false} /></div> : <p className="coloc-empty">Graph evidence was not returned for this record. Recorded posteriors and available variant data remain visible.</p>}{!graphView.selectedRecorded && <p className="coloc-footnote">The selected variant is available in raw statistics but has no recorded node in this graph response.</p>}</section>
        <Sources detail={currentDetail} />
      </>}
    </section>}
  </div></main></div>;
}
