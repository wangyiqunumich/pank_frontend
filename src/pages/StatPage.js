import React, { useMemo, useState } from 'react';
import data from '../statistics/statistics20261104.json';
import './Statistics.css';

const number = value => value.toLocaleString('en-US');
const licenseUrls = {
  'CC-BY-4.0': 'https://creativecommons.org/licenses/by/4.0/',
  'CC-BY-3.0': 'https://creativecommons.org/licenses/by/3.0/',
  'CC-BY-SA-4.0': 'https://creativecommons.org/licenses/by-sa/4.0/',
  'CC0-1.0': 'https://creativecommons.org/publicdomain/zero/1.0/',
  MIT: 'https://opensource.org/license/mit',
  'LicenseRef-Ensembl-Data-Use': 'https://www.ensembl.org/info/about/legal/disclaimer.html',
  'LicenseRef-NCBI-Data-Usage': 'https://www.ncbi.nlm.nih.gov/home/about/policies/',
};
const licenseLabel = value => ({
  'LicenseRef-Ensembl-Data-Use': 'Ensembl data terms',
  'LicenseRef-NCBI-Data-Usage': 'NCBI data terms',
}[value] || value);
function ExternalLink({ href, children, ...props }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" {...props}>{children}<span aria-hidden="true"> ↗</span></a>;
}
function Licenses({ values }) {
  return <div className="stats-licenses">{values.map(value => value === 'unknown'
    ? <span className="stats-license stats-license-unknown" key={value}>Not yet verified</span>
    : <span className="stats-license" key={value}>{value.split(' AND ').map((part, index) => <React.Fragment key={part}>{index > 0 && <span> + </span>}{licenseUrls[part] ? <ExternalLink href={licenseUrls[part]} title={part}>{licenseLabel(part)}</ExternalLink> : part}</React.Fragment>)}</span>)}</div>;
}
function LibraryLinks({ row }) {
  if (!row.library.length) return <span className="stats-muted">No mapped download</span>;
  const [first, ...rest] = row.library;
  const link = item => <ExternalLink key={item.url} href={item.url} title={item.description}>{item.label}</ExternalLink>;
  return <div className="stats-library"><span className={`stats-link-kind ${row.libraryStatus === 'Source dataset' ? 'stats-link-source' : ''}`}>{row.libraryStatus}</span>{link(first)}<details><summary>{rest.length ? `View ${rest.length} more & provenance` : 'Link provenance'}</summary><p>{row.libraryNote}</p>{rest.map(item => <div className="stats-library-item" key={item.url}>{link(item)}<small>{item.description}</small></div>)}</details></div>;
}
export default function StatPage() {
  const [kind, setKind] = useState('nodes');
  const [query, setQuery] = useState('');
  const [license, setLicense] = useState('all');
  const [linkedOnly, setLinkedOnly] = useState(false);
  const [sort, setSort] = useState('count');
  const rows = useMemo(() => data.rows.filter(row => row.kind === kind
    && (!linkedOnly || row.library.length > 0)
    && (license === 'all' || (license === 'unknown' ? row.licenses.includes('unknown') : row.licenses.every(value => value !== 'unknown')))
    && [row.name, row.type, row.endpoints, ...row.sources.map(s => s.name), ...row.licenses, ...row.library.map(l => l.label)].join(' ').toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => sort === 'count' ? b.count - a.count : a.name.localeCompare(b.name)), [kind, query, license, linkedOnly, sort]);
  const reset = () => { setQuery(''); setLicense('all'); setLinkedOnly(false); setSort('count'); };
  return <main className="stats-page" aria-labelledby="stats-title">
    <header className="stats-header">
      <div className="stats-eyebrow">DATA RESOURCES <span>{data.release}</span></div>
      <h1 id="stats-title">Statistics & data sources</h1>
      <p className="stats-intro">Explore the biological entities and relationships in PanKgraph, with source provenance, recorded licenses, and links to the PanKbase Data Library.</p>
      <div className="stats-meta"><span>Version date · November 4, 2026</span><span>Human · GRCh38</span><ExternalLink href="https://data.pankbase.org/">Browse PanKbase Data Library</ExternalLink></div>
    </header>
    <section className="stats-metrics" aria-label="Version totals">
      {[['Graph nodes', data.totals.nodes, 'Biological entities & metadata'], ['Relationships', data.totals.edges, 'Contextualized graph records'], ['Supporting table rows', data.totals.sqlRows, `Across ${data.totals.sqlTables} evidence & lookup tables`]].map(([label, count, description]) => <div className="stats-metric" key={label}><span>{label}</span><strong>{number(count)}</strong><small>{description}</small></div>)}
    </section>
    <div className="stats-scope"><strong>About these counts</strong><p>Graph records and supporting table rows have different units and should not be added together.</p></div>
    <section className="stats-catalog" aria-labelledby="stats-catalog-title">
      <div className="stats-section-heading"><div><h2 id="stats-catalog-title">Explore the data</h2><p>Find a data type, review its terms, and follow the available source links.</p></div><a href="#stats-reuse">How to use these resources ↓</a></div>
      <div className="stats-tabs" role="group" aria-label="Record category">{[['nodes', 'Nodes'], ['edges', 'Relationships']].map(([value, label]) => <button type="button" key={value} aria-pressed={kind === value} onClick={() => setKind(value)}>{label}<span>{data.rows.filter(row => row.kind === value).length}</span></button>)}</div>
      <div className="stats-controls">
        <label className="stats-search">Search data<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search type, source, license or accession…" /></label>
        <label>License status<select value={license} onChange={event => setLicense(event.target.value)}><option value="all">All statuses</option><option value="recorded">Terms recorded</option><option value="unknown">Not yet verified</option></select></label>
        <label>Sort by<select value={sort} onChange={event => setSort(event.target.value)}><option value="count">Record count</option><option value="name">Name (A–Z)</option></select></label>
      </div>
      <div className="stats-results-line"><p role="status">{rows.length} of {data.rows.filter(row => row.kind === kind).length} {kind === 'nodes' ? 'node categories' : 'relationship groups'}</p><label><input type="checkbox" checked={linkedOnly} onChange={event => setLinkedOnly(event.target.checked)} /> With PanKbase links</label><button type="button" onClick={reset}>Reset filters</button></div>
      <div className="stats-table-scroll" role="region" aria-label="Data statistics table" tabIndex="0"><table className="stats-table">
        <caption className="stats-sr-only">{data.release} {kind === 'nodes' ? 'node categories' : 'relationship groups'}, counts, sources, licenses and PanKbase resources</caption>
        <thead><tr><th scope="col">{kind === 'nodes' ? 'Entity type' : 'Relationship / endpoints'}</th><th scope="col" className="stats-count">Records</th><th scope="col">Source</th><th scope="col">Recorded license</th><th scope="col">PanKbase downloads</th></tr></thead>
        <tbody>{rows.map(row => <tr key={row.id}>
          <th scope="row"><span className="stats-row-name">{row.name}</span>{row.endpoints && <small className="stats-endpoints">{row.endpoints}</small>}<details className="stats-record-details"><summary>Type & version</summary><code>{row.type}</code>{row.versions.map(version => <small key={version}>{version}</small>)}</details></th>
          <td className="stats-count">{number(row.count)}</td>
          <td><div className="stats-sources">{row.sources.map(source => <span key={source.name}>{source.url ? <ExternalLink href={source.url}>{source.name}</ExternalLink> : source.name}</span>)}{row.methods && <details><summary>Methods & code</summary>{row.methods.map(method => <div key={method.url}><ExternalLink href={method.url}>{method.label}</ExternalLink></div>)}</details>}</div></td>
          <td><Licenses values={row.licenses} /></td><td><LibraryLinks row={row} /></td>
        </tr>)}</tbody>
      </table>{!rows.length && <div className="stats-empty"><strong>No matching data types</strong><p>Try a different source or clear the filters.</p><button type="button" onClick={reset}>Clear filters</button></div>}</div>
      <p className="stats-table-note">Relationships are grouped by type and endpoint categories. Counts include individual source records; repeated gene pairs may represent distinct experimental evidence.</p>
    </section>
    <section className="stats-reuse" id="stats-reuse" aria-labelledby="stats-reuse-title"><h2 id="stats-reuse-title">Using the data responsibly</h2><div className="stats-reuse-grid">
      <div><span className="stats-step">01 / LICENSING</span><h3>Check the source terms</h3><p>Licenses are recorded per data type in this version. “Not yet verified” preserves an unknown license; it does not grant permission to reuse or redistribute. Where several terms are shown, review the original records and their source conditions.</p></div>
      <div><span className="stats-step">02 / DOWNLOADS</span><h3>Keep dataset identity intact</h3><p>Source dataset links come from the source records. Related resources provide useful context, but may differ in release, cohort or processing. Open each dataset’s Files section for downloads and current availability.</p></div>
      <div><span className="stats-step">03 / INTERPRETATION</span><h3>Retain the biological context</h3><p>Associations, expression differences and inferred ligand–receptor relationships have distinct evidence scopes. Counts do not establish causality or completeness. This version excludes ABC predictions and regulatory-element nodes.</p></div>
    </div></section>
    <footer className="stats-provenance"><span>{data.release} · Library mapping reviewed {data.libraryCheckedOn}</span><details><summary>Version provenance</summary><p>Aggregate counts and recorded terms are derived from the validated version schema. Library mappings retain their source review date.</p><strong>Input manifest SHA-256</strong><code>{data.inputManifestSha256}</code><strong>Schema SHA-256</strong><code>{data.schemaSha256}</code></details></footer>
  </main>;
}
