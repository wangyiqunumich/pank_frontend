// epgg 53.6.0's public embed entry renders a React-Redux Provider. Capture the
// supplied store during that single call; never inspect private React fibers.
export function mountGenome(runtime, contents, container) {
  const render=runtime.ReactDOM.render;
  let store;
  runtime.ReactDOM.render=function(element,...args) {
    if(element?.props?.store?.dispatch)store=element.props.store;
    return render.call(this,element,...args);
  };
  try { runtime.renderBrowserInElement(contents,container); }
  finally { runtime.ReactDOM.render=render; }
  if(!store?.getState || !store?.subscribe)throw new Error('Genome renderer controls are unavailable.');
  return store;
}
export function zoomGenome(store,factor) {
  const region=store.getState().browser.present.viewRegion;
  if(!region)return;
  const {start,end}=region.getContextCoordinates(),center=(start+end)/2;
  const width=Math.max(5,(end-start)*factor);
  store.dispatch({type:'SET_VIEW_REGION',start:center-width/2,end:center+width/2});
}
export function fitSignalTracks(tracks, extraHeight, { availableHeight = 1000, fixedHeight = null } = {}) {
  const signals=tracks.filter(t=>t.type==='bigwig'&&typeof t.cloneAndSetOption==='function');
  if(!signals.length || !Number.isFinite(extraHeight))return null;
  // Bound each allocation by the actual viewport. Never compound transient
  // render measurements into an unbounded track height during fullscreen.
  const ceiling=Math.max(50,Math.min(160,Math.floor(availableHeight/signals.length)));
  if(fixedHeight===null&&Math.abs(extraHeight)<3)return null;
  let changed=false;
  const next=tracks.map(track=>{
    if(!signals.includes(track))return track;
    const old=track.options?.height||50,height=fixedHeight===null?Math.max(50,Math.min(ceiling,Math.round(old+extraHeight/signals.length))):fixedHeight;
    if(height===old)return track;changed=true;return track.cloneAndSetOption('height',height);
  });
  return changed?next:null;
}
