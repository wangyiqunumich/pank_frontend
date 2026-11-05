import { browserTabIcon } from '../src/vnext/browserTabIcons';
const protocol='pankgraph.pankbase.v1';
const origin=()=>new URL(document.baseURI).origin;
export default {
  data:()=>({fullscreen:false}),
  mounted(){this.onFullscreenState=event=>{if(event.origin===origin()&&event.source===window.parent&&event.data?.protocol===protocol&&event.data.type==='fullscreen-state')this.fullscreen=event.data.fullscreen===true;};window.addEventListener('message',this.onFullscreenState);this.onEscape=e=>{if(e.key==='Escape'&&this.fullscreen){e.preventDefault();this.toggleFullscreen();}};window.addEventListener('keydown',this.onEscape);},
  beforeDestroy(){window.removeEventListener('keydown',this.onEscape);window.removeEventListener('message',this.onFullscreenState);},
  methods:{tabIcon:browserTabIcon,toggleFullscreen(){window.parent.postMessage({protocol,type:'fullscreen-toggle'},origin());}},
};
