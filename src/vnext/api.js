import { newId } from '../utils/agentIdentity';
import { safeSessionStorage } from '../utils/safeStorage';
import { abortError, readWithRecovery, waitDelay } from './readRecovery';
import { getDevConfig } from './runtimeConfig';
// UI routes live at the dev root; API assets keep their separate namespace.
export const BASE_PATH = '';
export const sitePath = (path = '/') => {
  if (path.startsWith('/api/')) return `${getDevConfig().apiBase}${path.slice(4)}`;
  return path.startsWith('/') || /^(https?:|mailto:|#|data:)/.test(path) ? path : `/${path}`;
};
export const routerPath = (path = '/') => path;
export const apiPath = (path = '') => `${getDevConfig().apiBase}${path}`;
export const TERMINAL_RUNS = new Set(['completed', 'complete', 'partial', 'failed', 'cancelled', 'interrupted', 'superseded']);
const inFlight = new Map();
const readSaved = (key) => { try { return JSON.parse(safeSessionStorage.getItem(key)); } catch (_) { return null; } };
const save = (key, value) => safeSessionStorage.setItem(key, JSON.stringify(value));
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const identity = value => typeof value === 'string' && value.length > 0 && value.length <= 200;
const protocolError = () => Object.assign(new Error('The service returned an invalid response. Reconnect to read the saved result.'), { protocol: true });
const validateIdentity = (body, field, expected, snapshot = false) => {
  if (!object(body) || !identity(body[field]) || (expected && body[field] !== expected)
      || (snapshot && !identity(body.status))) throw protocolError();
  if (snapshot && body.component_status !== undefined && !object(body.component_status)) throw protocolError();
  for (const field of ['plan', 'preview', 'evidence', 'resources_tabs']) {
    if (snapshot && body[field] !== undefined && body[field] !== null && !object(body[field])) throw protocolError();
  }
  if (snapshot && body.combined_query_result !== undefined && body.combined_query_result !== null
      && (!object(body.combined_query_result) || !Array.isArray(body.combined_query_result.nodes) || !Array.isArray(body.combined_query_result.edges))) throw protocolError();
  if (body.event_sequence !== undefined && (!Number.isSafeInteger(body.event_sequence) || body.event_sequence < 0)) throw protocolError();
  return body;
};

export async function request(path, options = {}) {
  const { timeoutMs = options.method && options.method !== 'GET' ? 10000 : 15000, signal, ...fetchOptions } = options;
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (signal?.aborted) throw abortError();
  signal?.addEventListener('abort', cancel, { once: true });
  let timedOut = false;
  const timer = timeoutMs ? setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs) : null;
  try {
    const response = await fetch(apiPath(path), {
      credentials: 'same-origin', ...fetchOptions, signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...fetchOptions.headers },
    });
    let body;
    try { body = await response.json(); } catch (_) { if (response.ok) throw protocolError(); body = {}; }
    if (!response.ok) {
      const error = new Error(typeof body?.detail === 'string' ? body.detail : `Request failed (${response.status}).`);
      error.status = response.status;
      if (fetchOptions.method && fetchOptions.method !== 'GET' && response.status >= 500) error.outcomeUnknown = true;
      throw error;
    }
    if (!object(body)) throw protocolError();
    return body;
  } catch (error) {
    if (signal?.aborted) throw abortError();
    if (timedOut) throw Object.assign(new Error(fetchOptions.method && fetchOptions.method !== 'GET' ? 'The request timed out; its outcome is unknown. Reading saved state will recover it.' : 'Reading the saved result timed out.'), { status: 408, outcomeUnknown: true });
    if (fetchOptions.method && fetchOptions.method !== 'GET' && (!error.status || error.protocol)) error.outcomeUnknown = true;
    throw error;
  } finally {
    clearTimeout(timer); signal?.removeEventListener('abort', cancel);
  }
}

