import { DEBUG_STREAM_LOADING_ENTRIES } from '../SearchResult/streamLoadingProgress';
export const TEMPLATE_IDS = ['qtl_by_gene', 'qtl_by_variant_gene', 'qtl_by_variant', 'gwas_by_variant', 'coloc_by_gene', 'expression_by_gene'];
const literatureIncluded = (plan) => typeof plan?.literature_intent?.included === 'boolean' ? plan.literature_intent.included : typeof plan?.literature === 'boolean' ? plan.literature : null;

export function literatureNotice(run, literature = run?.literature) {
  const included = literatureIncluded(run?.plan);
  const state = literature?.status;
  const hasPerspectives = Boolean(literature?.perspectives?.length);
  const terminal = ['completed', 'complete', 'partial', 'failed', 'cancelled', 'interrupted', 'superseded'].includes(run?.status);
  const preserved = hasPerspectives ? ' Available perspectives and references are preserved.' : '';
  if (['unavailable', 'failed', 'timeout'].includes(state)) return `Literature evidence is unavailable.${preserved}`;
  if (['cancelled', 'interrupted'].includes(state)) return `Literature retrieval was ${state}.${preserved}`;
  if (state === 'not_requested') return included === true ? 'Literature enrichment was included in the plan, but no search is recorded for this run.' : '';
  if (state === 'complete' || state === 'completed') return hasPerspectives ? '' : 'The literature search returned no validated perspectives.';
  if (state === 'partial') return terminal || run?.literature_complete
    ? `Literature evidence is partial.${preserved}`
    : 'Literature evidence is still arriving; available perspectives are shown below.';
  if (['pending', 'queued', 'running', 'searching'].includes(state)) return terminal && !literature?.repair
    ? `Literature retrieval did not finish.${preserved}` : 'Literature evidence is pending.';
  if (included !== true) return '';
  if (terminal) return 'No literature outcome is recorded for this run.';
  if (['planning', 'awaiting_confirmation'].includes(run?.status)) return 'Literature evidence will be retrieved after confirmation.';
  return 'Literature evidence is pending.';
}

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
  if (event.type === 'plan_validated') Object.assign(next, { plan: payload.plan, plan_id: payload.plan_id });
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
  if (event.type === 'literature_progress') next.literature = { ...state.literature, status: state.literature?.perspectives?.length ? 'partial' : 'running' };
  if (event.type === 'literature_complete') { next.literature = payload; next.literature_complete = true; }
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
    return `${index + 1}. **${step.title || step.question}**${step.purpose === 'context' ? ' — Related context' : ''}\n\n   ${step.rationale || ''}${step.semantic_summary ? `\n\n   ${step.semantic_summary}` : ''}${step.semantic_issues?.length ? `\n\n   ${step.semantic_issues.join(' ')}` : ''}${entities.length ? `\n\n   Resolved entities: ${entities.join('; ')}` : ''}`;
  }).join('\n\n');
  const preview = run?.preview;
  const notice = run?.rerun_advisory || plan.clarification || (!preview && run?.status === 'awaiting_confirmation'
    ? 'This saved plan needs an initial evidence check. Revise the plan to continue.'
    : preview ? `Initial evidence check: ${preview.status}. Related context is preliminary.` : 'Checking initial graph evidence.');
  const included = literatureIncluded(plan);
  const summary = typeof plan.literature_intent?.summary === 'string' ? plan.literature_intent.summary.trim() : '';
  const literature = included === null ? 'Literature evidence: not specified in this saved plan.'
    : `Literature evidence: ${included ? 'included' : 'not included'}. ${summary || (included ? 'After confirmation, add literature context and linked references.' : 'This plan uses graph evidence only.')}`;
  return `${text}\n\n${literature}\n\n${notice}`;
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
