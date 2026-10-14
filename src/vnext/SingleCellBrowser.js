import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { SC_PROTOCOL, expressionEdges } from './singleCellContext';
import { SC_CONFIG, SC_WORDING } from './scBrowserConfig';
import { sitePath } from './api';

export function ExpressionNavigation({ graph, context, onSelect }) {
  const edges = expressionEdges(graph);
  if (!edges.length || !onSelect) return null;
  const index = edges.findIndex(edge => (edge['~id'] || edge.id) === context?.edgeId);
  const move = step => { const next = edges[index < 0 ? 0 : (index + step + edges.length) % edges.length]; onSelect(next['~id'] || next.id); };
  return <Box role="group" aria-label="Expression browser navigation" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
    <Button aria-label={SC_WORDING.previous_pair} disabled={edges.length < 2 && index >= 0} onClick={() => move(-1)} sx={{ minWidth: 28, p: 0.25, color: '#3A838B' }}>‹</Button>
    <Typography aria-live="polite" sx={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>{index < 0 ? SC_WORDING.choose_pair : `${index + 1} / ${edges.length}`}</Typography>
    <Button aria-label={SC_WORDING.next_pair} disabled={edges.length < 2 && index >= 0} onClick={() => move(1)} sx={{ minWidth: 28, p: 0.25, color: '#3A838B' }}>›</Button>
  </Box>;
}
export function ExpressionCard({ context, minimized, onMinimize, onClose, onOpen }) {
  if (!context?.available) return null;
  return <Box component="section" aria-label="Expression evidence" sx={{ position: 'absolute', right: { xs: 8, sm: 62 }, top: { xs: 'auto', sm: 18 }, bottom: { xs: 82, sm: 'auto' }, left: { xs: 8, sm: 'auto' }, width: { xs: 'auto', sm: 286 }, maxWidth: 'calc(100% - 78px)', maxHeight: 'calc(100% - 90px)', overflow: 'hidden', zIndex: 20, bgcolor: '#fff', border: '1px solid #a9ced1', borderRadius: '14px', boxShadow: '0 8px 24px #163e481c' }}>
    <Box sx={{ display: 'flex', alignItems: 'center', px: 1.25, py: 0.5, bgcolor: '#E4F0F1', gap: 0.5 }}>
      <Typography sx={{ flex: 1, fontWeight: 600, fontSize: 11, color: '#28636a' }}>{SC_WORDING.card_title}</Typography>
      <Button size="small" sx={{ minWidth: 24, p: 0.25, color: '#3A838B' }} aria-label={minimized ? 'Restore expression card' : 'Minimize expression card'} onClick={() => onMinimize(!minimized)}>{minimized ? '↗' : '−'}</Button>
      <Button size="small" sx={{ minWidth: 24, p: 0.25, color: '#3A838B' }} aria-label="Close expression card" onClick={onClose}>×</Button>
    </Box>
    {!minimized && <Box sx={{ height: SC_CONFIG.preview.height + (SC_CONFIG.preview.show_open_hint ? 22 : 0), position: 'relative', bgcolor: '#fafcfc' }}>
      <Box sx={{ height: SC_CONFIG.preview.height }}><SingleCellBrowser context={context} isVisible preview /></Box>
      <Button title={SC_WORDING.preview_open_hint} aria-label="Open in scBrowser →" onClick={onOpen} sx={{ position: 'absolute', inset: 0, width: '100%', borderRadius: 0, '&:hover': { bgcolor: '#3a838b08' } }}>{SC_CONFIG.preview.show_open_hint && <Box component="span" sx={{ position: 'absolute', bottom: 0, height: 22, lineHeight: '22px', width: '100%', borderTop: '1px solid #e4eff0', bgcolor: '#f6fafb', color: '#28636a', fontSize: 10, fontWeight: 600, textTransform: 'none' }}>{SC_WORDING.preview_open_hint}</Box>}</Button>
    </Box>}
    {!minimized && SC_CONFIG.preview.show_metadata && <Box sx={{ p: 1 }}><Typography sx={{ fontSize: 11 }}>{context.geneSymbol} · {context.cellType}</Typography><Typography sx={{ fontSize: 10 }}>{SC_WORDING.atlas_label} · {SC_WORDING.related_context}</Typography></Box>}
  </Box>;
}
export default function SingleCellBrowser({ context, isVisible, graph, onSelect, preview = false }) {
  const frame = useRef(null);
  const readyRef = useRef(false);
  const contextRef = useRef(context);
  contextRef.current = context;
  const [started, setStarted] = useState(false);
  const [status, setStatus] = useState('');
  const [pageHtml, setPageHtml] = useState('');
  const send = () => { const current = contextRef.current; if (current?.available) frame.current?.contentWindow?.postMessage({ protocol: SC_PROTOCOL, type: 'context', context: current }, window.location.origin); };
  useEffect(() => {
    if (context?.available && isVisible) setStarted(true);
  }, [context, isVisible]);
  useEffect(() => {
    if (!started) return undefined;
    let cancelled = false;
    // The host rewrites HTML URLs. Load only our fixed same-origin build manifest.
    Promise.resolve().then(() => fetch(sitePath('/scbrowser/embed.json'), { credentials: 'same-origin' }))
      .then(response => { if (!response.ok) throw new Error('Browser entry is unavailable.'); return response.json(); })
      .then(page => {
        if (page.version !== 1 || typeof page.html !== 'string' || page.html.length > 8000 || !/^<!doctype html/i.test(page.html)) throw new Error('Invalid browser entry.');
        const base = `${window.location.origin}${sitePath('/scbrowser/')}`;
        const html = page.html.replace('<head>', `<head><base href="${base}"><meta name="pankgraph-preview" content="${preview ? '1' : '0'}">`);
        if (!cancelled) setPageHtml(html);
      }).catch(() => { if (!cancelled) setStatus(SC_WORDING.start_failed); });
    return () => { cancelled = true; };
  }, [started, preview]);
  useEffect(() => {
    const receive = event => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow || event.data?.protocol !== SC_PROTOCOL) return;
      if (event.data.type === 'ready') { readyRef.current = true; setStatus(''); send(); }
      if (event.data.type === 'status' && event.data.edgeId === contextRef.current?.edgeId) setStatus(typeof event.data.message === 'string' ? event.data.message.slice(0, 500) : '');
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, []);
  useEffect(() => {
    if (!started) return undefined;
    const timer = setTimeout(() => { if (!readyRef.current) setStatus(SC_WORDING.start_failed); }, 12000);
    return () => clearTimeout(timer);
  }, [started]);
  useEffect(() => { setStatus(''); send(); }, [context]);
  useEffect(() => { if (isVisible) frame.current?.contentWindow?.postMessage({ protocol: SC_PROTOCOL, type: 'resize' }, window.location.origin); }, [isVisible]);
  return <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
    {!preview && <ExpressionNavigation graph={graph} context={context} onSelect={onSelect} />}
    {!preview && (!context ? <Typography sx={{ p: 2 }}>{SC_WORDING.no_resource}</Typography> : <>
      {!context.available ? <Typography sx={{ p: 2 }}>{context.reason}</Typography> : null}
      <span role="status" style={{ padding: status ? 8 : 0, fontSize: 12 }}>{status}</span>
      {status && context.available && <Button component="a" href={context.browserUrl} target="_blank" rel="noopener noreferrer">{SC_WORDING.external_browser}</Button>}
    </>)}
    {started && <iframe ref={frame} title={preview ? "PanKbase atlas preview" : "PanKgraph single-cell browser"} srcDoc={pageHtml || undefined} onLoad={send} style={{ border: 0, width: '100%', flex: 1, minHeight: preview ? 0 : 300, pointerEvents: preview ? 'none' : 'auto', display: context?.available ? 'block' : 'none' }} />}
  </Box>;
}
