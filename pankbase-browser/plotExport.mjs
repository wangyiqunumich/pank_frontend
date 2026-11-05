import { downloadText } from './assets.mjs';
export function downloadHeatmapSvg(rows, color, filename, labels) {
  if (!rows?.length || labels?.length!==rows[0].expression.length) return;
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
  const cell=18, left=145, bottom=Math.max(150,...labels.map(label=>label.length*6+20));
  const width=left+labels.length*cell+20,height=65+rows.length*20+bottom;
  svg.setAttribute('xmlns',ns);svg.setAttribute('width',width);svg.setAttribute('height',height);
  const add=(tag,attrs,text)=>{const e=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));if(text)e.textContent=text;svg.appendChild(e);};
  add('rect',{width,height,fill:'white'});
  add('text',{x:4,y:16,'font-size':12,'font-family':'sans-serif'},'Z-normalized expression · Source sample order');
  [-3,0,3].forEach((v,i)=>{add('rect',{x:4+i*45,y:26,width:15,height:12,fill:color(v)});add('text',{x:22+i*45,y:36,'font-size':11},String(v));});
  rows.forEach((row,r)=>{add('text',{x:4,y:62+r*20,'font-size':12,'font-family':'sans-serif'},row.gene);row.expression.forEach((v,c)=>add('rect',{x:left+c*cell,y:48+r*20,width:cell,height:20,fill:color(v)}));});
  labels.forEach((label,c)=>add('text',{transform:`translate(${left+c*cell+4},${54+rows.length*20}) rotate(90)`,'font-size':10,'font-family':'sans-serif'},label));
  add('text',{x:4,y:70+rows.length*20,'font-size':12},'Source samples');
  downloadText(new XMLSerializer().serializeToString(svg),filename,'image/svg+xml');
}
