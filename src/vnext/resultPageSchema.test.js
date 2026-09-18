import { resolveResultPage } from './resultPageSchema';

const graph = () => ({ status: 'ready', combined_query_result: { nodes: [{ '~id': 'GENE1' }], edges: [{ '~type': 'part_of_QTL_signal' }] }, component_status: { graph: 'available', resources: 'available' } });
const functional = () => ({ status: 'ready', visual_material_kind: 'functional_traces',
  evidence: { functional_filters: { trace_type: 'ins_ieq', disease: 'ND' }, rows: [{ time_minutes: 0, mean_response: 1.2 }] },
  component_status: { resources: 'available' }, resources_tabs: { empirical_evidence: { title: 'Cohort response', image_url: '/api/resources/functionalplot', download_url: '/api/resources/functionalplot' } } });
const sourceAsset = () => ({ asset_id: 'rawtable', kind: 'association_tsv', media_type: 'text/tab-separated-values',
  url: '/api/resources/rawtable', data_source: 'Recorded study', credible_set: 'set1', download_name: 'set1.txt' });

test('state then controlled keywords choose among available views', () => {
  const result = { ...functional(), combined_query_result: graph().combined_query_result };
  expect(resolveResultPage({ result }).mainVisuals.map(v => v.id)).toEqual(['functional_data', 'graph_viewer']);
  expect(resolveResultPage({ result, state: { main_visual: 'graph' }, agentKeywords: ['functional_data'] }).mainVisuals[0].id).toBe('graph_viewer');
  expect(resolveResultPage({ result, agentKeywords: ['kg_view'] }).mainVisuals[0].id).toBe('graph_viewer');
});

test('hints cannot fabricate functional context or reveal the hidden genome browser', () => {
  const page = resolveResultPage({ result: graph(), state: { main_visual: 'genome_browser' }, agentKeywords: ['functional_data', 'genome_browser'] });
  expect(page.mainVisuals.map(v => v.id)).toEqual(['graph_viewer']);
  expect(page.decisions.find(d => d.component === 'genome_browser').reason).toBe('hidden_or_disabled');
});

test('reads exact keyword arrays without scanning answer prose', () => {
  const result = { ...functional(), combined_query_result: graph().combined_query_result, answer: 'Display a knowledge_graph' };
  expect(resolveResultPage({ result }).mainVisuals[0].id).toBe('functional_data');
  expect(resolveResultPage({ result, run: { evidence: { result_page_keywords: ['kg_view'] } } }).mainVisuals[0].id).toBe('graph_viewer');
  expect(resolveResultPage({ result, agentKeywords: ['execute_html'] }).decisions).toContainEqual(expect.objectContaining({ reason: 'unknown_keyword' }));
});

test('raw download requires typed data assets; a plot download URL never qualifies', () => {
  const result = functional();
  result.resources = { assets: [{ asset_id: 'functionalplot', kind: 'functional_trace', media_type: 'image/png', url: '/api/resources/functionalplot' }] };
  expect(resolveResultPage({ result, agentKeywords: ['raw_data'] }).insertions).toEqual([]);
  result.resources.assets.push(sourceAsset());
  const page = resolveResultPage({ result });
  expect(page.insertions).toHaveLength(1);
  expect(page.insertions[0].links).toHaveLength(1);
  expect(page.insertions[0].links[0].url).toBe('/api/resources/rawtable');
});

test('data download retains source context and rejects unavailable, unsafe and duplicate assets', () => {
  const asset = sourceAsset();
  const result = { ...graph(), resources: { assets: [asset, asset, { ...asset, url: 'https://example.org/table' },
    { ...asset, url: '/api/resources/failed', status: 'unavailable' }, { ...asset, url: '/api/resources/rawimage', media_type: 'image/png' }],
    resource_groups: [{ asset_id: asset.asset_id, status: 'available', context: { tissue_name: 'Islet' } }] } };
  const page = resolveResultPage({ result });
  expect(page.insertions[0].links).toHaveLength(1);
  expect(page.insertions[0].links[0].label).toContain('Islet');
  expect(page.decisions.find(d => d.component === 'raw_data_download').by).toBe('kg_rule');
});

