import {collectTable} from './tableDownloads';
test('cancellation during final page never returns a partial or completed export',async()=>{
 const controller=new AbortController();
 const request=jest.fn(async()=>{controller.abort();return {state:'available',records:[{value:0}],has_more:false};});
 await expect(collectTable(request,{},controller.signal)).rejects.toMatchObject({name:'AbortError'});
});
test('export reads all exact filtered pages and fails on a later error',async()=>{
 const query={ref:{kind:'edge',type_id:'QTL',id:'e'},table_id:'credible_members',filters:{condition:'ND'}};
 const request=jest.fn().mockResolvedValueOnce({state:'available',records:[{pip:0}],has_more:true,next_cursor:'next'}).mockResolvedValueOnce({state:'unavailable',records:[],has_more:false});
 await expect(collectTable(request,query)).rejects.toThrow('no partial');
 expect(request.mock.calls[1][1]).toEqual({...query,limit:100,cursor:'next'});
});
