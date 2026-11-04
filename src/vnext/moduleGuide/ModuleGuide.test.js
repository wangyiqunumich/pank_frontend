import React from 'react';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import ModuleGuide from './ModuleGuide';
import * as bridge from './bridge';

beforeEach(()=>{
 sessionStorage.clear();Element.prototype.scrollIntoView=jest.fn();
 global.ResizeObserver=class {observe(){} disconnect(){}};
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
 expect(body.history.map(x=>x.role)).toEqual(['user','assistant']);expect(body.message).toBe('What about signal only?');
 await waitFor(()=>expect(screen.getAllByText('Choose cell types in Tracks, then Apply tracks.')).toHaveLength(2));
 fireEvent.click(screen.getAllByRole('button',{name:'Genome tracks'})[0]);expect(screen.getByRole('heading',{name:'Genome · Choose tracks / 选择轨道'})).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'New conversation'}));
 expect(JSON.parse(sessionStorage.getItem('pank-module-guide:v1'))).toEqual([]);
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
 fireEvent.click(await screen.findByRole('button',{name:'Apply configuration'}));
 await screen.findByRole('button',{name:'Undo'});
 expect(screen.getByRole('button',{name:'Applied'}).disabled).toBe(true);
 fireEvent.click(screen.getByRole('button',{name:'Close module guide'}));fireEvent.click(screen.getByRole('button',{name:'Open module guide'}));
 expect(screen.getByRole('button',{name:'Undo'})).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Genome tracks'}));
 fireEvent.click(screen.getByRole('button',{name:'Chat',exact:true}));
 fireEvent.click(screen.getByRole('button',{name:'Undo'}));
 await screen.findByText('Previous settings restored.');
 expect(apply.mock.calls.map(([value])=>value)).toEqual([action,inverse]);
 expect(screen.queryByRole('button',{name:'Undo'})).toBeNull();
 expect(screen.getByRole('button',{name:'Apply configuration'}).disabled).toBe(false);
});
