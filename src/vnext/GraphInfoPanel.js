import React, { createContext, useContext, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconButton } from '@mui/material';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import CloseFullscreenIcon from '@mui/icons-material/CloseFullscreen';
import CloseIcon from '@mui/icons-material/Close';

import {bundled,panelSchema,PanelSchemaContext,usePanelSchema} from './evidence/panelSchema';
import './GraphInfoPanel.css';

const PanelContext = createContext(null);
const icons={open_in_full:OpenInFullIcon,close_fullscreen:CloseFullscreenIcon,close:CloseIcon};
function ControlIcon({name}){const Icon=icons[name] || OpenInFullIcon;return <Icon fontSize="small"/>;}
export const useGraphInfoPanel = () => useContext(PanelContext);

export function GraphPanelSymbol({ name }) {
  return <span className="graph-panel-symbol" aria-hidden="true">{name}</span>;
}

export function graphPanelViewport() {
  const viewport = window.visualViewport;
  if (viewport) return { left: viewport.offsetLeft, top: viewport.offsetTop, width: viewport.width, height: viewport.height };
  const root = document.documentElement;
  return { left: 0, top: 0, width: root.clientWidth || window.innerWidth, height: root.clientHeight || window.innerHeight };
}

export function GraphInfoPanelHeader({ children, title, canExpand = false, record = false, recordType }) {
  const panel = useContext(PanelContext);
  const config=usePanelSchema(); const h=config.header; const controls=h.controls;
  const showActions = panel && (panel.large || canExpand || h.compact_close);
  const padding = showActions ? Math.max(h.compact_padding_px, canExpand && h.compact_close ? 76 : 46) : 16;
  const expanded = panel?.large;
  const styled = expanded || record;
  const icon = name => record ? <GraphPanelSymbol name={icons[name] ? name : 'open_in_full'}/> : <ControlIcon name={name}/>;
  return <div className="graph-info-panel-header" data-record={record || undefined} style={styled ? {background: record ? '#e3f0f1' : h.background} : {
    position: 'relative', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8,
    minHeight: h.min_height_px, boxSizing: 'border-box', padding: `10px ${padding}px`, background: h.background, borderBottom: '1px solid #d8e6e8' }}>
    <div className="graph-info-panel-heading">
      {recordType && <div className="graph-info-panel-record-type">{recordType}</div>}
      <div className="graph-info-panel-title" title={title} data-testid="graph-info-title"
        role={expanded ? 'heading' : undefined} aria-level={expanded ? 2 : undefined}
        style={{ minWidth: 0, display: '-webkit-box', WebkitBoxOrient: 'vertical',
          WebkitLineClamp: panel?.short ? 1 : h.title_max_lines,
          textAlign: expanded ? h.expanded_title_align ?? 'start' : record ? 'start' : h.title_align,
          overflow: 'hidden', overflowWrap: 'anywhere', ...(!styled && {font: '700 16px/1.35 Open Sans, sans-serif', color: '#263238'}) }}>{children}</div>
    </div>
    {showActions && <div className="graph-info-panel-actions"
      style={styled ? undefined : { position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 2 }}>
      {(panel.large || canExpand) && <IconButton size="small" title={panel.large ? controls.minimize.label : controls.enlarge.label}
        aria-label={panel.large ? controls.minimize.aria_label : controls.enlarge.aria_label}
        onClick={panel.large ? panel.onMinimize : panel.onEnlarge}
        sx={styled ? undefined : { color: '#37646b', width: 30, height: 30 }}>
        {icon(panel.large ? controls.minimize.icon : controls.enlarge.icon)}
      </IconButton>}
      {!panel.large && h.compact_close && <IconButton size="small" title={controls.close.label} aria-label={controls.close.aria_label} onClick={panel.onClose}
        sx={styled ? undefined : { color: '#37646b', width: 30, height: 30 }}>{icon(controls.close.icon)}</IconButton>}
    </div>}
  </div>;
}

export function GraphInfoPanelBody({ children, loading = false, ...props }) {
  const panel = useGraphInfoPanel();
  return <div {...props} className="graph-info-panel-body" data-loading={loading || undefined}>
    {panel?.large ? <div className="graph-info-panel-content">{children}</div> : children}
  </div>;
}

function useExpandedPanelHeight(panelRef, enabled) {
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!enabled || !panel || typeof ResizeObserver === 'undefined') return undefined;
    const property = '--graph-info-panel-content-height';
    let parts = [];

    const measure = () => {
      const previous = panel.style.getPropertyValue(property);
      // Hold the current height while a newly selected tab loads its records.
      if (!parts.length || (previous && panel.querySelector('[data-loading]'))) return;
      const borders = panel.offsetHeight - panel.clientHeight;
      const height = parts.reduce((sum, part) => sum + part.getBoundingClientRect().height, borders);
      const next = `${Math.ceil(height)}px`;
      if (next !== previous) panel.style.setProperty(property, next);
    };

    const sizes = new ResizeObserver(measure);
    const updateParts = () => {
      // Observe the natural content, not the scrolling body's animated height.
      const next = Array.from(panel.children).filter(child => !child.hidden).map(child =>
        child.classList.contains('graph-info-panel-body') ? child.firstElementChild : child).filter(Boolean);
      if (next.length !== parts.length || next.some((part, index) => part !== parts[index])) {
        sizes.disconnect();
        for (const part of next) sizes.observe(part);
        parts = next;
      }
      measure();
    };
    const content = new MutationObserver(updateParts);
    content.observe(panel, {childList: true, subtree: true, attributes: true, attributeFilter: ['data-loading']});
    updateParts();
    return () => {
      content.disconnect();
      sizes.disconnect();
      panel.style.removeProperty(property);
    };
  }, [panelRef, enabled]);
}

