import '../SearchResult/scoped.css';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Button, Typography, CircularProgress } from '@mui/material';
import KnowledgeGraph from './KnowledgeGraph';
import QuestionAnswerPage, { PlanConfirmationPage } from './ResultComponent';
import { ErrorComponent } from './ErrorComponent';
import { AlertMessage } from '../components/SupportingMaterial';
import SearchResultLoading from './Loading';
import { upsertRecentChat } from '../utils/chatSessionStorage';
import { safeLocalStorage } from '../utils/safeStorage';
import ConnectionNotice from './ConnectionNotice';
import QueryRecoveryDialog, { queryRecovery } from './QueryRecoveryDialog';
import Diagnostics, { diagnosticsFor } from './Diagnostics';
import AnswerMarkdown from './AnswerMarkdown';
import FunctionalVisual from './FunctionalVisual';
import SummaryInsertions from './SummaryInsertions';
import { resolveResultPage } from './resultPageSchema';
import { useResourcePanels } from './Resources';
import { applyRunEvent, groundedLiterature, literatureNotice, liveProgress, planMarkdown, projectionForRun, templateRequest, withLiteratureReferences } from './contracts';
import { cancelRun, confirmPlan, createPlanOnce, createResultOnce, getRun, getResult, pollResult, revisePlan, sitePath, TERMINAL_RUNS, watchRun } from './api';

import { recordInteraction, referenceKey } from './telemetry';
import { questionInputError } from './questionInput';

const readLocal = (key) => { try { return JSON.parse(safeLocalStorage.getItem(key)); } catch (_) { return null; } };
const writeLocal = (key, value) => safeLocalStorage.setItem(key, JSON.stringify(value));
const decodeQuestion = (value) => { try { return decodeURIComponent(escape(atob(value))); } catch (_) { return value || ''; } };
const sessionKey = (id) => `pank-vnext:session:${id}`;
const resultKey = (id, phase) => `pank-vnext:presentation:${id}:${phase}`;
export async function readPriorConversation(ids, currentId, options = {}) {
  let unavailable = 0;
  const saved = await Promise.all(ids.filter(id => id !== currentId).slice(-19).map(async (id) => {
    try {
      const run = await getRun(id, options);
      if (!['completed', 'complete', 'partial'].includes(run.status)) return null;
      const resultId = readLocal(resultKey(id, 'final')) || readLocal(resultKey(id, 'preview'));
      let result = null;
      if (resultId) { try { result = await getResult(resultId, options); } catch (_) { unavailable += 1; } }
      return { run, result, error: result?.combined_query_result ? '' : 'The saved graph presentation is unavailable. The recorded answer is preserved.' };
    } catch (_) { unavailable += 1; return null; }
  }));
  return { items: saved.filter(Boolean), unavailable };
}

export function useProjectedResult(payload, savedId = '') {
  const key = savedId ? `saved:${savedId}` : payload ? JSON.stringify(payload) : '';
  const [storedResult, setStoredResult] = useState(null);
  // Clearing the preview on preview -> final is not needed anymore: the
  // updated PanKagent streams one durable run. Keep its graph mounted until
  // the replacement is ready, preserving pan/zoom. Never reuse another run.
  const scope = payload?.run_id || key;
  const result = storedResult?.scope === scope ? storedResult.value : null;
  const [error, setError] = useState('');
  const [connection, setConnection] = useState('connected');
  const [readAttempt, setReadAttempt] = useState(0);
  const createdRef = useRef(null);
  const reconnect = useCallback(() => { if (createdRef.current?.key === key) setReadAttempt(value => value + 1); }, [key]);
  useEffect(() => {
    // setStoredResult(null); // Not needed anymore: causes a graph teardown
    // and a page-refresh-like flash during same-run progressive updates.
    setError('');
    setConnection('connected');
    if (!key) return;
    const controller = new AbortController();
    const creation = createdRef.current?.key === key ? Promise.resolve(createdRef.current) : savedId ? Promise.resolve({ result_id: savedId }) : createResultOnce(JSON.parse(key));
    creation.then((created) => {
      if (!controller.signal.aborted) {
        createdRef.current = { key, result_id: created.result_id };
        const source = savedId ? {} : JSON.parse(key);
        if (source.template_id && window.location.pathname === '/result-new') {
          const params = new URLSearchParams(window.location.search);
          params.set('provider', 'vnext'); params.set('result_id', created.result_id);
          window.history.replaceState({}, '', sitePath(`/result-new?${params}`));
        }
        if (source.run_id) writeLocal(resultKey(source.run_id, source.phase || 'final'), created.result_id);
      }
      if (!controller.signal.aborted) return pollResult(created.result_id, (value) => {
        if (controller.signal.aborted) return;
        setError('');
        setStoredResult((previous) => {
          // A queued projection is not a replacement for a visible graph.
          if (previous?.scope === scope && previous.value?.combined_query_result
              && !value.combined_query_result && !['ready', 'failed', 'cancelled'].includes(value.status)) return previous;
          return { key, scope, value };
        });
      }, { signal: controller.signal, onConnection: state => { if (!controller.signal.aborted) setConnection(state); } });
    }).catch((err) => { if (!controller.signal.aborted) { setError(err.message); if (createdRef.current?.key === key) setConnection('exhausted'); } });
    return () => controller.abort();
  }, [key, scope, readAttempt, savedId]);
  return [result, error, { status: connection, reconnect: createdRef.current?.key === key ? reconnect : undefined }];
}

