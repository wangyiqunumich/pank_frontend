import React, { useLayoutEffect, useRef } from 'react';

// A native modal dialog enters the browser's top layer without moving its DOM.
// Unlike reparenting a portal, this also preserves the iframe browsing context.
// Its closed state remains an ordinary inline graph, with identical children.
export default function PersistentGraphViewport({ children, fullscreen, onExit, label = 'Fullscreen graph viewer' }) {
  const dialog = useRef(null);
  const previousFullscreen = useRef(false);
  useLayoutEffect(() => {
    const element = dialog.current;
    const changed = previousFullscreen.current !== fullscreen;
    previousFullscreen.current = fullscreen;
    const sync = () => {
      if (!element.isConnected) return false;
      if (fullscreen) {
        // Moving the stable graph from the plan slot to the answer slot removes
        // native dialogs from the top layer, even though `open` remains true.
        const modal = typeof element.showModal === 'function';
        if (modal ? element.matches(':modal') : element.open) return false;
        element.setAttribute('autofocus', '');
        if (modal) {
          if (element.open) element.close();
          element.showModal();
        } else element.setAttribute('open', ''); // Non-layout test environments.
        // Do not focus Search and trigger the mobile keyboard on entry.
        element.focus({ preventScroll: true });
        return true;
      }
      if (element.open) {
        element.removeAttribute('autofocus');
        if (element.close) element.close();
        else element.removeAttribute('open');
        return true;
      }
      return false;
    };
    const synchronized = sync();
    // GraphSlot attaches its host in a sibling layout effect. Check once more
    // after that commit so a plan/answer transition cannot strand fullscreen.
    const frame = window.requestAnimationFrame(() => {
      const recovered = sync();
      if (changed || synchronized || recovered) window.dispatchEvent(new Event('resize'));
    });
    return () => window.cancelAnimationFrame(frame);
  });
  useLayoutEffect(() => {
    if (!fullscreen) return undefined;
    const bodyOverflow = document.body.style.overflow;
    const htmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => { document.body.style.overflow = bodyOverflow; document.documentElement.style.overflow = htmlOverflow; };
  }, [fullscreen]);
  return <dialog ref={dialog} role={fullscreen ? 'dialog' : 'presentation'} aria-modal={fullscreen || undefined} aria-label={fullscreen ? label : undefined} tabIndex={-1}
    onCancel={event => { event.preventDefault(); onExit(); }}
    onKeyDown={event => { if (fullscreen && event.key === 'Escape') { event.preventDefault(); onExit(); } }}
    style={{ display: 'block', boxSizing: 'border-box', position: fullscreen ? 'fixed' : 'relative', inset: fullscreen ? 0 : 'auto', width: fullscreen ? '100vw' : '100%', height: fullscreen ? '100dvh' : '100%', minHeight: 0, maxWidth: 'none', maxHeight: 'none', margin: 0, padding: 0, border: 0, background: 'transparent', color: 'inherit', outline: 0 }}>
    {children}
  </dialog>;
}