// Escape the graph/answer stacking contexts; native fullscreen needs its own host.
export function GraphInfoPanelSurface({ children, panelRef, visible, staging = false, mode, position, review, schema,
  onEnter, onLeave, onEnlarge, onMinimize, onClose, label }) {
  const large = mode === 'expanded';
  const config=panelSchema(schema), cardLayout=config.layout, surface=config.surface;
  const surfaceRef = useRef(null);
  useImperativeHandle(panelRef, () => surfaceRef.current, []);
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
  useExpandedPanelHeight(surfaceRef, large && visible);
  const room = position.above ? `calc(${position.y}px - 12px)` : `calc(100dvh - ${Math.max(12, position.y)}px - 12px)`;
  const limits = cardLayout.height_limits;
  const frame = surface.expanded_frame || bundled.surface.expanded_frame;
  const maxWidth = frame?.max_width_px ?? surface.expanded_width_px;
  const maxHeight = frame?.max_height_px ?? limits.expanded_px;
  const margin = viewport && viewport.width <= 600 ? 10 : 24;
  const bottomGap = viewport && viewport.height <= 400 ? 8 : margin;
  const topGap = viewport ? Math.min(surface.expanded_top_px, Math.max(56, viewport.height * .2)) : surface.expanded_top_px;
  const availableHeight = viewport ? Math.max(0, Math.min(maxHeight, viewport.height * limits.expanded_vh / 100, viewport.height - topGap - bottomGap)) : null;
  const expandedHeight = availableHeight === null
    ? `min(${maxHeight}px, ${limits.expanded_vh}dvh, calc(100dvh - ${topGap}px - ${bottomGap}px))`
    : `${availableHeight}px`;
  const short = large && availableHeight !== null && availableHeight < 260;
  const compactHeight = position.maxHeight === undefined
    ? `min(${limits.compact_px}px, ${limits.compact_vh}dvh, ${room})`
    : `${position.maxHeight}px`;
  const widthLimit = large ? viewport?.width : position.viewportWidth;
  const availableWidth = `calc(${widthLimit === undefined ? '100vw' : `${widthLimit}px`} - ${large ? margin * 2 : 24}px)`;
  const panelWidth = `min(${large ? maxWidth : review ? surface.review_width_px : surface.compact_width_px}px, ${availableWidth})`;
  return <section ref={surfaceRef} aria-label={label || (large ? 'Expanded graph information' : 'Graph information')} tabIndex={large ? -1 : undefined}
    aria-hidden={!visible} inert={visible ? undefined : ''}
    className={`graph-info-panel${large ? ' graph-info-panel--expanded' : ''}${visible ? ' is-visible' : ''}${staging ? ' is-staging' : ''}${!large && visible && position.slide ? ' is-sliding' : ''}${short ? ' is-height-constrained' : ''}`}
    onMouseEnter={onEnter} onMouseLeave={onLeave}
    style={{ position: 'fixed', zIndex: 2147483000, display: 'flex', flexDirection: 'column',
      left: large ? viewport ? viewport.left + viewport.width / 2 : '50%' : position.x,
      top: large ? viewport ? viewport.top + viewport.height / 2 : '50%' : position.y,
      transform: large ? 'translate(-50%, -50%)' : position.above ? 'translateY(-100%)' : undefined,
      width: large ? undefined : 'var(--graph-info-panel-compact-width, var(--graph-info-panel-width))',
      '--graph-info-panel-width': panelWidth,
      '--graph-info-panel-available-width': availableWidth,
      maxHeight: large ? undefined : compactHeight,
      '--graph-info-panel-height-limit': large ? expandedHeight : compactHeight,
      background: '#fff', color: '#333', borderRadius: `var(--graph-info-panel-radius, ${surface.border_radius_px}px)`,
      boxShadow: large ? undefined : 'var(--graph-info-panel-compact-shadow, 0 8px 32px #0003)',
      fontFamily: 'Open Sans, sans-serif', overflow: 'hidden', overflowWrap: 'anywhere' }}>
    <PanelSchemaContext.Provider value={config}><PanelContext.Provider value={{ large, short, onEnlarge, onMinimize, onClose }}>
      {children}
    </PanelContext.Provider></PanelSchemaContext.Provider>
  </section>;
}

export default function GraphInfoPanel({host, ...props}) {
  return createPortal(<GraphInfoPanelSurface {...props} />, host || document.body);
}