function GraphPanel({ result, error, onEvidenceInspect }) {
  const graphStatus = typeof result?.component_status?.graph === 'string'
    ? result.component_status.graph : result?.component_status?.graph?.status;
  const pending = value => ['preparing', 'pending', 'queued', 'running', 'processing'].includes(value);
  const failed = value => ['failed', 'unavailable', 'cancelled', 'interrupted'].includes(value);
  const graphError = error || (failed(result?.status) || failed(graphStatus) || failed(result?.completeness)
    ? 'Graph retrieval could not finish. Available answer sections are preserved.' : '');
  const waiting = !graphError && (!result || pending(result.status) || pending(graphStatus));
  const empty = !waiting && (graphStatus === 'empty' || (result?.status === 'ready' && Array.isArray(result?.combined_query_result?.nodes) && !result.combined_query_result.nodes.length));
  if (result?.combined_query_result?.nodes?.length) return <Box sx={{ width: '100%', height: '100%' }}>
    <KnowledgeGraph onEvidenceInspect={onEvidenceInspect} graphData={result.combined_query_result} coordData={result.xy_json} edgeRoutes={result.edge_routes} sx={{ height: '100%' }} containerHeight="100%" />
  </Box>;
  return <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    {waiting ? <Box role="status" aria-label="Loading graph" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}><CircularProgress size={28} /><Typography sx={{ fontSize: 14, color: '#64748B' }}>Loading graph…</Typography></Box> : <Typography sx={{ fontSize: 14, color: '#64748B', textAlign: 'center', px: 2 }}>{graphError || (empty ? 'No matching graph evidence was returned.' : 'The graph presentation is unavailable. Available answer sections are preserved.')}</Typography>}
  </Box>;
}

