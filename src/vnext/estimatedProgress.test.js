import React from 'react';
import { act, render, screen } from '@testing-library/react';
import Loading from './Loading';
import { liveProgress } from './contracts';
import { estimatedTarget, PROGRESS_SEGMENTS } from './estimatedProgress';

beforeEach(() => jest.useFakeTimers());
afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });
const advance = ms => act(() => jest.advanceTimersByTime(ms));
const percent = () => Number(screen.getByRole('progressbar').getAttribute('aria-valuenow'));
const progress = (stage='planning', run_id='r', connection='connected') => liveProgress({run_id,stage,status:'running'}, connection);

test('the calibrated curve is continuous, monotonic, unequally weighted, and capped at 99', () => {
  expect(estimatedTarget(0)).toBe(0);
  let previous=0;
  for(let ms=0;ms<=600000;ms+=50){const next=estimatedTarget(ms);expect(next).toBeGreaterThanOrEqual(previous);expect(next).toBeLessThanOrEqual(99);previous=next;}
  expect(estimatedTarget(600000)).toBeGreaterThan(98);
  expect(PROGRESS_SEGMENTS[3].end).toBeCloseTo(90);
  expect(PROGRESS_SEGMENTS[2].end-PROGRESS_SEGMENTS[1].end).toBeGreaterThan(PROGRESS_SEGMENTS[1].end-PROGRESS_SEGMENTS[0].end);
  let boundary=0;
  for(const segment of PROGRESS_SEGMENTS){boundary+=segment.durationMs;expect(Math.abs(estimatedTarget(boundary+1)-estimatedTarget(boundary-1))).toBeLessThan(.1);}
});

test('the bar starts at zero, progresses smoothly through tool loops, and never completes checklist rows on a timer', () => {
  const {rerender}=render(<Loading streamProgress={progress()} />);
  expect(percent()).toBe(0);
  advance(1000);const early=percent();expect(early).toBeGreaterThan(0);
  rerender(<Loading streamProgress={progress('querying_graph')} />);
  advance(50);expect(percent()-early).toBeLessThanOrEqual(1);
  advance(1000);const queried=percent();
  rerender(<Loading streamProgress={progress('planning')} />);advance(1000);expect(percent()).toBeGreaterThanOrEqual(queried);
  advance(300000);expect(percent()).toBeLessThanOrEqual(99);
  expect(screen.getAllByTestId('CheckCircleIcon')).toHaveLength(1);
});

test('lost connection and model-service waits freeze the bar; reconnection resumes without a jump', () => {
  const {rerender}=render(<Loading streamProgress={progress()} />);advance(2000);const before=percent();
  rerender(<Loading streamProgress={progress('planning','r','reconnecting')} />);advance(60000);expect(percent()).toBe(before);
  rerender(<Loading streamProgress={progress('waiting_for_model_service')} />);advance(60000);expect(percent()).toBe(before);
  rerender(<Loading streamProgress={progress()} />);advance(50);expect(percent()-before).toBeLessThanOrEqual(1);
});

test('a new question resets progress and unmounting clears the animation and tip timers', () => {
  const {rerender,unmount}=render(<Loading streamProgress={progress()} />);advance(4000);expect(percent()).toBeGreaterThan(0);
  rerender(<Loading streamProgress={progress('planning','new-run')} />);expect(percent()).toBe(0);
  unmount();expect(jest.getTimerCount()).toBe(0);
});

test('waiting tips occupy the original footer beside Cancel, with no additional row', () => {
  render(<Loading streamProgress={progress()} />);
  const tip=screen.getByText(/^While you wait:/);
  const cancel=screen.getByRole('button',{name:'Cancel and ask a new question'});
  expect(tip.parentElement).toBe(cancel.parentElement);
  expect(screen.queryByText('Updates appear as your investigation progresses.')).toBeNull();
  expect(screen.queryByText(/seconds|elapsed/i)).toBeNull();
});
