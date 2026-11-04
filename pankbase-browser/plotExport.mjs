import { downloadText } from './assets.mjs';
export function downloadHeatmapSvg(rows, color, filename) {
  if (!rows?.length) return;
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
  const width=150+rows[0].expression.length*5,height=30+rows.length*20;
  svg.setAttribute('xmlns',ns);svg.setAttribute('width',width);svg.setAttribute('height',height);
  const add=(tag,attrs,text)=>{const e=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));if(text)e.textContent=text;svg.appendChild(e);};
  add('rect',{width,height,fill:'white'});
  rows.forEach((row,r)=>{add('text',{x:4,y:25+r*20,'font-size':12,'font-family':'sans-serif'},row.gene);row.expression.forEach((v,c)=>add('rect',{x:145+c*5,y:10+r*20,width:5,height:20,fill:color(v)}));});
  downloadText(new XMLSerializer().serializeToString(svg),filename,'image/svg+xml');
}
