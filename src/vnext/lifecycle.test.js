import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AgentResultView from './ResultView';
import * as api from './api';

jest.mock('react-markdown', () => ({ __esModule: true, default: ({ children }) => <div>{children}</div> }));
jest.mock('remark-gfm', () => ({ __esModule: true, default: () => {} }));
jest.mock('react-slick', () => ({ __esModule: true, default: ({ children }) => <div>{children}</div> }));
jest.mock('../components/KnowledgeGraph', () => ({ __esModule: true, default: ({ graphData }) => <div data-testid="graph">{graphData.nodes.map((node) => node['~id']).join(',')}</div> }));
jest.mock('./api', () => ({ ...jest.requireActual('./api'), getRun: jest.fn(), createPlanOnce: jest.fn(), createResultOnce: jest.fn(), pollResult: jest.fn(), watchRun: jest.fn(), revisePlan: jest.fn(), confirmPlan: jest.fn(), cancelRun: jest.fn() }));

const snapshot = (id = 'r1', question = 'Which cells express INS?') => ({ run_id: id, plan_id: `p-${id}`, session_id: 's1', question, status: 'awaiting_confirmation', event_sequence: 40, plan: { interpreted_question: question, steps: [{ id: 's1', title: 'Check expression', question }] }, preview: { status: 'complete' }, include_context: true });
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
  fireEvent.change(screen.getByPlaceholderText('Tell me if I missed anything...'), { target: { value: 'Which cells express SST?' } });
  fireEvent.click(screen.getByRole('button', { name: 'send' }));
  await waitFor(() => expect(screen.getByTestId('graph').textContent).toBe('r2-preview'));
  expect(api.revisePlan).toHaveBeenCalledWith('p-r1', 'Which cells express SST?', true);
  expect(screen.getByPlaceholderText('Tell me if I missed anything...').value).toBe('Which cells express SST?');
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
  act(() => emit({ sequence: 42, type: 'graph_answer', payload: { answer: 'Final [G1]', delta: false, evidence: { completeness: 'complete' } } }));
  await waitFor(() => expect(screen.getByTestId('graph').textContent).toBe('r1-final'));
  expect(api.createResultOnce.mock.calls.map(([payload]) => payload.phase)).toEqual(['preview', 'final']);
  expect(screen.getByText('Final [G1]')).toBeTruthy();
});
