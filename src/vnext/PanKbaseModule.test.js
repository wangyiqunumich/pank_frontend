import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import PanKbaseModule from './PanKbaseModule';
const context={moduleId:'gene_browser',recordId:'g',geneSymbol:'CFTR',available:true};
afterEach(()=>jest.restoreAllMocks());
test('previews and unopened modules perform no fetch; opening loads one entry and retains its frame when hidden',async()=>{
 global.fetch=jest.fn().mockResolvedValue({ok:true,json:async()=>({version:1,html:'<!doctype html><html><head></head><body></body></html>'})});
 const {rerender}=render(<PanKbaseModule moduleId="gene_browser" context={context} preview/>);
 expect(global.fetch).not.toHaveBeenCalled();
 rerender(<PanKbaseModule moduleId="gene_browser" context={context} isVisible={false}/>);
 expect(global.fetch).not.toHaveBeenCalled();
 rerender(<PanKbaseModule moduleId="gene_browser" context={context} isVisible/>);
 await waitFor(()=>expect(screen.getByTitle('Gene Browser')).toBeTruthy());
 const frame=screen.getByTitle('Gene Browser');
 expect(global.fetch).toHaveBeenCalledTimes(1);
 fireEvent.click(screen.getByRole('button',{name:'Expand view'}));
 expect(screen.getByRole('dialog',{name:'Gene Browser'})).toBeTruthy();
 expect(screen.getByTitle('Gene Browser')).toBe(frame);
 fireEvent.click(screen.getByRole('button',{name:'Exit full screen'}));
 expect(screen.getByTitle('Gene Browser')).toBe(frame);
 rerender(<PanKbaseModule moduleId="gene_browser" context={context} isVisible={false}/>);
 expect(screen.getByTitle('Gene Browser')).toBe(frame);
 // A ready message from any unrelated frame or origin cannot finish startup.
 act(()=>window.dispatchEvent(new MessageEvent('message',{origin:'https://example.org',data:{protocol:'pankgraph.pankbase.v1',type:'ready'}})));
 expect(screen.getByRole('status')).toBeTruthy();
 act(()=>window.dispatchEvent(new MessageEvent('message',{origin:window.location.origin,source:frame.contentWindow,data:{protocol:'pankgraph.pankbase.v1',type:'ready'}})));
 expect(screen.queryByRole('status')).toBeNull();
});
