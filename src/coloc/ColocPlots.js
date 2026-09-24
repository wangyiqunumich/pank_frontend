import React, { useMemo, useRef, useState } from 'react';
import { exportPlot, formatNumber, hasCoordinate, membershipLabel, numeric, probability, trackValue } from './data';

const COLORS = ['#c2cbd5', '#a6c8dc', '#7cabc4', '#e7b872', '#2f827a'];
const HYPOTHESES = ['Neither trait associated', 'Only trait 1 associated', 'Only trait 2 associated', 'Both traits, different signals', 'Both traits, shared signal'];
const font = { fontFamily: 'Inter, Arial, sans-serif', fontSize: 11, fill: '#40535b' };

export function PlotFrame({ title, subtitle, metadata, filename, children, className = '' }) {
  const ref = useRef(null), [error, setError] = useState(''), [exporting, setExporting] = useState(false);
  async function save(kind) {
    setError(''); setExporting(true);
    try { await exportPlot(ref.current?.querySelector('svg'), kind, metadata, filename); }
    catch (failure) { setError(failure.message); }
    finally { setExporting(false); }
  }
  return <section className={`coloc-card ${className}`}>
    <div className="coloc-panel-heading"><div><h3>{title}</h3><p>{subtitle}</p></div>
      <div className="coloc-actions"><button disabled={exporting} onClick={() => save('svg')} aria-label={`Export ${title} as SVG`}>SVG</button><button disabled={exporting} onClick={() => save('png')} aria-label={`Export ${title} as PNG`}>PNG</button></div>
    </div>
    {error && <p role="alert" className="coloc-error">{error}</p>}
    <div className="coloc-svg-wrap" ref={ref}>{children}</div>
  </section>;
}

function PlotFooter({ metadata, y, compact = false }) {
  // Labels are in the SVG itself, so PNG and SVG carry visible provenance.
  const short = value => String(value || 'Not recorded').slice(0, compact ? 90 : 120);
  return <g style={{ ...font, fontSize: 10 }}>
    <text x="20" y={y}>{short(`${metadata.gene_name || metadata.gene_id} · ${metadata.dataset || 'Source not recorded'} · ${metadata.tissue || 'Tissue not recorded'} · ${metadata.qtl_type || 'QTL'}`)}</text>
    <text x="20" y={y + 15}>{short(`Source version: ${metadata.data_version || 'not recorded'} · Graph: ${metadata.graph_version || 'not recorded'}`)}</text>
    <text x="20" y={y + 30}>{short(compact ? `Record: ${metadata.record_id}` : `Record: ${metadata.record_id} · Retrieved: ${metadata.checked_at || 'not recorded'}`)}</text>
    {compact && <text x="20" y={y + 45}>{short(`Retrieved: ${metadata.checked_at || 'not recorded'}`)}</text>}
  </g>;
}

export function PosteriorPlot({ record, metadata }) {
  const values = ['h0', 'h1', 'h2', 'h3', 'h4'].map(key => probability(record.posteriors?.[key]));
  let offset = 0;
  const total = values.reduce((sum, value) => sum + (value ?? 0), 0);
  return <PlotFrame className="coloc-posterior" title="Colocalization posteriors" subtitle={`Original analysis SNP count (nsnp): ${numeric(record.nsnp) === null ? 'Not recorded' : record.nsnp}. H1/H2 follow the source trait ordering.`} metadata={metadata} filename={`coloc-${record.id}-posteriors`}>
    <svg viewBox="0 0 600 260" width="600" height="260" role="img" aria-label="Recorded H0 to H4 posterior probabilities" style={font}>
      <rect width="600" height="260" fill="white" /><text x="20" y="20" fontSize="13" fontWeight="600">Recorded H0–H4 posteriors</text>
      <text x="20" y="38">Original analysis nsnp: {numeric(record.nsnp) === null ? 'Not recorded' : record.nsnp} · Probabilities are not renormalized</text>
      <rect x="20" y="50" width="560" height="25" fill="#f2f4f5" rx="4" />
      {total <= 1.01 && values.map((value, index) => {
        const x = 20 + offset * 560; offset += value ?? 0;
        return value === null ? null : <g key={index}><rect x={x} y="50" width={value * 560} height="25" fill={COLORS[index]}><title>{`H${index}: ${formatNumber(value)}`}</title></rect>{value >= 0.08 && <text x={x + value * 280} y="67" textAnchor="middle" fill={index === 4 ? 'white' : '#233744'}>{`H${index}`}</text>}</g>;
      })}
      {total > 1.01 && <text x="30" y="67">Posterior sum exceeds one; inspect source values below.</text>}
      {values.map((value, index) => <g key={index} transform={`translate(20 ${90 + index * 19})`}><rect width="12" height="12" rx="2" fill={COLORS[index]} /><text x="22" y="10">{`H${index} · ${HYPOTHESES[index]}`}</text><text x="455" y="10" fontWeight="600">{formatNumber(value)}</text></g>)}
      <PlotFooter metadata={metadata} y={202} compact />
    </svg>
    <p className="coloc-footnote">H4 supports a shared association signal; it does not establish a biological mechanism. PIP and credible-set overlap measure different things.</p>
  </PlotFrame>;
}

