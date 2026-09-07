import '../SearchResult/scoped.css';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress } from '@mui/material';
import KnowledgeGraph from '../components/KnowledgeGraph';
import QuestionAnswerPage, { PlanConfirmationPage } from '../components/ResultComponent';
import { ErrorComponent } from '../components/IntermediatePage';
import { AlertMessage } from '../components/SupportingMaterial';
import SearchResultLoading from '../SearchResult/loading';
import { upsertRecentChat } from '../utils/chatSessionStorage';
import AnswerMarkdown from './AnswerMarkdown';
import { useResourcePanels } from './Resources';
import { applyRunEvent, literatureNotice, liveProgress, planMarkdown, projectionForRun, templateRequest, withLiteratureReferences } from './contracts';
import { cancelRun, confirmPlan, createPlanOnce, createResultOnce, getRun, pollResult, revisePlan, sitePath, TERMINAL_RUNS, watchRun } from './api';

import { recordInteraction, referenceKey } from './telemetry';

const readLocal = (key) => { try { return JSON.parse(localStorage.getItem(key)); } catch (_) { return null; } };
const writeLocal = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) { /* Storage is optional. */ } };
const decodeQuestion = (value) => { try { return decodeURIComponent(escape(atob(value))); } catch (_) { return value || ''; } };
const sessionKey = (id) => `pank-vnext:session:${id}`;

export function useProjectedResult(payload) {
  const key = payload ? JSON.stringify(payload) : '';
  const [storedResult, setStoredResult] = useState(null);
  const result = storedResult?.key === key ? storedResult.value : null;
  const [error, setError] = useState('');
  useEffect(() => {
    setStoredResult(null); setError('');
    if (!key) return;
    const controller = new AbortController();
    createResultOnce(JSON.parse(key)).then((created) => {
      if (!controller.signal.aborted) return pollResult(created.result_id, (value) => setStoredResult({ key, value }), { signal: controller.signal });
    }).catch((err) => { if (!controller.signal.aborted) setError(err.message); });
    return () => controller.abort();
  }, [key]);
  return [result, error];
}

function GraphPanel({ result, waiting, error, onEvidenceInspect }) {
  if (result?.combined_query_result?.nodes?.length) return <Box sx={{ width: '100%', height: '100%' }}>
    <KnowledgeGraph onEvidenceInspect={onEvidenceInspect} graphData={result.combined_query_result} coordData={result.xy_json} edgeRoutes={result.edge_routes} sx={{ height: '100%' }} containerHeight="100%" />
  </Box>;
  return <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    {waiting && !error ? <CircularProgress size={28} /> : <Typography sx={{ fontSize: 14, color: '#64748B', textAlign: 'center', px: 2 }}>{error || (['failed', 'unavailable'].includes(result?.completeness) ? 'Graph retrieval failed. Available answer sections are preserved.' : 'No matching graph evidence was returned.')}</Typography>}
  </Box>;
}

