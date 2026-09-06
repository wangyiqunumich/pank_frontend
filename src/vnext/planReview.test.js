import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { PlanConfirmationPage } from '../components/ResultComponent';
import { ResultSection } from './ResultView';

jest.mock('react-markdown', () => ({ __esModule: true, default: ({ children }) => <div>{children}</div> }));
jest.mock('remark-gfm', () => ({ __esModule: true, default: () => {} }));
jest.mock('rehype-raw', () => ({ __esModule: true, default: () => {} }));
jest.mock('../components/KnowledgeGraph', () => ({ __esModule: true, default: ({ graphData }) => <div data-testid="actual-graph">{graphData.nodes.length} graph nodes</div> }));
jest.mock('react-slick', () => ({ __esModule: true, default: ({ children }) => <div>{children}</div> }));

test('the existing revision input hydrates the full question and sends it verbatim', () => {
  const revise = jest.fn();
  const data = { originalQuestion: 'Which cells express INS?', revisionQuestion: 'Which cells express INS?', revisionKey: 'p1', agentPlan: 'Check expression evidence.', onSendFeedback: revise };
  const { rerender } = render(<PlanConfirmationPage data={data} />);
  const input = screen.getByPlaceholderText('Tell me if I missed anything...');
  expect(input.value).toBe('Which cells express INS?');
  fireEvent.change(input, { target: { value: 'Which cells express GCG in ND?' } });
  fireEvent.click(screen.getByRole('button', { name: 'send' }));
  expect(revise).toHaveBeenCalledWith('Which cells express GCG in ND?');
  expect(input.value).toBe('Which cells express GCG in ND?');
  rerender(<PlanConfirmationPage data={{ ...data, revisionQuestion: 'Which cells express SST?', revisionKey: 'p2' }} />);
  expect(input.value).toBe('Which cells express SST?');
});

test('saved plan without preview disables confirmation and keeps revision usable', () => {
  render(<ResultSection planning run={{ status: 'awaiting_confirmation', question: 'INS?', plan_id: 'old', plan: { steps: [] } }} anchorPrefix="test" />);
  expect(screen.getByText(/This saved plan needs an initial evidence check/)).toBeTruthy();
  const proceed = document.getElementById('test-plan-proceed-button');
  expect(proceed.disabled).toBe(true);
  expect(screen.getByRole('button', { name: 'send' }).disabled).toBe(false);
});

test('failed checked preview is disclosed and can be confirmed for bounded retry', () => {
  render(<ResultSection planning run={{ status: 'awaiting_confirmation', question: 'INS?', plan_id: 'p', preview: { status: 'failed' }, plan: { steps: [] } }} anchorPrefix="test" />);
  expect(screen.getByText(/Initial evidence check: failed/)).toBeTruthy();
  expect(document.getElementById('test-plan-proceed-button').disabled).toBe(false);
});

test('plan review uses the actual projected graph and clarified entities disable confirmation', () => {
  const result = { combined_query_result: { nodes: [{ '~id': 'INS' }], edges: [] } };
  render(<ResultSection planning result={result} run={{ status: 'awaiting_confirmation', question: 'INS?', plan_id: 'p', preview: { status: 'not_requested' }, plan: { clarification: 'Resolve the indicated entity.', steps: [] } }} anchorPrefix="test" />);
  expect(screen.getByTestId('actual-graph').textContent).toBe('1 graph nodes');
  expect(screen.getByText(/Resolve the indicated entity/)).toBeTruthy();
  expect(document.getElementById('test-plan-proceed-button').disabled).toBe(true);
});