export function VariantMatrix({ detail, activeVariant, onHover, onSelect, metadata }) {
  const pageSize = 12, [page, setPage] = useState(0);
  const variants = detail.variants, pages = Math.max(1, Math.ceil(variants.length / pageSize));
  const activeIndex = variants.findIndex(variant => variant.id === activeVariant);
  // A linked plot selection should bring the corresponding matrix row into view.
  const visiblePage = activeIndex >= 0 ? Math.floor(activeIndex / pageSize) : Math.min(page, pages - 1);
  const visible = variants.slice(visiblePage * pageSize, (visiblePage + 1) * pageSize);
  const height = 110 + visible.length * 26 + 75;
  return <PlotFrame title="Variant membership & PIP" subtitle="Union of returned credible-set variants. Color represents recorded PIP, not colocalization probability." metadata={metadata} filename={`coloc-${detail.record.id}-membership-page-${visiblePage + 1}`}>
    <div className="coloc-pagination"><span>Variants {variants.length ? visiblePage * pageSize + 1 : 0}–{Math.min((visiblePage + 1) * pageSize, variants.length)} of {variants.length}</span><button disabled={visiblePage === 0} onClick={() => { onSelect(null); setPage(visiblePage - 1); }}>Previous</button><button disabled={visiblePage + 1 >= pages} onClick={() => { onSelect(null); setPage(visiblePage + 1); }}>Next</button></div>
    <svg viewBox={`0 0 900 ${height}`} width="900" height={height} role="img" aria-label="Variant credible-set membership and recorded PIP" style={font}>
      <defs><pattern id="coloc-missing-pip" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#f3f5f6" /><path d="M0 6L6 0" stroke="#c7d0d8" strokeWidth="1" /></pattern></defs>
      <rect width="900" height={height} fill="white" />
      <text x="20" y="25" fontSize="15" fontWeight="600">Credible-set membership and PIP</text><text x="20" y="46">Hatched = PIP not recorded · White = PIP 0 · ★ = recorded study lead</text>
      <text x="20" y="77">Variant</text><text x="330" y="77">GWAS</text><text x="600" y="77">QTL</text>
      {visible.map((variant, index) => <g key={variant.id} transform={`translate(0 ${90 + index * 26})`} tabIndex="0" role="button" aria-label={`Select variant ${variant.id}`} aria-pressed={activeVariant === variant.id}
        onMouseEnter={() => onHover(variant.id)} onMouseLeave={() => onHover(null)} onFocus={() => onHover(variant.id)} onBlur={() => onHover(null)}
        onClick={() => onSelect(variant.id)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(variant.id); } }}>
        <rect x="15" y="-14" width="870" height="24" rx="3" fill={activeVariant === variant.id ? '#e0f1ed' : index % 2 ? '#f8fafb' : '#fff'} />
        <text x="20" y="2">{variant.id.length > 32 ? `${variant.id.slice(0, 29)}…` : variant.id}</text>
        {['gwas', 'qtl'].map((side, sideIndex) => {
          const pip = probability(variant[side]?.pip), member = membershipLabel(variant[side], detail.coverage?.[`${side}_complete`]);
          const lead = (detail.record[`${side}_leads`] || []).includes(variant.id);
          return <g key={side} transform={`translate(${330 + sideIndex * 270} 0)`}><rect x="0" y="-12" width="65" height="20" stroke="#d0d9dd" fill={pip === null ? 'url(#coloc-missing-pip)' : `hsl(172, 40%, ${100 - pip * 67}%)`} /><text x="32" y="2" textAnchor="middle" fill={pip > 0.6 ? 'white' : '#223c42'}>{pip === null ? '—' : formatNumber(pip)}</text><text x="75" y="2">{`${lead ? '★ ' : ''}${member}`}</text><title>{`${side.toUpperCase()} ${variant.id}: ${member}, PIP ${formatNumber(pip)}${lead ? ', recorded lead' : ''}`}</title></g>;
        })}
      </g>)}
      <PlotFooter metadata={metadata} y={height - 48} />
    </svg>
    <p className="coloc-footnote">“Not observed” does not mean excluded when membership retrieval is incomplete. Original analysis nsnp is separate from the number of returned variants.</p>
  </PlotFrame>;
}

