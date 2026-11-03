import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import PanKgraphFunctionalPlot from './PanKgraphFunctionalPlot';

test('uses the PanKgraph results-page plot through the same-origin EC2 API', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok:true, json:async()=>({summary:{available_donors:407}}) });
  render(<PanKgraphFunctionalPlot isVisible />);
  await waitFor(()=>expect(screen.getByText(/407 donors/)).toBeTruthy());
  const img = screen.getByRole('img');
  expect(img.getAttribute('src')).toContain('/api/functional/api/charts/cohort-traces.png?trace_type=ins_ieq&result_page=Yes');
  expect(screen.getByRole('button',{name:'Expand plot'})).toBeTruthy();
  expect(screen.queryByTitle('Functional Browser')).toBeNull();
});

test('does not fetch or render an inactive module', () => {
  global.fetch = jest.fn();
  const {container}=render(<PanKgraphFunctionalPlot />);
  expect(container.firstChild).toBeNull();
  expect(global.fetch).not.toHaveBeenCalled();
});