const post = (path, body, options = {}) => request(path, { method: 'POST', body: JSON.stringify(body || {}), ...options });
export const getRun = (id, options = {}) => readWithRecovery(async () => validateIdentity(await request(`/agent/v2/runs/${encodeURIComponent(id)}`, { signal: options.signal }), 'run_id', id, true), options);
export const getRequest = async (id, options = {}) => validateIdentity(await request(`/agent/v2/requests/${encodeURIComponent(id)}`, options), 'request_id', id);
export const cancelRequest = async (id) => {
  try { return await post(`/agent/v2/requests/${encodeURIComponent(id)}/cancel`); }
  catch (error) { if (!error.outcomeUnknown) throw error; let saved; try { saved = await getRequest(id); } catch (_) { throw error; } if (saved.cancel_requested || TERMINAL_RUNS.has(saved.status)) return saved; throw error; }
};
async function recoverControl(path, runId, body, accepted) {
  try { return validateIdentity(await post(path, body), 'run_id', runId); }
  catch (error) {
    if (error.protocol) error.outcomeUnknown = true;
    if (!error.outcomeUnknown) throw error;
    let saved;
    try { saved = validateIdentity(await request(`/agent/v2/runs/${encodeURIComponent(runId)}`), 'run_id', runId, true); } catch (_) { throw error; }
    if (accepted(saved)) return saved;
    throw error;
  }
}
export const confirmPlan = (id, runId = id) => recoverControl(`/agent/v2/plans/${encodeURIComponent(id)}/confirm`, runId, {}, run => run.status !== 'awaiting_confirmation');
export const retryFormatter = (id) => recoverControl(`/agent/v2/runs/${encodeURIComponent(id)}/retry-format`, id, {}, run => run.status === 'running' || !run.errors?.some(error => error.component === 'formatter'));
export const cancelRun = (id) => recoverControl(`/agent/v2/runs/${encodeURIComponent(id)}/cancel`, id, {}, run => TERMINAL_RUNS.has(run.status));

async function admit(path, payload, key) {
  const previous = readSaved(key);
  if (identity(previous?.run_id)) return previous;
  if (previous?.pending) {
    try {
      const saved = await getRequest(payload.request_id);
      if (identity(saved.run_id)) { save(key, saved); return saved; }
      if (saved.cancel_requested || TERMINAL_RUNS.has(saved.status)) throw Object.assign(new Error('This request ended before admission.'), { status: 409 });
      throw Object.assign(new Error('This request is still pending. Reconnect to read its saved state.'), { outcomeUnknown: true });
    } catch (error) { if (error.status !== 404) throw error; }
  }
  save(key, { pending: true, request_id: payload.request_id });
  try {
    const created = validateIdentity(await post(path, payload), 'run_id');
    save(key, created); return created;
  } catch (error) {
    if (error.protocol) error.outcomeUnknown = true;
    if (error.outcomeUnknown) {
      try {
        const recovered = await getRequest(payload.request_id);
        if (identity(recovered.run_id)) { save(key, recovered); return recovered; }
      } catch (_) { /* Preserve pending intent for explicit reconnect/reload. */ }
    } else if (error.status >= 400) save(key, null);
    throw error;
  }
}
export function createPlanOnce(question, sessionId = '', requestId = null, parentRunId = null) {
  // Legacy call sites retain a stable locally mapped intent; current UI passes UUIDs.
  const legacyKey = `pank-vnext:intent:${JSON.stringify([sessionId, requestId || question])}`;
  const previousIntent = readSaved(legacyKey);
  const id = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId || '') ? requestId : previousIntent?.request_id || newId();
  const durableSessionId = sessionId || previousIntent?.session_id || newId();
  save(legacyKey, { request_id: id, session_id: durableSessionId });
  const key = `pank-vnext:request:${id}`;
  if (inFlight.has(key)) return inFlight.get(key);
  const task = admit('/agent/v2/plans', { question, session_id: durableSessionId, request_id: id, include_context: true, ...(parentRunId ? { parent_run_id: parentRunId } : {}) }, key).finally(() => inFlight.delete(key));
  inFlight.set(key, task); return task;
}
export function revisePlan(id, question, includeContext = true, requestId = newId()) {
  const key = `pank-vnext:request:${requestId}`;
  if (inFlight.has(key)) return inFlight.get(key);
  const task = admit(`/agent/v2/plans/${encodeURIComponent(id)}/revise`, { question, request_id: requestId, include_context: includeContext, revision_instruction: question, revision_mode: 'instruction' }, key).finally(() => inFlight.delete(key));
  inFlight.set(key, task); return task;
}

