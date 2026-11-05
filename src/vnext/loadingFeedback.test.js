import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import SearchResultLoading from './Loading';
import { applyRunEvent, liveProgress } from './contracts';

beforeEach(() => jest.useFakeTimers());
afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });

test('Qwen tool/reasoning cycles update details without claiming successful query completion', () => {
  let run = { run_id: 'r', status: 'running', stage: 'planning', event_sequence: 0 };
  const { rerender } = render(<SearchResultLoading streamProgress={liveProgress(run, 'connected')} />);
  for (const [seq, stage, detail] of [
    [1, 'resolving_entities', 'Matching names and identifiers to graph entities.'],
    [2, 'querying_graph', 'Retrieving records for the current query.'],
    [3, 'planning', 'Working through your question and the available evidence.'],
    [4, 'waiting_for_model_service', 'Waiting for the model service to become available.'],
    [5, 'recovering_model_response', 'Retrying the response with the saved context.'],
  ]) {
    run = applyRunEvent(run, { run_id: 'r', seq, type: 'progress', stage });
    const progress = liveProgress(run, 'connected');
    expect(progress.entryStates.filter(state => state.isFinished)).toHaveLength(1);
    rerender(<SearchResultLoading streamProgress={progress} />);
    act(() => jest.advanceTimersByTime(300));
    expect(screen.getByText(detail)).toBeTruthy();
  }
});

test('only actual receipt and returned artifacts earn completion ticks', () => {
  expect(liveProgress(null, 'connecting').entryStates.some(s => s.isFinished)).toBe(false);
  expect(liveProgress({run_id:'r',stage:'queued'}, 'connected').entryStates.some(s => s.isFinished)).toBe(false);
  const progress = liveProgress({run_id:'r', stage:'awaiting_confirmation',status:'awaiting_confirmation',plan:{},preview:{evidence:{graph_version:'v1'}}}, 'connected');
  expect(progress.entryStates.every(s => s.isFinished)).toBe(true);
  expect(liveProgress({run_id:'r',stage:'unrecognized'}, 'connected').entryStates.filter(s => s.isFinished)).toHaveLength(1);
});

test('elapsed time and heartbeats never advance steps; tips rotate independently and cancellation remains available', () => {
  const run = { run_id:'r', stage:'planning', elapsed_ms:12000, queue_elapsed_ms:3000 };
  const initial = liveProgress(run, 'connected');
  const later = liveProgress(applyRunEvent(run, {seq:99,type:'heartbeat',elapsed_ms:90000}), 'connected');
  expect(later.entryStates).toEqual(initial.entryStates);
  const cancel = jest.fn();
  render(<SearchResultLoading streamProgress={initial} handleClose={cancel} />);
  expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('0');
  expect(screen.queryByText(/seconds|elapsed|Queue waiting:/i)).toBeNull();
  expect(screen.getByText(`While you wait: ${initial.waitingTips[0]}`)).toBeTruthy();
  act(() => jest.advanceTimersByTime(8000));
  expect(screen.getByText(`While you wait: ${initial.waitingTips[1]}`)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', {name:initial.cancel}));
  expect(cancel).toHaveBeenCalledTimes(1);
});

test.each(['reconnecting','exhausted'])('lost updates show reconnection instead of ongoing activity (%s)', connection => {
  const progress = liveProgress({run_id:'r',stage:'querying_graph'}, connection);
  expect(progress.entryStates.some(s => s.step === 0)).toBe(false);
  expect(progress.indeterminate).toBe(false);
  expect(progress.shortTitle).toMatch(/Reconnecting/);
  expect(progress.waitingTips).toEqual([]);
});
