import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import FunctionalCohortPlot from './FunctionalCohortPlot';
import schema from '../schema/functional_browser_schema.json';

const data = { y_label: 'Insulin secretion', times: [0, 10], mean: [2, 3], stimuli: [[0, 10, 'Stimulus']],
  series: [{ donor_id: 'rrid-one', values: [0, 2] }, { donor_id: 'rrid-two', values: [4, 4] }] };

test('inspection joins metadata by donor identity, follows schema columns, and closes on Escape', () => {
  const custom = { cohort_traces: { ...schema.cohort_traces, hover_panel: { ...schema.cohort_traces.hover_panel,
    columns: [{ key: 'age', label: 'Recorded age' }, { key: 'bmi', label: 'Body mass index' }] } } };
  render(<FunctionalCohortPlot data={data} schema={custom} donors={[
    { donor_id: 'rrid-two', id: 'PKBD-second', age: 48, bmi: 29.3 },
    { donor_id: 'rrid-one', id: 'PKBD-first', age: 0, bmi: null },
  ]} />);
  const chart = screen.getByRole('img', { name: /Insulin secretion/ });
  fireEvent.keyDown(chart, { key: 'ArrowRight' });
  let panel = screen.getByRole('region', { name: 'Functional donor information' });
  expect(within(panel).getByText('PKBD-first')).toBeTruthy();
  expect(within(panel).getByText('Recorded age')).toBeTruthy();
  expect(within(panel).getByText('0')).toBeTruthy();
  expect(within(panel).getByText('Not recorded')).toBeTruthy();
  fireEvent.keyDown(chart, { key: 'ArrowRight' });
  panel = screen.getByRole('region', { name: 'Functional donor information' });
  expect(within(panel).getByText('PKBD-second')).toBeTruthy();
  expect(within(panel).getByText('48')).toBeTruthy();
  fireEvent.keyDown(chart, { key: 'Escape' });
  expect(screen.queryByRole('region', { name: 'Functional donor information' })).toBeNull();
});

test('curves remain inspectable before metadata loads and their hover clears when the cohort changes', () => {
  const { rerender } = render(<FunctionalCohortPlot data={data} metadataLoading />);
  fireEvent.keyDown(screen.getByRole('img'), { key: 'ArrowLeft' });
  expect(screen.getByRole('region', { name: 'Functional donor information' }).textContent).toContain('rrid-two');
  expect(screen.getAllByText('Loading…').length).toBeGreaterThan(0);
  rerender(<FunctionalCohortPlot data={{ ...data, series: [] }} />);
  expect(screen.queryByRole('region', { name: 'Functional donor information' })).toBeNull();
  expect(screen.getByRole('status').textContent).toBe(schema.cohort_traces.empty_message);
});
