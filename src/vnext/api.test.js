import { apiPath, cancelRun, componentsPending, createPlanOnce, createResultOnce, pollResult, routerPath, sitePath, watchRun } from './api';

const response = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });
beforeEach(() => { sessionStorage.clear(); global.fetch = jest.fn(); });
test('same-origin routes honor deployment prefix', () => {
  expect(apiPath('/agent/v2/plans')).toBe('/pankgraph-vnext/api/agent/v2/plans');
});
test('plain links and router returns apply the deployment prefix exactly once', () => {
  const savedReturn = '/pankgraph-vnext/old-landing?qid=1#question';
  expect(routerPath(savedReturn)).toBe('/old-landing?qid=1#question');
  expect(sitePath(routerPath(savedReturn))).toBe(savedReturn);
  expect(sitePath(savedReturn)).toBe(savedReturn);
  expect(sitePath('/docs/API')).toBe('/pankgraph-vnext/docs/API');
  expect(sitePath('/')).toBe('/pankgraph-vnext/');
  expect(routerPath('/pankgraph-vnext?tab=search')).toBe('/?tab=search');
  expect(routerPath('/pankgraph-vnext-other')).toBe('/pankgraph-vnext-other');
  expect(sitePath('https://pankbase.org')).toBe('https://pankbase.org');
});
test('concurrent creation and reload reuse the one saved run', async () => {
  fetch.mockResolvedValue(response({ run_id: 'r1', plan_id: 'p1' }, 202));
  const [first, second] = await Promise.all([createPlanOnce('Which cells express INS?'), createPlanOnce('Which cells express INS?')]);
  expect(first).toEqual(second);
  expect(await createPlanOnce('Which cells express INS?')).toEqual(first);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ question: 'Which cells express INS?', include_context: true });
});
test('uncertain creation is not retried automatically', async () => {
  fetch.mockRejectedValue(new TypeError('offline'));
  await expect(createPlanOnce('uncertain')).rejects.toThrow('offline');
  await expect(createPlanOnce('uncertain')).rejects.toThrow('interrupted');
  expect(fetch).toHaveBeenCalledTimes(1);
});
test('result phase and changed question cannot reuse another result', async () => {
  fetch.mockResolvedValue(response({ result_id: 'result1' }));
  await createResultOnce({ run_id: 'r', phase: 'preview' });
  await createResultOnce({ run_id: 'r', phase: 'preview' });
  await createResultOnce({ run_id: 'r', phase: 'final' });
  expect(fetch).toHaveBeenCalledTimes(2);
});
test('layout ready keeps polling immutable result while optional resources are pending', async () => {
  const first = { status: 'ready', component_status: { graph: 'ready', resources: 'pending' } };
  const final = { status: 'ready', component_status: { graph: 'ready', resources: 'partial' } };
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
  fetch.mockResolvedValue(response({ status: 'cancelled' }));
  await cancelRun('safe-id');
  expect(fetch.mock.calls[0][0]).toBe('/pankgraph-vnext/api/agent/v2/runs/safe-id/cancel');
  expect(fetch.mock.calls[0][1].method).toBe('POST');
});
