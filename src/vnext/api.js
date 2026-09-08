// The isolated demo uses one origin; no provider key or production fallback.
export const BASE_PATH = (process.env.PUBLIC_URL || '/pankgraph-vnext').replace(/\/$/, '');
export const sitePath = (path = '/') => {
  if (/^https?:|^mailto:|^#|^data:/.test(path)) return path;
  if (BASE_PATH && (path === BASE_PATH || path.startsWith(`${BASE_PATH}/`))) return path;
  return `${BASE_PATH}${path.startsWith('/') ? path : `/${path}`}`;
};
// Router navigation already applies basename; saved browser URLs may include it.
export const routerPath = (path = '/') => {
  if (BASE_PATH && path === BASE_PATH) return '/';
  if (BASE_PATH && path.startsWith(`${BASE_PATH}/`)) return path.slice(BASE_PATH.length);
  if (BASE_PATH && (path.startsWith(`${BASE_PATH}?`) || path.startsWith(`${BASE_PATH}#`))) return `/${path.slice(BASE_PATH.length)}`;
  return path;
};
export const apiPath = (path) => sitePath(`/api${path}`);
export const TERMINAL_RUNS = new Set(['completed', 'complete', 'partial', 'failed', 'cancelled', 'interrupted', 'superseded']);
const inFlight = new Map();
const readSaved = (key) => { try { return JSON.parse(sessionStorage.getItem(key)); } catch (_) { return null; } };
const save = (key, value) => { try { sessionStorage.setItem(key, JSON.stringify(value)); } catch (_) { /* Private browsing may disable storage. */ } };

export async function request(path, options = {}) {
  const response = await fetch(apiPath(path), {
    credentials: 'same-origin', ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  let body;
  try { body = await response.json(); } catch (_) { body = {}; }
  if (!response.ok) {
    const error = new Error(typeof body.detail === 'string' ? body.detail : `Request failed (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return body;
}

const post = (path, body, options = {}) => request(path, { method: 'POST', body: JSON.stringify(body || {}), ...options });
export const getRun = (id) => request(`/agent/v2/runs/${encodeURIComponent(id)}`);
export const confirmPlan = (id) => post(`/agent/v2/plans/${encodeURIComponent(id)}/confirm`);
export const revisePlan = (id, question, includeContext = true) => post(`/agent/v2/plans/${encodeURIComponent(id)}/revise`, { question, include_context: includeContext, revision_instruction: question, revision_mode: 'instruction' });
export const cancelRun = (id) => post(`/agent/v2/runs/${encodeURIComponent(id)}/cancel`);

// Re-render/StrictMode/reload resumes a saved run; uncertainty never repeats inference.
export function createPlanOnce(question, sessionId = '', intentKey = question) {
  const key = `pank-vnext:plan:${JSON.stringify([sessionId, intentKey])}`;
  if (inFlight.has(key)) return inFlight.get(key);
  const previous = readSaved(key);
  if (previous?.run_id) return Promise.resolve(previous);
  if (previous?.pending) return Promise.reject(new Error('Plan creation was interrupted. Open the saved conversation if available, or start a new question.'));
  save(key, { pending: true });
  const task = post('/agent/v2/plans', { question, include_context: true, ...(sessionId ? { session_id: sessionId } : {}) })
    .then((created) => { save(key, created); return created; })
    .catch((error) => { if (error.status) save(key, null); throw error; })
    .finally(() => inFlight.delete(key));
  inFlight.set(key, task);
  return task;
}

export function createResultOnce(payload) {
  const key = `pank-vnext:result:tools1:${JSON.stringify(payload)}`;
  if (inFlight.has(key)) return inFlight.get(key);
  const previous = readSaved(key);
  if (previous?.result_id) return Promise.resolve(previous);
  const task = post('/results', payload).then((created) => { save(key, created); return created; }).finally(() => inFlight.delete(key));
  inFlight.set(key, task);
  return task;
}
export const getResult = (id) => request(`/results/${encodeURIComponent(id)}`);
export function searchEntities(parameters, options = {}) {
  const query = new URLSearchParams(Object.entries(parameters).filter(([, value]) => value !== undefined && value !== null && value !== '').map(([key, value]) => [key, String(value)]));
  return request(`/search?${query}`, options);
}
export function componentsPending(result) {
  return ['pending', 'queued', 'running', 'processing'].includes(result?.status)
    || Object.values(result?.component_status || {}).some((item) => ['pending', 'queued', 'running', 'processing'].includes(typeof item === 'string' ? item : item?.status));
}
export async function pollResult(id, onUpdate, { signal, interval = 1000 } = {}) {
  while (!signal?.aborted) {
    const value = await request(`/results/${encodeURIComponent(id)}`, { signal });
    if (signal?.aborted) return;
    onUpdate(value);
    if (!componentsPending(value)) return value;
    await new Promise((resolve, reject) => {
      const onAbort = () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); };
      const timer = setTimeout(() => { signal?.removeEventListener('abort', onAbort); resolve(); }, interval);
      signal?.addEventListener('abort', onAbort, { once: true });
    });
  }
}

export function watchRun(runId, sequence, onEvent, onConnection = () => {}) {
  let lastSequence = Number(sequence || 0);
  const source = new EventSource(apiPath(`/agent/v2/runs/${encodeURIComponent(runId)}/events?after=${lastSequence}`), { withCredentials: true });
  const handle = (message) => {
    let event;
    try { event = JSON.parse(message.data); } catch (_) { return; }
    const seq = Number(event.seq ?? event.sequence ?? message.lastEventId);
    if (!Number.isFinite(seq) || seq <= lastSequence) return;
    lastSequence = seq;
    onEvent({ ...event, seq });
    if (event.type === 'terminal') source.close();
  };
  ['progress', 'heartbeat', 'plan_validated', 'plan_ready', 'preview_step', 'preview_reused', 'graph_step', 'graph_answer', 'literature_progress', 'literature_perspective', 'literature_complete', 'terminal'].forEach((type) => source.addEventListener(type, handle));
  source.onopen = () => onConnection('connected');
  source.onerror = () => onConnection('reconnecting');
  return () => source.close();
}
