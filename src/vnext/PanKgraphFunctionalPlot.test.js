import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import PanKgraphFunctionalPlot from './PanKgraphFunctionalPlot';
import {registerGuideModule} from './moduleGuide/bridge';
import {validFunctionalFilters} from './functionalConfig.mjs';
jest.mock('./moduleGuide/bridge',()=>({registerGuideModule:jest.fn(()=>()=>{})}));
const fixture=(trace='ins_ieq',ids=Array.from({length:407},(_,i)=>'RRID:SAMN'+i))=>({trace_type:trace,series:ids.map(donor_id=>({donor_id,values:[1,2]})),times:[1,2],mean:[1,2]});
const mockCohort=()=>{global.fetch=jest.fn(async url=>({ok:true,json:async()=>fixture(new URL(url,'https://example.org').searchParams.get('trace_type'))}));};
import {figureSize} from './BrowserImagePlot';

test('uses the PanKgraph results-page plot through the same-origin EC2 API', async () => {
  mockCohort();
  render(<PanKgraphFunctionalPlot isVisible />);
  await waitFor(()=>expect(screen.getByText(/407 donors/)).toBeTruthy());
  const img = screen.getByRole('img');
  expect(img.getAttribute('src')).toContain('/api/functional/api/charts/cohort-traces.png?trace_type=ins_ieq&result_page=Yes');
  expect(global.fetch.mock.calls[0][0]).toContain('/cohort-traces?trace_type=ins_ieq&result_page=Yes');
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
  mockCohort();
  render(<PanKgraphFunctionalPlot isVisible />);
  await waitFor(()=>expect(screen.getByText(/407 donors/)).toBeTruthy());
  expect(screen.getByRole('link',{name:/PanKgraph functional browser tool/}).href).toBe('https://dev.pankgraph.org/functional-data');
  for(const trace of ['ins_content','gcg_ieq','gcg_content','ins_ieq']) {
    fireEvent.change(screen.getByRole('combobox'),{target:{value:trace}});
    await waitFor(()=>expect(screen.getByRole('img').src).toContain('trace_type='+trace+'&result_page=Yes'));
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


test('Source lists the actual cohort and drawn trace IDs; filter Apply and Undo share the image query',async()=>{
 global.fetch=jest.fn(async url=>{const q=new URL(url,'https://example.org').searchParams;return {ok:true,json:async()=>fixture(q.get('trace_type'),q.has('disease')?['RRID:SAMN42','RRID:SAMN43']:Array.from({length:30},(_,i)=>'RRID:SAMN'+i))};});
 render(<PanKgraphFunctionalPlot isVisible/>);await screen.findByRole('img');
 fireEvent.click(screen.getByRole('button',{name:'Source',exact:true}));
 expect(screen.getByText(/no manual cohort filter controls/)).toBeTruthy();
 expect(screen.getByText('Cohort mean donor IDs (30)')).toBeTruthy();
 expect(screen.getByText('Individual trace donor IDs (24)')).toBeTruthy();
 expect(screen.getByText(/RRID:SAMN29/)).toBeTruthy();
 let undo;await act(async()=>{undo=await registerGuideModule.mock.calls.at(-1)[1]({type:'functional_filters',module:'functional_browser',params:{filters:{disease:'T1D',sex:'Female'}}});});
 await waitFor(()=>expect(screen.getByRole('img').src).toContain('disease=T1D&sex=Female'));
 expect(global.fetch.mock.calls.at(-1)[0]).toContain('disease=T1D&sex=Female');
 fireEvent.click(screen.getByRole('button',{name:'Source',exact:true}));
 expect(screen.getByText('T1D')).toBeTruthy();expect(screen.getByText('Female')).toBeTruthy();
 expect(screen.getByText('Cohort mean donor IDs (2)')).toBeTruthy();
 expect(screen.queryByText(/RRID:SAMN29/)).toBeNull();
 await act(async()=>{await registerGuideModule.mock.calls.at(-1)[1](undo);});
 await waitFor(()=>expect(screen.getByRole('img').src).not.toContain('disease='));
 expect(screen.getByText(/30 donors with this response/)).toBeTruthy();
});

test('failed or empty cohort does not display an unfiltered or stale plot',async()=>{
 global.fetch=jest.fn().mockResolvedValue({ok:true,json:async()=>fixture('ins_ieq',[])});
 render(<PanKgraphFunctionalPlot isVisible/>);
 expect(await screen.findByText(/No donors have this response/)).toBeTruthy();expect(screen.queryByRole('img')).toBeNull();
 global.fetch.mockResolvedValue({ok:false});
 await act(async()=>{await registerGuideModule.mock.calls.at(-1)[1]({type:'functional_filters',module:'functional_browser',params:{filters:{donor_ids:['not-found']}}});});
 expect(await screen.findByRole('alert')).toBeTruthy();expect(screen.queryByRole('img')).toBeNull();
});

test('filter actions reject ambiguous ID precedence and invalid bounds',()=>{
 for(const filters of [{donor_ids:[]},{ids:['a'],disease:'T1D'},{age_min:60,age_max:20},{sex:'F'},{bmi_min:true},{url:'https://x'},{donor_ids:['a','a']}])expect(validFunctionalFilters(filters)).toBe(false);
 for(const filters of [{},{donor_ids:['RRID:SAMN123']},{disease:'T1D',age_min:18,sex:'Female'}])expect(validFunctionalFilters(filters)).toBe(true);
});
