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
test('the existing plan content discloses included literature without adding controls', () => {
  render(<ResultSection planning run={{ status: 'awaiting_confirmation', question: 'Why is CFTR enriched?', plan_id: 'p', preview: { status: 'complete' }, plan: { literature_intent: { included: true, summary: 'Add literature context and alternative explanations.' }, steps: [] } }} anchorPrefix="test" />);
  expect(screen.getByText(/Literature evidence: included/)).toBeTruthy();
  expect(screen.getByText(/Add literature context and alternative explanations/)).toBeTruthy();
  expect(document.getElementById('test-plan-proceed-button').disabled).toBe(false);
});
test('existing answer sections show pending and unavailable literature while retaining graph and valid references', () => {
  const run = { status: 'running', question: 'CFTR?', graph_answer: 'Graph answer remains visible.', plan: { literature: true } };
  const { rerender } = render(<ResultSection run={run} anchorPrefix="test" />);
  expect(screen.getByText('Literature evidence is pending.')).toBeTruthy();
  const perspective = { id: 'm', label: 'Mechanism', answer: 'Available literature context.', references: [{ pmid: '12345678', title: 'Supplied paper title', journal: 'Supplied journal' }] };
  rerender(<ResultSection run={{ ...run, status: 'partial', literature: { status: 'unavailable', perspectives: [perspective] } }} anchorPrefix="test" />);
  expect(screen.getByText('Graph answer remains visible.')).toBeTruthy();
  expect(screen.getByText(/Literature evidence is unavailable/)).toBeTruthy();
  expect(screen.getByText('Available literature context.')).toBeTruthy();
  expect(screen.getByRole('link', { name: /Supplied paper title/ }).getAttribute('href')).toBe('https://pubmed.ncbi.nlm.nih.gov/12345678/');
});
test('saved result literature is visible when the run wrapper has no literature field', () => {
  render(<ResultSection run={{ status: 'completed', question: 'CFTR?', graph_answer: 'Graph answer.' }} result={{ literature: { status: 'complete', perspectives: [{ id: 'm', label: 'Mechanism', answer: 'Saved literature context.' }] } }} anchorPrefix="test" />);
  expect(screen.getByText('Saved literature context.')).toBeTruthy();
  expect(screen.queryByText('Literature evidence is pending.')).toBeNull();
});
