<template><div ref="toolbar" class="graph-toolbar browser-toolbar" :class="{'is-expanded':expanded,'is-short':short}" role="toolbar" aria-label="Visualization controls" aria-orientation="vertical">
  <button class="graph-toolbar-toggle" type="button" :aria-label="expanded?'Collapse graph toolbar':'Expand graph toolbar'" :aria-expanded="expanded" @click="expanded=!expanded"><img aria-hidden="true" :src="icons.compactChevron" alt="" :style="{transform:expanded?'none':'scaleX(-1)'}"/></button>
  <template v-for="group in groups">
    <div v-if="!expanded" :key="group.title+'divider'" class="graph-toolbar-divider"/>
    <div :key="group.title" class="graph-toolbar-section"><h3 v-if="expanded">{{group.title}}</h3>
      <span v-for="action in group.actions" :key="action.id" class="graph-toolbar-action-wrapper">
        <button class="graph-toolbar-action" :class="{'is-active':action.id==='info'&&infoEnabled}" type="button" :aria-label="action.label" :title="expanded?'':action.label" :aria-pressed="action.id==='info'?infoEnabled:undefined" :disabled="inactive(action)" @click="$emit(action.id)">
          <span class="graph-toolbar-icon"><svg v-if="action.id==='fullscreen'&&fullscreen" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path :d="icons.fullscreenExitPath"/></svg><img aria-hidden="true" v-else :src="icons[expanded?action.icon:action.compact]" alt=""/></span>
          <template v-if="expanded"><span class="graph-toolbar-label">{{action.label}}</span><span v-if="action.id==='zoomIn'&&zoomPercent" class="graph-toolbar-zoom">{{zoomPercent}}%</span><span v-if="action.id==='info'" class="graph-toolbar-switch" :class="{'is-on':infoEnabled}" aria-hidden="true"><span/></span><img aria-hidden="true" v-if="action.id==='download'" :src="icons.downloadChevron" alt=""/></template>
        </button>
      </span>
    </div>
  </template>
</div></template>
<script>
import * as icons from '../src/vnext/graphToolbarIcons';
import '../src/vnext/GraphToolbar.css';
import '../src/vnext/browserChrome.css';
export default {
  props:{navigationOnly:Boolean,fullscreen:Boolean,disabled:Boolean,infoEnabled:Boolean,infoLabel:{type:String,default:'Hover info'},zoomPercent:Number,canZoomIn:{type:Boolean,default:true},canZoomOut:{type:Boolean,default:true}},
  data:()=>({icons,expanded:false,short:false}),
  computed: {
    groups() {
      const action=(id,label,icon,compact)=>({id,label,icon,compact});
      const view=[action('fullscreen',this.fullscreen?'Exit full screen':'Open in full screen','fullscreenIcon','compactFullscreen')];
      if(this.navigationOnly)return [{title:'View',actions:view}];
      view.push(action('zoomIn','Zoom in','zoomIn','compactZoomIn'),action('zoomOut','Zoom out','zoomOut','compactZoomOut'),action('fit','Fit to view','fit','compactFit'));
      const info=action('info',this.infoLabel,'hover','compactHover');
      const groups=[{title:'View',actions:view}];
      if(this.expanded)groups.push({title:'Plot',actions:[info]});
      else view.push(info);
      groups.push({title:'Download & reset',actions:[action('download','Download plot','download','compactDownload'),action('reset','Reset view','reset','compactReset')]});
      return groups;
    },
  },
  mounted(){const measure=()=>{const height=this.$el.parentElement.getBoundingClientRect().height;this.short=height>0&&height<420;};this.observer=new ResizeObserver(measure);this.observer.observe(this.$el.parentElement);measure();},
  beforeDestroy(){this.observer?.disconnect();},
  methods:{inactive(action){return action.id!=='fullscreen'&&(this.disabled||!this.$listeners[action.id]||(action.id==='zoomIn'&&!this.canZoomIn)||(action.id==='zoomOut'&&!this.canZoomOut));}}
};
</script>