export function ResultSection({ run, result, error, planning, busy, onRevise, onConfirm, onFollowUp, anchorPrefix }) {
  const sectionRef = useRef(null);
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
  const literature = run?.literature ?? result?.literature;
  const resources = useResourcePanels(withLiteratureReferences(result?.resources_tabs, literature), result?.component_status?.resources);
  const graphData = result?.combined_query_result || null;
  const graphError = error || (planning && run?.plan?.clarification) || (planning && run?.preview?.status === 'failed' ? 'The initial graph retrieval failed. Revise the plan before continuing; this failure does not indicate biological absence.' : '');
  const visualMaterial = { title: 'Visual Material', tabs: [{ label: 'Knowledge Graph', content: <GraphPanel onEvidenceInspect={onEvidenceInspect} result={result} waiting={!result && !graphError} error={graphError} /> }] };
  const planData = {
    questionId: 'PLAN', title: 'Confirm Query & Execution Steps', originalQuestion: run?.plan?.original_question || run?.question || '', parsedTitle: run?.plan?.interpreted_question || '',
    agentPlan: planMarkdown(run), revisionQuestion: run?.question || '', revisionKey: run?.plan_id,
    disableRevise: busy, disableProceed: busy || !run?.preview || run?.preview?.confirmation_eligible === false || Boolean(run?.plan?.clarification) || run?.status !== 'awaiting_confirmation',
    onSendFeedback: onRevise, onProceed: onConfirm, graphData, visualMaterial,
  };
  const sections = [{ content: <AnswerMarkdown answer={run?.graph_answer || result?.answer?.text || result?.answer || (run?.error?.message || 'Writing the grounded answer…')} references={resources.references} /> }];
  const literatureStatus = literatureNotice(run, literature);
  if (literatureStatus) sections.push({ content: <AnswerMarkdown answer={literatureStatus} references={resources.references} /> });
  (literature?.perspectives || []).forEach((perspective) => sections.push({ heading: perspective.label || 'Literature perspective', content: <AnswerMarkdown answer={perspective.answer || ''} references={resources.references} /> }));
  const display = result?.display;
  const completeness = result?.completeness || run?.evidence?.completeness;
  const evidenceNotice = run?.rerun_advisory || (typeof display?.notice === 'string' ? display.notice : (['partial', 'failed', 'unavailable'].includes(completeness) ? `Graph evidence is ${completeness}.` : ''));
  if (evidenceNotice) sections.push({ content: <Typography sx={{ fontSize: 14, color: '#64748B' }}>{evidenceNotice}</Typography> });
  const data = {
    styleVariant: 'pank1', questionId: 'Q1', title: run?.plan?.interpreted_question || run?.question || result?.question || '',
    aiOverview: { sections, isLoading: !run?.graph_answer && !result?.answer, scrollToTop: TERMINAL_RUNS.has(run?.status) },
    graphData, visualMaterial, evidences: resources.tabs.length ? { title: 'Evidences', tabs: resources.tabs } : undefined,
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
  const streamRef = useRef(null);
  const runRef = useRef(null);
  const mounted = useRef(true);
  const metaRef = useRef('');
  const bootstrapRef = useRef(null);
  const projectionRef = useRef(null);
  const loadVersion = useRef(0);
  runRef.current = run;

  const attachRun = useCallback(async (runId) => {
    const version = ++loadVersion.current;
    streamRef.current?.();
    const snapshot = await getRun(runId);
    if (!mounted.current || version !== loadVersion.current) return;
    setRun(snapshot); setError('');
    const ids = readLocal(sessionKey(snapshot.session_id)) || [];
    writeLocal(sessionKey(snapshot.session_id), [...ids.filter((id) => id !== runId), runId].slice(-20));
    upsertRecentChat({ sessionId: snapshot.session_id, firstQuestion: snapshot.question });
    const params = new URLSearchParams({ run_id: runId, session_id: snapshot.session_id });
    window.history.replaceState({}, '', sitePath(`/result-new2?${params}`));
    if (!TERMINAL_RUNS.has(snapshot.status)) streamRef.current = watchRun(runId, snapshot.event_sequence, (event) => {
      if (!mounted.current || version !== loadVersion.current) return;
      setRun((value) => applyRunEvent(value || snapshot, event));
      if (event.type === 'terminal') getRun(runId).then((value) => { if (mounted.current && version === loadVersion.current) setRun(value); }).catch(() => {});
    }, setConnection);
  }, []);

  useEffect(() => {
    mounted.current = true;
    let stopped = false;
    const sessionId = route.get('session_id') || '';
    const savedIds = readLocal(sessionKey(sessionId)) || [];
    const runId = route.get('run_id') || savedIds[savedIds.length - 1];
    const question = decodeQuestion(route.get('question'));
    const task = runId ? Promise.resolve({ run_id: runId }) : (question ? createPlanOnce(question, sessionId) : Promise.reject(new Error('Open a saved investigation or enter a question.')));
    bootstrapRef.current = task;
    task.then((created) => { if (!stopped) return attachRun(created.run_id); }).catch((err) => { if (!stopped) setError(err.message); });
    return () => { stopped = true; mounted.current = false; streamRef.current?.(); };
  }, [route, attachRun]);

  const isPlanning = run?.status === 'awaiting_confirmation' || (run?.status === 'planning' && run?.plan?.review_ready);
  const projectionPayload = projectionForRun(run);
  const [result, resultError] = useProjectedResult(projectionPayload);
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
    if (!question?.trim() || !TERMINAL_RUNS.has(runRef.current?.status)) return;
    const current = runRef.current;
    setPrevious((items) => [...items, { run: current, result: projectionRef.current }]); setRun(null); setError('');
    try { const created = await createPlanOnce(question.trim(), current.session_id, `${current.run_id}:${question.trim()}`); await attachRun(created.run_id); }
    catch (err) { setError(err.message); }
  }, [attachRun]);
  useEffect(() => {
    if (!onContentMeta) return;
    const meta = { anchorPrefix: contentAnchorPrefix, aiHeadings: [], hasVisual: Boolean(run?.plan), hasEvidences: Boolean(result?.resources_tabs), hasFollowUp: !isPlanning,
      isQuestionComplete: TERMINAL_RUNS.has(run?.status), isPlanning, hideFloatingSearchBar: !TERMINAL_RUNS.has(run?.status),
      planProceedAnchorId: isPlanning ? `${contentAnchorPrefix}-plan-proceed-button` : '', feedbackSessionId: run?.session_id || '', metaRouteKey: `${location.pathname}${location.search}` };
    const signature = JSON.stringify(meta);
    if (metaRef.current === signature) return;
    metaRef.current = signature;
    onContentMeta({ ...meta, followUpHandler: followUp });
  }, [onContentMeta, contentAnchorPrefix, run?.plan, run?.status, run?.session_id, result?.resources_tabs, isPlanning, location.pathname, location.search, followUp]);
  const initialLoading = !run?.plan || (run?.status === 'planning' && !run?.plan?.review_ready);
  const progress = liveProgress(run, connection);
  if ((!run && error) || (TERMINAL_RUNS.has(run?.status) && !run?.plan)) return <ErrorComponent errorTitle="Investigation could not finish" errorMessage={error || run?.error?.message || `Investigation ${run.status}.`} />;
  return <>
    <AlertMessage type="warning" content={error || resultError} open={Boolean(error || resultError)} onClose={() => setError('')} />
    {initialLoading ? <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', paddingY: '200px' }}><SearchResultLoading streamProgress={progress} handleClose={cancel} /></Box> :
      <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', px: { xs: 2, md: 3 }, py: 3 }}><Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 3 }}>
        {previous.map((item, index) => <ResultSection key={item.run.run_id} {...item} anchorPrefix={`${contentAnchorPrefix}-previous-${index}`} />)}
        <ResultSection run={run} result={result} error={resultError} planning={isPlanning} busy={busy} onRevise={onRevise} onConfirm={onConfirm} onFollowUp={followUp} anchorPrefix={contentAnchorPrefix} />
      </Box></Box>}
  </>;
}

