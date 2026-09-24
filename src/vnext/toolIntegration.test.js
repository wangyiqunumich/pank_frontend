import React from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import queryResultReducer, { queryQueryResult } from '../redux/queryResultSlice';
import viewSchemaReducer from '../redux/viewSchemaSlice';
import searchReducer from '../redux/searchSlice';
import { flaskBackendAxiosInstanceNew } from '../axios/axios';
import { searchEntities } from './api';
import { getDevConfig } from './runtimeConfig';
import GWASExplorerPage from '../skills/GWASExplorerPage';
import QTLExplorerPage from '../skills/QTLExplorerPage';
import IntermediatePage from '../components/IntermediatePage';
import { getSummary, getDonors, getCohortTracesPng } from '../utils/functionalDataApi';
import { toolSearchState, toolViewSchema } from './toolSearch';
import { templateRequest, selectedResultParams } from './contracts';

jest.mock('../axios/axios', () => ({ flaskBackendAxiosInstanceNew: { post: jest.fn() } }));
jest.mock('./api', () => ({ searchEntities: jest.fn(), apiPath: path => `/pankgraph-vnext/api${path}` }));
jest.mock('./runtimeConfig', () => ({ getDevConfig: jest.fn() }));
jest.mock('../image/new_logos/gene+snp.svg', () => ({ ReactComponent: () => <svg /> }));
jest.mock('../components/AgentSidebar', () => () => <div>Existing sidebar</div>);
jest.mock('../components/IntermediateKG', () => ({ data }) => <pre data-testid="intermediate-graph">{JSON.stringify(data)}</pre>);
const makeStore = preloadedState => configureStore({ reducer: { queryResult: queryResultReducer, viewSchema: viewSchemaReducer, search: searchReducer }, preloadedState });
function RouteProbe() { const location = useLocation(); return <output data-testid="route">{location.pathname}{location.search}</output>; }
const mount = (element, store = makeStore()) => render(<Provider store={store}><MemoryRouter initialEntries={[window.location.pathname + window.location.search]}>{element}<RouteProbe /></MemoryRouter></Provider>);
beforeEach(() => {
  jest.clearAllMocks();
  getDevConfig.mockReturnValue({ vnextEnabled: true });
  window.history.replaceState({}, '', '/');
  searchEntities.mockResolvedValue({ items: [], coverage: { complete: true } });
  flaskBackendAxiosInstanceNew.post.mockResolvedValue({ data: { results: [{ snp: 'rs1016432' }] } });
});

