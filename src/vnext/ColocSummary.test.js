import React, { StrictMode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ColocSummary from './ColocSummary';
import { pollResult, request } from './api';

jest.mock('./api', () => ({ request: jest.fn(), pollResult: jest.fn(), componentsPending: value => value?.component_status?.answer === 'pending' }));
jest.mock('./AnswerMarkdown', () => props => <div data-testid="shared-answer" data-density={props.density}>{props.answer}</div>);
const first = 'a'.repeat(64), second = 'b'.repeat(64);
const result = (id, answer = '', status = 'pending') => ({ result_id: `summary-${id}`, source: { kind: 'coloc', record_id: id }, component_status: { answer: status }, answer });
const detail = id => ({ record: { id } });
beforeEach(() => { jest.clearAllMocks(); pollResult.mockResolvedValue(undefined); });

test('waits for credible-set evidence and coalesces StrictMode mounts', async () => {
  let resolve;
  request.mockImplementation(() => new Promise(done => { resolve = done; }));
  const view = render(<StrictMode><ColocSummary detail={detail(first)} loading /></StrictMode>);
  expect(request).not.toHaveBeenCalled();
  view.rerender(<StrictMode><ColocSummary detail={detail(first)} /></StrictMode>);
  await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
  await act(async () => { resolve(result(first, 'Grounded comparison.', 'available')); });
  expect(screen.getByTestId('shared-answer').textContent).toBe('Grounded comparison.');
  expect(screen.getByTestId('shared-answer').getAttribute('data-density')).toBe('compact');
});

test('polls the saved result while retaining the evidence area', async () => {
  request.mockResolvedValue(result(first));
  pollResult.mockImplementation(async (id, update) => update(result(first, 'Shared evidence summary.', 'available')));
  render(<ColocSummary detail={detail(first)} />);
  expect(await screen.findByText('Shared evidence summary.')).toBeTruthy();
  expect(pollResult).toHaveBeenCalledWith(`summary-${first}`, expect.any(Function), expect.objectContaining({ signal: expect.any(AbortSignal) }));
});

test('late results from an earlier record cannot replace the selected record', async () => {
  const resolvers = {};
  request.mockImplementation(path => new Promise(resolve => { resolvers[path.includes(first) ? first : second] = resolve; }));
  const view = render(<ColocSummary detail={detail(first)} />);
  view.rerender(<ColocSummary detail={detail(second)} />);
  await act(async () => { resolvers[second](result(second, 'Second analysis.', 'available')); });
  await act(async () => { resolvers[first](result(first, 'Stale analysis.', 'available')); });
  expect(screen.getByText('Second analysis.')).toBeTruthy();
  expect(screen.queryByText('Stale analysis.')).toBeNull();
});

test('failed saved synthesis remains terminal and does not retry inference', async () => {
  request.mockResolvedValue(result(first, '', 'failed'));
  render(<ColocSummary detail={detail(first)} />);
  expect(await screen.findByText(/unavailable for this saved result/)).toBeTruthy();
  expect(pollResult).not.toHaveBeenCalled();
  expect(request).toHaveBeenCalledTimes(1);
});

test('network recovery explicitly checks the saved summary and rejects record mismatch', async () => {
  request.mockRejectedValueOnce(new Error('Connection unavailable.')).mockResolvedValueOnce(result(second, 'Wrong record.', 'available'));
  render(<ColocSummary detail={detail(first)} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Check saved summary' }));
  expect(await screen.findByText(/summary service returned a different record/)).toBeTruthy();
  expect(screen.queryByText('Wrong record.')).toBeNull();
});

test('reopening consults the service so shared answer updates are not hidden by a browser cache', async () => {
  request.mockResolvedValue(result(first, 'Saved summary.', 'available'));
  const view = render(<ColocSummary detail={detail(first)} />);
  await screen.findByText('Saved summary.'); view.unmount();
  render(<ColocSummary detail={detail(first)} />);
  await screen.findByText('Saved summary.');
  expect(request).toHaveBeenCalledTimes(2);
});
