import React, { useRef, useState } from 'react';
import BrowserToolbar from './BrowserToolbar';

export default function BrowserImagePlot({ url, title, fullscreen, onFullscreen }) {
  const [zoom,setZoom]=useState(1), [pan,setPan]=useState({x:0,y:0}), [failed,setFailed]=useState(false);
  const drag=useRef(null);
  const fit=()=>{setZoom(1);setPan({x:0,y:0});};
  const changeZoom=factor=>setZoom(value=>{const next=Math.max(1,Math.min(4,value*factor));if(next===1)setPan({x:0,y:0});return next;});
  const download=()=>{const link=document.createElement('a');link.href=url;link.download='PanKgraph-functional-response.png';link.click();};
  return <div className="browser-image-plot">
    <div className="browser-image-viewport" onPointerDown={e=>{if(e.button!==0||zoom===1)return;drag.current={x:e.clientX,y:e.clientY};e.currentTarget.setPointerCapture(e.pointerId);}} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}} onPointerMove={e=>{if(!drag.current)return;const dx=e.clientX-drag.current.x,dy=e.clientY-drag.current.y;const rect=e.currentTarget.getBoundingClientRect();setPan(p=>({x:Math.max(-rect.width*(zoom-1)/2,Math.min(rect.width*(zoom-1)/2,p.x+dx)),y:Math.max(-rect.height*(zoom-1)/2,Math.min(rect.height*(zoom-1)/2,p.y+dy))}));drag.current={x:e.clientX,y:e.clientY};}}>
      {failed?<p role="alert">The functional plot could not load. <button onClick={()=>setFailed(false)}>Retry</button></p>:<img src={url} alt={title} draggable="false" onError={()=>setFailed(true)} style={{transform:`translate(${pan.x}px,${pan.y}px) scale(${zoom})`}}/>}
    </div>
    <BrowserToolbar fullscreen={fullscreen} onFullscreen={onFullscreen} onZoomIn={()=>changeZoom(1.25)} onZoomOut={()=>changeZoom(0.8)} onFit={fit} onDownload={download} disabled={failed} canZoomIn={zoom<4} canZoomOut={zoom>1}/>
    <span className="image-zoom">{Math.round(zoom*100)}%</span>
  </div>;
}
