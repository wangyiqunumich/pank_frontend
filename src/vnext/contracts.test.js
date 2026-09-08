import { groundedLiterature } from './contracts';
import { applyRunEvent, literatureNotice, liveProgress, planMarkdown, projectionForRun, selectedResultParams, stageLabel, templateRequest, withLiteratureReferences } from './contracts';
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
test('plan text makes literature intent explicit using the readable policy summary', () => {
  const summary = 'After confirmation, add literature context and alternative explanations.';
  const text = planMarkdown({ plan: { literature: false, literature_intent: { included: true, reason: 'scientific_interpretation', summary, policy_version: 'scientific-intent-v1' }, steps: [] } });
  expect(text).toContain(`Literature evidence: included. ${summary}`);
  expect(text).not.toContain('scientific_interpretation');
  expect(text).not.toContain('scientific-intent-v1');
  expect(planMarkdown({ plan: { literature: true, steps: [] } })).toContain('After confirmation, add literature context and linked references.');
  expect(planMarkdown({ plan: { literature: false, steps: [] } })).toContain('Literature evidence: not included.');
  expect(planMarkdown({ plan: { steps: [] } })).toContain('Literature evidence: not specified in this saved plan.');
});
test('explicit graph-only summary remains visible despite a stale literature boolean', () => {
  expect(planMarkdown({ plan: { literature: true, literature_intent: { included: false, reason: 'explicit_opt_out', summary: 'Use graph evidence only, as requested.' }, steps: [] } })).toContain('Literature evidence: not included. Use graph evidence only, as requested.');
});
test('literature progress distinguishes pending, partial, missing and unavailable outcomes', () => {
  const run = { status: 'running', plan: { literature: true } };
  expect(literatureNotice(run)).toBe('Literature evidence is pending.');
  expect(literatureNotice({ ...run, status: 'completed' })).toBe('No literature outcome is recorded for this run.');
  expect(literatureNotice(run, { status: 'not_requested' })).toContain('no search is recorded');
  expect(literatureNotice({ ...run, plan: { literature: false } }, { status: 'not_requested' })).toBe('');
  const partial = { status: 'partial', perspectives: [{ id: 'mechanism' }] };
  expect(literatureNotice(run, partial)).toContain('still arriving');
  expect(literatureNotice({ ...run, literature_complete: true }, partial)).toContain('Literature evidence is partial.');
  expect(literatureNotice(run, { ...partial, status: 'unavailable' })).toContain('Available perspectives and references are preserved.');
  expect(literatureNotice(run, { status: 'complete', perspectives: [] })).toBe('The literature search returned no validated perspectives.');
  expect(literatureNotice({ status: 'completed', plan: { literature: false } }, { status: 'running', repair: { requested_by: 'user' } })).toBe('Literature evidence is pending.');
});
test('literature events retain progressive perspectives and mark the final outcome', () => {
  const start = { event_sequence: 1, status: 'running', plan: { literature: true } };
  const progress = applyRunEvent(start, { sequence: 2, type: 'literature_progress', payload: { status: 'running' } });
  expect(progress.literature.status).toBe('running');
  const perspective = { id: 'm', label: 'Mechanism', answer: 'Grounded context', references: [{ pmid: '12345678' }] };
  const partial = applyRunEvent(progress, { sequence: 3, type: 'literature_perspective', payload: perspective });
  const continued = applyRunEvent(partial, { sequence: 4, type: 'literature_progress', payload: { status: 'running' } });
  expect(continued.literature.perspectives).toEqual([perspective]);
  const final = applyRunEvent(continued, { sequence: 5, type: 'literature_complete', payload: { status: 'partial', perspectives: [perspective] } });
  expect(final.literature_complete).toBe(true);
  expect(literatureNotice(final)).toContain('Literature evidence is partial.');
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
test('provided routes retain finite geometry without suppressing evidence labels', () => {
  const style = routeStyle({ route_type: 'bezier', source_port: [5, 0], target_port: [95, 0], control_points: [[30, 20], [70, 20]], label_visible: false }, { x: 0, y: 0 }, { x: 100, y: 0 });
  expect(style).toMatchObject({ 'curve-style': 'unbundled-bezier', 'control-point-weights': [0.3, 0.7], 'control-point-distances': [20, 20] });
  expect(style).not.toHaveProperty('text-opacity', 0);
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

test('validated plan is visible without advancing confirmation and replay is idempotent', () => {
  const event = {sequence: 3, type: 'plan_validated', payload: {plan_id: 'p1', plan: {review_ready: true, steps: [{id: 's1', question: 'INS expression'}]}}};
  const run = applyRunEvent({status: 'planning', event_sequence: 2}, event);
  expect(run.plan.review_ready).toBe(true);
  expect(run.status).toBe('planning');
  expect(projectionForRun(run)).toBeFalsy();
  expect(applyRunEvent(run, event)).toBe(run);
});

test('terminology interpretation and historical advisory use existing plan text', () => {
  const text = planMarkdown({status:'awaiting_confirmation',rerun_advisory:'Rerun this saved donor result.',plan:{steps:[{id:'s1',question:'HPAP donors',semantic_summary:'RNA includes documented multiome components.'}]}});
  expect(text).toContain('RNA includes documented multiome components.');
  expect(text).toContain('Rerun this saved donor result.');
});

test('groups multiple checks without dropping their readable scope', () => {
  const run = {plan:{steps:[
    {id:'a',title:'Check detection'}, {id:'b',title:'Check enrichment'}, {id:'c',title:'Check genetic support'}
  ],display_groups:[{id:'cells',title:'Cell context',step_ids:['a','b']},{id:'genetics',title:'Genetic evidence',step_ids:['c']}]}};
  const text = planMarkdown(run);
  expect(text).toContain('Cell context');
  expect(text).toContain('Check detection (after confirmation)');
  expect(text).toContain('Check enrichment (after confirmation)');
  expect(text).toContain('Genetic evidence');
});

test('old empty-result literature is hidden without deleting saved evidence', () => {
 const run={plan:{steps:[{id:'s1'}],literature:true},evidence:{steps:[{status:'empty',nodes:[],edges:[],rows:[]}]},literature:{status:'complete',perspectives:[{answer:'Unrelated'}]}};
 const visible=groundedLiterature(run);
 expect(visible.perspectives).toEqual([]);expect(literatureNotice(run,visible)).toBe('');
 expect(run.literature.perspectives).toHaveLength(1);
 expect(groundedLiterature({...run,plan:{steps:[],answer_mode:'skills'}}).perspectives).toEqual([]);
});
