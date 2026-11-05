import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import PanKgraphFunctionalPlot from './PanKgraphFunctionalPlot';
import {figureSize} from './BrowserImagePlot';

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

test('retains four native response modes, capability-specific controls and fullscreen exit from Source', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok:true, json:async()=>({summary:{available_donors:407}}) });
  render(<PanKgraphFunctionalPlot isVisible />);
  await waitFor(()=>expect(screen.getByText(/407 donors/)).toBeTruthy());
  expect(screen.getByRole('link',{name:/PanKgraph functional browser tool/}).href).toBe('https://dev.pankgraph.org/functional-data');
  for(const trace of ['ins_content','gcg_ieq','gcg_content','ins_ieq']) {
    fireEvent.change(screen.getByRole('combobox'),{target:{value:trace}});
    expect(screen.getByRole('img').src).toContain('trace_type='+trace+'&result_page=Yes');
  }
  expect(screen.queryByRole('button',{name:'Zoom in'})).toBeNull();
  expect(screen.queryByRole('button',{name:'Fit to view'})).toBeNull();
  expect(screen.getByRole('img').src).toContain('plot_width=800&plot_height=500');
  expect(screen.getByRole('button',{name:'Download plot'})).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Open in full screen'}));
  fireEvent.click(screen.getByRole('button',{name:'Source',exact:true}));
  expect(screen.getByRole('dialog',{name:'PanKgraph functional plot'})).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Exit full screen'}));
  expect(screen.queryByRole('dialog')).toBeNull();
});

test('large figures preserve the viewport aspect ratio within renderer bounds',()=>{
 expect(figureSize(3840,1800)).toEqual({width:1920,height:900});
 expect(figureSize(1600,1600)).toEqual({width:1200,height:1200});
 expect(figureSize(500,400)).toEqual({width:500,height:400});
});
