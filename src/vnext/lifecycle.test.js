import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AgentResultView, { useProjectedResult, readPriorConversation } from './ResultView';
import ConnectionNotice from './ConnectionNotice';
import * as api from './api';

jest.mock('react-markdown', () => ({ __esModule: true, default: ({ children }) => <div>{children}</div> }));
jest.mock('remark-gfm', () => ({ __esModule: true, default: () => {} }));
jest.mock('react-slick', () => ({ __esModule: true, default: ({ children }) => <div>{children}</div> }));
jest.mock('./KnowledgeGraph', () => ({ __esModule: true, default: ({ graphData }) => <div data-testid="graph">{graphData.nodes.map((node) => node['~id']).join(',')}</div> }));
jest.mock('./api', () => ({ ...jest.requireActual('./api'), getRun: jest.fn(), getResult: jest.fn(), createPlanOnce: jest.fn(), createResultOnce: jest.fn(), pollResult: jest.fn(), watchRun: jest.fn(), revisePlan: jest.fn(), confirmPlan: jest.fn(), cancelRun: jest.fn() }));

const snapshot = (id = 'r1', question = 'Which cells express INS?') => ({ run_id: id, plan_id: `p-${id}`, session_id: 's1', question, status: 'awaiting_confirmation', event_sequence: 40, plan: { interpreted_question: question, steps: [{ id: 's1', title: 'Check expression', question }] }, preview: { status: 'complete', evidence: {graph_version:'test'} }, include_context: true });
beforeEach(() => {
  jest.clearAllMocks(); localStorage.clear(); sessionStorage.clear();
  api.getRun.mockImplementation(async (id) => snapshot(id));
  api.createResultOnce.mockImplementation(async ({ run_id, phase }) => ({ result_id: `${run_id}-${phase}` }));
  api.pollResult.mockImplementation(async (id, update) => { const result = { status: 'ready', component_status: { resources: 'not_applicable' }, combined_query_result: { nodes: [{ '~id': id }], edges: [] }, resources_tabs: {} }; update(result); return result; });
  api.watchRun.mockReturnValue(jest.fn());
});
const mount = () => render(<MemoryRouter initialEntries={['/result-new2?run_id=r1']}><AgentResultView contentAnchorPrefix="lifecycle" onContentMeta={jest.fn()} /></MemoryRouter>);

test('saved run hydrates preview, resumes cursor, and does not create a model call', async () => {
  const { unmount } = mount();
  await waitFor(() => expect(screen.getByTestId('graph').textContent).toBe('r1-preview'));
  expect(api.createPlanOnce).not.toHaveBeenCalled();
  expect(api.watchRun).toHaveBeenCalledWith('r1', 40, expect.any(Function), expect.any(Function));
  expect(api.createResultOnce).toHaveBeenCalledTimes(1);
  unmount();
  expect(api.watchRun.mock.results[0].value).toHaveBeenCalled();
});
test('revision creates a fresh run and graph while preserving the edited biological question', async () => {
  api.revisePlan.mockResolvedValue({ run_id: 'r2' });
  api.getRun.mockImplementation(async (id) => snapshot(id, id === 'r2' ? 'Which cells express SST?' : 'Which cells express INS?'));
  mount();
  await waitFor(() => expect(screen.getByTestId('graph').textContent).toBe('r1-preview'));
  expect(screen.getByPlaceholderText('e.g. Use spleen instead, keeping the same donor filters').value).toBe('');
  fireEvent.change(screen.getByPlaceholderText('e.g. Use spleen instead, keeping the same donor filters'), { target: { value: 'Which cells express SST?' } });
  fireEvent.click(screen.getByRole('button', { name: 'send' }));
  await waitFor(() => expect(screen.getByTestId('graph').textContent).toBe('r2-preview'));
  expect(api.revisePlan).toHaveBeenCalledWith('p-r1', 'Which cells express SST?', true);
  expect(screen.getByPlaceholderText('e.g. Use spleen instead, keeping the same donor filters').value).toBe('');
  expect(api.createPlanOnce).not.toHaveBeenCalled();
});
test('SSE text is appended once and final evidence requests one final projection', async () => {
  api.getRun.mockResolvedValue({ ...snapshot(), status: 'running', graph_answer: 'Already saved ' });
  mount();
  await waitFor(() => expect(api.watchRun).toHaveBeenCalled());
  const emit = api.watchRun.mock.calls[0][2];
  act(() => {
    emit({ sequence: 41, type: 'graph_answer', payload: { text: 'new text', delta: true } });
    emit({ sequence: 41, type: 'graph_answer', payload: { text: 'new text', delta: true } });
  });
  expect(screen.getByText('Already saved new text')).toBeTruthy();
  act(() => emit({ sequence: 42, type: 'graph_answer', payload: { answer: 'Final [G1]', delta: false, evidence: { graph_version:'test', completeness: 'complete' } } }));
  await waitFor(() => expect(screen.getByTestId('graph').textContent).toBe('r1-final'));
  expect(api.createResultOnce.mock.calls.map(([payload]) => payload.phase)).toEqual(['preview', 'final']);
  expect(screen.getByText('Final [G1]')).toBeTruthy();
});