export function ResultSection({ run, result, error, planning, busy, onRevise, onConfirm, onFollowUp, anchorPrefix, presentationState }) {
  const sectionRef = useRef(null);
  const visualOrderRef = useRef({ scope: null, preference: null, ids: [] });
  const runId = run?.run_id || result?.result_id;
  const trackingScope = run?.run_id ? 'run' : 'result';
  const onEvidenceInspect = useCallback((id) => { recordInteraction(runId, 'graph_evidence_inspected', referenceKey(id), trackingScope); }, [runId, trackingScope]);
  useEffect(() => {
    if (!runId || !sectionRef.current || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) {
        recordInteraction(runId, planning ? 'plan_displayed' : 'answer_section_displayed', planning ? 'plan' : entry.target.id, trackingScope);
        observer.unobserve(entry.target);
      }
    }), { threshold: 0.01 });
    const targets = planning ? [sectionRef.current] : [...sectionRef.current.querySelectorAll('[id]')].filter((el) => /-ai-overview-\d+$/.test(el.id));
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [runId, trackingScope, planning, run?.graph_answer, run?.literature, result?.literature]);
  const onResourceAccess = useCallback((event) => {
    const link = event.target.closest?.('a[href]');
    if (link) recordInteraction(runId, 'resource_accessed', referenceKey(link.getAttribute('href')), trackingScope);
  }, [runId, trackingScope]);
  const literature = groundedLiterature(run, result);
  const resourceTabs = withLiteratureReferences(result?.resources_tabs, literature);
  const page = resolveResultPage({ result, run, state: presentationState, resourceTabs });
  const resources = useResourcePanels(page.resourceTabs, page.resourceStatus, { tabs: page.supportingTabs });
  const graphData = result?.combined_query_result || null;
  const graphError = error || (planning && run?.plan?.clarification) || (planning && run?.preview?.status === 'failed' ? 'The initial graph retrieval failed. Revise the plan before continuing; this failure does not indicate biological absence.' : '');
  const visualRenderers = {
    graph_viewer: <GraphPanel onEvidenceInspect={onEvidenceInspect} result={result} error={graphError} />,
    functional_data: <FunctionalVisual result={result} />,
  };
  const selectedVisuals = page.mainVisuals.filter((visual) => Object.prototype.hasOwnProperty.call(visualRenderers, visual.id));
  const selectedIds = selectedVisuals.map((visual) => visual.id);
  const visualScope = runId || anchorPrefix;
  const visualPreference = (presentationState || result?.result_page_state)?.main_visual;
  const previousOrder = visualOrderRef.current;
  // The existing pane renderer keys tabs by position. Keep already selected
  // visuals in place as evidence arrives, so graph pan/zoom survives new tabs.
  const visualIds = previousOrder.scope === visualScope && previousOrder.preference === visualPreference
    ? [...previousOrder.ids.filter((id) => selectedIds.includes(id)), ...selectedIds.filter((id) => !previousOrder.ids.includes(id))]
    : selectedIds;
  visualOrderRef.current = { scope: visualScope, preference: visualPreference, ids: visualIds };
  const visualTabs = visualIds.map((id) => ({ id, label: selectedVisuals.find((visual) => visual.id === id).label, content: visualRenderers[id] }));
  const visualMaterial = visualTabs.length ? { title: page.mainVisualTitle, tabs: visualTabs } : undefined;
  const planData = {
    questionId: 'PLAN', title: 'Confirm Query & Execution Steps', originalQuestion: run?.plan?.original_question || run?.question || '', parsedTitle: run?.plan?.interpreted_question || '',
    agentPlan: planMarkdown(run), revisionQuestion: run?.question || '', revisionKey: run?.plan_id,
    disableRevise: busy, disableProceed: busy || !run?.preview || run?.preview?.confirmation_eligible === false || Boolean(run?.plan?.clarification) || run?.status !== 'awaiting_confirmation',
    onSendFeedback: onRevise, onProceed: onConfirm, graphData, visualMaterial,
  };
  const sections = [{ content: <AnswerMarkdown answer={run?.graph_answer || result?.answer?.text || result?.answer || (run?.error?.message || 'Writing the grounded answer…')} references={resources.references} /> }];
  if (page.insertions.length) sections.push({ content: <SummaryInsertions insertions={page.insertions} /> });
  const literatureStatus = literatureNotice(run, literature);
  if (literatureStatus) sections.push({ content: <AnswerMarkdown answer={literatureStatus} references={resources.references} /> });
  (literature?.perspectives || []).forEach((perspective) => sections.push({ heading: perspective.label || 'Literature perspective', content: <AnswerMarkdown answer={perspective.answer || ''} references={resources.references} /> }));
  const display = result?.display;
  const completeness = result?.completeness || run?.evidence?.completeness;
  const evidenceNotice = run?.rerun_advisory || (typeof display?.notice === 'string' ? display.notice : (['partial', 'failed', 'unavailable'].includes(completeness) ? `Graph evidence is ${completeness}.` : ''));
  if (evidenceNotice) sections.push({ content: <Typography sx={{ fontSize: 14, color: '#64748B' }}>{evidenceNotice}</Typography> });
  const data = {
    styleVariant: 'pank1', questionId: 'Q1', title: run?.plan?.interpreted_question || run?.question || result?.question || '',
    // Completion-triggered scroll reset is not needed anymore: streamed
    // answers update in place and must not interrupt the user's reading.
    aiOverview: { title: page.summaryTitle, sections, isLoading: !run?.graph_answer && !result?.answer, scrollToTop: false },
    graphData, visualMaterial, evidences: resources.tabs.length ? { title: page.supportingTitle, tabs: resources.tabs } : undefined,
    followUp: { title: 'Follow Up', onSelect: onFollowUp ? (item) => onFollowUp(item.label) : undefined, items: (run?.evidence?.follow_up_questions || result?.evidence?.follow_up_questions || []).map((question) => ({ label: question })), loading: !TERMINAL_RUNS.has(run?.status), disabled: !TERMINAL_RUNS.has(run?.status) },
  };
  return <>{resources.popup}<Box ref={sectionRef} onClickCapture={onResourceAccess} id={`${anchorPrefix}-question-1`}>{planning ? <PlanConfirmationPage data={planData} contentAnchorPrefix={anchorPrefix} /> : <QuestionAnswerPage data={data} contentAnchorPrefix={anchorPrefix} />}</Box></>;
}

