import React, { act } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { request } from '../vnext/api';
import ColocExplorerPage from '../skills/ColocExplorerPage';
/* eslint-disable no-script-url -- Test that untrusted source URLs never become links. */

jest.mock('../components/AgentSidebar', () => () => <aside>Tools navigation</aside>);
jest.mock('../vnext/KnowledgeGraph', () => props => <div data-testid="coloc-graph">{props.graphData.nodes.length} recorded graph nodes</div>);
jest.mock('../vnext/api', () => ({ request: jest.fn() }));

// Synthetic protocol fixtures are test-only and are never loaded by the application.
const first = { id: 'r1', gene_id: 'ENSG1', gene_name: 'ADCY3', disease_id: 'd1', gwas_signal_id: 'GWAS1', qtl_signal_id: 'QTL1', dataset: 'INSPIRE', tissue: 'Islet', qtl_type: 'eQTL', data_version: 'v1', nsnp: 1273, posteriors: { h0: 0.01, h1: 0.01, h2: 0.01, h3: 0.07, h4: 0.9 }, gwas_leads: ['rs1'], qtl_leads: ['rs2'] };
const second = { ...first, id: 'r2', gene_name: 'GSDMB', gene_id: 'ENSG2', qtl_signal_id: 'QTL2', dataset: 'GTEx', posteriors: { h0: 0.1, h1: 0.1, h2: 0.1, h3: 0.7, h4: 0 } };
const catalog = { version: 1, graph_version: 'test-only', checked_at: '2026-09-21', records: [second, first], coverage: { complete: true } };
const detail = record => ({ version: 1, record, variants: [{ id: 'rs1', chromosome: '2', position: 100, gwas: { member: true, pip: 0, nominal_p: 0.01 }, qtl: null }, { id: 'rs2', chromosome: null, position: null, gwas: null, qtl: { member: true, pip: 0.7, nominal_p: 0.0001 } }], coordinate_build: 'GRCh38', coverage: { variant_count: 2, coordinate_count: 1, gwas_count: 1, qtl_count: 1, shared_count: 0, gwas_complete: true, qtl_complete: false, scope: 'credible_set' }, graph: { nodes: [{ '~id': record.gene_id, '~properties': { id: record.gene_id } }], edges: [] }, sources: [{ label: 'Raw data', status: 'unavailable', url: 'javascript:alert(1)' }], status: 'partial' });
const renderPage = () => render(<MemoryRouter><ColocExplorerPage /></MemoryRouter>);
const choose = name => fireEvent.click(screen.getByRole('button', { name: new RegExp(`Inspect ${name},`) }));

