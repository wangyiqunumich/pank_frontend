import React from 'react';
import { render, screen } from '@testing-library/react';
import { ResultSection } from './ResultView';
import { resolveResultPage } from './resultPageSchema';

jest.mock('./resultPageSchema', () => ({ resolveResultPage: jest.fn() }));
jest.mock('./AnswerMarkdown', () => ({ __esModule: true, default: ({ answer }) => <div data-testid="answer-markdown">{answer}</div> }));
jest.mock('react-markdown', () => ({ __esModule: true, default: ({ children }) => <div>{children}</div> }));
jest.mock('remark-gfm', () => ({ __esModule: true, default: () => {} }));
jest.mock('react-slick', () => ({ __esModule: true, default: ({ children }) => <div>{children}</div> }));
jest.mock('./KnowledgeGraph', () => ({ __esModule: true, default: ({ graphData }) => <div data-testid="schema-graph">{graphData.nodes.map((node) => node['~id']).join(',')}</div> }));

const result = {
  result_id: 'schema-result', status: 'ready', answer: '| Gene | Value |\n| --- | --- |\n| INS | 1 |',
  combined_query_result: { nodes: [{ '~id': 'INS' }], edges: [] }, resources_tabs: {},
};
const run = { run_id: 'schema-run', question: 'What does this evidence show?', status: 'completed' };
const page = {
  schemaVersion: '0.2.0', summaryTitle: 'AI Overview', mainVisualTitle: 'Visual Material', supportingTitle: 'Supporting Materials',
  insertions: [], mainVisuals: [{ id: 'graph_viewer', label: 'Knowledge Graph', status: 'available' }],
  resourceTabs: {}, resourceStatus: 'available', supportingTabs: [], decisions: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  resolveResultPage.mockImplementation(({ resourceTabs }) => ({ ...page, resourceTabs }));
});