export default function AgentResultView({ contentAnchorPrefix = 'result-1', onContentMeta } = {}) {
  const location = useLocation();
  const navigate = useNavigate();
  const route = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const [run, setRun] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [connection, setConnection] = useState('connected');
  const [previous, setPrevious] = useState([]);
  const [historyError, setHistoryError] = useState('');
  const [failedFollowUp, setFailedFollowUp] = useState(null);
  const streamRef = useRef(null);
  const runRef = useRef(null);
  const mounted = useRef(true);
  const metaRef = useRef('');
  const bootstrapRef = useRef(null);
  const projectionRef = useRef(null);
  const followUpPending = useRef(false);
  const loadVersion = useRef(0);
  const readController = useRef(null);
  const readRunId = useRef(null);
  runRef.current = run;

  const attachRun = useCallback(async (runId) => {
    const version = ++loadVersion.current;
    streamRef.current?.();
    readController.current?.abort();
    const controller = new AbortController();
    readController.current = controller;
    readRunId.current = runId;
    const onConnection = state => { if (mounted.current && version === loadVersion.current) setConnection(state); };
    let snapshot;
    try { snapshot = await getRun(runId, { signal: controller.signal, onConnection }); }
    catch (err) { if (!controller.signal.aborted && mounted.current && version === loadVersion.current) setConnection('exhausted'); return; }
    if (!mounted.current || version !== loadVersion.current) return;
    if (runRef.current?.run_id === runId && runRef.current.event_sequence > snapshot.event_sequence) snapshot = runRef.current;
    setRun(snapshot); setError('');
    setConnection('connected');
    const ids = readLocal(sessionKey(snapshot.session_id)) || [];
    writeLocal(sessionKey(snapshot.session_id), [...ids.filter((id) => id !== runId), runId].slice(-20));
    readPriorConversation(ids, runId, { signal: controller.signal }).then(({ items, unavailable }) => {
      if (controller.signal.aborted || !mounted.current || version !== loadVersion.current) return;
      setPrevious(items);
      setHistoryError(unavailable ? 'Some saved conversation turns could not be read. Refresh history to try again.' : '');
    });
    upsertRecentChat({ sessionId: snapshot.session_id, firstQuestion: snapshot.question, provider: 'vnext', version: 2 });
    const params = new URLSearchParams({ provider: 'vnext', run_id: runId, session_id: snapshot.session_id });
    window.history.replaceState({}, '', sitePath(`/result-new2?${params}`));
    if (!TERMINAL_RUNS.has(snapshot.status)) streamRef.current = watchRun(runId, snapshot.event_sequence, (event) => {
      if (!mounted.current || version !== loadVersion.current) return;
      setRun((value) => applyRunEvent(value || snapshot, event));
      if (event.type === 'terminal') getRun(runId, { signal: controller.signal, onConnection }).then((value) => { if (mounted.current && version === loadVersion.current) setRun(value); }).catch(() => { if (!controller.signal.aborted) onConnection('exhausted'); });
    }, onConnection);
  }, []);

  useEffect(() => {
    mounted.current = true;
    let stopped = false;
    const sessionId = route.get('session_id') || '';
    const savedIds = readLocal(sessionKey(sessionId)) || [];
    const runId = route.get('run_id') || savedIds[savedIds.length - 1];
    const question = decodeQuestion(route.get('question'));
    const task = runId ? Promise.resolve({ run_id: runId }) : (!sessionId && question ? createPlanOnce(question, '', route.get('intent') || question) : Promise.reject(new Error(sessionId ? 'This saved investigation is not available in this browser. Open its saved run link; no new work was started.' : 'Open a saved investigation or enter a question.')));
    bootstrapRef.current = task;
    task.then((created) => { if (!stopped) return attachRun(created.run_id); }).catch((err) => { if (!stopped) setError(err.message); });
    return () => { stopped = true; mounted.current = false; loadVersion.current += 1; readController.current?.abort(); streamRef.current?.(); };
  }, [route, attachRun]);

  const isPlanning = run?.status === 'awaiting_confirmation' || (run?.status === 'planning' && run?.plan?.review_ready);
  const projectionPayload = projectionForRun(run);
  const [result, resultError, resultConnection] = useProjectedResult(projectionPayload);
  projectionRef.current = result;
  const onRevise = useCallback(async (question) => {
    const current = runRef.current;
    if (!current || busy) return;
    setBusy(true); setError('');
    try { const created = await revisePlan(current.plan_id, question, current.include_context ?? true); setRun(null); await attachRun(created.run_id); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }, [attachRun, busy]);
  const onConfirm = useCallback(async () => {
    if (!runRef.current || busy) return;
    setBusy(true); setError('');
    try { const started = await confirmPlan(runRef.current.plan_id); await attachRun(started.run_id); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }, [attachRun, busy]);
  const cancel = useCallback(async () => {
    try {
      const pending = runRef.current?.run_id ? runRef.current : await bootstrapRef.current;
      if (pending?.run_id) await cancelRun(pending.run_id);
    } catch (err) { setError(err.message); return; }
    streamRef.current?.(); navigate('/');
  }, [navigate]);
  const followUp = useCallback(async (question) => {
    if (!question?.trim() || followUpPending.current || !TERMINAL_RUNS.has(runRef.current?.status)) return false;
    const inputError = questionInputError(question);
    if (inputError) { setFailedFollowUp({ question, message: inputError }); return false; }
    const current = runRef.current;
    followUpPending.current = true; setBusy(true); setFailedFollowUp(null);
    try {
      const created = await createPlanOnce(question.trim(), current.session_id, `${current.run_id}:${question.trim()}`);
      if (!mounted.current) return;
      setPrevious((items) => [...items, { run: current, result: projectionRef.current, presentationState: location.state?.result_page }]);
      setRun(null); await attachRun(created.run_id);
      return true;
    } catch (err) { if (mounted.current) setFailedFollowUp({ question, message: err.message }); return false; }
    finally { followUpPending.current = false; if (mounted.current) setBusy(false); }
  }, [attachRun, location.state?.result_page]);
  useEffect(() => {
    if (!onContentMeta) return;
    const page = resolveResultPage({ result, run, state: location.state?.result_page, resourceTabs: withLiteratureReferences(result?.resources_tabs, groundedLiterature(run, result)) });
    const questions = [...previous.map((item, index) => ({ id: item.run.run_id, query: item.run.question, anchorPrefix: `${contentAnchorPrefix}-previous-${index}`, anchorId: `${contentAnchorPrefix}-previous-${index}-question-1` })), ...(run ? [{ id: run.run_id, query: run.question, anchorPrefix: contentAnchorPrefix, anchorId: `${contentAnchorPrefix}-question-1` }] : [])];
    const meta = { anchorPrefix: contentAnchorPrefix, questions, aiHeadings: [], hasVisual: page.mainVisuals.length > 0, hasEvidences: page.supportingTabs.length > 0, hasFollowUp: !isPlanning,
      isQuestionComplete: TERMINAL_RUNS.has(run?.status) && !busy, isPlanning, hideFloatingSearchBar: !TERMINAL_RUNS.has(run?.status),
      planProceedAnchorId: isPlanning ? `${contentAnchorPrefix}-plan-proceed-button` : '', feedbackSessionId: run?.session_id || '', metaRouteKey: `${location.pathname}${location.search}` };
    const signature = JSON.stringify(meta);
    if (metaRef.current === signature) return;
    metaRef.current = signature;
    onContentMeta({ ...meta, followUpHandler: followUp });
  }, [onContentMeta, contentAnchorPrefix, run, result, isPlanning, location.pathname, location.search, location.state?.result_page, followUp, busy, previous]);
  // Read-transport failures reconnect to saved state; only recorded execution
  // failures or explicit mutation failures belong in the query-recovery dialog.
  const missingSavedSession = !run && Boolean(route.get('session_id')) && !route.get('run_id') && Boolean(error);
  const recovery = missingSavedSession ? null : queryRecovery(run, error);
  const retryRecovery = async (instruction = '') => {
    if (busy) return;
    const current = runRef.current;
    if (current?.plan_id && ['planning','awaiting_confirmation'].includes(current.status)) {
      return onRevise(instruction || 'Retry the original question without changing any entities, filters, or scope.');
    }
    setBusy(true); setError('');
    try {
      const original = current?.question || decodeQuestion(route.get('question'));
      const question = instruction ? `${original}\nRequested change: ${instruction}` : original;
      const created = await createPlanOnce(question, current?.session_id || '', `recovery:${current?.run_id || 'initial'}:${Date.now()}`);
      setRun(null); await attachRun(created.run_id);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const initialLoading = !run?.plan || (run?.status === 'planning' && !run?.plan?.review_ready);
  const progress = liveProgress(run, connection);
  if (!recovery && ((!run && error) || (TERMINAL_RUNS.has(run?.status) && !run?.plan))) return <ErrorComponent errorTitle="Investigation could not finish" errorMessage={error || run?.error?.message || `Investigation ${run.status}.`} />;
  return <>
    <ConnectionNotice status={connection} onReconnect={() => { if (readRunId.current) attachRun(readRunId.current); }} />
    <ConnectionNotice status={resultConnection.status} onReconnect={resultConnection.reconnect} />
    {!recovery && ['partial','completed'].includes(run?.status) && <Diagnostics items={diagnosticsFor(run)} />}
    <QueryRecoveryDialog issue={recovery} question={run?.plan?.original_question || run?.question || decodeQuestion(route.get('question'))} busy={busy} onRevise={retryRecovery} onRetry={()=>retryRecovery()} onCancel={cancel} />
    {failedFollowUp && <Box role="alert" sx={{ p: 2 }}><Typography>Could not submit follow-up: {failedFollowUp.message}</Typography><Typography>{failedFollowUp.question}</Typography><Button disabled={busy} onClick={() => followUp(failedFollowUp.question)}>Retry follow-up</Button></Box>}
    <AlertMessage type="warning" content={error || resultError} open={!recovery && Boolean(error || resultError)} onClose={() => setError('')} />
    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', px: { xs: 2, md: 3 }, py: 3 }}><Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 3 }}>
        {historyError && <Box role="status"><Typography>{historyError}</Typography><Button onClick={() => attachRun(readRunId.current)}>Refresh history</Button></Box>}
        {previous.map((item, index) => <ResultSection key={item.run.run_id} {...item} anchorPrefix={`${contentAnchorPrefix}-previous-${index}`} />)}
        {initialLoading ? <Box role="status" aria-label="Loading current question" sx={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', paddingY: '200px' }}><SearchResultLoading streamProgress={progress} handleClose={cancel} /></Box> :
          <ResultSection run={run} result={result} error={resultError} planning={isPlanning} busy={busy || connection !== 'connected'} onRevise={onRevise} onConfirm={onConfirm} onFollowUp={followUp} anchorPrefix={contentAnchorPrefix} presentationState={location.state?.result_page} />}
      </Box></Box>
  </>;
}

export function ConventionalResultView({ contentAnchorPrefix = 'result-1', onContentMeta } = {}) {
  const location = useLocation();
  const savedId = new URLSearchParams(location.search).get('result_id') || '';
  const payload = useMemo(() => { try { return templateRequest(new URLSearchParams(location.search)); } catch (_) { return null; } }, [location.search]);
  const [result, error, connection] = useProjectedResult(payload, savedId);
  const metaRef = useRef('');
  const run = useMemo(() => ({ question: result?.question || result?.answer?.title || '', status: result?.status === 'ready' ? 'completed' : 'running', graph_answer: typeof result?.answer === 'string' ? result.answer : result?.answer?.text }), [result]);
  useEffect(() => {
    const page = resolveResultPage({ result, run, state: location.state?.result_page, resourceTabs: withLiteratureReferences(result?.resources_tabs, groundedLiterature(run, result)) });
    const meta = { anchorPrefix: contentAnchorPrefix, questions: [{ id: result?.result_id || 'tool', query: run.question || 'Search results', anchorPrefix: contentAnchorPrefix, anchorId: `${contentAnchorPrefix}-question-1` }], aiHeadings: [], hasVisual: page.mainVisuals.length > 0, hasEvidences: page.supportingTabs.length > 0, isQuestionComplete: Boolean(result), isPlanning: false, hideFloatingSearchBar: true, metaRouteKey: `${location.pathname}${location.search}` };
    const signature = JSON.stringify(meta);
    if (metaRef.current !== signature) { metaRef.current = signature; onContentMeta?.(meta); }
  }, [onContentMeta, contentAnchorPrefix, result, run, location.pathname, location.search, location.state?.result_page]);
  return <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', px: { xs: 2, md: 3 }, py: 3 }}><Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 3 }}>
    <ConnectionNotice status={connection.status} onReconnect={connection.reconnect} />
    <ResultSection run={run} result={result} error={error || (!payload && !savedId ? 'This search is unavailable. Return to the tool and choose a supported search.' : '')} anchorPrefix={contentAnchorPrefix} presentationState={location.state?.result_page} />
  </Box></Box>;
}
