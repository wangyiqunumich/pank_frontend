import React, { useLayoutEffect, useRef, useState } from 'react';
import { ButtonBase, Tooltip } from '@mui/material';
import { fullscreenExitPath, compactChevron, compactFullscreen, compactZoomIn, compactZoomOut, compactFit, compactHover, compactDownload, compactReset, fullscreenIcon, zoomIn, zoomOut, fit, hover, mode, chevron, download, downloadChevron, reset } from './graphToolbarIcons';
import './GraphToolbar.css';

export default function GraphToolbar({ fullscreen, onFullscreen, zoomPercent, canZoomIn, canZoomOut, onZoomIn, onZoomOut, onFit, hoverEnabled, onHover, onDownload, onReset, modeLabel = 'KG mode', navigationOnly = false, browser = false, infoLabel = 'Hover info', resetLabel = 'Reset graph', downloadLabel = 'Download', disabled = false }) {
  const [expanded, setExpanded] = useState(false);
  const toolbarRef = useRef(null);
  const [short, setShort] = useState(false);
  useLayoutEffect(() => {
    const viewer = toolbarRef.current?.parentElement;
    if (!viewer) return undefined;
    const measure = () => {
      const height = viewer.getBoundingClientRect().height;
      if (height > 0) setShort(height < 420);
    };
    measure();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    observer?.observe(viewer);
    window.addEventListener('resize', measure);
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, []);
  // Native fullscreen dialogs live above body portals; keep tips in that layer.
  const tooltipProps = { placement: 'left', PopperProps: { container: () => toolbarRef.current?.closest('dialog') || document.body } };
  const actions = {
    fullscreen: { label: fullscreen ? 'Exit full screen' : 'Open in full screen', icon: fullscreenIcon, compact: compactFullscreen, onClick: onFullscreen },
    zoomIn: { label: 'Zoom in', icon: zoomIn, compact: compactZoomIn, onClick: onZoomIn, disabled: !canZoomIn, suffix: <span className="graph-toolbar-zoom">{zoomPercent}%</span> },
    zoomOut: { label: 'Zoom out', icon: zoomOut, compact: compactZoomOut, onClick: onZoomOut, disabled: !canZoomOut },
    fit: { label: 'Fit to view', icon: fit, compact: compactFit, onClick: onFit },
    hover: { label: infoLabel, icon: hover, compact: compactHover, onClick: onHover, pressed: hoverEnabled, suffix: <span className={`graph-toolbar-switch${hoverEnabled ? ' is-on' : ''}`} aria-hidden="true"><span /></span> },
    download: { label: downloadLabel, icon: download, compact: compactDownload, onClick: onDownload, suffix: <img aria-hidden="true" src={downloadChevron} alt="" /> },
    reset: { label: resetLabel, icon: reset, compact: compactReset, onClick: onReset },
  };
  const action = key => {
    const item = actions[key];
    return <Tooltip key={key} title={expanded ? '' : item.label} {...tooltipProps}><span className="graph-toolbar-action-wrapper">
      <ButtonBase className={`graph-toolbar-action${item.pressed ? ' is-active' : ''}`} aria-label={item.label} aria-pressed={item.pressed} disabled={item.disabled || (key !== 'fullscreen' && (disabled || !item.onClick))} onClick={item.onClick}>
        <span className="graph-toolbar-icon">{key === 'fullscreen' && fullscreen ? <svg width={expanded ? 14 : 16} height={expanded ? 14 : 16} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={fullscreenExitPath}/></svg> : <img aria-hidden="true" src={expanded ? item.icon : item.compact} alt="" />}</span>
        {expanded && <><span className="graph-toolbar-label">{item.label}</span>{item.suffix}</>}
      </ButtonBase>
    </span></Tooltip>;
  };
  return <div ref={toolbarRef} className={`graph-toolbar${browser ? ' browser-toolbar' : ''}${expanded ? ' is-expanded' : ''}${short ? ' is-short' : ''}`} role="toolbar" aria-label={browser ? 'Visualization controls' : 'Graph controls'} aria-orientation="vertical">
    <ButtonBase className="graph-toolbar-toggle" aria-label={expanded ? 'Collapse graph toolbar' : 'Expand graph toolbar'} aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>
      <img aria-hidden="true" src={compactChevron} alt="" style={{ transform: expanded ? 'none' : 'scaleX(-1)' }} />
    </ButtonBase>
    {expanded ? <>
      <div className="graph-toolbar-section"><h3>View</h3>{(navigationOnly ? ['fullscreen'] : ['fullscreen', 'zoomIn', 'zoomOut', 'fit']).map(action)}</div>
      <div className="graph-toolbar-section" hidden={navigationOnly}><h3>{browser ? 'Plot' : 'Graph'}</h3>{action('hover')}
        {!browser && <Tooltip title="The saved graph determines its presentation mode." {...tooltipProps}><div className="graph-toolbar-mode"><span className="graph-toolbar-icon"><img aria-hidden="true" src={mode} alt="" /></span><span className="graph-toolbar-label">Mode</span><span className="graph-toolbar-mode-value">{modeLabel}</span><img aria-hidden="true" src={chevron} alt="" /></div></Tooltip>}
      </div>
      <div className="graph-toolbar-section" hidden={navigationOnly}><h3>Download &amp; reset</h3>{['download', 'reset'].map(action)}</div>
    </> : <><div className="graph-toolbar-divider" />{(navigationOnly ? ['fullscreen'] : ['fullscreen', 'zoomIn', 'zoomOut', 'fit', 'hover']).map(action)}{!navigationOnly && <><div className="graph-toolbar-divider" />{['download', 'reset'].map(action)}</>}</>}
  </div>;
}