test('result composition calls the schema with explicit state and merged literature, then inserts a raw-data box after unchanged Markdown', () => {
  const insertion = { id: 'raw_data_download', title: 'Raw data', description: 'Source measurements used for this answer.', links: [{ id: 'source-data', label: 'Download source data', url: '/api/resources/source.tsv', description: 'Recorded association data (TSV).' }] };
  const presentationState = { main_visuals: ['graph_viewer'] };
  resolveResultPage.mockImplementation(({ resourceTabs }) => ({ ...page, insertions: [insertion], resourceTabs, supportingTabs: [{ id: 'references', label: 'References' }] }));
  const literature = { status: 'complete', perspectives: [{ id: 'context', label: 'Literature context', answer: 'Recorded interpretation.', references: [{ pmid: '12345678', title: 'Supplied paper' }] }] };
  render(<ResultSection run={{ ...run, literature }} result={result} presentationState={presentationState} anchorPrefix="schema" />);
  const inputs = resolveResultPage.mock.calls[0][0];
  expect(inputs.state).toBe(presentationState);
  expect(inputs.result).toBe(result);
  expect(Object.values(inputs.resourceTabs.references).some((reference) => reference.title === 'Supplied paper')).toBe(true);
  const answer = screen.getAllByTestId('answer-markdown')[0];
  expect(answer.textContent).toBe(result.answer);
  const rawData = screen.getByRole('region', { name: 'Raw data' });
  expect(answer.compareDocumentPosition(rawData) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  const link = screen.getByRole('link', { name: 'Download source data' });
  expect(link.getAttribute('href')).toBe('/pankgraph-vnext/api/resources/source.tsv');
  expect(link.hasAttribute('download')).toBe(true);
});

test('schema-selected functional visual retains independent empirical evidence and supplies tab labels', () => {
  const functional = { ...result, resources_tabs: { empirical_evidence: { image_url: '/api/resources/functional.png', title: 'Functional response' } } };
  resolveResultPage.mockReturnValue({ ...page, mainVisuals: [{ id: 'functional_data', label: 'Functional Data' }], resourceTabs: { empirical_evidence: { image_url: '/api/resources/association.png', title: 'Independent association evidence' } }, supportingTabs: [{ id: 'empirical_evidence', label: 'Recorded measurements' }] });
  render(<ResultSection run={run} result={functional} anchorPrefix="schema" />);
  expect(screen.getByAltText('Functional response').getAttribute('src')).toContain('/api/resources/functional.png');
  expect(screen.getByText('Independent association evidence')).toBeTruthy();
  expect(screen.getByText('Recorded measurements')).toBeTruthy();
  expect(screen.queryByTestId('schema-graph')).toBeNull();
  expect(screen.queryByText('Genome Browser')).toBeNull();
});

test('progressive schema resolution preserves the existing graph mount', () => {
  const { rerender } = render(<ResultSection run={run} result={result} anchorPrefix="schema" />);
  const graph = screen.getByTestId('schema-graph');
  rerender(<ResultSection run={run} result={{ ...result, combined_query_result: { nodes: [{ '~id': 'GCG' }], edges: [] } }} anchorPrefix="schema" />);
  expect(screen.getByTestId('schema-graph')).toBe(graph);
  expect(graph.textContent).toBe('GCG');
  expect(resolveResultPage).toHaveBeenCalledTimes(2);
});

const mixedResult = {
  ...result, visual_material_kind: 'functional_traces', component_status: { resources: 'available' },
  resources_tabs: { empirical_evidence: { image_url: '/api/resources/functional_response', title: 'Selected cohort response' } },
};

test('real schema appends a newly eligible functional view without remounting an existing graph', () => {
  resolveResultPage.mockImplementation(jest.requireActual('./resultPageSchema').resolveResultPage);
  const { rerender } = render(<ResultSection run={run} result={result} anchorPrefix="schema" />);
  const graph = screen.getByTestId('schema-graph');
  rerender(<ResultSection run={run} result={mixedResult} anchorPrefix="schema" />);
  expect(screen.getByTestId('schema-graph')).toBe(graph);
  expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Knowledge Graph', 'Functional Data']);
  expect(screen.getByRole('tab', { name: 'Knowledge Graph' }).getAttribute('aria-selected')).toBe('true');
  // An explicit state change is allowed to choose a different primary view.
  rerender(<ResultSection run={run} result={mixedResult} presentationState={{ main_visual: 'functional_data' }} anchorPrefix="schema" />);
  expect(screen.getAllByRole('tab')[0].textContent).toBe('Functional Data');
  expect(screen.getByRole('tab', { name: 'Functional Data' }).getAttribute('aria-selected')).toBe('true');
});

test.each([
  [{ main_visual: 'graph_viewer' }, [], 'Knowledge Graph'],
  [undefined, ['graph'], 'Knowledge Graph'],
  [{ main_visual: 'functional_data' }, ['graph'], 'Functional Data'],
])('real schema honors initial eligible state and keyword preferences (%j, %j)', (presentationState, keywords, expected) => {
  resolveResultPage.mockImplementation(jest.requireActual('./resultPageSchema').resolveResultPage);
  render(<ResultSection run={run} result={{ ...mixedResult, result_page_keywords: keywords }} presentationState={presentationState} anchorPrefix="schema" />);
  expect(screen.getAllByRole('tab')[0].textContent).toBe(expected);
  expect(screen.getByRole('tab', { name: expected }).getAttribute('aria-selected')).toBe('true');
});

test('plan graph stays loading from Cypher completion through presentation preparation', () => {
  const planRun = { ...run, status: 'awaiting_confirmation', plan: { interpreted_question: run.question, steps: [] }, preview: { status: 'complete' } };
  const { rerender } = render(<ResultSection run={planRun} planning anchorPrefix="pending-graph" />);
  expect(screen.getByRole('status', { name: 'Loading graph' })).toBeTruthy();
  for (const pending of [
    { status: 'preparing', component_status: { graph: 'pending', layout: 'pending' } },
    { status: 'queued' },
    { status: 'running', combined_query_result: { nodes: [], edges: [] } },
    { status: 'ready', component_status: { graph: { status: 'processing' } } },
  ]) {
    rerender(<ResultSection run={planRun} planning result={pending} anchorPrefix="pending-graph" />);
    expect(screen.getByRole('status', { name: 'Loading graph' })).toBeTruthy();
    expect(screen.queryByText('No matching graph evidence was returned.')).toBeNull();
  }
  rerender(<ResultSection run={planRun} planning result={result} anchorPrefix="pending-graph" />);
  expect(screen.queryByRole('status', { name: 'Loading graph' })).toBeNull();
  expect(screen.getByTestId('schema-graph').textContent).toBe('INS');
});

test('only completed empty graph evidence shows the empty message, even while resources load', () => {
  render(<ResultSection run={run} result={{ ...result, combined_query_result: { nodes: [], edges: [] }, component_status: { graph: 'empty', resources: 'pending' } }} anchorPrefix="empty-graph" />);
  expect(screen.getByText('No matching graph evidence was returned.')).toBeTruthy();
  expect(screen.queryByRole('status', { name: 'Loading graph' })).toBeNull();
});

test.each(['failed', 'cancelled', 'interrupted'])('a %s graph request is neither loading nor biological absence', status => {
  render(<ResultSection run={run} result={{ status, component_status: { graph: 'pending' } }} anchorPrefix="failed-graph" />);
  expect(screen.getByText('Graph retrieval could not finish. Available answer sections are preserved.')).toBeTruthy();
  expect(screen.queryByRole('status', { name: 'Loading graph' })).toBeNull();
  expect(screen.queryByText('No matching graph evidence was returned.')).toBeNull();
});

test('an existing graph remains visible during subsequent preparation', () => {
  render(<ResultSection run={run} result={{ ...result, status: 'preparing', component_status: { graph: 'pending' } }} anchorPrefix="preserved-graph" />);
  expect(screen.getByTestId('schema-graph').textContent).toBe('INS');
  expect(screen.queryByRole('status', { name: 'Loading graph' })).toBeNull();
});
