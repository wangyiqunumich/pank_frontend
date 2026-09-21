import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import AgentSidebar from '../components/AgentSidebar';
import KnowledgeGraph from '../vnext/KnowledgeGraph';
import ColocSummary from '../vnext/ColocSummary';
import { request } from '../vnext/api';
import { LocusTracks, PosteriorPlot, VariantMatrix } from '../coloc/ColocPlots';
import { notes, Sources, text, VariantEvidence } from '../coloc/ColocEvidence';
import { downloadBlob, focusedGraph, formatNumber, provenance, sourceTsv, validateDetail } from '../coloc/data';
import { catalogSearch } from './ColocExplorerPage';
import '../coloc/coloc.css';

const TABS = [['locus', 'Locus tracks'], ['membership', 'Variant membership'], ['table', 'Evidence table'], ['sources', 'Sources & coverage']];

export default function ColocDetailPage() {
  const { recordId } = useParams(), location = useLocation();
  const [detail, setDetail] = useState(null), [detailLoading, setDetailLoading] = useState(true), [detailError, setDetailError] = useState(''), [attempt, setAttempt] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(null), [hoveredVariant, setHoveredVariant] = useState(null), [activeTab, setActiveTab] = useState('locus');
  const tabRefs = useRef([]);
  useEffect(() => {
    const controller = new AbortController(); let current = true;
    setDetail(null); setDetailError(''); setDetailLoading(true); setSelectedVariant(null); setHoveredVariant(null); setActiveTab('locus');
    request(`/coloc/records/${encodeURIComponent(recordId)}`, { signal: controller.signal, timeoutMs: 60000 }).then(value => validateDetail(value, recordId)).then(value => { if (current) setDetail(value); })
      .catch(error => { if (current && error.name !== 'AbortError') setDetailError(error.message || 'The selected evidence could not be loaded.'); })
      .finally(() => { if (current) setDetailLoading(false); });
    return () => { current = false; controller.abort(); };
  }, [recordId, attempt]);
  const currentDetail = detail?.record.id === recordId ? detail : null;
  const initialRecord = location.state?.catalogRecord?.id === recordId ? location.state.catalogRecord : null;
  const record = currentDetail?.record || initialRecord;
  const catalogContext = { graph_version: location.state?.graphVersion, checked_at: location.state?.checkedAt };
  const metadata = record ? provenance(currentDetail || { record, coverage: { scope: 'credible_set' } }, catalogContext) : null;
  const activeVariant = hoveredVariant || selectedVariant;
  const active = currentDetail?.variants.find(variant => variant.id === activeVariant);
  const completeness = currentDetail?.coverage;
  const graphView = useMemo(() => focusedGraph(currentDetail, selectedVariant), [currentDetail, selectedVariant]);
  const onGraphSelection = useCallback(ids => {
    const variantIds = new Set((detail?.variants || []).map(item => item.id));
    const selected = ids.map(id => detail?.graph?.nodes?.find(item => item['~id'] === id)?.['~properties']?.id || id).find(id => variantIds.has(id));
    if (selected) setSelectedVariant(selected);
  }, [detail]);
  const keyboardTab = (event, index) => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % TABS.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + TABS.length) % TABS.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = TABS.length - 1;
    else return;
    event.preventDefault(); setActiveTab(TABS[next][0]); tabRefs.current[next]?.focus();
  };
  const unavailable = <div className="coloc-card"><h3>Variant statistics unavailable</h3><p>No variant rows were returned for this recorded analysis. This does not imply that its original analysis had no variants.</p></div>;
  return <div className="coloc-shell"><AgentSidebar activeNav="skills" /><main className="coloc-main"><div className="coloc-content coloc-results">
    <nav className="coloc-breadcrumb" aria-label="Breadcrumb"><Link to="/skills">Tools</Link><span aria-hidden="true">/</span><Link to={`/coloc-explorer${catalogSearch(location.search)}`}>Coloc Explorer</Link><span aria-hidden="true">/</span><span aria-current="page">Signal pair</span></nav>
    <header className="coloc-header"><div><h1>{record ? `${record.gene_name || record.gene_id} colocalization` : 'Colocalization results'}</h1><p>{record ? `${text(record.dataset)} · ${text(record.tissue)} · ${text(record.qtl_type)} · ${text(record.data_version)}` : 'Reading the selected GWAS–QTL signal pair.'}</p></div><Link className="coloc-back" to={`/coloc-explorer${catalogSearch(location.search)}`}>← Back to analyses</Link></header>
    {record && <div className="coloc-signal-pair"><div><span>GWAS signal / credible set</span><strong>{text(record.gwas_signal_id)}</strong><small>{text(record.gwas_credible_set_id)}</small></div><div><span>QTL signal / credible set</span><strong>{text(record.qtl_signal_id)}</strong><small>{text(record.data_source)}</small></div></div>}
    {(detailLoading || currentDetail) && <ColocSummary detail={currentDetail} loading={detailLoading} />}
    {detailError && <div className="coloc-card coloc-error" role="alert"><strong>Evidence could not be loaded.</strong><p>{detailError}{initialRecord ? ' Recorded catalog posteriors remain available below.' : ''}</p><button onClick={() => setAttempt(value => value + 1)}>Retry selected evidence</button></div>}
    {detailLoading && !record && <div role="status" className="coloc-card coloc-loading">Loading this signal pair and its graph and variant evidence…</div>}
    {record && <div className="coloc-summary-grid"><PosteriorPlot record={record} metadata={metadata} />
      <section className="coloc-card coloc-graph-card"><h3>Linked evidence graph</h3>{detailLoading ? <p role="status" className="coloc-loading">Loading graph and variant evidence for this signal pair…</p> : currentDetail ? <>
        <p>Showing {graphView.graph.nodes.length} of {graphView.total} recorded nodes: gene, disease, leads and selected variant. Full returned membership remains in the table.</p>
        {graphView.graph.nodes.length ? <div className="coloc-graph-frame"><KnowledgeGraph graphData={graphView.graph} coordData={graphView.positions} edgeRoutes={{}} selectable setSelectedNode={onGraphSelection} containerHeight="290px" defaultLegendVisible={false} /></div> : <p className="coloc-empty">Graph evidence was not returned for this record.</p>}
        {!graphView.selectedRecorded && <p className="coloc-footnote">The selected variant has raw statistics but no recorded node in this graph response.</p>}
      </> : <p>Graph evidence could not be loaded. Retry above.</p>}</section>
    </div>}
    {currentDetail && <>
      <div className="coloc-results-toolbar"><div className="coloc-counts">{[['GWAS members', completeness?.gwas_count], ['QTL members', completeness?.qtl_count], ['Observed in both', completeness?.shared_count], ['Returned variants', currentDetail.variants.length]].map(([label, value]) => <span key={label}><strong>{text(value)}</strong> {label}</span>)}</div><div className="coloc-actions"><button onClick={() => downloadBlob(new Blob([sourceTsv(currentDetail)], { type: 'text/tab-separated-values;charset=utf-8' }), `coloc-${record.id}-variants.tsv`)}>Variant TSV</button><button onClick={() => downloadBlob(new Blob([JSON.stringify({ ...currentDetail, export_provenance: metadata }, null, 2)], { type: 'application/json' }), `coloc-${record.id}-evidence.json`)}>Evidence JSON</button></div></div>
      {(completeness?.gwas_complete !== true || completeness?.qtl_complete !== true) && <p className="coloc-notice">Membership coverage: GWAS {completeness?.gwas_complete === true ? 'complete recorded set' : 'incomplete or unconfirmed'}; QTL {completeness?.qtl_complete === true ? 'complete recorded set' : 'incomplete or unconfirmed'}. An unobserved variant is not evidence of exclusion.</p>}
      <div className="coloc-evidence-tabs" role="tablist" aria-label="Signal evidence">{TABS.map(([key, label], index) => <button key={key} id={`coloc-tab-${key}`} ref={node => { tabRefs.current[index] = node; }} role="tab" aria-selected={activeTab === key} aria-controls={`coloc-panel-${key}`} tabIndex={activeTab === key ? 0 : -1} onKeyDown={event => keyboardTab(event, index)} onClick={() => setActiveTab(key)}>{label}</button>)}</div>
      <div className="coloc-linked-selection" aria-live="polite">{active ? <><strong>{active.id}</strong><span>GWAS PIP {formatNumber(active.gwas?.pip)} · QTL PIP {formatNumber(active.qtl?.pip)}</span><button onClick={() => { setSelectedVariant(null); setHoveredVariant(null); }}>Clear variant</button></> : <span>Hover or select a variant to link the plots and evidence table.</span>}</div>
      <section id="coloc-panel-locus" role="tabpanel" aria-labelledby="coloc-tab-locus" hidden={activeTab !== 'locus'} tabIndex="0">{currentDetail.variants.length ? <LocusTracks key={`${record.id}-locus`} detail={currentDetail} metadata={metadata} activeVariant={activeVariant} onHover={setHoveredVariant} onSelect={setSelectedVariant} /> : unavailable}</section>
      <section id="coloc-panel-membership" role="tabpanel" aria-labelledby="coloc-tab-membership" hidden={activeTab !== 'membership'} tabIndex="0">{currentDetail.variants.length ? <VariantMatrix key={`${record.id}-matrix`} detail={currentDetail} metadata={metadata} activeVariant={activeVariant} onHover={setHoveredVariant} onSelect={setSelectedVariant} /> : unavailable}</section>
      <section id="coloc-panel-table" role="tabpanel" aria-labelledby="coloc-tab-table" hidden={activeTab !== 'table'} tabIndex="0"><VariantEvidence key={`${record.id}-table`} detail={currentDetail} activeVariant={activeVariant} selectedVariant={selectedVariant} onHover={setHoveredVariant} onSelect={setSelectedVariant} /></section>
      <section id="coloc-panel-sources" role="tabpanel" aria-labelledby="coloc-tab-sources" hidden={activeTab !== 'sources'} tabIndex="0"><Sources detail={currentDetail} /><div className="coloc-card"><h3>Analysis provenance</h3><p>Graph: {text(currentDetail.graph_version)} · Retrieved: {text(currentDetail.checked_at)}</p><p>Original analysis nsnp: {text(record.nsnp)} · Returned credible-set variants: {currentDetail.variants.length}. These are different denominators.</p><p className="coloc-record-id">Record: {record.id}</p>{[...notes(currentDetail.notices), ...notes(completeness?.notes)].map((note, index) => <p className="coloc-footnote" key={index}>{note}</p>)}</div></section>
    </>}
  </div></main></div>;
}
