import React, { act } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { request } from '../vnext/api';
import ColocExplorerPage from '../skills/ColocExplorerPage';
import ColocDetailPage from '../skills/ColocDetailPage';
/* eslint-disable no-script-url -- Test that untrusted source URLs never become links. */

jest.mock('../components/AgentSidebar', () => () => <aside>Tools navigation</aside>);
jest.mock('../vnext/KnowledgeGraph', () => props => <div>{props.graphData.nodes.length} recorded graph nodes</div>);
jest.mock('../vnext/ColocSummary', () => props => <section aria-label="AI Summary">{props.loading ? 'Summary awaiting selected evidence' : props.detail ? `Summary for ${props.detail.record.id}` : 'Summary unavailable'}</section>);
jest.mock('../vnext/api', () => ({ request: jest.fn() }));

// Synthetic protocol fixtures are test-only and never loaded by the application.
const first = { id: 'r1', gene_id: 'ENSG1', gene_name: 'ADCY3', disease_id: 'd1', gwas_signal_id: 'GWAS1', gwas_credible_set_id: 'GWAS-CS1', qtl_signal_id: 'QTL1', dataset: 'INSPIRE', tissue: 'Islet', qtl_type: 'eQTL', data_version: 'v1', nsnp: 1273, posteriors: { h0: 0.01, h1: 0.01, h2: 0.01, h3: 0.07, h4: 0.9 }, gwas_leads: ['rs1'], qtl_leads: ['rs2'] };
const second = { ...first, id: 'r2', gene_name: 'GSDMB', gene_id: 'ENSG2', qtl_signal_id: 'QTL2', dataset: 'GTEx', posteriors: { h0: 0.1, h1: 0.1, h2: 0.1, h3: 0.7, h4: 0 } };
const catalog = { version: 1, graph_version: 'test-only', checked_at: '2026-09-21', records: [second, first], coverage: { complete: true } };
const detail = record => ({ version: 1, record, variants: [{ id: 'rs1', chromosome: '2', position: 100, gwas: { member: true, pip: 0, nominal_p: 0.01 }, qtl: null }, { id: 'rs2', chromosome: null, position: null, gwas: null, qtl: { member: true, pip: 0.7, nominal_p: 0.0001 } }], coordinate_build: 'GRCh38', coverage: { variant_count: 2, coordinate_count: 1, gwas_count: 1, qtl_count: 1, shared_count: 0, gwas_complete: true, qtl_complete: false, scope: 'credible_set' }, graph: { nodes: [{ '~id': record.gene_id, '~properties': { id: record.gene_id } }], edges: [] }, sources: [{ label: 'Raw data', status: 'unavailable', url: 'javascript:alert(1)' }], status: 'partial' });
let navigateRoute;
function RouteProbe() { navigateRoute = useNavigate(); const location = useLocation(); return <output aria-label="Current route">{location.pathname}{location.search}</output>; }
const renderPage = (path = '/coloc-explorer') => render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/coloc-explorer" element={<ColocExplorerPage />} /><Route path="/coloc-explorer/:recordId" element={<ColocDetailPage />} /></Routes><RouteProbe /></MemoryRouter>);
const choose = name => fireEvent.click(screen.getByRole('link', { name: new RegExp(`Inspect ${name},`) }));