export function LocusTracks({ detail, activeVariant, onHover, onSelect, metadata }) {
  const [selectedChromosome, setSelectedChromosome] = useState('');
  const coordinates = useMemo(() => detail.variants.filter(hasCoordinate), [detail.variants]);
  const chromosomes = [...new Set(coordinates.map(variant => String(variant.chromosome)))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const chromosome = chromosomes.includes(selectedChromosome) ? selectedChromosome : chromosomes[0];
  const variants = coordinates.filter(variant => String(variant.chromosome) === chromosome);
  const positions = variants.map(variant => Number(variant.position));
  const min = positions.length ? Math.min(...positions) : 0, max = positions.length ? Math.max(...positions) : 1;
  const pad = max === min ? 1 : (max - min) * 0.03, start = min - pad, end = max + pad;
  const x = position => 120 + (position - start) / (end - start) * 740;
  const tracks = [['gwas', 'p'], ['qtl', 'p'], ['gwas', 'pip'], ['qtl', 'pip']];
  const pUpper = Math.max(1, ...variants.flatMap(variant => ['gwas', 'qtl'].map(side => trackValue(variant, side, 'p')).filter(value => value !== null))) * 1.08;
  return <PlotFrame title="Aligned locus tracks" subtitle={`Credible-set variants only · Coordinates: ${coordinates.length}/${detail.variants.length} returned variants · ${detail.coordinate_build || 'Coordinate build not reported'}`} metadata={metadata} filename={`coloc-${detail.record.id}-locus-${chromosome || 'unavailable'}`}>
    {chromosomes.length > 1 && <label className="coloc-chromosome">Chromosome <select value={chromosome} onChange={event => setSelectedChromosome(event.target.value)}>{chromosomes.map(value => <option key={value}>{value}</option>)}</select></label>}
    <svg viewBox="0 0 900 620" width="900" height="620" role="img" aria-label="Aligned genomic association and fine-mapping tracks, credible-set variants only" style={font}>
      <rect width="900" height="620" fill="white" /><text x="20" y="26" fontSize="15" fontWeight="600">Credible-set variants only · {detail.record.gene_name || detail.record.gene_id}</text>
      <text x="20" y="47">Coordinates {coordinates.length}/{detail.variants.length} returned variants · {detail.coordinate_build || 'Coordinate build not reported'} · Missing values are omitted</text>
      {!variants.length ? <text x="180" y="250" fontSize="16">Verified coordinates are unavailable for the returned variants.</text> : tracks.map(([side, metric], trackIndex) => {
        const top = 76 + trackIndex * 108, points = variants.map(variant => ({ variant, value: trackValue(variant, side, metric) })).filter(item => item.value !== null);
        const upper = metric === 'pip' ? 1 : pUpper;
        const y = value => top + 72 - value / upper * 65;
        return <g key={`${side}-${metric}`}>
          <text x="20" y={top + 18} fontWeight="600">{side.toUpperCase()}</text><text x="20" y={top + 35}>{metric === 'pip' ? 'PIP' : '−log₁₀(P)'}</text>
          {[0, upper / 2, upper].map(value => <g key={value}><line x1="120" x2="860" y1={y(value)} y2={y(value)} stroke="#e5ebed" /><text x="108" y={y(value) + 4} textAnchor="end">{Number(value.toPrecision(2))}</text></g>)}
          {!points.length && <text x="370" y={top + 35}>No recorded {metric === 'pip' ? 'PIP' : 'positive nominal P'} values</text>}
          {points.map(({ variant, value }) => {
            const lead = (detail.record[`${side}_leads`] || []).includes(variant.id), active = variant.id === activeVariant;
            return <g key={variant.id} tabIndex="0" role="button" aria-label={`${variant.id} ${side.toUpperCase()} ${metric === 'pip' ? 'PIP' : 'negative log10 P'} ${formatNumber(value)}`} aria-pressed={active}
              onMouseEnter={() => onHover(variant.id)} onMouseLeave={() => onHover(null)} onFocus={() => onHover(variant.id)} onBlur={() => onHover(null)} onClick={() => onSelect(variant.id)}
              onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(variant.id); } }}>
              {active && <line x1={x(variant.position)} x2={x(variant.position)} y1={top} y2={top + 75} stroke="#315e58" strokeDasharray="3 3" />}
              {lead ? <path d="M 0 -6 L 6 0 L 0 6 L -6 0 Z" transform={`translate(${x(variant.position)},${y(value)})`} fill={side === 'gwas' ? '#7368ad' : '#36867a'} stroke={active ? '#142d31' : 'white'} strokeWidth={active ? 2 : 1} /> : <circle cx={x(variant.position)} cy={y(value)} r={active ? 5 : 3.5} fill={side === 'gwas' ? '#7368ad' : '#36867a'} stroke={active ? '#142d31' : 'white'} />}
              <title>{`${variant.id} · Chr${chromosome}:${variant.position} · ${side.toUpperCase()} ${metric === 'pip' ? 'PIP' : 'nominal P'} ${formatNumber(variant[side]?.[metric === 'pip' ? 'pip' : 'nominal_p'])}${lead ? ' · Recorded lead' : ''}`}</title>
            </g>;
          })}
        </g>;
      })}
      {variants.length > 0 && <g>{[min, (min + max) / 2, max].filter((value, index, all) => all.indexOf(value) === index).map(value => <text key={value} x={x(value)} y="516" textAnchor="middle">{Math.round(value).toLocaleString()}</text>)}<text x="470" y="536" textAnchor="middle">Chromosome {chromosome} position · Diamond = recorded lead · No LD coloring</text></g>}
      <PlotFooter metadata={metadata} y={571} />
    </svg>
    <p className="coloc-footnote">These tracks show supplied credible-set subsets, not full regional association statistics. P = 0 cannot be log-transformed and is retained in the source table. Coordinates and raw statistics may cover different subsets.</p>
  </PlotFrame>;
}
