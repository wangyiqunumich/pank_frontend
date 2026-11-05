import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultCellTypes } from './vendor/genome/trackDefaults.mjs';
import { fitSignalTracks } from './vendor/genome/browserBridge.mjs';
const available=['a_stellate','acinar','alpha','beta','delta','ductal','gamma','immune'];
test('comparison defaults prioritize the context and cover six distinct available types',()=>{
 assert.deepEqual(defaultCellTypes(available,'Immune'),['immune','ductal','beta','alpha','acinar','delta']);
 assert.deepEqual(defaultCellTypes(available,null),['ductal','beta','alpha','acinar','delta','gamma']);
 assert.deepEqual(defaultCellTypes(['alpha'],'missing'),['alpha']);
});
const track=height=>({type:'bigwig',options:{height},cloneAndSetOption(key,value){return track(value);}});
test('automatic track allocation stays readable without stretching one signal to the viewport',()=>{
 assert.equal(fitSignalTracks([track(50)],2000,{availableHeight:2200})[0].options.height,160);
 assert.equal(fitSignalTracks([track(800)],-100,{availableHeight:1000})[0].options.height,160);
 assert.equal(fitSignalTracks([track(50)],10,{fixedHeight:260})[0].options.height,260);
 assert.equal(fitSignalTracks([track(50)],-900,{availableHeight:200}) ,null);
});
