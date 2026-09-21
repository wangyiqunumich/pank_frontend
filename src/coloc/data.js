// Coloc posteriors, per-study PIPs, and membership are separate evidence types.
export const numeric = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? Number(value) : null;
export const probability = value => { const number = numeric(value); return number !== null && number >= 0 && number <= 1 ? number : null; };
export const formatNumber = value => { const number = numeric(value); return number === null ? 'Not recorded' : number === 0 ? '0' : Math.abs(number) < 0.001 ? number.toExponential(3) : Number(number.toPrecision(5)).toString(); };
export const h4Color = value => probability(value) === null ? '#e2e8ee' : `hsl(172, ${24 + probability(value) * 30}%, ${94 - probability(value) * 67}%)`;
export const rowKey = record => JSON.stringify([record.gene_id, record.gwas_signal_id]);
export const columnKey = record => JSON.stringify([record.dataset, record.tissue, record.qtl_type]);
export const sortRecords = records => [...records].sort((a, b) => (probability(b.posteriors?.h4) ?? -1) - (probability(a.posteriors?.h4) ?? -1) || String(a.id).localeCompare(String(b.id)));
export function filterRecords(records, filters) {
  const gene = (filters.gene || '').trim().toLowerCase();
  return sortRecords(records.filter(record => (!gene || `${record.gene_name || ''} ${record.gene_id || ''}`.toLowerCase().includes(gene))
    && ['dataset', 'tissue', 'qtl_type'].every(key => !filters[key] || record[key] === filters[key])));
}
export function matrixGroups(records) {
  const rows = new Map(), columns = new Map(), cells = new Map();
  records.forEach(record => {
    const row = rowKey(record), column = columnKey(record), key = `${row}|${column}`;
    if (!rows.has(row)) rows.set(row, record);
    if (!columns.has(column)) columns.set(column, record);
    cells.set(key, [...(cells.get(key) || []), record]);
  });
  return { rows: [...rows.entries()], columns: [...columns.entries()], cells };
}
export function focusedGraph(detail, selectedVariant) {
  const graph = detail?.graph || { nodes: [], edges: [] }, record = detail?.record || {};
  const focus = new Set([record.gene_id, record.disease_id, ...(record.gwas_leads || []), ...(record.qtl_leads || []), selectedVariant].filter(Boolean));
  const nodes = graph.nodes.filter(node => focus.has(node['~id']) || focus.has(node['~properties']?.id));
  const ids = new Set(nodes.map(node => node['~id']));
  const edges = graph.edges.filter(edge => ids.has(edge['~start']) && ids.has(edge['~end']));
  const others = nodes.filter(node => ![record.gene_id, record.disease_id].includes(node['~properties']?.id || node['~id']));
  const positions = Object.fromEntries(nodes.map(node => {
    const id = node['~properties']?.id || node['~id'], index = others.indexOf(node);
    return [node['~id'], id === record.gene_id ? { x: -120, y: 0 } : id === record.disease_id ? { x: 120, y: 0 }
      : { x: Math.cos(2 * Math.PI * index / Math.max(1, others.length) + Math.PI / 2) * 70, y: Math.sin(2 * Math.PI * index / Math.max(1, others.length) + Math.PI / 2) * 100 }];
  }));
  return { graph: { nodes, edges }, positions, total: graph.nodes.length, selectedRecorded: !selectedVariant || nodes.some(node => (node['~properties']?.id || node['~id']) === selectedVariant) };
}
export function membershipLabel(side, complete) {
  if (side?.member === true) return 'Member';
  if (side?.member === false && complete === true) return 'Outside recorded set';
  if (!side && complete === true) return 'Outside recorded set';
  return 'Not observed';
}
export const hasCoordinate = variant => Boolean(variant.chromosome) && numeric(variant.position) !== null && Number.isSafeInteger(Number(variant.position)) && Number(variant.position) > 0;
export function trackValue(variant, side, metric) {
  if (metric === 'pip') return probability(variant[side]?.pip);
  const p = probability(variant[side]?.nominal_p);
  return p !== null && p > 0 ? -Math.log10(p) : null;
}
export function validateCatalog(body) {
  if (body.version !== 1 || !Array.isArray(body.records) || body.records.some(record => !record?.id || !record.posteriors)
    || new Set(body.records.map(record => record.id)).size !== body.records.length) throw new Error('The coloc catalog response is invalid. Please retry.');
  return { ...body, records: sortRecords(body.records) };
}
export function validateDetail(body, id) {
  if (body.version !== 1 || body.record?.id !== id || !Array.isArray(body.variants)
    || body.variants.some(variant => !variant?.id) || new Set(body.variants.map(variant => variant.id)).size !== body.variants.length) {
    throw new Error('The selected coloc record returned an invalid response. Please retry.');
  }
  return body;
}
export function safeUrl(value, sameOrigin = false) {
  if (!value || typeof value !== 'string') return null;
  try {
    const url = new URL(value, window.location.origin);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || (sameOrigin && url.origin !== window.location.origin)) return null;
    return url.href;
  } catch (_) { return null; }
}
export function provenance(detail, catalog) {
  return {
    record_id: detail.record.id, gene_id: detail.record.gene_id, gene_name: detail.record.gene_name,
    gwas_signal_id: detail.record.gwas_signal_id, qtl_signal_id: detail.record.qtl_signal_id,
    graph_version: detail.graph_version || catalog?.graph_version || null,
    checked_at: detail.checked_at || catalog?.checked_at || null,
    dataset: detail.record.dataset, data_version: detail.record.data_version,
    data_source: detail.record.data_source, tissue: detail.record.tissue, qtl_type: detail.record.qtl_type,
    scope: detail.coverage?.scope || 'credible_set', coordinate_build: detail.coordinate_build || null,
    nsnp: detail.record.nsnp, posteriors: detail.record.posteriors,
    coverage: detail.coverage, sources: detail.sources || [], notices: detail.notices || [],
  };
}
// Neutralize spreadsheet formula cells while retaining ordinary negative numbers.
const tsvCell = value => {
  const text = value === null || value === undefined ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
  return (/^[=+@-]/.test(text) && !/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(text) ? `'${text}` : text).replace(/[\t\r\n]/g, ' ');
};
export function sourceTsv(detail, catalog) {
  const metadata = provenance(detail, catalog);
  const columns = ['variant_id', 'chromosome', 'position', 'gwas_membership', 'gwas_pip', 'gwas_nominal_p', 'gwas_effect_allele', 'gwas_other_allele', 'gwas_slope', 'qtl_membership', 'qtl_pip', 'qtl_nominal_p', 'qtl_effect_allele', 'qtl_other_allele', 'qtl_slope'];
  const rows = detail.variants.map(variant => [variant.id, variant.chromosome, variant.position,
    ...['gwas', 'qtl'].flatMap(side => [membershipLabel(variant[side], detail.coverage?.[`${side}_complete`]),
      ...['pip', 'nominal_p', 'effect_allele', 'other_allele', 'slope'].map(key => variant[side]?.[key])])]);
  return [...Object.entries(metadata).map(([key, value]) => `# ${key}\t${tsvCell(value)}`), columns.join('\t'), ...rows.map(row => row.map(tsvCell).join('\t'))].join('\n');
}
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function serializeSvg(svg, metadata) {
  const clone = svg.cloneNode(true);
  // XMLSerializer supplies the SVG namespace. A plain xmlns attribute would
  // duplicate it and produce invalid XML (also breaking PNG image decoding).
  clone.removeAttribute('xmlns');
  const element = document.createElementNS('http://www.w3.org/2000/svg', 'metadata');
  element.textContent = JSON.stringify(metadata); clone.insertBefore(element, clone.firstChild);
  clone.querySelectorAll('[tabindex]').forEach(node => node.removeAttribute('tabindex'));
  return new XMLSerializer().serializeToString(clone);
}
export async function exportPlot(svg, kind, metadata, filename) {
  if (!svg) throw new Error('The plot is not ready to export.');
  const serialized = serializeSvg(svg, metadata);
  if (kind === 'svg') { downloadBlob(new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' }), `${filename}.svg`); return; }
  const image = new Image(), url = URL.createObjectURL(new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error('The plot image could not be prepared. Try SVG export.')); image.src = url; });
    const box = svg.viewBox.baseVal, canvas = document.createElement('canvas');
    canvas.width = box.width * 2; canvas.height = box.height * 2;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('PNG export is unavailable in this browser. Try SVG export.');
    context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('PNG export failed. Try SVG export.');
    downloadBlob(blob, `${filename}.png`);
  } finally { URL.revokeObjectURL(url); }
}
