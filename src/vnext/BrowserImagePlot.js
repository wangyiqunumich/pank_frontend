import React, { useLayoutEffect, useRef, useState } from 'react';
import BrowserToolbar from './BrowserToolbar';

export function figureSize(width,height) {
  const scale=Math.min(1,1920/width,1200/height);
  return {width:Math.max(360,Math.round(width*scale)),height:Math.max(260,Math.round(height*scale))};
}

export default function BrowserImagePlot({ url, title, fullscreen, onFullscreen }) {
  const stage=useRef(null);
  const [size,setSize]=useState({width:800,height:500}), [failed,setFailed]=useState(false), [retry,setRetry]=useState(0);
  useLayoutEffect(()=>{
    let timer;
    const measure=()=>{clearTimeout(timer);timer=setTimeout(()=>{const el=stage.current;if(el?.clientWidth>0&&el?.clientHeight>0)setSize(figureSize(el.clientWidth,el.clientHeight));},180);};
    const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(measure);
    observer?.observe(stage.current);window.addEventListener('resize',measure);measure();
    return ()=>{clearTimeout(timer);observer?.disconnect();window.removeEventListener('resize',measure);};
  },[]);
  const imageUrl=`${url}&plot_width=${size.width}&plot_height=${size.height}&retry=${retry}`;
  const download=()=>{const link=document.createElement('a');link.href=imageUrl;link.download='PanKgraph-functional-response.png';link.click();};
  return <div ref={stage} className="browser-image-plot browser-native-figure">
    {failed?<p role="alert">The functional plot could not load. <button onClick={()=>{setFailed(false);setRetry(value=>value+1);}}>Retry</button></p>:<img src={imageUrl} alt={title} draggable="false" onError={()=>setFailed(true)}/>}
    <BrowserToolbar visibleActions={['fullscreen','download']} fullscreen={fullscreen} onFullscreen={onFullscreen} onDownload={download} disabled={failed}/>
  </div>;
}
