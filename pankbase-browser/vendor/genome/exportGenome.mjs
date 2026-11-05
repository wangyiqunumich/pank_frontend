import { downloadText } from '../../assets.mjs';
// Export the rendered track geometry, including SVG annotations and canvas
// signal layers. Each track gets its own clip; nothing is reconstructed from data.
export function exportGenome(root,locus) {
  const tracks=[...root.querySelectorAll('.Track')];if(!tracks.length)return;
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
  const width=root.clientWidth,height=tracks.reduce((sum,t)=>sum+t.getBoundingClientRect().height,0)+30;
  svg.setAttribute('xmlns',ns);svg.setAttribute('width',width);svg.setAttribute('height',height);
  const el=(name,attrs,parent=svg)=>{const n=document.createElementNS(ns,name);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));parent.appendChild(n);return n;};
  el('rect',{width,height,fill:'white'});el('text',{x:4,y:17,'font-size':12,'font-family':'sans-serif'}).textContent='GRCh38 · '+locus;
  let y=28;
  tracks.forEach((track,i)=>{
    const box=track.getBoundingClientRect(),g=el('g',{'clip-path':`url(#track-${i})`});
    const clip=el('clipPath',{id:`track-${i}`});el('rect',{x:0,y,width,height:box.height},clip);
    for(const node of track.querySelectorAll('svg,canvas')){
      if(node.tagName.toLowerCase()==='svg'&&node.parentElement.closest('svg'))continue;
      const r=node.getBoundingClientRect();if(!r.width||!r.height)continue;
      if(node.tagName.toLowerCase()==='canvas'){el('image',{x:r.left-box.left,y:y+r.top-box.top,width:r.width,height:r.height,href:node.toDataURL('image/png')},g);continue;}
      const copy=node.cloneNode(true);copy.setAttribute('x',r.left-box.left);copy.setAttribute('y',y+r.top-box.top);copy.setAttribute('width',r.width);copy.setAttribute('height',r.height);
      const originals=[node,...node.querySelectorAll('*')],copies=[copy,...copy.querySelectorAll('*')];
      originals.forEach((n,j)=>{const style=getComputedStyle(n);for(const key of ['fill','stroke','stroke-width','font-family','font-size','font-weight','opacity'])copies[j].style.setProperty(key,style.getPropertyValue(key));});
      g.appendChild(copy);
    }
    for(const label of track.querySelectorAll('.TrackLegend-label,.TrackLegend-chrLabel')){const r=label.getBoundingClientRect();el('text',{x:r.left-box.left+2,y:y+r.top-box.top+11,'font-size':10,'font-family':'sans-serif'},g).textContent=label.textContent;}
    el('line',{x1:0,x2:width,y1:y+box.height,y2:y+box.height,stroke:'#e2e8f0'});y+=box.height;
  });
  downloadText(new XMLSerializer().serializeToString(svg),'GRCh38-'+locus.replace(/[^a-z0-9-]/gi,'_')+'.svg','image/svg+xml');
}