beforeEach(() => jest.resetAllMocks());
test('catalog-first browse includes H4 zero and filters before detail is fetched', async () => {
  request.mockResolvedValue(catalog); renderPage();
  await screen.findByText('2 of 2 returned analyses · All H4 values included');
  expect(request).toHaveBeenCalledTimes(1); expect(screen.getByText('0%')).toBeTruthy();
  fireEvent.change(screen.getByRole('textbox', { name: 'Gene' }), { target: { value: 'GSDMB' } });
  expect(screen.getByText('1 of 2 returned analyses · All H4 values included')).toBeTruthy();
  expect(screen.queryByRole('button', { name: /Inspect ADCY3,/ })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
  expect(screen.getByRole('button', { name: /Inspect ADCY3,/ })).toBeTruthy();
});
test('catalog and original posterior stay visible while graph/variants load and when raw request fails', async () => {
  let rejectDetail; request.mockImplementation(path => path === '/coloc/records' ? Promise.resolve(catalog) : new Promise((resolve, reject) => { rejectDetail = reject; }));
  renderPage(); await screen.findByText('2 of 2 returned analyses · All H4 values included'); choose('ADCY3');
  expect(screen.getByText('Loading graph and variant evidence for this signal pair…')).toBeTruthy();
  expect(screen.queryByText(/Graph evidence was not returned/)).toBeNull();
  expect(screen.getByText('Recorded colocalizations')).toBeTruthy(); expect(screen.getByRole('img', { name: 'Recorded H0 to H4 posterior probabilities' })).toBeTruthy();
  await act(async () => rejectDetail(new Error('S3 access denied')));
  expect(screen.getByText('Variant and graph evidence could not be loaded.')).toBeTruthy();
  expect(screen.getByText(/Original analysis SNP count \(nsnp\): 1273/)).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Retry selected evidence' })).toBeTruthy();
});
test('switching records aborts and ignores stale detail responses', async () => {
  const pending = {}; request.mockImplementation((path, options) => path === '/coloc/records' ? Promise.resolve(catalog) : new Promise(resolve => { pending[path] = { resolve, signal: options.signal }; }));
  renderPage(); await screen.findByText('2 of 2 returned analyses · All H4 values included'); choose('ADCY3'); choose('GSDMB');
  expect(pending['/coloc/records/r1'].signal.aborted).toBe(true);
  await act(async () => pending['/coloc/records/r2'].resolve(detail(second)));
  expect(screen.getByRole('heading', { name: 'GSDMB · GTEx · Islet' })).toBeTruthy();
  await act(async () => pending['/coloc/records/r1'].resolve(detail(first)));
  expect(screen.queryByRole('heading', { name: 'ADCY3 · INSPIRE · Islet' })).toBeNull();
  expect(screen.getByRole('heading', { name: 'GSDMB · GTEx · Islet' })).toBeTruthy();
});
test('partial detail renders linked evidence, missing coverage, genuine zero PIP and coordinate count', async () => {
  request.mockImplementation(path => Promise.resolve(path === '/coloc/records' ? catalog : detail(first)));
  renderPage(); await screen.findByText('2 of 2 returned analyses · All H4 values included'); choose('ADCY3');
  await screen.findByRole('heading', { name: 'Variant evidence table' });
  expect(screen.getByText(/GWAS complete recorded set; QTL incomplete or unconfirmed/)).toBeTruthy();
  expect(screen.getByText(/Coordinates: 1\/2 returned variants/)).toBeTruthy();
  expect(screen.getByText('1 recorded graph nodes')).toBeTruthy();
  expect(screen.queryByRole('link', { name: 'Source ↗' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Select variant rs1' }));
  expect(screen.getByText('GWAS PIP 0 · QTL PIP Not recorded')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Select variant rs1' }).getAttribute('aria-pressed')).toBe('true');
});
test('catalog failure has retry and recovery does not create an analysis request', async () => {
  request.mockRejectedValueOnce(new Error('Catalog unavailable')).mockResolvedValue(catalog);
  renderPage(); await screen.findByRole('alert'); fireEvent.click(screen.getByRole('button', { name: 'Retry catalog' }));
  await screen.findByText('2 of 2 returned analyses · All H4 values included');
  expect(request.mock.calls.every(([path, options]) => path === '/coloc/records' && !options.method)).toBe(true);
});
test('closing a pending record cancels it and keeps the overview', async () => {
  let detailSignal; request.mockImplementation((path, options) => path === '/coloc/records' ? Promise.resolve(catalog) : new Promise(() => { detailSignal = options.signal; }));
  renderPage(); await screen.findByText('2 of 2 returned analyses · All H4 values included'); choose('ADCY3');
  fireEvent.click(screen.getByRole('button', { name: 'Close details' }));
  await waitFor(() => expect(detailSignal.aborted).toBe(true));
  expect(screen.getByText('Select a recorded signal pair')).toBeTruthy();
  expect(screen.queryByText('Loading graph and variant evidence for this signal pair…')).toBeNull();
});
test('graph-row retrieval completeness is not presented as complete original credible-set membership', async () => {
  const value = { ...detail(first), sources: [{ label: 'Neo4j QTL membership', status: 'available', coverage: { scope: 'recorded_signal_membership', complete: true, returned: 1 } }] };
  request.mockImplementation(path => Promise.resolve(path === '/coloc/records' ? catalog : value));
  renderPage(); await screen.findByText('2 of 2 returned analyses · All H4 values included'); choose('ADCY3');
  await screen.findByText('Coverage: Recorded graph membership · 1 returned · All recorded graph rows retrieved');
  expect(screen.queryByText(/1 returned · Complete recorded credible set/)).toBeNull();
});
