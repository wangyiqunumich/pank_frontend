<template><div class="scatter"><canvas ref="canvas" role="img" :aria-label="`${title}: ${xLabel} versus ${yLabel}; ${valid.length} observations`" @mousemove="hover" @mouseleave="tip=''"/><div class="plot-tip" role="status">{{tip}}</div><button @click="download">Download plot</button><p v-if="omitted">{{omitted}} records have missing or non-finite plotting values.</p></div></template>
<script>
import { scaleLinear, extent } from 'd3';
export default {
  props: { rows: Array, xLabel: String, yLabel: String, title: String },
  data: () => ({ tip: '', points: [], width: 700 }),
  computed: { valid() { return (this.rows || []).filter(row => Number.isFinite(row.x) && Number.isFinite(row.y)); }, omitted() { return (this.rows || []).length - this.valid.length; } },
  mounted() { this.observer = new ResizeObserver(() => this.draw()); this.observer.observe(this.$el); this.draw(); },
  beforeDestroy() { this.observer?.disconnect(); },
  watch: { rows() { this.draw(); }, xLabel() { this.draw(); }, yLabel() { this.draw(); } },
  methods: {
    draw() {
      const canvas = this.$refs.canvas; if (!canvas) return;
      const width = Math.max(280, this.$el.clientWidth), height = 390, dpr = window.devicePixelRatio || 1;
      this.width = width; canvas.width = width * dpr; canvas.height = height * dpr; canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
      const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height);
      const domain = key => { const [min,max] = extent(this.valid, row => row[key]); return min === undefined ? [0,1] : min === max ? [min-1,max+1] : [min,max]; };
      const x = scaleLinear().domain(domain('x')).nice().range([64, width-18]);
      const y = scaleLinear().domain(domain('y')).nice().range([height-56, 24]);
      ctx.font = '11px system-ui'; ctx.lineWidth = 1;
      for (const tick of x.ticks(5)) { const px=x(tick); ctx.strokeStyle='#edf2f7'; ctx.beginPath();ctx.moveTo(px,24);ctx.lineTo(px,height-56);ctx.stroke();ctx.fillStyle='#475569';ctx.textAlign='center';ctx.fillText(x.tickFormat(5)(tick),px,height-38); }
      for (const tick of y.ticks(5)) { const py=y(tick);ctx.strokeStyle='#edf2f7';ctx.beginPath();ctx.moveTo(64,py);ctx.lineTo(width-18,py);ctx.stroke();ctx.fillStyle='#475569';ctx.textAlign='right';ctx.fillText(y.tickFormat(5)(tick),57,py+4); }
      this.points = this.valid.map(row => ({...row,px:x(row.x),py:y(row.y)}));
      for (const row of this.points) {ctx.fillStyle=row.color || '#0f827d';ctx.globalAlpha=row.highlight?1:0.65;ctx.beginPath();ctx.arc(row.px,row.py,row.highlight?4:2.2,0,2*Math.PI);ctx.fill();}
      ctx.globalAlpha=1;ctx.fillStyle='#334155';ctx.font='12px system-ui';ctx.textAlign='center';ctx.fillText(this.xLabel,width/2,height-10);ctx.save();ctx.translate(14,height/2);ctx.rotate(-Math.PI/2);ctx.fillText(this.yLabel,0,0);ctx.restore();
    },
    hover(event) { const r=this.$refs.canvas.getBoundingClientRect(), x=event.clientX-r.left,y=event.clientY-r.top;let best=null, distance=64;for(const p of this.points){const d=(p.px-x)**2+(p.py-y)**2;if(d<distance){best=p;distance=d;}} this.tip=best?`${best.label || ''} · ${this.xLabel}: ${best.x} · ${this.yLabel}: ${best.y}`:''; },
    download() { const link=document.createElement('a');link.download=`${this.title || 'plot'}.png`;link.href=this.$refs.canvas.toDataURL('image/png');link.click(); },
  },
};
</script>