export function createResultOnce(payload) {
  const key = `pank-vnext:result:tools1:${JSON.stringify(payload)}`;
  if (inFlight.has(key)) return inFlight.get(key);
  const previous = readSaved(key);
  if (identity(previous?.result_id)) return Promise.resolve(previous);
  const task = post('/results', payload).then((created) => { validateIdentity(created, 'result_id'); save(key, created); return created; }).finally(() => inFlight.delete(key));
  inFlight.set(key, task);
  return task;
}
export const getResult = (id, options = {}) => readWithRecovery(async () => validateIdentity(await request(`/results/${encodeURIComponent(id)}${options.graph_revision !== undefined ? `?graph_revision=${options.graph_revision}` : ''}`, { signal: options.signal }), 'result_id', id, true), options);
export function searchEntities(parameters, options = {}) {
  const query = new URLSearchParams(Object.entries(parameters).filter(([, value]) => value !== undefined && value !== null && value !== '').map(([key, value]) => [key, String(value)]));
  return request(`/search?${query}`, options);
}
export function componentsPending(result) {
  return ['pending', 'queued', 'running', 'processing'].includes(result?.status)
    || Object.values(result?.component_status || {}).some((item) => ['pending', 'queued', 'running', 'processing'].includes(typeof item === 'string' ? item : item?.status));
}
export async function pollResult(id, onUpdate, { signal, interval = 1000, ...recovery } = {}) {
  while (!signal?.aborted) {
    const value = await getResult(id, { signal, ...recovery });
    if (signal?.aborted) return;
    onUpdate(value);
    if (!componentsPending(value)) return value;
    await waitDelay(interval, signal);
  }
}

export function watchRun(runId, sequence, onEvent, onConnection = () => {}, onSnapshot = () => {}) {
  let lastSequence = Number(sequence || 0), stopped = false;
  // EventSource handles transport recovery and Last-Event-ID replay natively.
  // Switching tabs does not close the stream or interrupt backend execution.
  const source = new EventSource(apiPath(`/agent/v2/runs/${encodeURIComponent(runId)}/events?after=${lastSequence}`), { withCredentials: true });
  let polling = null, reading = false;
  const controller = new AbortController();
  const refresh = async () => {
    if (stopped || reading) return;
    reading = true;
    try {
      const saved = await getRun(runId, { signal: controller.signal });
      if (stopped) return;
      if (Number(saved.event_sequence || 0) >= lastSequence) {
        lastSequence = Number(saved.event_sequence || 0); onSnapshot(saved);
        if (TERMINAL_RUNS.has(saved.status)) stop();
      }
    } catch (_) { /* Keep the saved UI and try a read at the next polling tick. */ }
    finally { reading = false; }
  };
  const stop = () => { stopped = true; clearInterval(polling); controller.abort(); source.close(); };
  const handle = (message) => {
    if (stopped) return;
    let event;
    try { event = JSON.parse(message.data); } catch (_) { return; }
    if (!object(event) || (event.run_id && event.run_id !== runId)) return;
    const seq = Number(event.seq ?? event.sequence ?? message.lastEventId);
    if (!Number.isSafeInteger(seq) || seq < 0 || seq <= lastSequence) return;
    lastSequence = seq;
    onEvent({ ...event, seq });
    if (event.type === 'terminal') stop();
  };
  ['progress', 'heartbeat', 'plan_validated', 'plan_ready', 'preview_step', 'preview_reused', 'graph_step', 'graph_answer', 'followup_ready', 'literature_sources', 'literature_progress', 'literature_perspective', 'literature_complete', 'terminal'].forEach(type => source.addEventListener(type, handle));
  source.onopen = () => { if (!stopped) { clearInterval(polling); polling = null; onConnection('connected'); refresh(); } };
  source.onerror = () => {
    if (!stopped) {
      if (source.readyState === 2) source.close();
      onConnection(source.readyState === 2 ? 'exhausted' : 'reconnecting');
      if (!polling) { refresh(); polling = setInterval(refresh, 5000); }
    }
  };
  return stop;
}
