import { DEBUG_STREAM_LOADING_ENTRIES } from '../SearchResult/streamLoadingProgress';
export const TEMPLATE_IDS = ['qtl_by_gene', 'qtl_by_variant_gene', 'qtl_by_variant', 'gwas_by_variant', 'coloc_by_gene', 'expression_by_gene'];
export function projectionForRun(run) {
  if (!run?.run_id) return null;
  const terminal = ['completed', 'complete', 'partial', 'failed', 'cancelled', 'interrupted'].includes(run.status);
  if (run.evidence && (run.graph_complete || terminal || run.stage === 'searching_literature')) return { run_id: run.run_id, phase: 'final' };
  const pending = run.preview?.pending_step_ids || run.preview?.evidence?.pending_step_ids || [];
  if (run.preview && !pending.length && ['awaiting_confirmation', 'queued', 'running', 'completed', 'complete', 'partial'].includes(run.status)) return { run_id: run.run_id, phase: 'preview' };
  return null;
}
export function withLiteratureReferences(tabs = {}, literature) {
  const references = {};
  const keyFor = (ref) => ref.pmid ? `pmid:${ref.pmid}` : ref.doi ? `doi:${String(ref.doi).toLowerCase()}` : String(ref.id || ref.document_id || ref.href || ref.url || ref.link || '');
  Object.values(tabs.references || {}).forEach((ref) => { const key = keyFor(ref); if (key) references[key] = { ...ref }; });
  (literature?.perspectives || []).forEach((perspective) => (perspective.references || []).forEach((ref) => {
    const key = keyFor(ref);
    if (!key) return;
    const previous = references[key] || {};
    const merged = { ...previous, ...Object.fromEntries(Object.entries(ref).filter(([, value]) => value !== undefined && value !== null && value !== '')) };
    const url = ref.href || ref.url || ref.link || (ref.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${ref.pmid}/` : ref.doi ? `https://doi.org/${ref.doi}` : '');
    const href = /^https?:\/\//i.test(url) ? url : undefined;
    const perspectiveLabels = [...new Set([...(previous.perspective_labels || []), perspective.label].filter(Boolean))];
    const metadata = [merged.journal, merged.date, merged.year, merged.source, merged.source_type, merged.document_id].filter((value) => (typeof value === 'string' || typeof value === 'number') && String(value).trim()).map(String);
    const subtitle = [...new Set([...metadata, ...(previous.subtitle || '').split(' • '), ...perspectiveLabels].filter(Boolean))].join(' • ');
    references[key] = { ...merged, id: key, href,
      title: ref.title || previous.title || (ref.pmid ? `PubMed ${ref.pmid}` : ref.document_id || ref.id),
      perspective_labels: perspectiveLabels, subtitle,
    };
  }));
  return { ...tabs, references };
}

export function selectedResultParams(searchState, item) {
  const { sourceTerm, targetTerm, relationship } = searchState;
  return new URLSearchParams({
    ...Object.fromEntries(['credible_set_id', 'lead_snp', 'data_source'].filter((key) => item[key] !== undefined && item[key] !== null && item[key] !== '').map((key) => [key, item[key]])),
    sourceTerm: sourceTerm.includes('@') ? sourceTerm : `${sourceTerm}@${item[sourceTerm]}`,
    targetTerm: targetTerm.includes('@') ? targetTerm : `${targetTerm}@${item[targetTerm]}`,
    relationship,
  });
}

const termId = (value = '') => String(value).split('@').slice(1).join('@');
export function templateRequest(input) {
  const get = (key) => input instanceof URLSearchParams ? input.get(key) : input[key];
  const source = get('sourceTerm') || '';
  const target = get('targetTerm') || '';
  const relationship = get('relationship');
  const geneId = source.startsWith('gene@') ? termId(source) : (target.startsWith('gene@') ? termId(target) : '');
  const variantId = source.startsWith('snp@') ? termId(source) : '';
  let templateId;
  if (relationship === 'express_in') templateId = 'expression_by_gene';
  else if (relationship === 'COLOC') templateId = 'coloc_by_gene';
  else if (relationship === 'GWAS') templateId = 'gwas_by_variant';
  else if (relationship === 'QTL') templateId = variantId ? (geneId ? 'qtl_by_variant_gene' : 'qtl_by_variant') : 'qtl_by_gene';
  else throw new Error('This conventional search template is unavailable in this demo.');
  const parameters = {
    ...(geneId ? { gene_id: geneId } : {}), ...(variantId ? { variant_id: variantId } : {}),
    ...(get('credible_set_id') ? { credible_set_id: get('credible_set_id') } : {}),
    ...(get('lead_snp') ? { lead_variant_id: get('lead_snp') } : {}),
    ...(get('data_source') ? { data_source: get('data_source') } : {}),
  };
  return { template_id: templateId, parameters };
}

export function applyRunEvent(state, event) {
  const sequence = Number(event.seq ?? event.sequence);
  if (!Number.isFinite(sequence) || sequence <= Number(state.event_sequence || 0)) return state;
  const payload = event.payload || {};
  const next = { ...state, event_sequence: sequence, elapsed_ms: event.elapsed_ms, stage: event.stage || state.stage, status: event.status || state.status };
  if (event.type === 'plan_ready') Object.assign(next, { plan: payload.plan, plan_id: payload.plan_id, preview: payload.preview, status: 'awaiting_confirmation' });
  if (event.type === 'preview_step') next.preview = payload.preview;
  if (event.type === 'graph_answer') {
    next.graph_answer = payload.delta ? (state.graph_answer || '') + (payload.text || '') : (payload.answer ?? payload.text ?? state.graph_answer);
    if (!payload.delta) { next.evidence = payload.evidence; next.graph_complete = true; }
  }
  if (event.type === 'literature_perspective') {
    const perspectives = [...(state.literature?.perspectives || [])];
    const index = perspectives.findIndex((p) => p.id === payload.id);
    if (index < 0) perspectives.push(payload); else perspectives[index] = payload;
    next.literature = { ...state.literature, status: 'partial', perspectives };
  }
  if (event.type === 'literature_complete') next.literature = payload;
  if (event.type === 'terminal') Object.assign(next, { status: payload.status || event.status, error: payload.error || state.error, replacement_run_id: payload.replacement_run_id });
  return next;
}

export function planMarkdown(run) {
  const plan = run?.plan || {};
  const text = (plan.steps || []).map((step, index) => {
    const entities = (step.resolved_entities || []).map((entity) => {
      if (entity.state === 'resolved') return `${entity.name || entity.id} (${entity.id})`;
      return `${entity.requested?.value || 'Entity'}: ${entity.state}${entity.candidates?.length ? `; candidates: ${entity.candidates.map((c) => `${c.name} (${c.id})`).join(', ')}` : ''}`;
    });
    return `${index + 1}. **${step.title || step.question}**${step.purpose === 'context' ? ' — Related context' : ''}\n\n   ${step.rationale || ''}${entities.length ? `\n\n   Resolved entities: ${entities.join('; ')}` : ''}`;
  }).join('\n\n');
  const preview = run?.preview;
  const notice = plan.clarification || (!preview && run?.status === 'awaiting_confirmation'
    ? 'This saved plan needs an initial evidence check. Revise the plan to continue.'
    : preview ? `Initial evidence check: ${preview.status}. Related context is preliminary.` : 'Checking initial graph evidence.');
  return `${text}\n\n${notice}`;
}

const STAGES = { queued: 'Waiting for capacity', planning: 'Preparing the plan', preparing_preview: 'Checking initial graph evidence', resolving_entities: 'Resolving graph entities', generating_cypher: 'Preparing the graph query', validating: 'Checking the graph query', querying_graph: 'Checking graph evidence', preparing_execution: 'Preparing the investigation', reusing_preview: 'Using the checked graph evidence', writing_answer: 'Writing the grounded answer', searching_literature: 'Searching literature', awaiting_confirmation: 'Awaiting confirmation' };
export function stageLabel(stage) { return STAGES[stage] || 'Preparing the investigation'; }
export function liveProgress(run, connection) {
  const graphPreparation = ['preparing_preview', 'resolving_entities', 'generating_cypher', 'validating', 'querying_graph'].includes(run?.stage);
  const current = graphPreparation ? 2 : 0;
  return { title: 'Answering your question...', shortTitle: stageLabel(run?.stage), entries: DEBUG_STREAM_LOADING_ENTRIES,
    entryStates: DEBUG_STREAM_LOADING_ENTRIES.map((_, index) => ({ step: index < current ? 1 : index === current ? 0 : -1, isFinished: index < current })),
    indeterminate: true, useFakeTimer: false,
    tip: `${connection === 'reconnecting' ? 'Reconnecting to the saved investigation. ' : ''}${Math.floor((run?.elapsed_ms || 0) / 1000)} seconds elapsed. Progress reflects current activity.`, cancel: 'Cancel and ask a new question' };
}
