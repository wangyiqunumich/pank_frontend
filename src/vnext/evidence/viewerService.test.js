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
