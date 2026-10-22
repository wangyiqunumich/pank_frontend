import React, { useLayoutEffect, useRef } from 'react';

// A native modal dialog enters the browser's top layer without moving its DOM.
// Unlike reparenting a portal, this also preserves the iframe browsing context.
// Its closed state remains an ordinary inline graph, with identical children.
export default function PersistentGraphViewport({ children, fullscreen, onExit }) {
  const dialog = useRef(null);
  useLayoutEffect(() => {
    const element = dialog.current;
    if (fullscreen) {
      if (element.showModal) element.showModal();
      else element.setAttribute('open', ''); // Non-layout test environments.
    } else if (element.open) {
      if (element.close) element.close();
      else element.removeAttribute('open');
    }
    const frame = window.requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
    return () => window.cancelAnimationFrame(frame);
  }, [fullscreen]);
  useLayoutEffect(() => {
    if (!fullscreen) return undefined;
    const bodyOverflow = document.body.style.overflow;
    const htmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => { document.body.style.overflow = bodyOverflow; document.documentElement.style.overflow = htmlOverflow; };
  }, [fullscreen]);
  return <dialog ref={dialog} role={fullscreen ? 'dialog' : 'presentation'} aria-modal={fullscreen || undefined} aria-label={fullscreen ? 'Fullscreen graph viewer' : undefined} tabIndex={-1}
    onCancel={event => { event.preventDefault(); onExit(); }}
    onKeyDown={event => { if (fullscreen && event.key === 'Escape') { event.preventDefault(); onExit(); } }}
    style={{ display: 'block', boxSizing: 'border-box', position: fullscreen ? 'fixed' : 'relative', inset: fullscreen ? 0 : 'auto', width: fullscreen ? '100vw' : '100%', height: fullscreen ? '100dvh' : '100%', minHeight: 0, maxWidth: 'none', maxHeight: 'none', margin: 0, padding: 0, border: 0, background: 'transparent', color: 'inherit', outline: 0 }}>
    {children}
  </dialog>;
}
