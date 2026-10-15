import { apiPath, cancelRequest, cancelRun, confirmPlan, componentsPending, createPlanOnce, createResultOnce, pollResult, retryFormatter, revisePlan, routerPath, sitePath, watchRun } from './api';

const response = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });
beforeEach(() => { sessionStorage.clear(); global.fetch = jest.fn(); });
test('same-origin routes honor deployment prefix', () => {
  expect(apiPath('/agent/v2/plans')).toBe('/pankgraph-vnext/api/agent/v2/plans');
});
test('root UI paths and namespaced API resources remain separate', () => {
  expect(sitePath('/docs/API')).toBe('/docs/API');
  expect(sitePath('/')).toBe('/');
  expect(routerPath('/agent-vnext?run_id=r1')).toBe('/agent-vnext?run_id=r1');
  expect(sitePath('/api/resources/asset-1')).toBe('/pankgraph-vnext/api/resources/asset-1');
  expect(sitePath('/pankgraph-vnext/api/resources/asset-1')).toBe('/pankgraph-vnext/api/resources/asset-1');
  expect(sitePath('https://pankbase.org')).toBe('https://pankbase.org');
});
test('concurrent creation and reload reuse the one saved run', async () => {
  fetch.mockResolvedValue(response({ run_id: 'r1', plan_id: 'p1' }, 202));
  const [first, second] = await Promise.all([createPlanOnce('Which cells express INS?'), createPlanOnce('Which cells express INS?')]);
  expect(first).toEqual(second);
  expect(await createPlanOnce('Which cells express INS?')).toEqual(first);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ question: 'Which cells express INS?', include_context: true, session_id: expect.any(String), request_id: expect.any(String) });
});
test('uncertain creation is not retried automatically', async () => {
  fetch.mockRejectedValue(new TypeError('offline'));
  await expect(createPlanOnce('uncertain')).rejects.toThrow('offline');
  await expect(createPlanOnce('uncertain')).rejects.toThrow('offline');
  expect(fetch.mock.calls.filter(([, options]) => options.method === 'POST')).toHaveLength(1);
  expect(fetch.mock.calls.slice(1).every(([url, options]) => url.includes('/requests/') && !options.method)).toBe(true);
});
test('result phase and changed question cannot reuse another result', async () => {
  fetch.mockResolvedValue(response({ result_id: 'result1' }));
  await createResultOnce({ run_id: 'r', phase: 'preview' });
  await createResultOnce({ run_id: 'r', phase: 'preview' });
  await createResultOnce({ run_id: 'r', phase: 'final' });
  expect(fetch).toHaveBeenCalledTimes(2);
});
test('layout ready keeps polling immutable result while optional resources are pending', async () => {
  const first = { result_id: 'immutable', status: 'ready', component_status: { graph: 'ready', resources: 'pending' } };
  const final = { result_id: 'immutable', status: 'ready', component_status: { graph: 'ready', resources: 'partial' } };
  fetch.mockResolvedValueOnce(response(first)).mockResolvedValueOnce(response(final));
  const update = jest.fn();
  expect(componentsPending(first)).toBe(true);
  await pollResult('immutable', update, { interval: 0 });
  expect(update.mock.calls).toEqual([[first], [final]]);
  expect(fetch.mock.calls.map(([url]) => url)).toEqual(['/pankgraph-vnext/api/results/immutable', '/pankgraph-vnext/api/results/immutable']);
  expect(fetch.mock.calls.every(([, options]) => !options.method)).toBe(true);
});
test('SSE starts after snapshot and ignores duplicate sequence before terminal', () => {
  let source;
  global.EventSource = jest.fn().mockImplementation((url) => { source = { url, addEventListener: jest.fn((type, callback) => { source[type] = callback; }), close: jest.fn() }; return source; });
  const onEvent = jest.fn();
  const stop = watchRun('r1', 8, onEvent);
  expect(source.url).toContain('/runs/r1/events?after=8');
  const event = (sequence, type, payload) => ({ data: JSON.stringify({ sequence, type, payload }) });
  source.graph_answer(event(8, 'graph_answer', { text: 'duplicate', delta: true }));
  source.graph_answer(event(9, 'graph_answer', { text: 'new', delta: true }));
  source.graph_answer(event(9, 'graph_answer', { text: 'duplicate', delta: true }));
  source.terminal(event(10, 'terminal', { status: 'completed' }));
  expect(onEvent.mock.calls.map(([item]) => item.seq)).toEqual([9, 10]);
  expect(onEvent.mock.calls[0][0].payload.delta).toBe(true);
  expect(source.close).toHaveBeenCalledTimes(1);
  stop();
});
test('cancel is explicit and run-scoped', async () => {
  fetch.mockResolvedValue(response({ run_id: 'safe-id', status: 'cancelled' }));
  await cancelRun('safe-id');
  expect(fetch.mock.calls[0][0]).toBe('/pankgraph-vnext/api/agent/v2/runs/safe-id/cancel');
  expect(fetch.mock.calls[0][1].method).toBe('POST');
});

