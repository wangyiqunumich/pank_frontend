import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { ResultSection } from './ResultView';
import SingleCellBrowser from './SingleCellBrowser';
import { expressionContext } from './singleCellContext';
import { SC_CONFIG } from './scBrowserConfig';
jest.mock('./KnowledgeGraph', () => props => <>{props.overlay}<button data-testid="graph" onClick={() => props.onEvidenceInspect?.('edge-2')}>Inspect edge</button></>);
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
test('scBrowser uses its own tab without a duplicate graph preview and fills the first RNA gene-cell pair', async () => {
 render(<ResultSection result={result} anchorPrefix="first" />);
 expect(SC_CONFIG.preview.enabled).toBe(false);
 expect(screen.queryByRole('region', { name: 'Expression evidence' })).toBeNull();
 expect(screen.queryByTitle('PanKbase atlas preview')).toBeNull();
 expect(screen.queryByText(/padj|CFTR ·|Related atlas/)).toBeNull();
 fireEvent.click(screen.getByRole('tab', { name: 'scBrowser' }));
 expect(screen.getByRole('tab', { name: 'scBrowser' }).getAttribute('aria-selected')).toBe('true');
 expect(screen.queryByRole('group', { name: 'Expression browser navigation' })).toBeNull();
 expect(await sentContext(screen.getByTitle('PanKgraph single-cell browser'))).toMatchObject({ geneSymbol: 'CFTR', mappedCellType: 'Ductal' });
});
test('tab changes preserve graph and main browser', () => {
 const { rerender } = render(<ResultSection result={result} anchorPrefix="scope" />);
 const graphElement = screen.getByTestId('graph');
 expect(screen.queryByTitle('PanKbase atlas preview')).toBeNull();
 fireEvent.click(screen.getByRole('tab', { name: 'scBrowser' }));
 const frame = screen.getByTitle('PanKgraph single-cell browser');
 fireEvent.click(screen.getByRole('tab', { name: 'Knowledge Graph' }));
 expect(screen.getByTestId('graph')).toBe(graphElement);
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
 expect(screen.getByRole('tab', { name: 'scBrowser' }).getAttribute('aria-selected')).toBe('true');
 expect(await sentContext(screen.getByTitle('PanKgraph single-cell browser'))).toMatchObject({ geneSymbol: 'INS', mappedCellType: 'Beta' });
 rerender(<ResultSection result={{ ...result, combined_query_result: { ...graph, edges: [graph.edges[0]] } }} />);
 expect(await sentContext(screen.getByTitle('PanKgraph single-cell browser'))).toMatchObject({ geneSymbol: 'CFTR', mappedCellType: 'Ductal' });
});
test('same-origin manifest bridge ignores foreign and unrelated window messages', async () => {
 render(<SingleCellBrowser context={expressionContext(graph, 'edge-1')} isVisible preview />);
 const frame = screen.getByTitle('PanKbase atlas preview');
 await waitFor(() => expect(frame.getAttribute('srcdoc')).toContain('pankgraph-preview'));
 expect(frame.getAttribute('src')).toBeNull();
 fireEvent(window, new MessageEvent('message', { origin: 'https://foreign.test', source: window, data: { protocol: 'pankgraph.scbrowser.v1', type: 'status', edgeId: 'edge-1', message: 'Injected' } }));
 expect(screen.queryByText('Injected')).toBeNull();
});

test('only this browser frame can request fullscreen, preserving its iframe and exiting with Escape', async () => {
 const { unmount } = render(<SingleCellBrowser context={expressionContext(graph, 'edge-1')} isVisible />);
 const frame = await screen.findByTitle('PanKgraph single-cell browser');
 const send = (source, origin = window.location.origin) => fireEvent(window, new MessageEvent('message', { source, origin, data: { protocol: 'pankgraph.scbrowser.v1', type: 'toggle-fullscreen' } }));
 send(window); send(frame.contentWindow, 'https://foreign.test');
 expect(screen.queryByRole('dialog')).toBeNull();
 send(frame.contentWindow);
 const dialog = screen.getByRole('dialog', { name: SC_CONFIG.wording.fullscreen_title });
 expect(dialog.contains(frame)).toBe(true);
 expect(screen.getByTitle('PanKgraph single-cell browser')).toBe(frame);
 fireEvent.keyDown(dialog, { key: 'Escape' });
 expect(screen.queryByRole('dialog')).toBeNull();
 expect(screen.getByTitle('PanKgraph single-cell browser')).toBe(frame);
 unmount();
});
test('mixed QTL and RNA evidence retains the unrelated QTL preview but no cell preview', async () => {
 const qtlGraph = { nodes: [...graph.nodes, { '~id': 'rs2402203', '~labels': ['sequence_variant'], '~properties': { name: 'rs2402203' } }], edges: [...graph.edges, { '~id': 'qtl', '~type': 'PART_OF_QTL_SIGNAL', '~start': 'rs2402203', '~end': 'cftr', '~properties': { data_source: 'splicing; GTEx', credible_set: 'test_credibleSet1' } }] };
 render(<ResultSection result={{ ...result, combined_query_result: qtlGraph }} />);
 const graphElement = screen.getByTestId('graph');
 const card = screen.getByRole('region', { name: 'Visualization preview' });
 expect(screen.queryByRole('region', { name: 'Expression evidence' })).toBeNull();
 expect(within(card).queryByRole('tab', { name: 'scBrowser' })).toBeNull();
 expect(within(card).queryByTitle('PanKbase atlas preview')).toBeNull();
 fireEvent.click(within(card).getByRole('button', { name: 'Open QTL fine-mapping →' }));
 expect(screen.getByRole('tablist', { name: 'Result visualizations' }).querySelector('[aria-selected="true"]').textContent).toBe('QTL Fine-Mapping');
 fireEvent.click(within(screen.getByRole('tablist', { name: 'Result visualizations' })).getByRole('tab', { name: 'Knowledge Graph' }));
 expect(screen.getByTestId('graph')).toBe(graphElement);
 fireEvent.click(within(card).getByRole('button', { name: 'Close visualization preview' }));
 fireEvent.click(screen.getByRole('button', { name: 'Show visualization preview' }));
 expect(screen.getByRole('region', { name: 'Visualization preview' })).toBeTruthy();
});
