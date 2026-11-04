<template><div class="browser-toolbar" role="toolbar" aria-label="Visualization controls">
  <button type="button" :aria-label="fullscreen?'Exit full screen':'Open in full screen'" :title="fullscreen?'Exit full screen':'Open in full screen'" @click="$emit('fullscreen')"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path :d="icons.fullscreen"/></svg></button>
  <button v-for="action in navigationOnly ? [] : actions" :key="action.id" type="button" :aria-label="action.label" :title="action.label" :disabled="disabled || (action.id==='zoomIn' && !canZoomIn) || (action.id==='zoomOut' && !canZoomOut)" @click="$emit(action.id)"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path :d="icons[action.id]"/></svg></button>
</div></template>
<script>
import { TOOL_ICONS } from '../src/vnext/browserChrome';
import '../src/vnext/browserChrome.css';
export default { props:{navigationOnly:Boolean,fullscreen:Boolean,disabled:Boolean,canZoomIn:{type:Boolean,default:true},canZoomOut:{type:Boolean,default:true}}, data:()=>({icons:TOOL_ICONS,actions:[{id:'zoomIn',label:'Zoom in'},{id:'zoomOut',label:'Zoom out'},{id:'fit',label:'Fit to view'},{id:'download',label:'Download plot'}]}) };
</script>