test('SSE delivers follow-up readiness and independent literature source updates', () => {
  let source;
  global.EventSource = jest.fn().mockImplementation(() => {
    source = { addEventListener: jest.fn((type, callback) => { source[type] = callback; }), close: jest.fn() };
    return source;
  });
  const onEvent = jest.fn();
  const stop = watchRun('r1', 8, onEvent);
  expect(source.followup_ready).toEqual(expect.any(Function));
  expect(source.literature_sources).toEqual(expect.any(Function));
  const event = (seq, type, payload) => ({ data: JSON.stringify({ seq, type, payload }) });
  source.followup_ready(event(9, 'followup_ready', { followup_ready: true }));
  source.literature_sources(event(10, 'literature_sources', { sources: { hirn: { status: 'complete' }, glkb: { status: 'running' } } }));
  source.literature_sources(event(10, 'literature_sources', { sources: {} }));
  expect(onEvent.mock.calls.map(([item]) => item.type)).toEqual(['followup_ready', 'literature_sources']);
  expect(onEvent.mock.calls[1][0].payload.sources.hirn.status).toBe('complete');
  expect(source.close).not.toHaveBeenCalled();
  stop();
});

const requestId = 'd4907c27-822f-45de-8600-0c4906f26da7';
test('lost admission response recovers by request ID without repeating the POST', async () => {
  fetch.mockRejectedValueOnce(new TypeError('offline'))
    .mockResolvedValueOnce(response({ request_id: requestId, run_id: 'recovered', status: 'running' }));
  await expect(createPlanOnce('INS', 'session', requestId)).resolves.toMatchObject({ run_id: 'recovered' });
  await expect(createPlanOnce('INS', 'session', requestId)).resolves.toMatchObject({ run_id: 'recovered' });
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(fetch.mock.calls[1][0]).toContain(`/requests/${requestId}`);
  expect(fetch.mock.calls[1][1].method).toBeUndefined();
});

test('pending admission reconnect reads only and does not mislabel pending as cancelled', async () => {
  fetch.mockResolvedValueOnce(response({}, 503)).mockResolvedValueOnce(response({}, 503));
  await expect(createPlanOnce('INS', 'session', requestId)).rejects.toMatchObject({ outcomeUnknown: true });
  fetch.mockResolvedValueOnce(response({ request_id: requestId, status: 'pending' }));
  await expect(createPlanOnce('INS', 'session', requestId)).rejects.toMatchObject({ outcomeUnknown: true, message: expect.stringContaining('still pending') });
  expect(fetch.mock.calls.filter(([, options]) => options.method === 'POST')).toHaveLength(1);
});

test('missing admission can retry the same durable payload, including its generated session', async () => {
  fetch.mockResolvedValueOnce(response({}, 503)).mockResolvedValueOnce(response({}, 503));
  await expect(createPlanOnce('legacy')).rejects.toMatchObject({ outcomeUnknown: true });
  fetch.mockResolvedValueOnce(response({}, 404)).mockResolvedValueOnce(response({ run_id: 'r1' }));
  await expect(createPlanOnce('legacy')).resolves.toMatchObject({ run_id: 'r1' });
  const writes = fetch.mock.calls.filter(([, options]) => options.method === 'POST');
  expect(writes).toHaveLength(2);
  expect(JSON.parse(writes[1][1].body)).toEqual(JSON.parse(writes[0][1].body));
});

test('revision keeps its request identity when recovering a lost response', async () => {
  fetch.mockRejectedValueOnce(new TypeError('offline')).mockResolvedValueOnce(response({ request_id: requestId, run_id: 'revision' }));
  await expect(revisePlan('plan', 'Use SST', true, requestId)).resolves.toMatchObject({ run_id: 'revision' });
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({ request_id: requestId, revision_mode: 'instruction', revision_instruction: 'Use SST' });
});

test('request cancellation works before a run ID exists and recovers uncertain replies by reading', async () => {
  fetch.mockRejectedValueOnce(new TypeError('offline')).mockResolvedValueOnce(response({ request_id: requestId, cancel_requested: true, status: 'cancelled' }));
  await expect(cancelRequest(requestId)).resolves.toMatchObject({ cancel_requested: true });
  expect(fetch.mock.calls[0][0]).toContain(`/requests/${requestId}/cancel`);
  expect(fetch.mock.calls[1][1].method).toBeUndefined();
});

test.each([
  ['confirm', () => confirmPlan('plan', 'r1'), 'running'],
  ['cancel', () => cancelRun('r1'), 'cancelled'],
  ['formatter', () => retryFormatter('r1'), 'running'],
])('%s recovers an uncertain control response from the same saved run, without replay', async (_, operation, status) => {
  fetch.mockResolvedValueOnce(response({}, 503)).mockResolvedValueOnce(response({ run_id: 'r1', status }));
  await expect(operation()).resolves.toMatchObject({ run_id: 'r1', status });
  expect(fetch.mock.calls.filter(([, options]) => options.method === 'POST')).toHaveLength(1);
  expect(fetch.mock.calls[1][0]).toContain('/runs/r1');
});

test('control recovery refuses a snapshot belonging to another run', async () => {
  fetch.mockResolvedValueOnce(response({}, 503)).mockResolvedValueOnce(response({ run_id: 'other', status: 'cancelled' }));
  await expect(cancelRun('r1')).rejects.toMatchObject({ status: 503 });
});
