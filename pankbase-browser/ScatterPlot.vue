<template><div class="scatter"><div ref="viewport" class="scatter-viewport"><canvas ref="canvas" role="img" :aria-label="`${title}: ${xLabel} versus ${yLabel}; ${valid.length} observations`" @pointerdown="startPan" @pointermove="move" @pointerup="stopPan" @pointercancel="stopPan" @mouseleave="tip=''" @wheel.prevent="zoomBy($event.deltaY<0?1.2:1/1.2)"/></div><div class="plot-tip" role="status">{{tip}}</div><BrowserToolbar :fullscreen="fullscreen" :can-zoom-in="zoom<16" :can-zoom-out="zoom>1" @fullscreen="$emit('fullscreen')" @zoomIn="zoomBy(1.2)" @zoomOut="zoomBy(1/1.2)" :zoom-percent="Math.round(zoom*100)" :info-enabled="infoEnabled" @info="infoEnabled=!infoEnabled;tip=''" @reset="fit();infoEnabled=true" @fit="fit" @download="download"/><p v-if="omitted">{{omitted}} records have missing or non-finite plotting values.</p></div></template>
<script>
import { scaleLinear, extent } from 'd3';
import BrowserToolbar from './BrowserToolbar.vue';
export default {
  components: { BrowserToolbar },
  props: { fullscreen: Boolean, rows: Array, xLabel: String, yLabel: String, title: String },
  data: () => ({ tip: '', infoEnabled:true, points: [], width: 700, zoom:1, offsetX:0, offsetY:0, drag:null }),
  computed: { valid() { return (this.rows || []).filter(row => Number.isFinite(row.x) && Number.isFinite(row.y)); }, omitted() { return (this.rows || []).length - this.valid.length; } },
  mounted() { this.observer = new ResizeObserver(() => this.draw()); this.observer.observe(this.$refs.viewport); this.draw(); },
  beforeDestroy() { this.observer?.disconnect(); },
  watch: { rows() { this.draw(); }, xLabel() { this.fit(); }, yLabel() { this.fit(); } },
  methods: {
    fit() { this.zoom=1; this.offsetX=0; this.offsetY=0; this.draw(); },
    zoomBy(factor) { this.zoom=Math.max(1,Math.min(16,this.zoom*factor)); if(this.zoom===1){this.offsetX=0;this.offsetY=0;} this.draw(); },
    startPan(e) { if(e.button!==0)return;this.drag={x:e.clientX,y:e.clientY};e.target.setPointerCapture(e.pointerId); },
    stopPan() { this.drag=null; },
    move(e) { if(!this.drag)return this.hover(e);this.offsetX-=(e.clientX-this.drag.x)*this.spanX/Math.max(1,this.width-82);this.offsetY+=(e.clientY-this.drag.y)*this.spanY/Math.max(1,this.$refs.viewport.clientHeight-80);this.drag={x:e.clientX,y:e.clientY};this.draw(); },
    draw() {
      const canvas = this.$refs.canvas; if (!canvas) return;
      const width = this.$refs.viewport.clientWidth, height = this.$refs.viewport.clientHeight, dpr = window.devicePixelRatio || 1;
      if (width < 1 || height < 1) return; // Hidden tabs are measured again when shown.
      this.width = width; canvas.width = width * dpr; canvas.height = height * dpr; canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
      const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height);
      const domain = key => { const [min,max] = extent(this.valid, row => row[key]); return min === undefined ? [0,1] : min === max ? [min-1,max+1] : [min,max]; };
      const viewportDomain=(key,offset)=>{const [a,b]=scaleLinear().domain(domain(key)).nice().domain();const half=(b-a)/2/this.zoom;return [(a+b)/2+offset-half,(a+b)/2+offset+half];};
      const xd=viewportDomain('x',this.offsetX),yd=viewportDomain('y',this.offsetY);this.spanX=xd[1]-xd[0];this.spanY=yd[1]-yd[0];
      const x = scaleLinear().domain(xd).range([64, width-18]);
      const y = scaleLinear().domain(yd).range([height-56, 24]);
      ctx.font = '11px system-ui'; ctx.lineWidth = 1;
      for (const tick of x.ticks(5)) { const px=x(tick); ctx.strokeStyle='#edf2f7'; ctx.beginPath();ctx.moveTo(px,24);ctx.lineTo(px,height-56);ctx.stroke();ctx.fillStyle='#475569';ctx.textAlign='center';ctx.fillText(x.tickFormat(5)(tick),px,height-38); }
      for (const tick of y.ticks(5)) { const py=y(tick);ctx.strokeStyle='#edf2f7';ctx.beginPath();ctx.moveTo(64,py);ctx.lineTo(width-18,py);ctx.stroke();ctx.fillStyle='#475569';ctx.textAlign='right';ctx.fillText(y.tickFormat(5)(tick),57,py+4); }
      this.points = this.valid.map(row => ({...row,px:x(row.x),py:y(row.y)}));
      ctx.save();ctx.beginPath();ctx.rect(64,24,width-82,height-80);ctx.clip();
      for (const row of this.points) {ctx.fillStyle=row.color || '#0f827d';ctx.globalAlpha=row.highlight?1:0.65;ctx.beginPath();ctx.arc(row.px,row.py,row.highlight?4:2.2,0,2*Math.PI);ctx.fill();}
      ctx.restore();ctx.globalAlpha=1;ctx.fillStyle='#334155';ctx.font='12px system-ui';ctx.textAlign='center';ctx.fillText(this.xLabel,width/2,height-10);ctx.save();ctx.translate(14,height/2);ctx.rotate(-Math.PI/2);ctx.fillText(this.yLabel,0,0);ctx.restore();
    },
    hover(event) { if(!this.infoEnabled){this.tip='';return;}const r=this.$refs.canvas.getBoundingClientRect(), x=event.clientX-r.left,y=event.clientY-r.top;let best=null, distance=64;for(const p of this.points){const d=(p.px-x)**2+(p.py-y)**2;if(d<distance){best=p;distance=d;}} this.tip=best?`${best.label || ''} · ${this.xLabel}: ${best.x} · ${this.yLabel}: ${best.y}`:''; },
    download() { const link=document.createElement('a');link.download=`${this.title || 'plot'}.png`;link.href=this.$refs.canvas.toDataURL('image/png');link.click(); },
  },
};
</script>
