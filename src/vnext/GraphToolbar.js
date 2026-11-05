import React, { useId, useLayoutEffect, useRef, useState } from 'react';
import { ButtonBase, Menu, MenuItem, Tooltip } from '@mui/material';
import { fullscreenExitPath, compactChevron, compactFullscreen, compactZoomIn, compactZoomOut, compactFit, compactHover, compactDownload, compactReset, fullscreenIcon, zoomIn, zoomOut, fit, hover, mode, chevron, download, downloadChevron, reset } from './graphToolbarIcons';
import './GraphToolbar.css';

export default function GraphToolbar({ fullscreen, onFullscreen, zoomPercent, canZoomIn, canZoomOut, onZoomIn, onZoomOut, onFit, hoverEnabled, onHover, onDownload, onDownloadJson, onReset, modeLabel = 'KG mode', navigationOnly = false, visibleActions = null, browser = false, infoLabel = 'Hover info', resetLabel = 'Reset graph', downloadLabel = 'Download', disabled = false }) {
  const [expanded, setExpanded] = useState(false);
  const [downloadAnchor, setDownloadAnchor] = useState(null);
  const downloadMenuId = useId();
  const hasDownloadMenu = !browser && Boolean(onDownloadJson);
  useLayoutEffect(() => { setDownloadAnchor(null); }, [fullscreen]);
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
    download: { label: downloadLabel, icon: download, compact: compactDownload, onClick: hasDownloadMenu ? event => setDownloadAnchor(event.currentTarget) : onDownload, suffix: <img aria-hidden="true" src={downloadChevron} alt="" /> },
    reset: { label: resetLabel, icon: reset, compact: compactReset, onClick: onReset },
  };
  const minimal = visibleActions?.length <= 2;
  const action = key => {
    if (visibleActions && !visibleActions.includes(key)) return null;
    const item = actions[key];
    return <Tooltip key={key} title={expanded ? '' : item.label} {...tooltipProps}><span className="graph-toolbar-action-wrapper">
      <ButtonBase className={`graph-toolbar-action${item.pressed ? ' is-active' : ''}`} aria-label={item.label} aria-pressed={item.pressed}
        aria-haspopup={key === 'download' && hasDownloadMenu ? 'menu' : undefined}
        aria-expanded={key === 'download' && hasDownloadMenu ? Boolean(downloadAnchor) : undefined}
        aria-controls={key === 'download' && downloadAnchor ? downloadMenuId : undefined}
        disabled={item.disabled || (key !== 'fullscreen' && (disabled || !item.onClick))} onClick={item.onClick}>
        <span className="graph-toolbar-icon">{key === 'fullscreen' && fullscreen ? <svg width={expanded ? 14 : 16} height={expanded ? 14 : 16} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={fullscreenExitPath}/></svg> : <img aria-hidden="true" src={expanded ? item.icon : item.compact} alt="" />}</span>
        {expanded && <><span className="graph-toolbar-label">{item.label}</span>{item.suffix}</>}
      </ButtonBase>
    </span></Tooltip>;
  };
  return <div ref={toolbarRef} className={`graph-toolbar${browser ? ' browser-toolbar' : ''}${expanded ? ' is-expanded' : ''}${short ? ' is-short' : ''}${minimal ? ' is-minimal' : ''}`} role="toolbar" aria-label={browser ? 'Visualization controls' : 'Graph controls'} aria-orientation="vertical">
    {!minimal && <ButtonBase className="graph-toolbar-toggle" aria-label={expanded ? 'Collapse graph toolbar' : 'Expand graph toolbar'} aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>
      <img aria-hidden="true" src={compactChevron} alt="" style={{ transform: expanded ? 'none' : 'scaleX(-1)' }} />
    </ButtonBase>}
    {minimal ? visibleActions.map(action) : expanded ? <>
      <div className="graph-toolbar-section"><h3>View</h3>{(navigationOnly ? ['fullscreen'] : ['fullscreen', 'zoomIn', 'zoomOut', 'fit']).map(action)}</div>
      <div className="graph-toolbar-section" hidden={navigationOnly}><h3>{browser ? 'Plot' : 'Graph'}</h3>{action('hover')}
        {!browser && <Tooltip title="The saved graph determines its presentation mode." {...tooltipProps}><div className="graph-toolbar-mode"><span className="graph-toolbar-icon"><img aria-hidden="true" src={mode} alt="" /></span><span className="graph-toolbar-label">Mode</span><span className="graph-toolbar-mode-value">{modeLabel}</span><img aria-hidden="true" src={chevron} alt="" /></div></Tooltip>}
      </div>
      <div className="graph-toolbar-section" hidden={navigationOnly}><h3>Download &amp; reset</h3>{['download', 'reset'].map(action)}</div>
    </> : <><div className="graph-toolbar-divider" />{(navigationOnly ? ['fullscreen'] : ['fullscreen', 'zoomIn', 'zoomOut', 'fit', 'hover']).map(action)}{!navigationOnly && <><div className="graph-toolbar-divider" />{['download', 'reset'].map(action)}</>}</>}
    {hasDownloadMenu && downloadAnchor && <Menu anchorEl={downloadAnchor} open onClose={() => setDownloadAnchor(null)}
      container={() => { const dialog = toolbarRef.current?.closest('dialog'); return dialog?.open ? dialog : document.body; }}
      anchorOrigin={{ vertical: 'top', horizontal: 'left' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      onKeyDown={event => { if (event.key === 'Escape') event.preventDefault(); }}
      MenuListProps={{ id: downloadMenuId, 'aria-label': 'Graph download formats', dense: true }}
      PaperProps={{ sx: { border: '1px solid #e2e8f0', borderRadius: '8px', minWidth: 160,
        '& .MuiMenuItem-root': { fontSize: 12, minHeight: 32, color: '#334155' } } }} sx={{ zIndex: 1400 }}>
      <MenuItem onClick={() => { setDownloadAnchor(null); onDownloadJson(); }}>Download JSON</MenuItem>
      <MenuItem disabled={!onDownload} onClick={() => { setDownloadAnchor(null); onDownload(); }}>Download image</MenuItem>
    </Menu>}
  </div>;
}
