import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import SummaryInsertions from './SummaryInsertions';
import schema from './schema/result_page_schema.json';

jest.mock('./api', () => ({ sitePath: path => `/pankgraph-vnext${path}` }));
const file = { id: 'one', filename: 'CFTR_very_long_credible_set.txt', mediaType: 'text/tab-separated-values', contextLabel: 'Original downloaded association table · GTEx · pancreas', url: '/api/resources/one', label: 'Source association' };
const show = (links = [file]) => render(<SummaryInsertions insertions={[{ id: 'raw_data_download', title: 'Source data', links }]} />);
let click;
beforeEach(() => {
  jest.useFakeTimers();
  global.fetch = jest.fn();
  URL.createObjectURL = jest.fn(() => 'blob:test');
  URL.revokeObjectURL = jest.fn();
  click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});
afterEach(() => { jest.runOnlyPendingTimers(); jest.useRealTimers(); jest.restoreAllMocks(); });
const response = () => ({ ok: true, headers: new Headers({ 'Content-Type': 'text/tab-separated-values; charset=utf-8' }), blob: async () => new Blob(['snp\tpip\nrs1\t.5']) });

test('real filename and source context use schema columns and typed tag', () => {
  show();
  expect(screen.getByText(file.filename).title).toBe(file.filename);
  expect(screen.getByText(file.contextLabel)).toBeTruthy();
  expect(screen.getByText('TSV')).toBeTruthy();
  expect(screen.getAllByRole('columnheader').map(node => node.textContent)).toEqual(schema.ai_summary.insertions.raw_data_download.file_table.columns);
  expect(screen.queryByText(/Download all/)).toBeNull();
});

test('a file download stays pending until real response and preserves name and API namespace', async () => {
  let finish;
  fetch.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  show();
  fireEvent.click(screen.getByRole('button', { name: `Download ${file.filename}` }));
  expect(screen.getByText('Downloading…')).toBeTruthy();
  expect(screen.queryByText('Downloaded')).toBeNull();
  await act(async () => finish(response()));
  expect(await screen.findByText('Downloaded')).toBeTruthy();
  expect(fetch.mock.calls[0][0]).toBe('/pankgraph-vnext/api/resources/one');
  expect(click.mock.instances[0].download).toBe(file.filename);
  expect(click.mock.instances[0].href).toBe('blob:test');
});

test('an HTML routing error cannot be marked downloaded and supports retry', async () => {
  fetch.mockResolvedValueOnce({ ok: true, headers: new Headers({ 'Content-Type': 'text/html' }) }).mockResolvedValueOnce(response());
  show();
  fireEvent.click(screen.getByRole('button'));
  await screen.findByText('Retry');
  expect(click).not.toHaveBeenCalled();
  expect(screen.queryByText('Downloaded')).toBeNull();
  fireEvent.click(screen.getByRole('button'));
  await screen.findByText('Downloaded');
  expect(click).toHaveBeenCalledTimes(1);
});

test('bulk downloads use each real file and preserve a failed row instead of claiming all downloaded', async () => {
  fetch.mockResolvedValueOnce(response()).mockResolvedValueOnce({ ok: false, headers: new Headers() });
  show([file, { ...file, id: 'two', url: '/api/resources/two', filename: 'second.tsv' }]);
  fireEvent.click(screen.getByText('Download all (2)'));
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  await screen.findByText('Retry');
  expect(screen.queryByText('All downloaded')).toBeNull();
  expect(click).toHaveBeenCalledTimes(1);
});