export function ConventionalResultView({ contentAnchorPrefix = 'result-1', onContentMeta } = {}) {
  const location = useLocation();
  const payload = useMemo(() => { try { return templateRequest(new URLSearchParams(location.search)); } catch (_) { return null; } }, [location.search]);
  const [result, error] = useProjectedResult(payload);
  const metaRef = useRef('');
  useEffect(() => { const meta = { anchorPrefix: contentAnchorPrefix, aiHeadings: [], hasVisual: true, hasEvidences: Boolean(result?.resources_tabs), isQuestionComplete: Boolean(result), isPlanning: false, hideFloatingSearchBar: true, metaRouteKey: `${location.pathname}${location.search}` }; const signature = JSON.stringify(meta); if (metaRef.current !== signature) { metaRef.current = signature; onContentMeta?.(meta); } }, [onContentMeta, contentAnchorPrefix, result, location.pathname, location.search]);
  const run = { question: result?.question || result?.answer?.title || '', status: result?.status === 'ready' ? 'completed' : 'running', graph_answer: typeof result?.answer === 'string' ? result.answer : result?.answer?.text };
  return <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', px: { xs: 2, md: 3 }, py: 3 }}><Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 3 }}>
    <ResultSection run={run} result={result} error={error || (!payload ? 'This search is unavailable in the isolated demo.' : '')} anchorPrefix={contentAnchorPrefix} />
  </Box></Box>;
}
