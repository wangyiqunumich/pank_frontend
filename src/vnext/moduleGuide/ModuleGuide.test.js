import React from 'react';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import ModuleGuide from './ModuleGuide';
import * as bridge from './bridge';

beforeEach(()=>{
 sessionStorage.clear();Element.prototype.scrollIntoView=jest.fn();
 global.ResizeObserver=class {observe(){} unobserve(){} disconnect(){}};
 global.crypto.randomUUID=()=> '11111111-1111-4111-8111-111111111111';
 global.fetch=jest.fn(async (url,options)=>({ok:true,json:async()=>options?.method==='POST'?{answer:'Choose cell types in Tracks, then Apply tracks.',citations:[{id:'genome-tracks',title:'Genome tracks'}],actions:[]}:{status:'ready'}}));
});
afterEach(()=>jest.restoreAllMocks());
test('continuous conversation sends bounded prior turns and shows manual citations',async()=>{
 render(<ModuleGuide/>);fireEvent.click(screen.getByRole('button',{name:'Open module guide'}));
 fireEvent.change(screen.getByLabelText('Ask about module usage'),{target:{value:'How do I choose beta tracks?'}});
 fireEvent.click(screen.getByRole('button',{name:'Send guide question'}));
 await screen.findByText('Choose cell types in Tracks, then Apply tracks.');
 fireEvent.change(screen.getByLabelText('Ask about module usage'),{target:{value:'What about signal only?'}});fireEvent.click(screen.getByRole('button',{name:'Send guide question'}));
 await waitFor(()=>expect(fetch.mock.calls.filter(([,o])=>o?.method==='POST')).toHaveLength(2));
 const body=JSON.parse(fetch.mock.calls.filter(([,o])=>o?.method==='POST')[1][1].body);
 expect(body).not.toHaveProperty('module');expect(screen.queryByRole('combobox')).toBeNull();
 expect(body.history.map(x=>x.role)).toEqual(['user','assistant']);expect(body.message).toBe('What about signal only?');
 await waitFor(()=>expect(screen.getAllByText('Choose cell types in Tracks, then Apply tracks.')).toHaveLength(2));
 fireEvent.click(screen.getAllByRole('button',{name:'Genome · Choose tracks'})[0]);expect(screen.getByRole('heading',{name:'Genome · Choose tracks'})).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'New conversation'}));
 expect(JSON.parse(sessionStorage.getItem('pank-module-guide:techdemo:v2-en'))).toEqual([]);
});
test('unavailable provider retains manual and does not retry a paid request',async()=>{
 fetch.mockImplementation(async(url,o)=>({ok:!o?.method,json:async()=>o?.method?{detail:'Budget reached'}:{status:'manual-only'}}));
 render(<ModuleGuide/>);fireEvent.click(screen.getByRole('button',{name:'Open module guide'}));
 await screen.findByRole('button',{name:'Use manual'});
 fireEvent.change(screen.getByLabelText('Ask about module usage'),{target:{value:'Explain tracks'}});fireEvent.click(screen.getByRole('button',{name:'Send guide question'}));
 await screen.findByText('Budget reached');expect(fetch.mock.calls.filter(([,o])=>o?.method==='POST')).toHaveLength(1);
 fireEvent.click(screen.getByRole('button',{name:'Use manual'}));expect(screen.getByLabelText('Find a topic')).toBeTruthy();
});

