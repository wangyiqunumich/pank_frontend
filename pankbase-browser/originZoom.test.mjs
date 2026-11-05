import test from 'node:test';
import assert from 'node:assert/strict';
import { originScale } from './originZoom.mjs';
test('zero remains fixed for positive, negative and mixed coordinates, including inverted y axes',()=>{
 for(const values of [[0,2,9],[-8,0,3],[-4,-1],[0,0],[]]) for(const range of [[64,700],[400,24]]) {
  const base=originScale(values,range), zoomed=originScale(values,range,4);
  assert.ok(Math.abs(base(0)-zoomed(0))<1e-8);
  assert.ok(Math.abs((zoomed(1)-zoomed(0))/(base(1)-base(0))-4)<1e-8);
  assert.deepEqual(originScale(values,range,1).domain(),base.domain());
 }
});
