import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ResultSection } from './ResultView';
import { expressionContext } from './singleCellContext';
import SingleCellBrowser from './SingleCellBrowser';
jest.mock('./KnowledgeGraph', () => props => <button data-testid="graph" onClick={() => props.onEvidenceInspect?.('edge-1')} data-resource-selection-hook={String(!!props.onExpressionSelect)} data-resource-highlight={String(!!props.selectedExpressionId)}>Select graph edge</button>);
jest.mock('react-markdown', () => ({ __esModule: true, default: ({ children }) => <div>{children}</div> }));
jest.mock('remark-gfm', () => ({ __esModule: true, default: () => {} }));
jest.mock('react-slick', () => ({ __esModule: true, default: ({ children }) => <div>{children}</div> }));
jest.mock('./AnswerMarkdown', () => () => <div>Answer</div>);
const graph = { nodes: [{ '~id': 'g', '~labels': ['Gene'], '~properties': { gene_symbol: 'INS' } }, { '~id': 'c', '~labels': ['Cell_type'], '~properties': { name: 'Beta' } }], edges: [{ '~id': 'edge-1', '~start': 'g', '~end': 'c', '~type': 'gene_detected_in', '~properties': {} }] };
const result = { result_id: 'result-1', combined_query_result: graph, answer: 'Test', resources_tabs: {} };
test('card minimize/restore/close and tab round trips preserve the graph and browser', () => {
  const { rerender } = render(<ResultSection result={result} anchorPrefix="test" />);
  const graphElement = screen.getByTestId('graph');
  expect(screen.queryByTitle('PanKgraph single-cell browser')).toBeNull();
  fireEvent.click(graphElement);
  expect(screen.getByRole('region', { name: 'Expression evidence' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Minimize expression card' }));
  expect(screen.queryByRole('button', { name: 'Open in scBrowser →' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Restore expression card' }));
  fireEvent.click(screen.getByRole('button', { name: 'Open in scBrowser →' }));
  expect(screen.getByRole('tab', { name: 'scBrowser' }).getAttribute('aria-selected')).toBe('true');
  const frame = screen.getByTitle('PanKgraph single-cell browser');
  fireEvent.click(screen.getByRole('tab', { name: 'Knowledge Graph' }));
  expect(screen.getByTestId('graph')).toBe(graphElement);
  fireEvent.click(screen.getByRole('button', { name: 'Close expression card' }));
  expect(screen.queryByRole('region', { name: 'Expression evidence' })).toBeNull();
  fireEvent.click(screen.getByRole('tab', { name: 'scBrowser' }));
  expect(screen.getByTitle('PanKgraph single-cell browser')).toBe(frame);
  rerender(<ResultSection result={{ ...result, result_id: 'result-2' }} anchorPrefix="test" />);
  expect(screen.queryByTitle('PanKgraph single-cell browser')).not.toBe(frame);
  expect(screen.getByRole('tab', { name: 'Knowledge Graph' }).getAttribute('aria-selected')).toBe('true');
  expect(screen.getByRole('region', { name: 'Expression evidence' })).toBeTruthy();
});
test('message bridge ignores messages from foreign origins and unrelated windows', () => {
  const context = expressionContext(graph, 'edge-1');
  render(<SingleCellBrowser context={context} isVisible />);
  fireEvent(window, new MessageEvent('message', { origin: 'https://foreign.test', data: { protocol: 'pankgraph.scbrowser.v1', type: 'status', edgeId: 'edge-1', message: 'Injected' } }));
  fireEvent(window, new MessageEvent('message', { origin: window.location.origin, source: window, data: { protocol: 'pankgraph.scbrowser.v1', type: 'status', edgeId: 'edge-1', message: 'Injected' } }));
  expect(screen.queryByText('Injected')).toBeNull();
});

test('single-cell browser stays inside the result panel', () => {
  render(<SingleCellBrowser context={expressionContext(graph, 'edge-1')} isVisible />);
  expect(screen.getByTitle('PanKgraph single-cell browser')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Expand single-cell browser' })).toBeNull();
});

test('one card cycles expression contexts without a separate picker', () => {
  const twoEdges = { ...graph, edges: [...graph.edges, { ...graph.edges[0], '~id': 'edge-2', '~type': 'gene_enriched_in' }] };
  render(<ResultSection result={{ ...result, combined_query_result: twoEdges }} anchorPrefix="carousel" />);
  fireEvent.click(screen.getByTestId('graph'));
  expect(screen.queryByLabelText('Inspect expression edge')).toBeNull();
  expect(screen.getAllByRole('region', { name: 'Expression evidence' })).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Next expression browser' }));
  expect(within(screen.getByRole('region', { name: 'Expression evidence' })).getByText('2 / 2')).toBeTruthy();
  expect(screen.getByText(/Enrichment · scRNA-seq/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Previous expression browser' }));
  expect(within(screen.getByRole('region', { name: 'Expression evidence' })).getByText('1 / 2')).toBeTruthy();
});

test('resource card appears automatically and inspecting a matching edge reopens it', () => {
  render(<ResultSection result={result} anchorPrefix="independent" />);
  const graphElement = screen.getByTestId('graph');
  expect(graphElement.getAttribute('data-resource-selection-hook')).toBe('false');
  expect(graphElement.getAttribute('data-resource-highlight')).toBe('false');
  expect(screen.getByRole('region', { name: 'Expression evidence' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Close expression card' }));
  fireEvent.click(graphElement);
  fireEvent.mouseMove(graphElement);
  expect(screen.getByRole('region', { name: 'Expression evidence' })).toBeTruthy();
});
test('no automatic resource card when no matched browser resource exists', () => {
  const unavailable = { ...graph, edges: [{ ...graph.edges[0], '~properties': { dataset_id: 'unregistered' } }] };
  render(<ResultSection result={{ ...result, combined_query_result: unavailable }} anchorPrefix="unavailable" />);
  expect(screen.queryByRole('region', { name: 'Expression evidence' })).toBeNull();
});

test('KG inspection switches automatically to the matching gene', () => {
  const kg = { nodes: [...graph.nodes, { '~id': 'g2', '~labels': ['Gene'], '~properties': { HGNC_symbol: 'GCG' } }],
    edges: [{ ...graph.edges[0], '~id': 'edge-2', '~start': 'g2', '~type': 'marker_gene_of' }, graph.edges[0]] };
  render(<ResultSection result={{ ...result, combined_query_result: kg }} anchorPrefix="switch" />);
  expect(screen.getByText('GCG · Beta')).toBeTruthy();
  fireEvent.click(screen.getByTestId('graph'));
  expect(screen.getByText('INS · Beta')).toBeTruthy();
});
