import React from 'react';
import { TOOL_ICONS } from './browserChrome';
import './browserChrome.css';
export default function BrowserToolbar({ navigationOnly=false, fullscreen, onFullscreen, onZoomIn, onZoomOut, onFit, onDownload, disabled=false, canZoomIn=true, canZoomOut=true }) {
  const actions=[['fullscreen',fullscreen?'Exit full screen':'Open in full screen',onFullscreen,false],['zoomIn','Zoom in',onZoomIn,disabled||!canZoomIn],['zoomOut','Zoom out',onZoomOut,disabled||!canZoomOut],['fit','Fit to view',onFit,disabled],['download','Download plot',onDownload,disabled]];
  return <div className="browser-toolbar" role="toolbar" aria-label="Visualization controls">{actions.filter((_,i)=>!navigationOnly||i===0).map(([id,label,action,inactive])=><button key={id} type="button" aria-label={label} title={label} onClick={action} disabled={inactive}><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={TOOL_ICONS[id]}/></svg></button>)}</div>;
}
