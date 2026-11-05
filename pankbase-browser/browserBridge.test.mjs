import test from 'node:test';
import assert from 'node:assert/strict';
import { mountGenome, zoomGenome, fitSignalTracks } from './vendor/genome/browserBridge.mjs';
test('genome adapter restores render and keeps the public store for viewport operations',()=>{
  const store={dispatch(){},getState(){},subscribe(){}},render=()=>{};
  const runtime={ReactDOM:{render},renderBrowserInElement(){runtime.ReactDOM.render({props:{store}},{});}};
  assert.equal(mountGenome(runtime,{},{}),store);assert.equal(runtime.ReactDOM.render,render);
  runtime.renderBrowserInElement=()=>{throw new Error('failure');};
  assert.throws(()=>mountGenome(runtime,{},{}));assert.equal(runtime.ReactDOM.render,render);
});
test('genome zoom changes the real region around its center',()=>{
  const actions=[],store={getState:()=>({browser:{present:{viewRegion:{getContextCoordinates:()=>({start:100,end:200})}}}}),dispatch:a=>actions.push(a)};
  zoomGenome(store,0.5);assert.deepEqual(actions[0],{type:'SET_VIEW_REGION',start:125,end:175});
  zoomGenome(store,2);assert.deepEqual(actions[1],{type:'SET_VIEW_REGION',start:50,end:250});
});
test('fit allocates spare height to native signals without changing source tracks or values',()=>{
  const signal={type:'bigwig',options:{height:50,color:'brown'},url:'source.bw',cloneAndSetOption(k,v){return {...this,options:{...this.options,[k]:v}};}};
  const gene={type:'geneannotation',options:{height:60}},tracks=[gene,signal];
  const next=fitSignalTracks(tracks,200);assert.equal(next[0],gene);assert.equal(next[1].options.height,160);assert.equal(next[1].url,signal.url);assert.equal(signal.options.height,50);
  assert.equal(fitSignalTracks(next,1),null);
  assert.equal(fitSignalTracks(tracks,-200),null,'minimum signal height remains readable');
});

test('transient fullscreen measurements cannot grow a signal beyond its viewport',()=>{
  const signal={type:'bigwig',options:{height:600},cloneAndSetOption(k,v){return {...this,options:{...this.options,[k]:v}};}};
  assert.equal(fitSignalTracks([signal],10000,{availableHeight:350})[0].options.height,160);
  assert.equal(fitSignalTracks([signal],0,{availableHeight:350,fixedHeight:80})[0].options.height,80);
  assert.equal(fitSignalTracks([signal],NaN),null);
});
