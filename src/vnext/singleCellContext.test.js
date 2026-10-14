import { expressionContext, validBrowserContext, SC_DATASET, expressionEdges, firstAvailableExpression, cellLabel } from './singleCellContext';
const graph = (properties = {}, type = 'gene_detected_in') => ({ nodes: [
  { '~id': 'ENSG1', '~labels': ['Gene'], '~properties': { gene_symbol: 'INS' } },
  { '~id': 'beta', '~labels': ['Cell_type'], '~properties': { name: 'Beta cell' } },
], edges: [{ '~id': 'edge-1', '~start': 'ENSG1', '~end': 'beta', '~type': type, '~properties': properties }] });
test('maps gene and cell context without claiming exact-source equivalence', () => {
  const context = expressionContext(graph({ median_donor_CPM: 5, data_version: 'older analysis' }), 'edge-1');
  expect(context).toMatchObject({ geneSymbol: 'INS', mappedCellType: 'Beta', datasetId: SC_DATASET, match: 'related', available: true, edgeRelease: 'older analysis' });
  expect(validBrowserContext(context)).toBe(true);
  expect(context.preview).toEqual([{ label: 'median_donor_CPM', value: '5' }]);
});
test('older source is retained and matching RNA gene uses explicitly related atlas; ATAC is unavailable', () => {
  expect(expressionContext(graph({ dataset_id: 'islet_of_Langerhans_scRNA_v3-3' }), 'edge-1')).toMatchObject({ available: true, datasetId: SC_DATASET, edgeDatasetId: 'islet_of_Langerhans_scRNA_v3-3', match: 'related' });
  expect(expressionContext(graph({}, 'gene_activity_score_in'), 'edge-1').available).toBe(false);
});
test('rejects unsafe gene symbols and arbitrary dataset identities', () => {
  expect(expressionContext(graph({ gene_symbol: 'INS,<script>' }), 'edge-1').available).toBe(false);
  const valid = expressionContext(graph(), 'edge-1');
  expect(validBrowserContext({ ...valid, datasetId: 'https://attacker.test' })).toBe(false);
  expect(validBrowserContext({ ...valid, mappedCellType: 'unknown' })).toBe(false);
});

test('preserves older dataset identity in legacy port and parameter URLs', () => {
  const context = expressionContext(graph({ source_url: 'https://pankbase.org:8000/single-cell.html?PKBdatasetId=islet_of_Langerhans_scRNA_v3-3' }), 'edge-1');
  expect(context.edgeDatasetId).toBe('islet_of_Langerhans_scRNA_v3-3');
  expect(context.datasetId).toBe(SC_DATASET);
  expect(context.available).toBe(true);
  expect(context.reason).toMatch(/related.*not the original source/);
});

 test.each(['gene_detected_in', 'gene_enriched_in', 'marker_gene_of', 'HuBMAP_marker_gene_of'])('%s selects matching KG gene automatically', type => {
   const kg = graph({}, type);
   kg.nodes[0]['~properties'] = { HGNC_symbol: 'GCG' };
   expect(expressionContext(kg, 'edge-1')).toMatchObject({ available: true, geneSymbol: 'GCG', mappedCellType: 'Beta', relation: type });
 });

test('any supported RNA source initializes related gene context without fetching its URLs', () => {
  const context = expressionContext(graph({ dataset_id: 'another-rna-source', source_url: 'https://other.example/data' }, 'marker_gene_of'), 'edge-1');
  expect(context).toMatchObject({ available: true, geneSymbol: 'INS', edgeDatasetId: 'another-rna-source', datasetId: SC_DATASET, match: 'related' });
  expect(context.browserUrl).toContain('datasetId=' + SC_DATASET);
  expect(validBrowserContext(context)).toBe(true);
});

test.each(['GENE_ENRICHED_IN', 'GENE_DETECTED_IN', 'MARKER_GENE_OF', 'HUBMAP_MARKER_GENE_OF', 'T1D_DEG_IN'])('canonical KG relation %s triggers expression without modifying evidence', type => {
  const kg = graph({}, type);
  expect(expressionEdges(kg)).toHaveLength(1);
  expect(firstAvailableExpression(kg)).toMatchObject({ available: true, geneSymbol: 'INS', rawRelation: type });
  expect(kg.edges[0]['~type']).toBe(type);
});
test('uppercase ATAC stays unavailable and unrelated edges do not match', () => {
  expect(expressionContext(graph({}, 'GENE_ACTIVITY_SCORE_IN'), 'edge-1')).toMatchObject({ available: false, assay: 'snATAC-seq' });
  expect(expressionEdges(graph({}, 'GENE_ENRICHED_IN_OTHER'))).toHaveLength(0);
});
test('CFTR canonical enrichment maps ductal labels and retains ND condition', () => {
  const kg = { nodes: [
    { '~id': 'ENSG00000001626', '~labels': ['Gene'], '~properties': { HGNC_symbol: 'CFTR' } },
    { '~id': 'CL_0002079', '~labels': ['anatomical_structure'], '~properties': { name: 'ductal cell' } },
  ], edges: [{ '~id': 'cftr-enriched', '~type': 'GENE_ENRICHED_IN', '~start': 'ENSG00000001626', '~end': 'CL_0002079', display_type: 'gene_enriched_in', '~properties': { condition: 'ND', data_version: '2026-04-01' } }] };
  expect(firstAvailableExpression(kg)).toMatchObject({ available: true, geneSymbol: 'CFTR', mappedCellType: 'Ductal', condition: 'ND', edgeRelease: '2026-04-01', evidenceLabel: 'Enrichment' });
});

test('recorded pancreatic ductal MUC5B+ label maps to its registered atlas category', () => {
  expect(cellLabel('pancreatic ductal cell MUC5B+')).toBe('MUC5B+ Ductal');
  expect(cellLabel('ductal cell')).toBe('Ductal');
  expect(cellLabel('pancreatic ductal cell')).toBe('Ductal');
  expect(cellLabel('unregistered ductal subtype')).toBeNull();
});