test('metadata export is labeled as metadata and source failure removes a stale asset', () => {
  const asset = { ...sourceAsset(), kind: 'donor_index' };
  const result = { ...graph(), resources: { assets: [asset] } };
  expect(resolveResultPage({ result }).insertions[0].links[0].label).toContain('metadata');
  result.resources.resource_groups = [{ asset_id: asset.asset_id, status: 'unavailable' }];
  expect(resolveResultPage({ result }).insertions).toEqual([]);
});

test('functional main asset is deduplicated while independent empirical groups remain', () => {
  const result = functional();
  const association = { title: 'Independent association evidence', image_url: '/api/resources/associationplot', download_url: '/api/resources/rawtable' };
  const other = { ...association, title: 'Another source', image_url: '/api/resources/otherplot', data_source: 'study2' };
  result.resources = { resource_groups: [
    { resources_tabs: { empirical_evidence: result.resources_tabs.empirical_evidence } },
    { resources_tabs: { empirical_evidence: association } },
    { resources_tabs: { empirical_evidence: other } },
  ] };
  const page = resolveResultPage({ result });
  expect(page.resourceTabs.empirical_evidence_groups).toEqual([association, other]);
  expect(page.supportingTabs).toContainEqual({ id: 'empirical_evidence', label: 'Empirical Evidence' });
  expect(result.resources_tabs.empirical_evidence.image_url).toBe('/api/resources/functionalplot');
});

test('references and links use schema order and never accept a keyword URL', () => {
  const result = { ...graph(), resources_tabs: { references: { PMID1: { pmid: '123', title: 'Source' } },
    pankbase_links: [['Methods', 'https://example.org/methods']], external_links: [['Unsafe', 'bad', 'javascript:alert(1)']],
    empirical_evidence: { title: 'Association evidence', image_url: '/api/resources/plot' } } };
  const page = resolveResultPage({ result, agentKeywords: ['links', 'https://example.org/new'] });
  expect(page.supportingTabs.map(t => t.id)).toEqual(['references', 'pankbase_links', 'empirical_evidence']);
  expect(page.resourceTabs.external_links).toEqual([]);
});

test('mixed source success and failure retains a scoped failure card', () => {
  const result = { ...graph(), resources: { resource_groups: [
    { status: 'available', resources_tabs: { empirical_evidence: { title: 'Returned source', image_url: '/api/resources/good' } } },
    { status: 'unavailable', source_key: 'source2', data_source: 'Study 2' },
  ] } };
  const page = resolveResultPage({ result });
  expect(page.resourceTabs.empirical_evidence_groups).toHaveLength(2);
  expect(page.resourceTabs.empirical_evidence_groups[1].description).toContain('Study 2');
  expect(page.resourceTabs.empirical_evidence_groups[1].status).toBe('unavailable');
});

test('empty filters alone or an assay mention does not select functional data', () => {
  expect(resolveResultPage({ result: { ...graph(), evidence: { functional_filters: {} } } }).mainVisuals.map(v => v.id)).toEqual(['graph_viewer']);
  expect(resolveResultPage({ result: { ...graph(), evidence: { functional_filters: 'perifusion' } }, agentKeywords: ['perifusion'] }).mainVisuals.map(v => v.id)).toEqual(['graph_viewer']);
});

test('loading and failed graph work keep the status view; explanation-only work does not invent a graph', () => {
  expect(resolveResultPage().mainVisuals).toEqual([{ id: 'graph_viewer', label: 'Knowledge Graph', status: 'pending' }]);
  const result = { status: 'ready', completeness: 'failed', component_status: { graph: 'unavailable', resources: 'unavailable' } };
  const page = resolveResultPage({ result });
  expect(page.mainVisuals[0].status).toBe('unavailable');
  expect(page.resourceTabs.empirical_evidence.status).toBe('unavailable');
  expect(resolveResultPage({ result: {}, run: { plan: { answer_mode: 'explanation', steps: [] } } }).mainVisuals).toEqual([]);
});

test('pending functional response uses its own status without empty graph/references placeholders', () => {
  const result = { source: { template_id: 'functional_traces' }, component_status: { resources: 'pending' } };
  const page = resolveResultPage({ result });
  expect(page.mainVisuals).toEqual([{ id: 'functional_data', label: 'Functional Data', status: 'pending' }]);
  expect(page.supportingTabs).toEqual([]);
});
