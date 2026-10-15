import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export function GraphSlot({ host }) {
  const slot = useRef(null);
  useLayoutEffect(() => { if (host && slot.current) slot.current.appendChild(host); }, [host]);
  return <div ref={slot} style={{ width: '100%', height: '100%' }} />;
}
export function useStableGraphPane(content) {
  const [host] = useState(() => { const node = document.createElement('div'); node.style.cssText = 'width:100%;height:100%'; return node; });
  return { slot: <GraphSlot host={host} />, portal: createPortal(content, host) };
}
