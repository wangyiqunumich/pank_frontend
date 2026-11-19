import React, { createContext, useContext, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconButton } from '@mui/material';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import CloseFullscreenIcon from '@mui/icons-material/CloseFullscreen';
import CloseIcon from '@mui/icons-material/Close';

import {panelSchema,PanelSchemaContext,usePanelSchema} from './evidence/panelSchema';
import './GraphInfoPanel.css';

const PanelContext = createContext(null);
const icons={open_in_full:OpenInFullIcon,close_fullscreen:CloseFullscreenIcon,close:CloseIcon};
function ControlIcon({name}){const Icon=icons[name] || OpenInFullIcon;return <Icon fontSize="small"/>;}
export const useGraphInfoPanel = () => useContext(PanelContext);

export function graphPanelViewport() {
  const viewport = window.visualViewport;
  if (viewport) return { left: viewport.offsetLeft, top: viewport.offsetTop, width: viewport.width, height: viewport.height };
  const root = document.documentElement;
  return { left: 0, top: 0, width: root.clientWidth || window.innerWidth, height: root.clientHeight || window.innerHeight };
}

export function GraphInfoPanelHeader({ children, title, canExpand = false }) {
  const panel = useContext(PanelContext);
  const config=usePanelSchema(); const h=config.header; const controls=h.controls;
  const showActions = panel && (panel.large || canExpand || h.compact_close);
  const padding = panel?.large ? h.expanded_padding_px : showActions ? Math.max(h.compact_padding_px, canExpand && h.compact_close ? 76 : 46) : 16;
  const minHeight = panel?.short ? Math.min(h.min_height_px, 42) : h.min_height_px;
  return <div className="graph-info-panel-header" style={{ position: 'relative', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8,
    minHeight, boxSizing: 'border-box', padding: `${panel?.short ? 4 : 10}px ${padding}px`, background: h.background, borderBottom: '1px solid #d8e6e8' }}>
    <div title={title} data-testid="graph-info-title" style={{ flex: 1, minWidth: 0, display: '-webkit-box',
      WebkitBoxOrient: 'vertical', WebkitLineClamp: h.title_max_lines, overflow: 'hidden', textAlign: h.title_align,
      overflowWrap: 'anywhere', font: '700 16px/1.35 Open Sans, sans-serif', color: '#263238' }}>{children}</div>
    {showActions && <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 2 }}>
      {(panel.large || canExpand) && <IconButton size="small" title={panel.large ? controls.minimize.label : controls.enlarge.label}
        aria-label={panel.large ? controls.minimize.aria_label : controls.enlarge.aria_label}
        onClick={panel.large ? panel.onMinimize : panel.onEnlarge} sx={{ color: '#37646b', width: 30, height: 30 }}>
        <ControlIcon name={panel.large ? controls.minimize.icon : controls.enlarge.icon}/>
      </IconButton>}
      {!panel.large && h.compact_close && <IconButton size="small" title={controls.close.label} aria-label={controls.close.aria_label} onClick={panel.onClose}
        sx={{ color: '#37646b', width: 30, height: 30 }}><ControlIcon name={controls.close.icon}/></IconButton>}
    </div>}
  </div>;
}

export function GraphInfoPanelBody({ children, bodyRef, loading = false }) {
  return <div className="graph-info-panel-body" ref={bodyRef} data-loading={loading || undefined}>{children}</div>;
}

// Escape the graph/answer stacking contexts; native fullscreen needs its own host.
export function GraphInfoPanelSurface({ children, panelRef, visible, mode, position, review, schema,
  onEnter, onLeave, onEnlarge, onMinimize, onClose, label }) {
  const large = mode === 'expanded';
  const config=panelSchema(schema), cardLayout=config.layout, surface=config.surface;
  const [viewport, setViewport] = useState(null);
  useLayoutEffect(() => {
    if (!large || !visible) return undefined;
    const update = () => setViewport(graphPanelViewport());
    const visual = window.visualViewport;
    update();
    visual?.addEventListener('resize', update);
    visual?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      visual?.removeEventListener('resize', update);
      visual?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [large, visible]);
  const room = position.above ? `calc(${position.y}px - 12px)` : `calc(100dvh - ${Math.max(12, position.y)}px - 12px)`;
  const limits = cardLayout.height_limits;
  const expandedTop = viewport ? Math.min(surface.expanded_top_px, Math.max(56, viewport.height * .2)) : surface.expanded_top_px;
  const availableHeight = viewport ? Math.max(0, Math.min(limits.expanded_px, viewport.height * limits.expanded_vh / 100, viewport.height - expandedTop - 12)) : null;
  const expandedHeight = availableHeight === null
    ? `min(${limits.expanded_px}px, ${limits.expanded_vh}dvh, calc(100dvh - ${expandedTop}px - 12px))`
    : `${availableHeight}px`;
  const short = large && availableHeight !== null && availableHeight < 215;
  const compactHeight = position.maxHeight === undefined
    ? `min(${limits.compact_px}px, ${limits.compact_vh}dvh, ${room})`
    : `${position.maxHeight}px`;
  const widthLimit = large ? viewport?.width : position.viewportWidth;
  return <section ref={panelRef} aria-label={label || (large ? 'Expanded graph information' : 'Graph information')} tabIndex={large ? -1 : undefined}
    aria-hidden={!visible} inert={visible ? undefined : ''}
    className={`graph-info-panel${visible ? ' is-visible' : ''}${!large && visible && position.slide ? ' is-sliding' : ''}${short ? ' is-height-constrained' : ''}`}
    onMouseEnter={onEnter} onMouseLeave={onLeave}
    style={{ position: 'fixed', zIndex: 2147483000, display: 'flex', flexDirection: 'column',
      left: large ? viewport ? viewport.left + viewport.width / 2 : '50%' : position.x,
      top: large ? (viewport?.top || 0) + expandedTop : position.y,
      transform: large ? 'translateX(-50%)' : position.above ? 'translateY(-100%)' : undefined,
      width: `min(${large ? surface.expanded_width_px : review ? surface.review_width_px : surface.compact_width_px}px, calc(${widthLimit === undefined ? '100vw' : `${widthLimit}px`} - ${large ? 32 : 24}px))`,
      height: large ? expandedHeight : undefined,
      maxHeight: large ? undefined : compactHeight,
      '--graph-info-panel-height-limit': large ? expandedHeight : compactHeight,
      background: '#fff', color: '#333', borderRadius: surface.border_radius_px, boxShadow: '0 8px 32px #0003',
      fontFamily: 'Open Sans, sans-serif', overflow: 'hidden', overflowWrap: 'anywhere' }}>
    <PanelSchemaContext.Provider value={config}><PanelContext.Provider value={{ large, short, onEnlarge, onMinimize, onClose }}>
      {children}
    </PanelContext.Provider></PanelSchemaContext.Provider>
  </section>;
}

export default function GraphInfoPanel({host, ...props}) {
  return createPortal(<GraphInfoPanelSurface {...props} />, host || document.body);
}
