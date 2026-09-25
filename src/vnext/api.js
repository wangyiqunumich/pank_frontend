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
  const { timeoutMs = options.method && options.method !== 'GET' ? 0 : 15000, signal, ...fetchOptions } = options;
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
      throw error;
    }
    if (!object(body)) throw protocolError();
    return body;
  } catch (error) {
    if (signal?.aborted) throw abortError();
    if (timedOut) throw Object.assign(new Error('Reading the saved result timed out.'), { status: 408 });
    throw error;
  } finally {
    clearTimeout(timer); signal?.removeEventListener('abort', cancel);
  }
}

const post = (path, body, options = {}) => request(path, { method: 'POST', body: JSON.stringify(body || {}), ...options });
export const getRun = (id, options = {}) => readWithRecovery(async () => validateIdentity(await request(`/agent/v2/runs/${encodeURIComponent(id)}`, { signal: options.signal }), 'run_id', id, true), options);
export const confirmPlan = (id) => post(`/agent/v2/plans/${encodeURIComponent(id)}/confirm`).then(body => validateIdentity(body, 'run_id'));
export const revisePlan = (id, question, includeContext = true) => post(`/agent/v2/plans/${encodeURIComponent(id)}/revise`, { question, include_context: includeContext, revision_instruction: question, revision_mode: 'instruction' }).then(body => validateIdentity(body, 'run_id'));
export const cancelRun = (id) => post(`/agent/v2/runs/${encodeURIComponent(id)}/cancel`);

// Re-render/StrictMode/reload resumes a saved run; uncertainty never repeats inference.
export function createPlanOnce(question, sessionId = '', intentKey = question) {
  const key = `pank-vnext:plan:${JSON.stringify([sessionId, intentKey])}`;
  if (inFlight.has(key)) return inFlight.get(key);
  const previous = readSaved(key);
  if (identity(previous?.run_id)) return Promise.resolve(previous);
  if (previous?.pending) return Promise.reject(new Error('Plan creation was interrupted. Open the saved conversation if available, or start a new question.'));
  save(key, { pending: true });
  const task = post('/agent/v2/plans', { question, include_context: true, ...(sessionId ? { session_id: sessionId } : {}) })
    .then((created) => { validateIdentity(created, 'run_id'); save(key, created); return created; })
    .catch((error) => { if (error.status >= 400 && !error.protocol) save(key, null); throw error; })
    .finally(() => inFlight.delete(key));
  inFlight.set(key, task);
  return task;
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
export const getResult = (id, options = {}) => readWithRecovery(async () => validateIdentity(await request(`/results/${encodeURIComponent(id)}`, { signal: options.signal }), 'result_id', id, true), options);
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

export function watchRun(runId, sequence, onEvent, onConnection = () => {}) {
  let lastSequence = Number(sequence || 0), stopped = false;
  // EventSource handles transport recovery and Last-Event-ID replay natively.
  // Switching tabs does not close the stream or interrupt backend execution.
  const source = new EventSource(apiPath(`/agent/v2/runs/${encodeURIComponent(runId)}/events?after=${lastSequence}`), { withCredentials: true });
  const stop = () => { stopped = true; source.close(); };
  const handle = (message) => {
    if (stopped) return;
    let event;
    try { event = JSON.parse(message.data); } catch (_) { return; }
    if (!object(event)) return;
    const seq = Number(event.seq ?? event.sequence ?? message.lastEventId);
    if (!Number.isSafeInteger(seq) || seq < 0 || seq <= lastSequence) return;
    lastSequence = seq;
    onEvent({ ...event, seq });
    if (event.type === 'terminal') stop();
  };
  ['progress', 'heartbeat', 'plan_validated', 'plan_ready', 'preview_step', 'preview_reused', 'graph_step', 'graph_answer', 'literature_progress', 'literature_perspective', 'literature_complete', 'terminal'].forEach(type => source.addEventListener(type, handle));
  source.onopen = () => { if (!stopped) onConnection('connected'); };
  source.onerror = () => {
    if (!stopped && source.readyState === 2) { stop(); onConnection('exhausted'); }
  };
  return stop;
}
