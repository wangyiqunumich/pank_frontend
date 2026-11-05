import { createResultOnce, getResult, searchEntities } from './api';
import { getDevConfig } from './runtimeConfig';
jest.mock('./runtimeConfig', () => ({getDevConfig:jest.fn()}));
beforeEach(() => {getDevConfig.mockReturnValue({vnextEnabled:true,apiBase:'/pankgraph-vnext/api'});global.fetch=jest.fn();});
test('typed search goes directly to EC2 without browser credentials',async()=>{
 fetch.mockResolvedValue({ok:true,json:async()=>({items:[]})});
 await searchEntities({kind:'gene',term:'CFTR'});
 expect(fetch).toHaveBeenCalledWith('https://api-dev.pankgraph.org/api/conventional/search?kind=gene&term=CFTR',expect.objectContaining({credentials:'omit'}));
});
test('selected exact edge is retrieved from EC2 and retains coordinate identity',async()=>{
 const x=await createResultOnce({template_id:'gwas_by_variant',parameters:{edge_id:'a'.repeat(32),variant_id:'7:51018492_GT_G'}});
 expect(x.result_id).toBe(`ec2-1104-${'a'.repeat(32)}~7:51018492_GT_G`);
 fetch.mockResolvedValue({ok:true,json:async()=>({...x,status:'ready'})});
 await getResult(x.result_id);
 expect(fetch.mock.calls[0][0]).toContain('https://api-dev.pankgraph.org/api/conventional/result?result_id=');
 expect(fetch.mock.calls[0][0]).toContain('7%3A51018492_GT_G');
});
test('server error remains an error instead of empty associations',async()=>{
 fetch.mockResolvedValue({ok:false,status:503,json:async()=>({detail:'Signal search temporarily unavailable.'})});
 await expect(searchEntities({kind:'gene',term:'CFTR'})).rejects.toMatchObject({status:503});
});
