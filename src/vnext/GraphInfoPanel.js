import React, { createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { IconButton } from '@mui/material';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import CloseFullscreenIcon from '@mui/icons-material/CloseFullscreen';
import CloseIcon from '@mui/icons-material/Close';

import {panelSchema,PanelSchemaContext,usePanelSchema} from './evidence/panelSchema';

const PanelContext = createContext(null);
const icons={open_in_full:OpenInFullIcon,close_fullscreen:CloseFullscreenIcon,close:CloseIcon};
function ControlIcon({name}){const Icon=icons[name] || OpenInFullIcon;return <Icon fontSize="small"/>;}
export const useGraphInfoPanel = () => useContext(PanelContext);

export function GraphInfoPanelHeader({ children, title, canExpand = false }) {
  const panel = useContext(PanelContext);
  const config=usePanelSchema(); const h=config.header; const controls=h.controls;
  return <div style={{ position: 'sticky', top: 0, zIndex: 2, display: 'flex', alignItems: 'center', gap: 8,
    minHeight: h.min_height_px, boxSizing: 'border-box', padding: `10px ${panel?.large ? h.expanded_padding_px : canExpand ? h.compact_padding_px : 16}px`, background: h.background, borderBottom: '1px solid #d8e6e8' }}>
    <div title={title} data-testid="graph-info-title" style={{ flex: 1, minWidth: 0, display: '-webkit-box',
      WebkitBoxOrient: 'vertical', WebkitLineClamp: h.title_max_lines, overflow: 'hidden', textAlign: h.title_align,
      overflowWrap: 'anywhere', font: '700 16px/1.35 Open Sans, sans-serif', color: '#263238' }}>{children}</div>
    {panel && (panel.large || canExpand || h.compact_close) && <div style={{ position: 'absolute', right: 12, top: 14, display: 'flex', gap: 2 }}>
      <IconButton size="small" title={panel.large ? controls.minimize.label : controls.enlarge.label}
        aria-label={panel.large ? controls.minimize.aria_label : controls.enlarge.aria_label}
        onClick={panel.large ? panel.onMinimize : panel.onEnlarge} sx={{ color: '#37646b', width: 30, height: 30 }}>
        <ControlIcon name={panel.large ? controls.minimize.icon : controls.enlarge.icon}/>
      </IconButton>
      {(panel.large || h.compact_close) && <IconButton size="small" title={controls.close.label} aria-label={controls.close.aria_label} onClick={panel.onClose}
        sx={{ color: '#37646b', width: 30, height: 30 }}><ControlIcon name={controls.close.icon}/></IconButton>}
    </div>}
  </div>;
}

// Escape the graph/answer stacking contexts; native fullscreen needs its own host.
export function GraphInfoPanelSurface({ children, panelRef, visible, mode, position, review, schema,
  onEnter, onLeave, onEnlarge, onMinimize, onClose }) {
  const large = mode === 'expanded';
  const config=panelSchema(schema), cardLayout=config.layout, surface=config.surface;
  return <section ref={panelRef} aria-label={large ? 'Expanded graph information' : 'Graph information'}
    onMouseEnter={onEnter} onMouseLeave={onLeave}
    style={{ position: 'fixed', zIndex: 2147483000, display: visible ? 'flex' : 'none', flexDirection: 'column',
      left: large ? '50%' : position.x, top: large ? surface.expanded_top_px : position.y,
      transform: large ? 'translateX(-50%)' : undefined,
      width: `min(${large ? surface.expanded_width_px : review ? surface.review_width_px : surface.compact_width_px}px, calc(100vw - ${large ? 32 : 24}px))`,
      maxHeight: large ? `min(${cardLayout.height_limits.expanded_px}px, ${cardLayout.height_limits.expanded_vh}dvh, calc(100dvh - 100px))` : `min(${cardLayout.height_limits.compact_px}px, ${cardLayout.height_limits.compact_vh}dvh, calc(100dvh - 24px))`,
      background: '#fff', color: '#333', borderRadius: surface.border_radius_px, boxShadow: '0 8px 32px #0003',
      fontFamily: 'Open Sans, sans-serif', overflow: 'hidden', overflowWrap: 'anywhere' }}>
    <PanelSchemaContext.Provider value={config}><PanelContext.Provider value={{ large, onEnlarge, onMinimize, onClose }}>
      <div style={{ overflowY: 'auto', minHeight: 0, overscrollBehavior: 'contain' }}>{children}</div>
    </PanelContext.Provider></PanelSchemaContext.Provider>
  </section>;
}

export default function GraphInfoPanel({host, ...props}) {
  return createPortal(<GraphInfoPanelSurface {...props} />, host || document.body);
}
