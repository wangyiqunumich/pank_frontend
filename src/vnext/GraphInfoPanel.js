import React, { createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { IconButton } from '@mui/material';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import CloseFullscreenIcon from '@mui/icons-material/CloseFullscreen';
import CloseIcon from '@mui/icons-material/Close';

import cardLayout from '../schema/card_layout_schema.json';

const PanelContext = createContext(null);
export const useGraphInfoPanel = () => useContext(PanelContext);

export function GraphInfoPanelHeader({ children, title, canExpand = false }) {
  const panel = useContext(PanelContext);
  return <div style={{ position: 'sticky', top: 0, zIndex: 2, display: 'flex', alignItems: 'center', gap: 8,
    minHeight: 58, boxSizing: 'border-box', padding: panel?.large ? '10px 78px' : canExpand ? '10px 46px' : '10px 16px', background: '#E4F0F1', borderBottom: '1px solid #d8e6e8' }}>
    <div title={title} data-testid="graph-info-title" style={{ flex: 1, minWidth: 0, display: '-webkit-box',
      WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden', textAlign: 'center',
      overflowWrap: 'anywhere', font: '700 16px/1.35 Open Sans, sans-serif', color: '#263238' }}>{children}</div>
    {panel && (panel.large || canExpand) && <div style={{ position: 'absolute', right: 12, top: 14, display: 'flex', gap: 2 }}>
      <IconButton size="small" title={panel.large ? 'Minimize' : 'Enlarge'}
        aria-label={panel.large ? 'Minimize information panel' : 'Enlarge information panel'}
        onClick={panel.large ? panel.onMinimize : panel.onEnlarge} sx={{ color: '#37646b', width: 30, height: 30 }}>
        {panel.large ? <CloseFullscreenIcon fontSize="small" /> : <OpenInFullIcon fontSize="small" />}
      </IconButton>
      {panel.large && <IconButton size="small" title="Close" aria-label="Close information panel" onClick={panel.onClose}
        sx={{ color: '#37646b', width: 30, height: 30 }}><CloseIcon fontSize="small" /></IconButton>}
    </div>}
  </div>;
}

// Escape the graph/answer stacking contexts; native fullscreen needs its own host.
export function GraphInfoPanelSurface({ children, panelRef, visible, mode, position, review,
  onEnter, onLeave, onEnlarge, onMinimize, onClose }) {
  const large = mode === 'expanded';
  return <section ref={panelRef} aria-label={large ? 'Expanded graph information' : 'Graph information'}
    onMouseEnter={onEnter} onMouseLeave={onLeave}
    style={{ position: 'fixed', zIndex: 2147483000, display: visible ? 'flex' : 'none', flexDirection: 'column',
      left: large ? '50%' : position.x, top: large ? 76 : position.y,
      transform: large ? 'translateX(-50%)' : undefined,
      width: large ? 'min(900px, calc(100vw - 32px))' : review ? 'min(550px, calc(100vw - 24px))' : 'min(280px, calc(100vw - 24px))',
      maxHeight: large ? `min(${cardLayout.height_limits.expanded_px}px, ${cardLayout.height_limits.expanded_vh}dvh, calc(100dvh - 100px))` : `min(${cardLayout.height_limits.compact_px}px, ${cardLayout.height_limits.compact_vh}dvh, calc(100dvh - 24px))`,
      background: '#fff', color: '#333', borderRadius: 12, boxShadow: '0 8px 32px #0003',
      fontFamily: 'Open Sans, sans-serif', overflow: 'hidden', overflowWrap: 'anywhere' }}>
    <PanelContext.Provider value={{ large, onEnlarge, onMinimize, onClose }}>
      <div style={{ overflowY: 'auto', minHeight: 0, overscrollBehavior: 'contain' }}>{children}</div>
    </PanelContext.Provider>
  </section>;
}

export default function GraphInfoPanel({host, ...props}) {
  return createPortal(<GraphInfoPanelSurface {...props} />, host || document.body);
}
