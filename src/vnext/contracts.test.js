import { applyRunEvent, liveProgress, planMarkdown, projectionForRun, selectedResultParams, stageLabel, templateRequest, withLiteratureReferences } from './contracts';
import { graphElements, routeStyle } from './graphBindings';

test.each([
  ['snp', 'gene@ENSG1', 'QTL', 'qtl_by_gene'],
  ['snp@rs1', 'gene@ENSG1', 'QTL', 'qtl_by_variant_gene'],
  ['snp@rs1', 'gene', 'QTL', 'qtl_by_variant'],
  ['snp@rs1', 'disease', 'GWAS', 'gwas_by_variant'],
  ['gene@ENSG1', 'disease', 'COLOC', 'coloc_by_gene'],
  ['gene@ENSG1', 'cell_type', 'express_in', 'expression_by_gene'],
])('maps conventional triplet %s/%s/%s to approved template', (sourceTerm, targetTerm, relationship, expected) => {
  const result = templateRequest({ sourceTerm, targetTerm, relationship });
  expect(result.template_id).toBe(expected);
  expect(result).not.toHaveProperty('query');
});
test('selected credible set and lead variant survive result navigation', () => {
  expect(templateRequest(new URLSearchParams('sourceTerm=snp@rs1&targetTerm=gene@ENSG1&relationship=QTL&credible_set_id=c1&lead_snp=rs2&data_source=GTEx')).parameters).toEqual({ gene_id: 'ENSG1', variant_id: 'rs1', credible_set_id: 'c1', lead_variant_id: 'rs2', data_source: 'GTEx' });
});
test.each(['snp', 'snp@rs10'])('selected credible set survives intermediate navigation from %s search', (sourceTerm) => {
  const params = selectedResultParams({ sourceTerm, targetTerm: 'gene@ENSG1', relationship: 'QTL' }, { snp: 'rs10', gene: 'ENSG1', credible_set_id: 'ENSG1__GCLC__credibleSet1', lead_snp: 'rs11', data_source: 'GTEx; SusieR' });
  expect(templateRequest(params)).toEqual({ template_id: 'qtl_by_variant_gene', parameters: { variant_id: 'rs10', gene_id: 'ENSG1', credible_set_id: 'ENSG1__GCLC__credibleSet1', lead_variant_id: 'rs11', data_source: 'GTEx; SusieR' } });
});
test('unknown selected filters are omitted rather than serialized as undefined', () => {
  const params = selectedResultParams({ sourceTerm: 'snp', targetTerm: 'gene@ENSG1', relationship: 'QTL' }, { snp: 'rs1' });
  expect(params.has('credible_set_id')).toBe(false);
  expect(params.has('lead_snp')).toBe(false);
  expect(params.has('data_source')).toBe(false);
});
test('actual sequence envelope preserves delta then final replacement', () => {
  const initial = { event_sequence: 2, graph_answer: 'A' };
  const duplicate = applyRunEvent(initial, { sequence: 2, type: 'graph_answer', payload: { text: 'bad', delta: true } });
  expect(duplicate).toBe(initial);
  const streamed = applyRunEvent(initial, { sequence: 3, type: 'graph_answer', payload: { text: 'B', delta: true } });
  expect(streamed.graph_answer).toBe('AB');
  const final = applyRunEvent(streamed, { sequence: 4, type: 'graph_answer', payload: { answer: 'AB [G1]', evidence: { completeness: 'partial' }, delta: false } });
  expect(final.graph_answer).toBe('AB [G1]');
  expect(final.evidence.completeness).toBe('partial');
});
test('failed preview remains reviewable; legacy/clarification plans explain revision', () => {
  expect(planMarkdown({ status: 'awaiting_confirmation', plan: { steps: [] } })).toContain('Revise the plan');
  expect(planMarkdown({ preview: { status: 'failed' }, plan: { steps: [] } })).toContain('failed');
  expect(planMarkdown({ preview: { status: 'not_requested' }, plan: { clarification: 'Resolve this entity', steps: [] } })).toContain('Resolve this entity');
  expect(stageLabel('preparing_execution')).toBe('Preparing the investigation');
});
test('graph binding preserves endpoints, IDs and real disease labels despite property collisions', () => {
  const input = { nodes: [{ '~id': 'a', '~labels': ['gene'], '~properties': { name: 'INS', id: 'wrong' }, display_type: 'coding_elements' }, { '~id': 'b', '~labels': ['disease'], '~properties': { name: 'Type 2 diabetes' } }], edges: [{ '~id': 'e1', '~start': 'a', '~end': 'b', '~type': 'ASSOCIATED_WITH', '~properties': { source: 'paper', target: 'paper2', id: 'bad' }, display_type: 'associated_with' }] };
  const before = JSON.stringify(input);
  const bound = graphElements(input, { a: { x: 1, y: 2 }, b: { x: 30, y: 40 } });
  expect(bound.nodes[0].data.id).toBe('a');
  expect(bound.nodes[1].data.label).toBe('Type 2 diabetes');
  expect(bound.edges[0].data).toMatchObject({ id: 'e1', source: 'a', target: 'b', raw_type: 'ASSOCIATED_WITH' });
  expect(JSON.stringify(input)).toBe(before);
});
test('provided route positions become finite Cytoscape geometry, hidden labels respected', () => {
  const style = routeStyle({ route_type: 'bezier', source_port: [5, 0], target_port: [95, 0], control_points: [[30, 20], [70, 20]], label_visible: false }, { x: 0, y: 0 }, { x: 100, y: 0 });
  expect(style).toMatchObject({ 'curve-style': 'unbundled-bezier', 'control-point-weights': [0.3, 0.7], 'control-point-distances': [20, 20], 'text-opacity': 0 });
});
test('immutable presentation is not created from incomplete preflight or the first execution step', () => {
  const run = { run_id: 'r', status: 'planning', preview: { status: 'partial', pending_step_ids: ['step2'] }, evidence: null };
  expect(projectionForRun(run)).toBe(null);
  const ready = { ...run, status: 'awaiting_confirmation', preview: { status: 'complete' } };
  expect(projectionForRun(ready)).toEqual({ run_id: 'r', phase: 'preview' });
  const executing = { ...ready, status: 'running', stage: 'querying_graph', evidence: { steps: [{ id: 'step1' }] } };
  expect(projectionForRun(executing)).toEqual({ run_id: 'r', phase: 'preview' });
  expect(projectionForRun({ ...executing, graph_complete: true })).toEqual({ run_id: 'r', phase: 'final' });
  expect(projectionForRun({ ...executing, status: 'completed' })).toEqual({ run_id: 'r', phase: 'final' });
});
test('live progress preserves upstream four-row layout without invented completion percentages', () => {
  const progress = liveProgress({ stage: 'querying_graph', elapsed_ms: 12000 }, 'connected');
  expect(progress.entries).toHaveLength(4);
  expect(progress.entryStates[2]).toEqual({ step: 0, isFinished: false });
  expect(progress.entryStates[3]).toEqual({ step: -1, isFinished: false });
  expect(progress.tip).toContain('12 seconds elapsed');
  expect(progress.indeterminate).toBe(true);
  expect(progress).not.toHaveProperty('progress');
});
test('progressive literature references join the existing tab without an external lookup', () => {
  const tabs = { references: { graph: { id: 'graph', pmid: '12345678', title: 'PubMed 12345678' } } };
  const merged = withLiteratureReferences(tabs, { perspectives: [{ label: 'Mechanism', references: [{ pmid: '12345678', title: 'An observed paper title', document_id: 'doc1', source_type: 'paper' }, { id: 'unsafe', url: 'javascript:alert(1)', title: 'No active link' }] }] });
  expect(Object.keys(merged.references)).toHaveLength(2);
  expect(merged.references['pmid:12345678']).toMatchObject({ title: 'An observed paper title', href: 'https://pubmed.ncbi.nlm.nih.gov/12345678/', document_id: 'doc1' });
  expect(merged.references.unsafe.href).toBeUndefined();
  expect(tabs.references.graph.title).toBe('PubMed 12345678');
});
test('shared PMID retains both perspectives and actual journal/date/source metadata', () => {
  const literature = { perspectives: [
    { label: 'Mechanism', references: [{ pmid: '12345678', title: 'Reported preprint title', journal: 'bioRxiv', date: '2025-04-02', source: 'tdm', source_type: 'preprint', document_id: 'doc1' }] },
    { label: 'Alternative explanation', references: [{ pmid: '12345678', title: 'Reported preprint title', journal: 'bioRxiv', source: 'pmc_oa' }] },
  ] };
  const before = JSON.stringify(literature);
  const result = withLiteratureReferences({}, literature);
  const ref = result.references['pmid:12345678'];
  expect(Object.keys(result.references)).toHaveLength(1);
  expect(ref).toMatchObject({ source_type: 'preprint', document_id: 'doc1', date: '2025-04-02', perspective_labels: ['Mechanism', 'Alternative explanation'] });
  ['bioRxiv', '2025-04-02', 'tdm', 'pmc_oa', 'preprint', 'doc1', 'Mechanism', 'Alternative explanation'].forEach((value) => expect(ref.subtitle).toContain(value));
  expect(ref.subtitle.match(/bioRxiv/g)).toHaveLength(1);
  expect(withLiteratureReferences(result, literature).references['pmid:12345678'].subtitle.split(' • ').filter((value) => value === 'Mechanism')).toHaveLength(1);
  expect(JSON.stringify(literature)).toBe(before);
});
