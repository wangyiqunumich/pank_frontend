import { createPlanOnce, getRun, pollResult, request, watchRun } from './api';

const response = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });
const result = { result_id: 'saved', status: 'ready', component_status: { resources: 'available' } };
beforeEach(() => { global.fetch = jest.fn(); sessionStorage.clear(); });

test('a failed saved read is surfaced without automatic retries or new work', async () => {
  fetch.mockResolvedValue(response({ detail: 'Unavailable' }, 503));
  const connection = jest.fn();
  await expect(pollResult('saved', jest.fn(), { onConnection: connection })).rejects.toMatchObject({ status: 503 });
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[0][1].method).toBeUndefined();
  expect(connection).toHaveBeenLastCalledWith('exhausted');
});

test('saved reads proceed even when the browser reports hidden or offline', async () => {
  const online = Object.getOwnPropertyDescriptor(navigator, 'onLine');
  const visibility = Object.getOwnPropertyDescriptor(document, 'visibilityState');
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
  try {
    fetch.mockResolvedValue(response(result));
    await expect(pollResult('saved', jest.fn())).resolves.toEqual(result);
    expect(fetch).toHaveBeenCalledTimes(1);
  } finally {
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

test('SSE stays open through tab changes and five minutes of quiet plan review', () => {
  jest.useFakeTimers();
  let source;
  global.EventSource = jest.fn().mockImplementation(() => {
    source = { close: jest.fn(), readyState: 0, addEventListener(type, callback) { this[type] = callback; } };
    return source;
  });
  const onEvent = jest.fn(), connection = jest.fn();
  const stop = watchRun('run', 8, onEvent, connection);
  const visibility = Object.getOwnPropertyDescriptor(document, 'visibilityState');
  try {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('offline'));
    source.onerror();
    jest.advanceTimersByTime(300000);
    expect(source.close).not.toHaveBeenCalled();
    expect(EventSource).toHaveBeenCalledTimes(1);
    expect(connection).not.toHaveBeenCalled();
    const event = seq => ({ data: JSON.stringify({ seq, type: 'graph_answer' }) });
    source.graph_answer(event(9)); source.graph_answer(event(9));
    expect(onEvent).toHaveBeenCalledTimes(1);
    stop(); source.graph_answer(event(10));
    expect(onEvent).toHaveBeenCalledTimes(1);
    expect(fetch).not.toHaveBeenCalled();
  } finally {
    stop(); jest.useRealTimers();
    if (visibility) Object.defineProperty(document, 'visibilityState', visibility); else delete document.visibilityState;
  }
});

test('a permanently closed SSE surfaces a read error', () => {
  let source;
  global.EventSource = jest.fn().mockImplementation(() => {
    source = { close: jest.fn(), readyState: 2, addEventListener: jest.fn() }; return source;
  });
  const connection = jest.fn();
  watchRun('run', 8, jest.fn(), connection);
  source.onerror();
  expect(connection).toHaveBeenCalledWith('exhausted');
  expect(source.close).toHaveBeenCalled();
});
