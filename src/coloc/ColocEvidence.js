import React, { useState } from 'react';
import { formatNumber, membershipLabel, safeUrl } from './data';
export const text = value => value === null || value === undefined || value === '' ? 'Not recorded' : String(value);
export const notes = value => (Array.isArray(value) ? value : []).map(item => typeof item === 'string' ? item : item?.message || item?.detail || JSON.stringify(item));

export function VariantEvidence({ detail, activeVariant, selectedVariant, onHover, onSelect }) {
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

export function Sources({ detail }) {
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

