import { qtlContexts, qtlEdges, QTL_CONFIG } from './qtlContext';
import { resolveResultPage } from './resultPageSchema';
const set = 'ENSG00000001626__CFTR__chr7:117542108:117559464:clu_25847:ENSG00000001626.14__credibleSet1';
const edge = { '~id': 'qtl1', '~type': 'PART_OF_QTL_SIGNAL', '~start': 'rs2402203', '~end': 'ENSG00000001626', '~properties': { data_source: 'splicing; GTEx', credible_set: set, tissue_name: 'Pancreas' } };
const result = { combined_query_result: { nodes: [{ '~id': 'rs2402203' }, { '~id': 'ENSG00000001626' }], edges: [edge] } };
export { result as qtlFixture };
test('canonical and legacy QTL edges activate the main visual with exact production key', () => {
  const contexts = qtlContexts(result);
  expect(contexts[0]).toMatchObject({ available: true, key: `1_sQTL-gtex-susie/${set}`, context: { tissue_name: 'Pancreas' } });
  expect(contexts[0].downloadUrl).toContain(encodeURIComponent(set));
  expect(resolveResultPage({ result }).mainVisuals.map(view => view.id)).toEqual(['graph_viewer', 'qtl_fine_mapping']);
  expect(qtlEdges({ edges: [{ ...edge, '~type': 'part_of_qtl_signal' }] })).toHaveLength(1);
});
test('unknown source, missing set, gene mismatch and unsafe keys cannot request a plot', () => {
  for (const props of [{ data_source: 'Unknown' }, { credible_set: '' }, { credible_set: '../other' }, { credible_set: 'ENSG00000123456__other' }]) {
    const changed = { ...result, combined_query_result: { ...result.combined_query_result, edges: [{ ...edge, '~properties': { ...edge['~properties'], ...props } }] } };
    expect(qtlContexts(changed)[0].available).toBe(false);
    expect(qtlContexts(changed)[0].downloadUrl).toBe('');
    expect(resolveResultPage({ result: changed }).mainVisuals.map(view => view.id)).toContain('qtl_fine_mapping');
  }
});
test('deduplicate source/set pairs without collapsing distinct sources or inventing QTL from keywords', () => {
  const changed = { ...result, combined_query_result: { ...result.combined_query_result, edges: [edge, { ...edge, '~id': 'qtl2' }, { ...edge, '~id': 'qtl3', '~properties': { ...edge['~properties'], data_source: 'GTEx; SusieR' } }] } };
  expect(qtlContexts(changed)).toHaveLength(2);
  expect(resolveResultPage({ result: { combined_query_result: { nodes: [], edges: [] } }, agentKeywords: ['qtl_fine_mapping'], state: { main_visual: 'qtl' } }).mainVisuals.map(view => view.id)).not.toContain('qtl_fine_mapping');
});
test('promotes only the matching QTL plot and preserves independent empirical content and raw assets', () => {
  const empirical = { title: 'Old generated plot', data_source: 'splicing; GTEx', credible_set: set, folder: '1_sQTL-gtex-susie', image_url: '/api/resources/oldplot' };
  const independent = { title: 'Independent source', image_url: '/api/resources/otherplot' };
  const changed = { ...result, resources_tabs: { empirical_evidence: empirical, empirical_evidence_groups: [empirical, independent] }, resources: { assets: [{ asset_id: 'raw', kind: 'association_tsv', media_type: 'text/tab-separated-values', url: '/api/resources/raw' }] } };
  const page = resolveResultPage({ result: changed });
  expect(page.resourceTabs.empirical_evidence_groups).toEqual([independent]);
  expect(page.insertions[0].links[0].url).toBe('/api/resources/raw');
  QTL_CONFIG.enabled = false;
  expect(resolveResultPage({ result: changed }).resourceTabs.empirical_evidence_groups).toEqual([empirical, independent]);
  QTL_CONFIG.enabled = true;
});
