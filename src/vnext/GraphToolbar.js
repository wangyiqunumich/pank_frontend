import React, { useId, useLayoutEffect, useRef, useState } from 'react';
import { ButtonBase, Menu, MenuItem, Tooltip, Typography } from '@mui/material';
import { fullscreenExitPath, compactChevron, compactFullscreen, compactZoomIn, compactZoomOut, compactFit, compactHover, compactDownload, compactReset, fullscreenIcon, zoomIn, zoomOut, fit, hover, mode, download, downloadChevron, reset } from './graphToolbarIcons';
import './GraphToolbar.css';

export default function GraphToolbar({ fullscreen, onFullscreen, zoomPercent, canZoomIn, canZoomOut, onZoomIn, onZoomOut, onFit, hoverEnabled, onHover, onDownload, onDownloadJson, onDownloadMenuOpen, onReset, modeLabel = 'KG mode', navigationOnly = false, visibleActions = null, browser = false, infoLabel = 'Hover info', resetLabel = 'Reset graph', downloadLabel = 'Download', disabled = false }) {
  const [expanded, setExpanded] = useState(false);
  const [downloadAnchor, setDownloadAnchor] = useState(null);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const downloadMenuId = useId();
  const hasDownloadMenu = !browser && Boolean(onDownloadJson);
  useLayoutEffect(() => { setDownloadAnchor(null); }, [fullscreen, expanded]);
  const runDownload = callback => {
    setDownloadError('');
    const failed = () => setDownloadError('Download failed. Please try again.');
    try {
      const result = callback();
      if (result?.then) {
        setDownloadBusy(true);
        result.then(() => setDownloadAnchor(null), failed).finally(() => setDownloadBusy(false));
      } else setDownloadAnchor(null);
    } catch (_) { failed(); }
  };
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
    fullscreen: { label: fullscreen ? 'Exit full screen' : 'Open in full screen', icon: fullscreenIcon, compact: compactFullscreen, onClick: onFullscreen, pressed: Boolean(fullscreen) },
    zoomIn: { label: 'Zoom in', icon: zoomIn, compact: compactZoomIn, onClick: onZoomIn, disabled: !canZoomIn, suffix: <span className="graph-toolbar-zoom">{zoomPercent}%</span> },
    zoomOut: { label: 'Zoom out', icon: zoomOut, compact: compactZoomOut, onClick: onZoomOut, disabled: !canZoomOut },
    fit: { label: 'Fit to view', icon: fit, compact: compactFit, onClick: onFit },
    hover: { label: infoLabel, icon: hover, compact: compactHover, onClick: onHover, pressed: hoverEnabled, suffix: <span className={`graph-toolbar-switch${hoverEnabled ? ' is-on' : ''}`} aria-hidden="true"><span /></span> },
    download: { label: downloadLabel, icon: download, compact: compactDownload, onClick: hasDownloadMenu ? event => { setDownloadError(''); onDownloadMenuOpen?.(); setDownloadAnchor(event.currentTarget); } : onDownload, suffix: hasDownloadMenu && <img aria-hidden="true" src={downloadChevron} alt="" /> },
    reset: { label: resetLabel, icon: reset, compact: compactReset, onClick: onReset },
  };
  const minimal = visibleActions?.length <= 2;
  const groups = navigationOnly ? [{ title: 'View', keys: ['fullscreen'] }] : [
    { title: 'View', keys: ['fullscreen', 'zoomIn', 'zoomOut', 'fit'] },
    { title: browser ? 'Plot' : 'Graph', keys: ['hover'], showMode: !browser },
    { title: 'Download & reset', keys: ['download', 'reset'] },
  ];
  const action = key => {
    if (visibleActions && !visibleActions.includes(key)) return null;
    const item = actions[key];
    const highlighted = item.pressed && (key !== 'fullscreen' || !expanded);
    return <Tooltip key={key} title={expanded ? '' : item.label} {...tooltipProps}><span className="graph-toolbar-action-wrapper">
      <ButtonBase className={`graph-toolbar-action${key === 'hover' ? ' graph-toolbar-info' : ''}${highlighted ? ' is-active' : ''}`} aria-label={item.label} aria-pressed={item.pressed}
        aria-haspopup={key === 'download' && hasDownloadMenu ? 'menu' : undefined}
        aria-expanded={key === 'download' && hasDownloadMenu ? Boolean(downloadAnchor) : undefined}
        aria-controls={key === 'download' && downloadAnchor ? downloadMenuId : undefined}
        aria-busy={key === 'download' && downloadBusy ? true : undefined}
        disabled={item.disabled || (key !== 'fullscreen' && (disabled || !item.onClick))} onClick={item.onClick}>
        <span className="graph-toolbar-icon">{key === 'fullscreen' && fullscreen ? <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={fullscreenExitPath}/></svg> : <img aria-hidden="true" src={expanded ? item.icon : item.compact} alt="" />}</span>
        {!minimal && <span className="graph-toolbar-details" aria-hidden={!expanded}>
          <span className="graph-toolbar-label">{item.label}</span>{item.suffix}
        </span>}
      </ButtonBase>
    </span></Tooltip>;
  };
  return <div ref={toolbarRef} className={`graph-toolbar${browser ? ' browser-toolbar' : ''}${expanded ? ' is-expanded' : ''}${short ? ' is-short' : ''}${minimal ? ' is-minimal' : ''}`} role="toolbar" aria-label={browser ? 'Visualization controls' : 'Graph controls'} aria-orientation="vertical">
    {!minimal && <div className="graph-toolbar-toggle-slot">
      <ButtonBase className="graph-toolbar-toggle" aria-label={expanded ? 'Collapse graph toolbar' : 'Expand graph toolbar'} aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>
        <img aria-hidden="true" src={compactChevron} alt="" />
      </ButtonBase>
    </div>}
    {minimal ? visibleActions.map(action) : groups.map(({ title, keys, showMode }) => (
      <div className="graph-toolbar-section" key={title}>
        <h3 aria-hidden={!expanded}>{title}</h3>
        {keys.map(action)}
        {showMode && <Tooltip title={expanded ? 'The saved graph determines its presentation mode.' : ''} {...tooltipProps}>
          <div className="graph-toolbar-mode" aria-hidden={!expanded}>
            <span className="graph-toolbar-icon"><img src={mode} alt="" /></span>
            <span className="graph-toolbar-details"><span className="graph-toolbar-label">Mode</span><span className="graph-toolbar-mode-value">{modeLabel}</span></span>
          </div>
        </Tooltip>}
      </div>
    ))}
    {hasDownloadMenu && downloadAnchor && <Menu anchorEl={downloadAnchor} open onClose={() => setDownloadAnchor(null)}
      container={() => { const dialog = toolbarRef.current?.closest('dialog'); return dialog?.open ? dialog : document.body; }}
      anchorOrigin={{ vertical: 'top', horizontal: 'left' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      onKeyDown={event => { if (event.key === 'Escape') event.preventDefault(); }}
      MenuListProps={{ id: downloadMenuId, 'aria-label': 'Graph download formats', dense: true }}
      PaperProps={{ sx: { border: '1px solid #e2e8f0', borderRadius: '8px', minWidth: 160,
        '& .MuiMenuItem-root': { fontSize: 12, minHeight: 32, color: '#334155' } } }} sx={{ zIndex: 2147483002 }}>
      <MenuItem disabled={downloadBusy} onClick={() => runDownload(onDownloadJson)}>Download JSON</MenuItem>
      <MenuItem disabled={!onDownload || downloadBusy} onClick={() => runDownload(onDownload)}>{downloadBusy ? 'Preparing image…' : 'Download image'}</MenuItem>
      {downloadError && <Typography component="li" role="alert" sx={{ listStyle: 'none', px: 2, py: 1, maxWidth: 220, fontSize: 12, color: '#B91C1C' }}>{downloadError}</Typography>}
    </Menu>}
  </div>;
}