beforeEach(() => jest.resetAllMocks());
test('catalog includes H4 zero, exposes detail links and contains no inline result visualizations', async () => {
  request.mockResolvedValue(catalog); renderPage();
  await screen.findByText('2 of 2 returned analyses · All H4 values included');
  expect(request).toHaveBeenCalledTimes(1); expect(screen.getByText('0%')).toBeTruthy();
  expect(screen.queryByRole('img', { name: 'Recorded H0 to H4 posterior probabilities' })).toBeNull();
  expect(screen.queryByRole('region', { name: 'AI Summary' })).toBeNull();
  fireEvent.change(screen.getByRole('textbox', { name: 'Gene' }), { target: { value: 'GSDMB' } });
  expect(screen.getByText('1 of 2 returned analyses · All H4 values included')).toBeTruthy();
  expect(screen.getByRole('link', { name: /Inspect GSDMB,/ }).getAttribute('href')).toBe('/coloc-explorer/r2?gene=GSDMB');
  expect(screen.queryByRole('link', { name: /Inspect ADCY3,/ })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
  expect(screen.getByRole('link', { name: /Inspect ADCY3,/ })).toBeTruthy();
});
test('detail deep links fetch their exact record directly without requiring a catalog request', async () => {
  request.mockResolvedValue(detail(first)); renderPage('/coloc-explorer/r1');
  expect(screen.getByText('Loading this signal pair and its graph and variant evidence…')).toBeTruthy();
  expect(screen.queryByText(/Graph evidence was not returned/)).toBeNull();
  await screen.findByRole('heading', { name: 'ADCY3 colocalization' });
  expect(request).toHaveBeenCalledTimes(1); expect(request.mock.calls[0][0]).toBe('/coloc/records/r1');
  expect(screen.getByText('GWAS-CS1')).toBeTruthy(); expect(screen.getByText('QTL1')).toBeTruthy();
  expect(screen.getByText('Summary for r1')).toBeTruthy();
  expect(screen.queryByRole('heading', { name: 'Recorded colocalizations' })).toBeNull();
});
test('all catalog filters survive opening details and returning to the selection page', async () => {
  request.mockImplementation(path => Promise.resolve(path === '/coloc/records' ? catalog : detail(first)));
  renderPage('/coloc-explorer?gene=ADCY3&dataset=INSPIRE&tissue=Islet&qtl_type=eQTL');
  await screen.findByText('1 of 2 returned analyses · All H4 values included'); choose('ADCY3');
  await screen.findByText('Summary for r1');
  expect(screen.getByRole('link', { name: '← Back to analyses' }).getAttribute('href')).toBe('/coloc-explorer?gene=ADCY3&dataset=INSPIRE&tissue=Islet&qtl_type=eQTL');
  fireEvent.click(screen.getByRole('link', { name: '← Back to analyses' }));
  await screen.findByText('1 of 2 returned analyses · All H4 values included');
  expect(screen.getByRole('textbox', { name: 'Gene' }).value).toBe('ADCY3'); expect(screen.getByRole('combobox', { name: 'Dataset' }).value).toBe('INSPIRE');
  expect(screen.getByRole('combobox', { name: 'Tissue' }).value).toBe('Islet'); expect(screen.getByRole('combobox', { name: 'QTL type' }).value).toBe('eQTL');
});
test('same-gene analyses retain distinct exact signal-pair detail links', async () => {
  request.mockResolvedValue({ ...catalog, records: [first, { ...first, id: 'r3', qtl_signal_id: 'QTL3' }] }); renderPage();
  await screen.findByText('2 of 2 returned analyses · All H4 values included');
  expect(screen.getByRole('link', { name: /QTL signal QTL1,/ }).getAttribute('href')).toBe('/coloc-explorer/r1');
  expect(screen.getByRole('link', { name: /QTL signal QTL3,/ }).getAttribute('href')).toBe('/coloc-explorer/r3');
});
test('navigation keeps known catalog posterior visible while detail loads and after retrieval failure', async () => {
  let rejectDetail; request.mockImplementation(path => path === '/coloc/records' ? Promise.resolve(catalog) : new Promise((resolve, reject) => { rejectDetail = reject; }));
  renderPage(); await screen.findByText('2 of 2 returned analyses · All H4 values included'); choose('ADCY3');
  expect(screen.getByText('Loading graph and variant evidence for this signal pair…')).toBeTruthy();
  expect(screen.queryByText(/Graph evidence was not returned/)).toBeNull();
  expect(screen.getByRole('img', { name: 'Recorded H0 to H4 posterior probabilities' })).toBeTruthy();
  await act(async () => rejectDetail(new Error('S3 access denied')));
  expect(screen.getByText('Evidence could not be loaded.')).toBeTruthy();
  expect(screen.queryByRole('region', { name: 'AI Summary' })).toBeNull();
  expect(screen.getByText(/Original analysis SNP count \(nsnp\): 1273/)).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Retry selected evidence' })).toBeTruthy();
});
test('switching exact-record routes aborts and ignores stale responses', async () => {
  const pending = {}; request.mockImplementation((path, options) => new Promise(resolve => { pending[path] = { resolve, signal: options.signal }; }));
  renderPage('/coloc-explorer/r1'); act(() => navigateRoute('/coloc-explorer/r2'));
  expect(pending['/coloc/records/r1'].signal.aborted).toBe(true);
  await act(async () => pending['/coloc/records/r2'].resolve(detail(second)));
  expect(screen.getByRole('heading', { name: 'GSDMB colocalization' })).toBeTruthy();
  await act(async () => pending['/coloc/records/r1'].resolve(detail(first)));
  expect(screen.queryByRole('heading', { name: 'ADCY3 colocalization' })).toBeNull();
  expect(screen.getByText('Summary for r2')).toBeTruthy();
});
test('partial detail keeps missing-vs-zero evidence and linked selection across accessible tabs', async () => {
  request.mockResolvedValue(detail(first)); renderPage('/coloc-explorer/r1');
  await screen.findByRole('tab', { name: 'Locus tracks' });
  expect(screen.getByText(/GWAS complete recorded set; QTL incomplete or unconfirmed/)).toBeTruthy();
  expect(screen.getByText(/Coordinates: 1\/2 returned variants/)).toBeTruthy(); expect(screen.getByText('1 recorded graph nodes')).toBeTruthy();
  fireEvent.keyDown(screen.getByRole('tab', { name: 'Locus tracks' }), { key: 'ArrowRight' });
  expect(screen.getByRole('tab', { name: 'Variant membership' }).getAttribute('aria-selected')).toBe('true');
  fireEvent.click(screen.getByRole('button', { name: 'Select variant rs1' }));
  expect(screen.getByText('GWAS PIP 0 · QTL PIP Not recorded')).toBeTruthy();
  fireEvent.click(screen.getByRole('tab', { name: 'Evidence table' }));
  expect(screen.getByRole('heading', { name: 'Variant evidence table' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'rs1' }).getAttribute('aria-pressed')).toBe('true');
  fireEvent.click(screen.getByRole('tab', { name: 'Sources & coverage' }));
  expect(screen.queryByRole('link', { name: 'Source ↗' })).toBeNull();
});
test('catalog failure has retry without requesting detail or summary data', async () => {
  request.mockRejectedValueOnce(new Error('Catalog unavailable')).mockResolvedValue(catalog);
  renderPage(); await screen.findByRole('alert'); fireEvent.click(screen.getByRole('button', { name: 'Retry catalog' }));
  await screen.findByText('2 of 2 returned analyses · All H4 values included');
  expect(request.mock.calls.every(([path, options]) => path === '/coloc/records' && !options.method)).toBe(true);
});
test('returning from a pending detail cancels it and restores the catalog', async () => {
  let detailSignal; request.mockImplementation((path, options) => path === '/coloc/records' ? Promise.resolve(catalog) : new Promise(() => { detailSignal = options.signal; }));
  renderPage('/coloc-explorer/r1'); fireEvent.click(screen.getByRole('link', { name: '← Back to analyses' }));
  await waitFor(() => expect(detailSignal.aborted).toBe(true));
  expect(await screen.findByText('2 of 2 returned analyses · All H4 values included')).toBeTruthy();
});
test('graph-row retrieval completeness stays distinct from original credible-set completeness', async () => {
  request.mockResolvedValue({ ...detail(first), sources: [{ label: 'Neo4j QTL membership', status: 'available', coverage: { scope: 'recorded_signal_membership', complete: true, returned: 1 } }] });
  renderPage('/coloc-explorer/r1'); await screen.findByRole('tab', { name: 'Sources & coverage' }); fireEvent.click(screen.getByRole('tab', { name: 'Sources & coverage' }));
  expect(screen.getByText('Coverage: Recorded graph membership · 1 returned · All recorded graph rows retrieved')).toBeTruthy();
  expect(screen.queryByText(/1 returned · Complete recorded credible set/)).toBeNull();
});
