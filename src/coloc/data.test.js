import { filterRecords, focusedGraph, formatNumber, hasCoordinate, matrixGroups, membershipLabel, probability, safeUrl, serializeSvg, sourceTsv, trackValue, validateCatalog, validateDetail } from './data';
/* eslint-disable no-script-url -- Test the URL rejection boundary. */

const record = { id: 'r1', gene_id: 'ENSG1', gene_name: 'ADCY3', gwas_signal_id: 'GWAS1', qtl_signal_id: 'QTL1', dataset: 'INSPIRE', tissue: 'Islet', qtl_type: 'eQTL', posteriors: { h4: 0.1 }, nsnp: 1273 };
test('all H4 values remain searchable, separate analyses share a cell without aggregation', () => {
  const rows = [record, { ...record, id: 'r2', qtl_signal_id: 'QTL2', posteriors: { h4: 0.9 } }, { ...record, id: 'r3', gene_name: 'GSDMB', dataset: 'GTEx', posteriors: { h4: 0 } }];
  expect(filterRecords(rows, {})).toHaveLength(3);
  expect(filterRecords(rows, { gene: 'adcy3' }).map(item => item.id)).toEqual(['r2', 'r1']);
  expect(filterRecords(rows, { dataset: 'GTEx' })[0].posteriors.h4).toBe(0);
  const matrix = matrixGroups(rows.slice(0, 2));
  expect(matrix.rows).toHaveLength(1); expect(matrix.columns).toHaveLength(1);
  expect([...matrix.cells.values()][0]).toHaveLength(2);
});
test('missing PIP is never zero and incomplete membership never implies exclusion', () => {
  expect(probability(null)).toBeNull(); expect(probability('')).toBeNull(); expect(formatNumber(null)).toBe('Not recorded');
  expect(probability(0)).toBe(0); expect(formatNumber(0)).toBe('0');
  expect(membershipLabel(null, false)).toBe('Not observed');
  expect(membershipLabel({ member: false }, false)).toBe('Not observed');
  expect(membershipLabel(null, true)).toBe('Outside recorded set');
  expect(membershipLabel({ member: true }, false)).toBe('Member');
});
test('tracks omit unavailable coordinates, zero nominal P and invalid probabilities', () => {
  expect(hasCoordinate({ chromosome: '2', position: null })).toBe(false);
  expect(hasCoordinate({ chromosome: '2', position: 0 })).toBe(false);
  expect(hasCoordinate({ chromosome: '2', position: 123 })).toBe(true);
  expect(trackValue({ gwas: { nominal_p: 0 } }, 'gwas', 'p')).toBeNull();
  expect(trackValue({ gwas: { nominal_p: 0.0001 } }, 'gwas', 'p')).toBe(4);
  expect(trackValue({ qtl: { pip: 0 } }, 'qtl', 'pip')).toBe(0);
  expect(trackValue({ qtl: { pip: 1.5 } }, 'qtl', 'pip')).toBeNull();
});
test('source TSV retains denominators, provenance, missing values and zero values', () => {
  const exported = sourceTsv({ record, variants: [{ id: 'rs1', gwas: { member: true, pip: 0, nominal_p: 0 }, qtl: null }], coverage: { scope: 'credible_set', gwas_complete: true, qtl_complete: false }, sources: [{ label: 'Source', sha256: 'abc' }] }, { graph_version: 'g1' });
  expect(exported).toContain('# nsnp\t1273'); expect(exported).toContain('# graph_version\tg1');
  expect(exported).toContain('"sha256":"abc"'); expect(exported).toContain('Member\t0\t0'); expect(exported).toContain('Not observed\t\t');
});
test('rejects unexpected or duplicate records and unsafe download links', () => {
  expect(() => validateCatalog({ version: 1, records: [record, record] })).toThrow();
  expect(() => validateDetail({ version: 1, record, variants: [] }, 'other')).toThrow();
  expect(safeUrl('javascript:alert(1)')).toBeNull();
  expect(safeUrl('https://example.com/data', true)).toBeNull();
  expect(safeUrl('/pankgraph-vnext/api/resources/download?a=1', true)).toContain('/pankgraph-vnext/api/resources/download?a=1');
});
test('SVG export keeps actual values and embeds exact metadata', () => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.innerHTML = '<text>Original analysis nsnp: 1273</text>';
  const output = serializeSvg(svg, { record_id: 'r1', scope: 'credible_set', sources: [{ sha256: 'abc' }] });
  expect(output).toContain('Original analysis nsnp: 1273'); expect(output).toContain('<metadata>'); expect(output).toContain('"record_id":"r1"'); expect(output).toContain('"sha256":"abc"');
  const parsed = new DOMParser().parseFromString(output, 'image/svg+xml');
  expect(parsed.getElementsByTagName('parsererror')).toHaveLength(0);
  expect(parsed.documentElement.namespaceURI).toBe('http://www.w3.org/2000/svg');
});
test('focused graph uses only real recorded nodes and edges and keeps selected KG variants', () => {
  const nodes = ['ENSG1', 'disease1', 'rsLead', 'rsOther'].map(id => ({ '~id': id, '~properties': { id } }));
  const edges = [{ '~id': 'e1', '~start': 'rsLead', '~end': 'disease1' }, { '~id': 'e2', '~start': 'rsOther', '~end': 'disease1' }];
  const detail = { record: { ...record, disease_id: 'disease1', gwas_leads: ['rsLead'] }, graph: { nodes, edges } };
  const view = focusedGraph(detail, 'raw-only');
  expect(view.graph.nodes).toHaveLength(3); expect(view.graph.edges).toEqual([edges[0]]); expect(view.selectedRecorded).toBe(false);
  expect(Object.keys(view.positions)).toHaveLength(3); expect(view.total).toBe(4);
  expect(focusedGraph(detail, 'rsOther').graph.nodes).toHaveLength(4);
});
