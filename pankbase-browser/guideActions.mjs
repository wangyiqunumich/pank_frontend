import { validAction } from '../src/vnext/moduleGuide/actions.mjs';
export async function applyGuideAction(component, action) {
  if(!component||!validAction(action))throw new Error('Invalid module configuration.');
  const p=action.params, inverse=params=>({type:action.type,module:action.module,params});
  let undo;
  if(action.type==='open_module'){
    undo={type:'open_module',module:action.module,params:{view:component.view}};
    component.view=p.view;await component.$nextTick();if(component.loadHeatmap)await component.loadHeatmap();
  } else if(action.type==='genome_tracks'){
    if(!component.controlReady||component.isLoading||!component.allTracks)throw new Error('Genome data are still loading. Try again when the tracks appear.');
    if(!p.cell_types.every(c=>component.cellTypes.includes(c)))throw new Error('A requested cell type is unavailable in this source.');
    const trackNames=p.track_types.map(t=>component.trackTypes.find(name=>name.toLowerCase().includes(t)));
    if(trackNames.some(t=>!t))throw new Error('A requested track type is unavailable.');
    undo=inverse({cell_types:[...component.selectedCellTypes],track_types:component.selectedTrackTypes.map(t=>t.includes('peaks')?'peaks':'signal'),height:component.trackHeight});
    component.selectedCellTypes=[...p.cell_types];component.selectedTrackTypes=trackNames;component.trackHeight=p.height;component.view='Genome';await component.$nextTick();component.updateBrowser();
  } else if(action.type==='genome_region'){
    if(!component.controlReady||component.isLoading)throw new Error('Genome data are still loading.');
    undo=inverse({locus:component.liveLocus.replaceAll(',','')});component.regionInput=p.locus;await component.openRegion();
    if(component.loadError)throw new Error('The region could not be loaded. Check the module.');
  } else if(action.type==='de_thresholds'){
    undo=inverse({fold:component.fold,pvalue:component.pvalue});component.fold=p.fold;component.pvalue=p.pvalue;component.view='Volcano';
  } else if(action.type==='pca_axes'){
    undo=inverse({x:component.pcx,y:component.pcy});component.pcx=p.x;component.pcy=p.y;component.view='PCA map';
  } else throw new Error('This configuration is not supported by this module.');
  return validAction(undo)?undo:null;
}

export async function waitForGuideTarget(readState,moduleId,{timeoutMs=9000,intervalMs=120}={}) {
  const until=Date.now()+timeoutMs;
  while(true){
    const {moduleId:current,component}=readState();
    if(current===moduleId&&component&&(moduleId!=='genome_browser'||(component.controlReady&&!component.isLoading)))return component;
    if(Date.now()>=until)throw new Error('The module is still initializing. Please try again when its data appear.');
    await new Promise(resolve=>setTimeout(resolve,intervalMs));
  }
}
