import test from 'node:test';
import assert from 'node:assert/strict';
import {validAction} from '../src/vnext/moduleGuide/actions.mjs';
import {applyGuideAction,waitForGuideTarget} from './guideActions.mjs';
const action={type:'genome_tracks',module:'genome_browser',params:{cell_types:['beta','alpha'],track_types:['signal'],height:'80'}};
test('track action validates all fields before mutation and preserves an inverse',async()=>{
 let updates=0;
 const vm={controlReady:true,isLoading:false,allTracks:[],cellTypes:['alpha','beta','ductal'],trackTypes:[' ATAC signal',' peaks'],selectedCellTypes:['ductal'],selectedTrackTypes:[' ATAC signal',' peaks'],trackHeight:'auto',view:'Tracks',$nextTick:async()=>{},updateBrowser:()=>updates++};
 const undo=await applyGuideAction(vm,action);assert.deepEqual(vm.selectedCellTypes,['beta','alpha']);assert.equal(vm.trackHeight,'80');assert.equal(updates,1);
 await applyGuideAction(vm,undo);assert.deepEqual(vm.selectedCellTypes,['ductal']);assert.equal(vm.trackHeight,'auto');assert.equal(updates,2);
 await assert.rejects(()=>applyGuideAction(vm,{...action,params:{...action.params,cell_types:['unknown']}}));assert.equal(updates,2);
});
test('region and scientific axes reject invalid or executable input',()=>{
 for(const bad of [{type:'eval',module:'genome_browser',params:{code:'alert(1)'}},{type:'open_module',module:'__proto__',params:{}},{type:'genome_region',module:'genome_browser',params:{locus:'chr7:100-20'}},{type:'pca_axes',module:'pca_explorer',params:{x:1,y:1}}, {...action,params:{...action.params,cell_types:[]}}])assert.equal(validAction(bad),false);
});
test('DE settings apply to display only and can be undone',async()=>{
 const vm={fold:1.5,pvalue:.05,view:'Heatmap'};
 const undo=await applyGuideAction(vm,{type:'de_thresholds',module:'differential_expression',params:{fold:2,pvalue:.01}});assert.equal(vm.fold,2);assert.equal(vm.view,'Volcano');await applyGuideAction(vm,undo);assert.equal(vm.fold,1.5);
});

test('cold-start actions wait for lazy module import and native initialization',async()=>{
 const state={moduleId:'',component:null};
 setTimeout(()=>{state.moduleId='genome_browser';state.component={controlReady:false,isLoading:true};},5);
 setTimeout(()=>{state.component={controlReady:true,isLoading:false};},15);
 const target=await waitForGuideTarget(()=>state,'genome_browser',{timeoutMs:200,intervalMs:5});
 assert.equal(target.controlReady,true);
 await assert.rejects(()=>waitForGuideTarget(()=>state,'pca_explorer',{timeoutMs:15,intervalMs:5}),/initializing/);
});