test('typed search uses the dev namespace while existing raw consumers retain their backend', async () => {
  const store = makeStore();
  searchEntities.mockResolvedValue({ items: [{ id: 'rs1' }], coverage: { complete: false } });
  const typed = await store.dispatch(queryQueryResult({ kind: 'variant', term: 'rs1', rawResponse: true })).unwrap();
  expect(searchEntities).toHaveBeenCalledWith({ kind: 'variant', term: 'rs1' }, expect.objectContaining({ signal: expect.any(Object) }));
  expect(typed.results[0].snp).toBe('rs1');
  expect(typed.coverage.complete).toBe(false);
  expect(flaskBackendAxiosInstanceNew.post).not.toHaveBeenCalled();
  await store.dispatch(queryQueryResult({ isNeptune: false, rawResponse: true, query: 'legacy SQL' })).unwrap();
  expect(flaskBackendAxiosInstanceNew.post).toHaveBeenCalledWith('/RDSLambda', { query: 'legacy SQL' }, expect.any(Object));
});
test('disabled typed search fails closed without calling either service', async () => {
  getDevConfig.mockReturnValue({ vnextEnabled: false });
  await expect(makeStore().dispatch(queryQueryResult({ kind: 'gene', term: 'INS' })).unwrap()).rejects.toMatchObject({ message: 'The new search service is disabled.' });
  expect(searchEntities).not.toHaveBeenCalled();
  expect(flaskBackendAxiosInstanceNew.post).not.toHaveBeenCalled();
});
test('GWAS input validation and continue use the new search and native intermediate route', async () => {
  mount(<GWASExplorerPage />);
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'rs1016432' } });
  await waitFor(() => expect(searchEntities).toHaveBeenCalledWith({ kind: 'variant', term: 'rs1016432' }, expect.any(Object)));
  fireEvent.click(screen.getByRole('button', { name: /Continue/i }));
  expect(screen.getByTestId('route').textContent).toBe('/intermediate?sourceTerm=snp@rs1016432&relationship=GWAS&targetTerm=disease&resultLayout=new');
  expect(flaskBackendAxiosInstanceNew.post).not.toHaveBeenCalled();
});
test('GWAS fallback retains legacy validation and results route', async () => {
  getDevConfig.mockReturnValue({ vnextEnabled: false });
  mount(<GWASExplorerPage />);
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'rs1016432' } });
  await waitFor(() => expect(flaskBackendAxiosInstanceNew.post).toHaveBeenCalled());
  fireEvent.click(screen.getByRole('button', { name: /Continue/i }));
  expect(screen.getByTestId('route').textContent).toBe('/result-new?sourceTerm=snp@rs1016432&relationship=GWAS&targetTerm=disease');
  expect(searchEntities).not.toHaveBeenCalled();
});
test('QTL gene autocomplete uses typed search without a legacy SQL request', async () => {
  searchEntities.mockResolvedValue({ items: [{ id: 'ENSG00000254647', name: 'INS' }] });
  mount(<QTLExplorerPage />);
  fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'INS' } });
  await waitFor(() => expect(searchEntities).toHaveBeenCalledWith({ kind: 'gene', term: 'INS' }, expect.any(Object)));
  expect(flaskBackendAxiosInstanceNew.post).not.toHaveBeenCalled();
});
test('intermediate reads the requested typed search, ignores stale autocomplete data, and keeps coverage', async () => {
  window.history.replaceState({}, '', '/intermediate?sourceTerm=snp@rs1&relationship=GWAS&targetTerm=disease');
  const rows = [1, 2].map(n => ({ credible_set: `set${n}`, snp: 'rs1', disease: 'MONDO:0005147', disease_name: 'Type 1 diabetes', data_source: 'T1D GWAS', pip: 0, n_snp: 5 }));
  searchEntities.mockResolvedValue({ items: rows, coverage: { complete: false } });
  const store = makeStore({ queryResult: { queryResult: { results: [{ credible_sets: [{ id: 'stale', name: 'INS' }] }] } } });
  mount(<IntermediatePage />, store);
  await screen.findByRole('tab', { name: 'T1D GWAS (2)' });
  expect(searchEntities).toHaveBeenCalledWith({ kind: 'credible_set', term: 'rs1', template_id: 'gwas_by_variant', variant_id: 'rs1' }, expect.any(Object));
  expect(screen.getByText(/additional associations may not yet be indexed/)).toBeTruthy();
  await waitFor(() => expect(JSON.parse(screen.getByTestId('intermediate-graph').textContent).credible_sets).toHaveLength(2));
  const graph = JSON.parse(screen.getByTestId('intermediate-graph').textContent);
  expect(graph.type).toBe('gwas');
  expect(graph.credible_sets).toHaveLength(2);
  expect(graph.credible_sets[0].disease_name).toBe('Type 1 diabetes');
  expect(screen.queryByRole('button', { name: 'download' })).toBeNull();
  expect(flaskBackendAxiosInstanceNew.post).not.toHaveBeenCalled();
});
test('selected QTL source and lead survive native typed result navigation', () => {
  const state = toolSearchState('?sourceTerm=snp@rs1&relationship=QTL&targetTerm=gene@ENSG1&targetSymbol=INS');
  expect(toolViewSchema(state).intermediate_page_table).toHaveLength(5);
  expect(templateRequest(selectedResultParams(state, { credible_set_id: 'cs1', lead_snp: 'rs2', data_source: 'GTEx; SusieR' }))).toEqual({ template_id: 'qtl_by_variant_gene', parameters: { variant_id: 'rs1', gene_id: 'ENSG1', credible_set_id: 'cs1', lead_variant_id: 'rs2', data_source: 'GTEx; SusieR' } });
});
test('functional API resolves its runtime base per request and preserves selected filters', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}), blob: async () => new Blob() });
  await getSummary();
  expect(fetch.mock.calls[0][0]).toBe('/pankgraph-vnext/api/functional/api/data/summary');
  await getDonors({ disease: 'T1D', sex: 'F', age_min: 0, bmi_max: 30 });
  expect(fetch.mock.calls[1][0]).toBe('/pankgraph-vnext/api/functional/api/data/donors?disease=T1D&sex=F&age_min=0&bmi_max=30');
  await getCohortTracesPng('ins_ieq', { center: 'Penn' });
  expect(fetch.mock.calls[2][0]).toBe('/pankgraph-vnext/api/functional/api/charts/cohort-traces.png?trace_type=ins_ieq&center=Penn');
  getDevConfig.mockReturnValue({ vnextEnabled: false });
  await getSummary();
  expect(fetch.mock.calls[3][0]).toBe('https://functional.pankgraph.org/api/data/summary');
});


test.each([401, 403])('intermediate denied status %s offers refresh and retry without reporting absent evidence', async (status) => {
  window.history.replaceState({}, '', '/intermediate?sourceTerm=snp@rs1&relationship=GWAS&targetTerm=disease');
  searchEntities.mockRejectedValue(Object.assign(new Error('Request denied'), { status }));
  mount(<IntermediatePage />);
  await screen.findByRole('heading', { name: 'Search access denied' });
  expect(screen.getByRole('button', { name: 'Refresh page' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Retry search' })).toBeTruthy();
  expect(screen.queryByText(/No matching records/)).toBeNull();
});
test('intermediate unavailable response can be retried and is never labeled no data', async () => {
  window.history.replaceState({}, '', '/intermediate?sourceTerm=snp@rs1&relationship=GWAS&targetTerm=disease');
  searchEntities.mockRejectedValueOnce(Object.assign(new Error('Service unavailable'), { status: 503 }))
    .mockResolvedValue({ items: [], coverage: { complete: false } });
  mount(<IntermediatePage />);
  await screen.findByRole('heading', { name: 'Search is unavailable' });
  expect(screen.getByText(/failure does not indicate an absence of associations/)).toBeTruthy();
  expect(screen.queryByText(/No matching records/)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Retry search' }));
  await screen.findByRole('heading', { name: 'No matching records in the indexed sources' });
  expect(searchEntities).toHaveBeenCalledTimes(2);
});
test('empty partial-index search exposes coverage limits and cannot imply biological absence', async () => {
  window.history.replaceState({}, '', '/intermediate?sourceTerm=snp@rs1&relationship=QTL&targetTerm=gene');
  searchEntities.mockResolvedValue({ items: [], coverage: { complete: false } });
  mount(<IntermediatePage />);
  await screen.findByRole('heading', { name: 'No matching records in the indexed sources' });
  expect(screen.getByText(/Only currently indexed source files were searched/)).toBeTruthy();
  expect(screen.getByText(/does not establish that the association is absent/)).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Retry search' })).toBeTruthy();
  expect(screen.queryByText(/No QTL records found in the dataset/)).toBeNull();
});