test('preview stays mounted while final projection is pending, then updates in place', async () => {
  api.getRun.mockResolvedValue({ ...snapshot(), status: 'running' });
  let finalUpdate;
  const originalPoll = api.pollResult.getMockImplementation();
  api.pollResult.mockImplementation((id, update, options) => {
    if (id.endsWith('-final')) { finalUpdate = update; update({status:'queued'}); return Promise.resolve(); }
    return originalPoll(id, update, options);
  });
  mount();
  await waitFor(() => expect(screen.getByTestId('graph').textContent).toBe('r1-preview'));
  const graph = screen.getByTestId('graph');
  const emit = api.watchRun.mock.calls[0][2];
  act(() => emit({ sequence: 41, type:'graph_answer', payload:{answer:'Final answer', evidence:{graph_version:'test', completeness:'complete'}} }));
  await waitFor(() => expect(finalUpdate).toBeDefined());
  expect(screen.getByTestId('graph')).toBe(graph);
  expect(graph.textContent).toBe('r1-preview');
  act(() => finalUpdate({status:'ready', combined_query_result:{nodes:[{'~id':'final-evidence'}], edges:[]}, resources_tabs:{}}));
  expect(screen.getByTestId('graph')).toBe(graph);
  expect(graph.textContent).toBe('final-evidence');
});

test('manual result reconnect reads the existing result and preserves its graph', async () => {
  let calls = 0;
  api.pollResult.mockImplementation(async (id, update) => {
    calls += 1;
    update({ result_id: id, status: 'ready', combined_query_result: { nodes: [{ '~id': 'preserved' }], edges: [] } });
    if (calls === 1) throw new Error('Temporary read outage');
  });
  function Probe() {
    const [result, , connection] = useProjectedResult({ run_id: 'r1', phase: 'preview' });
    return <><ConnectionNotice status={connection.status} onReconnect={connection.reconnect} />{result && <div data-testid="saved-graph">{result.combined_query_result.nodes[0]['~id']}</div>}</>;
  }
  render(<Probe />);
  const reconnect = await screen.findByRole('button', { name: 'Reconnect' });
  const graph = screen.getByTestId('saved-graph');
  fireEvent.click(reconnect);
  await waitFor(() => expect(api.pollResult).toHaveBeenCalledTimes(2));
  expect(api.createResultOnce).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId('saved-graph')).toBe(graph);
  expect(api.createPlanOnce).not.toHaveBeenCalled();
});

test('a failed saved-run read offers read-only reconnect instead of a new query', async () => {
  api.getRun.mockRejectedValueOnce(new Error('Read unavailable')).mockResolvedValue(snapshot());
  mount();
  fireEvent.click(await screen.findByRole('button', { name: 'Reconnect' }));
  await screen.findByTestId('graph');
  expect(api.getRun).toHaveBeenCalledTimes(2);
  expect(api.createPlanOnce).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: 'Retry original question' })).toBeNull();
});

test('late result updates after changing scope cannot replace the current graph', async () => {
  const updates = {};
  api.pollResult.mockImplementation(async (id, update) => { updates[id] = update; });
  function Probe({ id }) { const [result] = useProjectedResult({ run_id: id, phase: 'preview' }); return <output>{result?.result_id || 'waiting'}</output>; }
  const { rerender } = render(<Probe id="old" />);
  await waitFor(() => expect(updates['old-preview']).toBeDefined());
  rerender(<Probe id="new" />);
  await waitFor(() => expect(updates['new-preview']).toBeDefined());
  act(() => updates['new-preview']({ result_id: 'new-preview', status: 'ready' }));
  act(() => updates['old-preview']({ result_id: 'old-preview', status: 'ready' }));
  expect(screen.getByRole('status').textContent).toBe('new-preview');
});


test('unknown session history does not create an investigation from a saved question', async () => {
  render(<MemoryRouter initialEntries={['/agent-vnext?session_id=legacy&question=SU5T']}><AgentResultView /></MemoryRouter>);
  await screen.findByText(/This saved investigation is not available/);
  expect(api.createPlanOnce).not.toHaveBeenCalled();
  expect(api.getRun).not.toHaveBeenCalled();
});


test('saved conversation hydration reads prior final snapshots without creating work', async () => {
  localStorage.setItem('pank-vnext:presentation:r0:final', JSON.stringify('saved-result'));
  api.getRun.mockImplementation(async (id) => ({...snapshot(id), status: id === 'superseded' ? 'superseded' : 'completed', graph_answer: 'Recorded answer'}));
  api.getResult.mockResolvedValue({ result_id:'saved-result', status:'ready', combined_query_result:{nodes:[],edges:[]} });
  const history = await readPriorConversation(['r0','superseded','r1'], 'r1');
  expect(history.items.map(item=>item.run.run_id)).toEqual(['r0']);
  expect(api.getResult).toHaveBeenCalledWith('saved-result', {});
  expect(api.createPlanOnce).not.toHaveBeenCalled();
  expect(api.createResultOnce).not.toHaveBeenCalled();
});
test('missing prior presentation preserves the saved answer with an explicit graph notice', async () => {
  api.getRun.mockResolvedValue({...snapshot('r0'),status:'completed',graph_answer:'Recorded answer'});
  const history = await readPriorConversation(['r0'], 'r1');
  expect(history.items[0].run.graph_answer).toBe('Recorded answer');
  expect(history.items[0].error).toMatch(/saved graph presentation is unavailable/);
  expect(api.getResult).not.toHaveBeenCalled();
  expect(api.createResultOnce).not.toHaveBeenCalled();
});