test('configuration undo survives closing the panel and visiting manual, without overwriting its inverse',async()=>{
 const action={type:'genome_tracks',module:'genome_browser',params:{cell_types:['beta','alpha'],track_types:['signal'],height:'80'}};
 const inverse={...action,params:{cell_types:['beta','alpha','ductal'],track_types:['signal','peaks'],height:'auto'}};
 const apply=jest.spyOn(bridge,'applyGuideAction').mockResolvedValue(inverse);
 fetch.mockImplementation(async(url,options)=>({ok:true,json:async()=>options?.method==='POST'?{answer:'Preview tracks.',citations:[{id:'genome-tracks',title:'Genome tracks'}],actions:[action]}:{status:'ready'}}));
 render(<ModuleGuide/>);fireEvent.click(screen.getByRole('button',{name:'Open module guide'}));
 fireEvent.change(screen.getByLabelText('Ask about module usage'),{target:{value:'Configure beta alpha'}});fireEvent.click(screen.getByRole('button',{name:'Send guide question'}));
 fireEvent.click(await screen.findByRole('button',{name:'Apply',exact:true}));
 await screen.findByRole('button',{name:'Undo'});
 expect(screen.getByRole('button',{name:'Applied'}).disabled).toBe(true);
 fireEvent.click(screen.getByRole('button',{name:'Close module guide'}));fireEvent.click(screen.getByRole('button',{name:'Open module guide'}));
 expect(screen.getByRole('button',{name:'Undo'})).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Genome · Choose tracks'}));
 fireEvent.click(screen.getByRole('button',{name:'Chat',exact:true}));
 fireEvent.click(screen.getByRole('button',{name:'Undo'}));
 await screen.findByText('Previous settings restored.');
 expect(apply.mock.calls.map(([value])=>value)).toEqual([action,inverse]);
 expect(screen.queryByRole('button',{name:'Undo'})).toBeNull();
 expect(screen.getByRole('button',{name:'Apply',exact:true}).disabled).toBe(false);
});

test('welcome examples prepare direct module configuration without automatically sending or applying',async()=>{
 render(<ModuleGuide/>);fireEvent.click(screen.getByRole('button',{name:'Open module guide'}));
 const prompt='Open PCA Explorer and set X to PC2 and Y to PC3.';
 fireEvent.click(screen.getByRole('button',{name:/Plot PC2 against PC3/}));
 expect(screen.getByLabelText('Ask about module usage').value).toBe(prompt);
 expect(fetch.mock.calls.filter(([,o])=>o?.method==='POST')).toHaveLength(0);
 expect(screen.queryByText('Module help and verified entities · Changes require Apply')).toBeNull();
});

test('the open panel fits above its shared action anchor as the page moves',()=>{
 let bottom=300;
 jest.spyOn(HTMLButtonElement.prototype,'getBoundingClientRect').mockImplementation(()=>({bottom}));
 render(<ModuleGuide/>);
 fireEvent.click(screen.getByRole('button',{name:'Open module guide'}));
 const panel=screen.getByRole('dialog',{name:'PanKgraph module guide'});
 expect(panel.style.maxHeight).toBe('284px');
 bottom=500;fireEvent.scroll(window);
 expect(panel.style.maxHeight).toBe('484px');
 bottom=window.innerHeight+200;fireEvent.resize(window);
 expect(panel.style.maxHeight).toBe(`${window.innerHeight-28}px`);
});

test('the guide stays inside the visible viewport when a mobile keyboard changes its size',()=>{
 const previous=Object.getOwnPropertyDescriptor(window,'visualViewport');
 const viewport=Object.assign(new EventTarget(),{height:300,width:390,offsetTop:100,offsetLeft:0});
 Object.defineProperty(window,'visualViewport',{configurable:true,value:viewport});
 jest.spyOn(HTMLButtonElement.prototype,'getBoundingClientRect').mockReturnValue({bottom:700,right:378});
 const {unmount}=render(<ModuleGuide/>);
 try{
  fireEvent.click(screen.getByRole('button',{name:'Open module guide'}));
  const panel=screen.getByRole('dialog',{name:'PanKgraph module guide'});
  expect(panel.style.maxHeight).toBe('272px');expect(panel.style.maxWidth).toBe('366px');
  expect(panel.style.bottom).toBe(`${window.innerHeight-388}px`);
  viewport.height=240;viewport.offsetTop=180;viewport.dispatchEvent(new Event('resize'));
  expect(panel.style.maxHeight).toBe('212px');expect(panel.style.bottom).toBe(`${window.innerHeight-408}px`);
 }finally{unmount();if(previous)Object.defineProperty(window,'visualViewport',previous);else delete window.visualViewport;}
});

// Exercise the complete module registry on the dedicated demo page.
jest.mock('../hosting', () => ({...jest.requireActual('../hosting'), TECH_DEMO: true}));
