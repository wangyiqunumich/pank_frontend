import { waitFor } from '@testing-library/react';
import { createPlanOnce, getRun, pollResult, request, watchRun } from './api';

const response = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });
const result = { result_id: 'saved', status: 'ready', component_status: { resources: 'available' } };
beforeEach(() => { global.fetch = jest.fn(); sessionStorage.clear(); });

test('a transient GET outage recovers the same saved result without any POST', async () => {
  fetch.mockRejectedValueOnce(new TypeError('offline')).mockResolvedValue(response(result));
  const update = jest.fn(), connection = jest.fn();
  await pollResult('saved', update, { baseDelay: 0, onConnection: connection });
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(fetch.mock.calls.every(([, options]) => !options.method)).toBe(true);
  expect(update).toHaveBeenCalledWith(result);
  expect(connection.mock.calls.map(([state]) => state)).toEqual(['reconnecting', 'connected']);
});

test('read retries are bounded and report exhaustion', async () => {
  fetch.mockResolvedValue(response({ detail: 'Unavailable' }, 503));
  const connection = jest.fn();
  await expect(pollResult('saved', jest.fn(), { maxRetries: 2, baseDelay: 0, onConnection: connection })).rejects.toMatchObject({ status: 503 });
  expect(fetch).toHaveBeenCalledTimes(3);
  expect(connection).toHaveBeenLastCalledWith('exhausted');
});

test('abort during backoff cancels the read and prevents another request', async () => {
  fetch.mockRejectedValue(new TypeError('temporary'));
  const controller = new AbortController(), connection = jest.fn();
  const reading = pollResult('saved', jest.fn(), { signal: controller.signal, baseDelay: 10000, onConnection: connection });
  const rejected = expect(reading).rejects.toMatchObject({ name: 'AbortError' });
  await waitFor(() => expect(connection).toHaveBeenCalledWith('reconnecting'));
  controller.abort(); await rejected;
  expect(fetch).toHaveBeenCalledTimes(1);
});

test('GET requests pause until the browser is online and visible', async () => {
  const online = Object.getOwnPropertyDescriptor(navigator, 'onLine');
  const visibility = Object.getOwnPropertyDescriptor(document, 'visibilityState');
  let isOnline = false, state = 'hidden';
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => isOnline });
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
  const controller = new AbortController();
  try {
    fetch.mockResolvedValue(response(result));
    const reading = pollResult('saved', jest.fn(), { signal: controller.signal });
    await Promise.resolve(); expect(fetch).not.toHaveBeenCalled();
    isOnline = true; window.dispatchEvent(new Event('online'));
    await Promise.resolve(); expect(fetch).not.toHaveBeenCalled();
    state = 'visible'; document.dispatchEvent(new Event('visibilitychange'));
    await expect(reading).resolves.toEqual(result);
  } finally {
    controller.abort();
    if (online) Object.defineProperty(navigator, 'onLine', online); else delete navigator.onLine;
    if (visibility) Object.defineProperty(document, 'visibilityState', visibility); else delete document.visibilityState;
  }
});

test('malformed successful JSON is a protocol error and never replays plan creation', async () => {
  fetch.mockResolvedValue({ ok: true, status: 200, json: async () => { throw new SyntaxError('bad JSON'); } });
  await expect(createPlanOnce('uncertain malformed response')).rejects.toMatchObject({ protocol: true });
  await expect(createPlanOnce('uncertain malformed response')).rejects.toThrow('interrupted');
  expect(fetch).toHaveBeenCalledTimes(1);
});

test('GET envelope mismatches and authentication failures do not retry automatically', async () => {
  fetch.mockResolvedValueOnce(response({ run_id: 'another', status: 'running' }))
    .mockResolvedValueOnce(response({ run_id: 'saved', status: 'running', plan: [] }))
    .mockResolvedValueOnce(response({ detail: 'Login required' }, 401));
  await expect(getRun('saved')).rejects.toMatchObject({ protocol: true });
  await expect(getRun('saved')).rejects.toMatchObject({ protocol: true });
  await expect(getRun('saved')).rejects.toMatchObject({ status: 401 });
  expect(fetch).toHaveBeenCalledTimes(3);
});

test('a hanging GET is aborted at its deadline', async () => {
  fetch.mockImplementation((_, { signal }) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))));
  await expect(request('/results/saved', { timeoutMs: 1 })).rejects.toMatchObject({ status: 408 });
});

test('SSE reconnect uses the newest durable sequence and ignores the closed connection', async () => {
  const sources = [];
  global.EventSource = jest.fn().mockImplementation(url => { const source = { url, close: jest.fn(), addEventListener(type, callback) { this[type] = callback; } }; sources.push(source); return source; });
  const event = (seq, type = 'graph_answer') => ({ data: JSON.stringify({ seq, type, payload: { text: 'text', delta: true } }) });
  const onEvent = jest.fn(), connection = jest.fn();
  const stop = watchRun('run', 8, onEvent, connection, { baseDelay: 0, maxRetries: 1 });
  try {
    sources[0].graph_answer(event(9)); sources[0].onerror();
    await waitFor(() => expect(sources).toHaveLength(2));
    expect(sources[1].url).toContain('after=9');
    sources[0].graph_answer(event(10)); sources[1].graph_answer(event(9));
    expect(onEvent).toHaveBeenCalledTimes(1);
    sources[1].onerror();
    expect(connection).toHaveBeenLastCalledWith('exhausted');
    expect(fetch).not.toHaveBeenCalled();
  } finally { stop(); }
});

test('stopping SSE during reconnection prevents a new subscription', async () => {
  let source;
  global.EventSource = jest.fn().mockImplementation(() => { source = { close: jest.fn(), addEventListener: jest.fn() }; return source; });
  const stop = watchRun('run', 8, jest.fn(), jest.fn(), { baseDelay: 0 });
  source.onerror(); stop();
  await new Promise(resolve => setTimeout(resolve, 5));
  expect(EventSource).toHaveBeenCalledTimes(1);
});

test('SSE closes while offline and resumes the same cursor after connectivity returns', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(navigator, 'onLine');
  let online = true;
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => online });
  const sources = [];
  global.EventSource = jest.fn().mockImplementation(url => { const source = { url, close: jest.fn(), addEventListener(type, callback) { this[type] = callback; } }; sources.push(source); return source; });
  const status = jest.fn(), stop = watchRun('run', 11, jest.fn(), status);
  try {
    online = false; window.dispatchEvent(new Event('offline'));
    expect(sources[0].close).toHaveBeenCalled();
    expect(status).toHaveBeenLastCalledWith('paused');
    online = true; window.dispatchEvent(new Event('online'));
    await waitFor(() => expect(sources).toHaveLength(2));
    expect(sources[1].url).toContain('after=11');
  } finally { stop(); if (descriptor) Object.defineProperty(navigator, 'onLine', descriptor); else delete navigator.onLine; }
});
