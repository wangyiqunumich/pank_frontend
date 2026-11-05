import {renderHook,act} from '@testing-library/react';
import {loadViewerService} from './viewerService';
jest.mock('../api',()=>({request:jest.fn()}));
test('pins every operation to the verified release and passes abort signal',async()=>{
 const send=jest.fn().mockResolvedValueOnce({release_id:'r1',profiles:{},tables:{}}).mockResolvedValue({state:'available'});
 const signal=new AbortController().signal;
 const service=await loadViewerService('r1',signal,send);
 await service.request('/table',{ref:{kind:'node',id:'a',type_id:'Gene'}},signal);
 expect(send.mock.calls[1][0]).toBe('/viewer/v1/table');
 expect(JSON.parse(send.mock.calls[1][1].body).release_id).toBe('r1');
 expect(send.mock.calls[1][1].signal).toBe(signal);
 await expect(service.request('/query',{})).rejects.toThrow('Unknown');
 await expect(service.request('/table',{release_id:'other'})).rejects.toThrow('version mismatch');
 expect(send).toHaveBeenCalledTimes(2);
});
test('mismatched schema cannot enable a viewer',async()=>{
 await expect(loadViewerService('r1',undefined,jest.fn().mockResolvedValue({release_id:'r2',profiles:{},tables:{}}))).rejects.toThrow('version mismatch');
});

test('typed refs without a release cannot dereference an uninitialized service',()=>{
 const {useViewerService}=require('./viewerService');
 const hook=renderHook(()=>useViewerService(undefined,true));
 expect(hook.result.current).toBeNull();
});

test('schema pending is distinct from failed and resets for a new release',async()=>{
 const {useViewerService}=require('./viewerService');
 const {request}=require('../api');
 let reject;
 request.mockImplementation(()=>new Promise((_,fail)=>{reject=fail;}));
 const {result,rerender}=renderHook(({release})=>useViewerService(release,true),{initialProps:{release:'r1'}});
 expect(result.current).toEqual({loading:true});
 await act(async()=>reject(new Error('offline')));
 expect(result.current).toBeNull();
 rerender({release:'r2'});
 expect(result.current).toEqual({loading:true});
});

test('prefetch and hover share an exact-object read and subsequent hover is synchronous from cache',async()=>{
 const ref={kind:'node',type_id:'Gene',id:'a'};let finish;
 const send=jest.fn().mockResolvedValueOnce({release_id:'r1',profiles:{},tables:{}}).mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
 const service=await loadViewerService('r1',undefined,send);
 const first=service.request('/inspect',{ref});
 const hover=service.request('/inspect',{ref});
 expect(send).toHaveBeenCalledTimes(2);
 finish({ref,fields:[]});await first;await hover;
 expect(service.peek(ref).ref).toEqual(ref);
 await service.request('/inspect',{ref});expect(send).toHaveBeenCalledTimes(2);
 expect(service.peek({...ref,id:'b'})).toBeUndefined();
 const other=await loadViewerService('r2',undefined,jest.fn().mockResolvedValue({release_id:'r2',profiles:{},tables:{}}));
 expect(other.peek(ref)).toBeUndefined();
});
test('invalid inspection is not cached and can be retried',async()=>{
 const ref={kind:'edge',type_id:'r',id:'a'};
 const send=jest.fn().mockResolvedValueOnce({release_id:'r1',profiles:{},tables:{}}).mockResolvedValueOnce({ref:{...ref,id:'wrong'}}).mockResolvedValueOnce({ref});
 const service=await loadViewerService('r1',undefined,send);
 await expect(service.request('/inspect',{ref})).rejects.toThrow('identity');
 expect(service.peek(ref)).toBeUndefined();
 await service.request('/inspect',{ref});expect(service.peek(ref).ref).toEqual(ref);
});
