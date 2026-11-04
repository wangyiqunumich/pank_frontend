import React from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@mui/material';

// Escape the graph/answer stacking contexts; native fullscreen needs its own host.
export default function GraphInfoPanel({ children, panelRef, host, visible, mode, position, review,
  onEnter, onLeave, onEnlarge, onMinimize, onClose }) {
  const large = mode === 'expanded';
  return createPortal(<section ref={panelRef} aria-label={large ? 'Expanded graph information' : 'Graph information'}
    onMouseEnter={onEnter} onMouseLeave={onLeave}
    style={{ position: 'fixed', zIndex: 2147483000, display: visible ? 'flex' : 'none', flexDirection: 'column',
      left: large ? '50%' : position.x, top: large ? 76 : position.y,
      transform: large ? 'translateX(-50%)' : undefined,
      width: large ? 'min(900px, calc(100vw - 32px))' : review ? 'min(550px, calc(100vw - 24px))' : 'min(280px, calc(100vw - 24px))',
      maxHeight: large ? 'calc(100dvh - 100px)' : 'calc(100dvh - 24px)',
      background: '#fff', color: '#333', borderRadius: 12, boxShadow: '0 8px 32px #0003',
      fontFamily: 'Open Sans, sans-serif', overflow: 'hidden', overflowWrap: 'anywhere' }}>
    <div style={{ display: 'flex', flexShrink: 0, justifyContent: 'flex-end', gap: 4, padding: '6px 8px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
      {large ? <Button size="small" onClick={onMinimize} aria-label="Minimize information panel">Minimize</Button>
        : <Button size="small" onClick={onEnlarge} aria-label="Enlarge information panel">Enlarge</Button>}
      <Button size="small" onClick={onClose} aria-label="Close information panel">Close</Button>
    </div>
    <div style={{ overflowY: 'auto', minHeight: 0, overscrollBehavior: 'contain' }}>{children}</div>
  </section>, host || document.body);
}
