import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ResultSection } from './ResultView';
import SingleCellBrowser from './SingleCellBrowser';
import { expressionContext } from './singleCellContext';
import { SC_CONFIG } from './scBrowserConfig';
jest.mock('./KnowledgeGraph', () => props => <button data-testid="graph" onClick={() => props.onEvidenceInspect?.('edge-2')}>Inspect edge</button>);
jest.mock('react-markdown', () => ({ __esModule: true, default: ({ children }) => <div>{children}</div> }));
jest.mock('remark-gfm', () => ({ __esModule: true, default: () => {} }));
jest.mock('react-slick', () => ({ __esModule: true, default: ({ children }) => <div>{children}</div> }));
jest.mock('./AnswerMarkdown', () => () => <div>Answer</div>);
beforeEach(() => { global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ version: 1, html: '<!doctype html><html><head></head><body></body></html>' }) }); });
afterEach(() => { delete global.fetch; });
const graph = { nodes: [
 { '~id': 'cftr', '~labels': ['Gene'], '~properties': { HGNC_symbol: 'CFTR' } },
 { '~id': 'ins', '~labels': ['Gene'], '~properties': { HGNC_symbol: 'INS' } },
 { '~id': 'ductal', '~labels': ['anatomical_structure'], '~properties': { name: 'ductal cell' } },
 { '~id': 'beta', '~labels': ['anatomical_structure'], '~properties': { name: 'Beta cell' } },
], edges: [
 { '~id': 'edge-1', '~type': 'GENE_ENRICHED_IN', '~start': 'cftr', '~end': 'ductal', '~properties': { padj: .01 } },
 { '~id': 'edge-2', '~type': 'GENE_DETECTED_IN', '~start': 'ins', '~end': 'beta', '~properties': {} },
] };
const result = { result_id: 'result-1', combined_query_result: graph, answer: 'Answer', resources_tabs: {} };
async function sentContext(frame) {
 const post = jest.spyOn(frame.contentWindow, 'postMessage');
 fireEvent(window, new MessageEvent('message', { origin: window.location.origin, source: frame.contentWindow, data: { protocol: 'pankgraph.scbrowser.v1', type: 'ready' } }));
 await waitFor(() => expect(post).toHaveBeenCalled());
 return post.mock.calls.filter(([message]) => message.type === 'context').slice(-1)[0][0].context;
}
test('schema enables a map-only preview and fills the first RNA gene-cell pair', async () => {
 render(<ResultSection result={result} anchorPrefix="first" />);
 const card = screen.getByRole('region', { name: 'Expression evidence' });
 expect(card.textContent).toBe('Single cell browser−×Open scBrowser →');
 expect(screen.queryByText(/padj|CFTR ·|Related atlas/)).toBeNull();
 expect(await sentContext(screen.getByTitle('PanKbase atlas preview'))).toMatchObject({ geneSymbol: 'CFTR', mappedCellType: 'Ductal' });
 fireEvent.click(screen.getByRole('button', { name: 'Open in scBrowser →' }));
 expect(screen.getByRole('tab', { name: 'scBrowser' }).getAttribute('aria-selected')).toBe('true');
 expect(screen.queryByRole('group', { name: 'Expression browser navigation' })).toBeNull();
 expect(await sentContext(screen.getByTitle('PanKgraph single-cell browser'))).toMatchObject({ geneSymbol: 'CFTR', mappedCellType: 'Ductal' });
});
test('minimize close and tab changes preserve graph and browser', () => {
 const { rerender } = render(<ResultSection result={result} anchorPrefix="scope" />);
 const graphElement = screen.getByTestId('graph');
 fireEvent.click(screen.getByRole('button', { name: 'Minimize expression card' }));
 expect(screen.queryByTitle('PanKbase atlas preview')).toBeNull();
 fireEvent.click(screen.getByRole('button', { name: 'Restore expression card' }));
 fireEvent.click(screen.getByRole('button', { name: 'Open in scBrowser →' }));
 const frame = screen.getByTitle('PanKgraph single-cell browser');
 fireEvent.click(screen.getByRole('tab', { name: 'Knowledge Graph' }));
 expect(screen.getByTestId('graph')).toBe(graphElement);
 fireEvent.click(screen.getByRole('button', { name: 'Close expression card' }));
 expect(screen.queryByRole('region', { name: 'Expression evidence' })).toBeNull();
 fireEvent.click(screen.getByRole('tab', { name: 'scBrowser' }));
 expect(screen.getByTitle('PanKgraph single-cell browser')).toBe(frame);
 rerender(<ResultSection result={{ ...result, result_id: 'result-2' }} anchorPrefix="scope" />);
 expect(screen.getByRole('tab', { name: 'Knowledge Graph' }).getAttribute('aria-selected')).toBe('true');
});
test('schema disabled scmap and unrelated or ATAC graphs do not activate it', () => {
 SC_CONFIG.enabled = false;
 const { unmount } = render(<ResultSection result={result} />);
 expect(screen.queryByRole('tab', { name: 'scBrowser' })).toBeNull();
 expect(screen.queryByRole('region', { name: 'Expression evidence' })).toBeNull();
 unmount(); SC_CONFIG.enabled = true;
 for (const type of ['PART_OF_QTL_SIGNAL', 'GENE_ACTIVITY_SCORE_IN']) {
   const view = render(<ResultSection result={{ ...result, combined_query_result: { ...graph, edges: [{ ...graph.edges[0], '~type': type }] } }} />);
   expect(screen.queryByRole('tab', { name: 'scBrowser' })).toBeNull(); view.unmount();
 }
});
test('graph inspection updates the selected pair and selection revalidates against current evidence', async () => {
 const { rerender } = render(<ResultSection result={result} />);
 fireEvent.click(screen.getByTestId('graph'));
 expect(await sentContext(screen.getByTitle('PanKbase atlas preview'))).toMatchObject({ geneSymbol: 'INS', mappedCellType: 'Beta' });
 rerender(<ResultSection result={{ ...result, combined_query_result: { ...graph, edges: [graph.edges[0]] } }} />);
 expect(await sentContext(screen.getByTitle('PanKbase atlas preview'))).toMatchObject({ geneSymbol: 'CFTR', mappedCellType: 'Ductal' });
});
test('same-origin manifest bridge ignores foreign and unrelated window messages', async () => {
 render(<SingleCellBrowser context={expressionContext(graph, 'edge-1')} isVisible preview />);
 const frame = screen.getByTitle('PanKbase atlas preview');
 await waitFor(() => expect(frame.getAttribute('srcdoc')).toContain('pankgraph-preview'));
 expect(frame.getAttribute('src')).toBeNull();
 fireEvent(window, new MessageEvent('message', { origin: 'https://foreign.test', source: window, data: { protocol: 'pankgraph.scbrowser.v1', type: 'status', edgeId: 'edge-1', message: 'Injected' } }));
 expect(screen.queryByText('Injected')).toBeNull();
});
