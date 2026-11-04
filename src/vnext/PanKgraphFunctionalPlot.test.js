import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import PanKgraphFunctionalPlot from './PanKgraphFunctionalPlot';

test('uses the PanKgraph results-page plot through the same-origin EC2 API', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok:true, json:async()=>({summary:{available_donors:407}}) });
  render(<PanKgraphFunctionalPlot isVisible />);
  await waitFor(()=>expect(screen.getByText(/407 donors/)).toBeTruthy());
  const img = screen.getByRole('img');
  expect(img.getAttribute('src')).toContain('/api/functional/api/charts/cohort-traces.png?trace_type=ins_ieq&result_page=Yes');
  expect(screen.getByRole('button',{name:'Open in full screen'})).toBeTruthy();
  expect(screen.queryByTitle('Functional Browser')).toBeNull();
});

test('does not fetch or render an inactive module', () => {
  global.fetch = jest.fn();
  const {container}=render(<PanKgraphFunctionalPlot />);
  expect(container.firstChild).toBeNull();
  expect(global.fetch).not.toHaveBeenCalled();
});

test('retains four native response modes, real zoom/fit and fullscreen exit from Source', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok:true, json:async()=>({summary:{available_donors:407}}) });
  render(<PanKgraphFunctionalPlot isVisible />);
  await waitFor(()=>expect(screen.getByText(/407 donors/)).toBeTruthy());
  expect(screen.getByRole('link',{name:/PanKbase functional browser/}).href).toBe('https://pankbase.org/functional.html');
  for(const trace of ['ins_content','gcg_ieq','gcg_content','ins_ieq']) {
    fireEvent.change(screen.getByRole('combobox'),{target:{value:trace}});
    expect(screen.getByRole('img').src).toContain('trace_type='+trace+'&result_page=Yes');
  }
  fireEvent.click(screen.getByRole('button',{name:'Zoom in'}));
  expect(screen.getByRole('img').style.transform).toContain('scale(1.25)');
  fireEvent.click(screen.getByRole('button',{name:'Fit to view'}));
  expect(screen.getByRole('img').style.transform).toContain('scale(1)');
  fireEvent.click(screen.getByRole('button',{name:'Open in full screen'}));
  fireEvent.click(screen.getByRole('button',{name:'Source',exact:true}));
  expect(screen.getByRole('dialog',{name:'PanKgraph functional plot'})).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Exit full screen'}));
  expect(screen.queryByRole('dialog')).toBeNull();
});
