import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AgentSidebar from '../components/AgentSidebar';
import { request } from '../vnext/api';
import { filterRecords, formatNumber, h4Color, matrixGroups, probability, validateCatalog } from '../coloc/data';
import { notes, text } from '../coloc/ColocEvidence';
import '../coloc/coloc.css';

export const FILTER_KEYS = ['gene', 'dataset', 'tissue', 'qtl_type'];
export function catalogSearch(search) {
  const current = new URLSearchParams(search), kept = new URLSearchParams();
  FILTER_KEYS.forEach(key => { if (current.get(key)) kept.set(key, current.get(key)); });
  return kept.toString() ? `?${kept}` : '';
}

function Overview({ records, search, catalog }) {
  const groups = useMemo(() => matrixGroups(records), [records]);
  return <div className="coloc-table-scroll"><table className="coloc-overview">
    <caption>Each mark opens one recorded GWAS–QTL signal pair. Rows retain gene and GWAS signal; columns retain dataset, tissue and QTL type.</caption>
    <thead><tr><th scope="col">Gene · GWAS signal</th>{groups.columns.map(([key, record]) => <th scope="col" key={key}><strong>{text(record.dataset)}</strong><span>{text(record.tissue)}</span><small>{text(record.qtl_type)}</small></th>)}</tr></thead>
    <tbody>{groups.rows.map(([key, record]) => <tr key={key}><th scope="row"><strong>{record.gene_name || record.gene_id}</strong><span>{record.gwas_signal_id}</span></th>{groups.columns.map(([column]) => <td key={column}><div className="coloc-marks">{(groups.cells.get(`${key}|${column}`) || []).map(item => <Link key={item.id} className="coloc-mark"
      style={{ backgroundColor: h4Color(item.posteriors.h4), color: probability(item.posteriors.h4) > 0.55 ? '#fff' : '#234c49' }}
      to={`/coloc-explorer/${encodeURIComponent(item.id)}${search}`}
      state={{ catalogRecord: item, graphVersion: catalog.graph_version, checkedAt: catalog.checked_at }}
      aria-label={`Inspect ${item.gene_name || item.gene_id}, ${item.dataset}, ${item.tissue}, ${item.qtl_type}, QTL signal ${item.qtl_signal_id}, H4 ${formatNumber(item.posteriors.h4)}`}
      title={`GWAS signal: ${item.gwas_signal_id}\nQTL signal: ${item.qtl_signal_id}\nH4: ${formatNumber(item.posteriors.h4)}\nSource version: ${text(item.data_version)}`}>
      {probability(item.posteriors.h4) === null ? '—' : `${Math.round(item.posteriors.h4 * 100)}%`}
    </Link>)}</div></td>)}</tr>)}</tbody>
  </table></div>;
}

export default function ColocExplorerPage() {
  const [catalog, setCatalog] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const search = catalogSearch(searchParams), filters = useMemo(() => Object.fromEntries(FILTER_KEYS.map(key => [key, new URLSearchParams(search).get(key) || ''])), [search]);
  const updateFilters = next => setSearchParams(Object.fromEntries(FILTER_KEYS.filter(key => next[key]).map(key => [key, next[key]])), { replace: true });
  useEffect(() => {
    const controller = new AbortController(); let current = true;
    setLoading(true); setError('');
    request('/coloc/records', { signal: controller.signal, timeoutMs: 60000 }).then(validateCatalog).then(value => { if (current) setCatalog(value); })
      .catch(failure => { if (current && failure.name !== 'AbortError') setError(failure.message || 'The coloc catalog could not be loaded.'); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; controller.abort(); };
  }, [attempt]);
  const records = catalog?.records || [], filtered = useMemo(() => filterRecords(catalog?.records || [], filters), [catalog, filters]);
  return <div className="coloc-shell"><AgentSidebar activeNav="skills" /><main className="coloc-main"><div className="coloc-content">
    <Link className="coloc-back" to="/skills">← Back to Tools</Link>
    <header className="coloc-header"><div><h1>Coloc Explorer <span className="coloc-badge">T1D</span></h1><p>Select a recorded signal pair to inspect its credible sets, shared-signal evidence and source data.</p></div></header>
    <section className="coloc-card" aria-labelledby="coloc-catalog-title">
      <div className="coloc-panel-heading"><div><h2 id="coloc-catalog-title">Recorded colocalizations</h2><p>{catalog ? `${filtered.length} of ${records.length} returned analyses · All H4 values included` : 'Reading the current T1D catalog'}</p></div><button onClick={() => setAttempt(value => value + 1)} disabled={loading}>{loading ? 'Loading catalog…' : 'Refresh catalog'}</button></div>
      {error && <div className="coloc-error" role="alert">{error} <button onClick={() => setAttempt(value => value + 1)}>Retry catalog</button></div>}
      {loading && <p role="status" className="coloc-loading">Loading recorded colocalizations…</p>}
      {catalog && <>
        <div className="coloc-filters"><label className="coloc-filter">Gene<input value={filters.gene} placeholder="Symbol or Ensembl ID" onChange={event => updateFilters({ ...filters, gene: event.target.value })} /></label>{[['dataset', 'Dataset'], ['tissue', 'Tissue'], ['qtl_type', 'QTL type']].map(([key, label]) => <label className="coloc-filter" key={key}>{label}<select value={filters[key]} onChange={event => updateFilters({ ...filters, [key]: event.target.value })}><option value="">All {label.toLowerCase()}s</option>{[...new Set(records.map(item => item[key]).filter(Boolean))].sort().map(value => <option key={value} value={value}>{value}</option>)}</select></label>)}<button onClick={() => updateFilters({})}>Reset filters</button></div>
        <div className="coloc-overview-key"><span>H4</span><span className="coloc-gradient" aria-hidden="true" /><span>0 → 1</span><span>One mark per analysis · Open details</span></div>
        {filtered.length ? <Overview records={filtered} search={search} catalog={catalog} /> : <p className="coloc-empty">{records.length ? 'No recorded analyses match these filters.' : 'No T1D colocalization records were returned by this graph release.'}</p>}
        <div className="coloc-catalog-footer"><span>Graph: {text(catalog.graph_version)} · Retrieved: {text(catalog.checked_at)}</span>{['ADCY3', 'GSDMB'].filter(gene => records.some(item => item.gene_name === gene)).map(gene => <button key={gene} onClick={() => updateFilters({ gene })}>Explore {gene}</button>)}</div>
        {catalog.coverage?.complete !== true && <p className="coloc-notice">Catalog retrieval is incomplete or not confirmed complete. The displayed count describes returned analyses only.</p>}{notes(catalog.coverage?.notes).map((note, index) => <p key={index} className="coloc-footnote">{note}</p>)}
      </>}
    </section>
  </div></main></div>;
}
