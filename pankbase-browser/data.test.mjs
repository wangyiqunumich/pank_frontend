import test from 'node:test';
import assert from 'node:assert/strict';
import { readPublic, readBioIndex } from './data.mjs';
const url = suffix => 'https://bioindex.pankbase.org/api/bio/query/test?q='+suffix;
const response = value => new Response(typeof value === 'string' ? value : JSON.stringify(value));
test('deduplicates concurrent reads and enforces a tighter budget on cache reuse', async () => {
 let calls=0; const fetcher=async()=>{calls++; return response('abcdef');};
 assert.deepEqual(await Promise.all([readPublic(url('dedup'),{fetcher}),readPublic(url('dedup'),{fetcher})]),['abcdef','abcdef']);
 assert.equal(calls,1);
 await assert.rejects(readPublic(url('dedup'),{fetcher,maxBytes:3}),/budget/);
});
test('completes all continuation pages and preserves source fields',async()=>{
 const seen=[];const fetcher=async target=>{seen.push(target);return response(seen.length===1?{data:[{id:1}],continuation:'next token',release:'v1'}:{data:[{id:2}],release:'v1'});};
 const result=await readBioIndex(url('pages'),{fetcher});
 assert.deepEqual(result.data,[{id:1},{id:2}]);assert.equal(result.count,2);assert.equal(result.release,'v1');
 assert.equal(seen[1],'https://bioindex.pankbase.org/api/bio/cont?token=next%20token');
});
test('restricted or malformed responses are evicted so retry reaches the source',async()=>{
 for (const [id,bad] of [['restricted',{data:[],restricted:1}],['malformed','not json']]) {
  let calls=0;const fetcher=async()=>response(++calls===1?bad:{data:[{ok:true}]});
  await assert.rejects(readBioIndex(url(id),{fetcher}));
  assert.equal((await readBioIndex(url(id),{fetcher})).data.length,1);assert.equal(calls,2);
 }
});
test('repeated continuation, oversized streams, HTTP failures and unregistered origins are errors',async()=>{
 await assert.rejects(readBioIndex(url('loop'),{fetcher:async()=>response({data:[],continuation:'loop'})}),/repeated/);
 await assert.rejects(readPublic(url('big'),{maxBytes:2,fetcher:async()=>response('abcd')}),/budget/);
 await assert.rejects(readPublic(url('http'),{fetcher:async()=>new Response('',{status:503})}),/503/);
 await assert.rejects(readPublic('https://example.org/data',{fetcher:()=>{throw Error('must not fetch');}}),/Unregistered/);
});
