import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { SC_PROTOCOL, expressionEdges } from './singleCellContext';
import { sitePath } from './api';

export function ExpressionNavigation({ graph, context, onSelect }) {
  const edges = expressionEdges(graph);
  if (!edges.length || !onSelect) return null;
  const index = edges.findIndex(edge => (edge['~id'] || edge.id) === context?.edgeId);
  const move = step => { const next = edges[index < 0 ? 0 : (index + step + edges.length) % edges.length]; onSelect(next['~id'] || next.id); };
  return <Box role="group" aria-label="Expression browser navigation" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
    <Button aria-label="Previous expression browser" disabled={edges.length < 2 && index >= 0} onClick={() => move(-1)} sx={{ minWidth: 28, p: 0.25, color: '#3A838B' }}>‹</Button>
    <Typography aria-live="polite" sx={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>{index < 0 ? 'Choose' : `${index + 1} / ${edges.length}`}</Typography>
    <Button aria-label="Next expression browser" disabled={edges.length < 2 && index >= 0} onClick={() => move(1)} sx={{ minWidth: 28, p: 0.25, color: '#3A838B' }}>›</Button>
  </Box>;
}
export function ExpressionCard({ context, graph, onSelect, minimized, onMinimize, onClose, onOpen }) {
  if (!context) return null;
  return <Box component="section" aria-label="Expression evidence" sx={{ position: 'absolute', right: { xs: 8, sm: 62 }, top: { xs: 'auto', sm: 18 }, bottom: { xs: 82, sm: 'auto' }, left: { xs: 8, sm: 'auto' }, width: { xs: 'auto', sm: 286 }, maxWidth: 'calc(100% - 78px)', maxHeight: 'calc(100% - 90px)', overflow: 'auto', zIndex: 20, bgcolor: '#fff', border: '1px solid #a9ced1', borderRadius: '14px', boxShadow: '0 8px 24px #163e481c' }}>
    <Box sx={{ display: 'flex', alignItems: 'center', px: 1.25, py: 0.5, bgcolor: '#E4F0F1', gap: 0.5 }}>
      <Typography sx={{ flex: 1, fontWeight: 600, fontSize: 11, color: '#28636a' }}>Single cell browser</Typography>
      <Button size="small" sx={{ minWidth: 24, p: 0.25, color: '#3A838B' }} aria-label={minimized ? 'Restore expression card' : 'Minimize expression card'} onClick={() => onMinimize(!minimized)}>{minimized ? '↗' : '−'}</Button>
      <Button size="small" sx={{ minWidth: 24, p: 0.25, color: '#3A838B' }} aria-label="Close expression card" onClick={onClose}>×</Button>
    </Box>
    {!minimized && <>
      {context.available && <Box sx={{ height: 92, position: 'relative', bgcolor: '#fafcfc', borderBottom: '1px solid #e2edef' }}>
        <SingleCellBrowser context={context} isVisible preview />
        <Button aria-label="Open atlas preview in scBrowser" onClick={onOpen} sx={{ position: 'absolute', inset: 0, width: '100%', borderRadius: 0, '&:hover': { bgcolor: '#3a838b08' } }} />
      </Box>}
      <Box sx={{ p: 1.25 }}>
        <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{context.geneSymbol} · {context.cellType}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Typography sx={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#21484f' }}>PanKbase scRNA-seq</Typography><ExpressionNavigation graph={graph} context={context} onSelect={onSelect} /></Box>
        <Typography sx={{ fontSize: 11, color: '#60777d', mt: 0.25 }}>{context.evidenceLabel} · {context.assay}</Typography>
        <Box sx={{ bgcolor: '#f4f8f8', border: '1px solid #e1ebec', borderRadius: '7px', p: 0.8, my: 1 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#3b7075' }}>{context.available ? `PanKbase scRNAseq ${context.release}` : 'Viewer unavailable'}</Typography>
          <Typography sx={{ fontSize: 10, lineHeight: 1.5, color: '#63747b' }}>{context.available ? `Related atlas context${context.edgeDatasetId && context.edgeDatasetId !== context.datasetId ? ` · KG source: ${context.edgeDatasetId}` : ''}` : context.reason}</Typography>
        </Box>
        {context.preview.length > 0 && <Typography sx={{ fontSize: 10, color: '#60777d', mb: 0.5 }}>{context.preview.map(item => `${item.label.replaceAll('_', ' ')}: ${item.value}`).join(' · ')}</Typography>}
        <Button variant="contained" disableElevation fullWidth disabled={!context.available} onClick={onOpen} sx={{ justifyContent: 'space-between', px: 1.5, py: 1.1, fontSize: 12, textTransform: 'none', bgcolor: '#287780', color: '#fff', borderRadius: '7px', fontWeight: 700, '&:hover': { bgcolor: '#1d5e66' } }} aria-label="Open in scBrowser →">Open interactive UMAP <span>→</span></Button>
      </Box>
    </>}
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
      }).catch(() => { if (!cancelled) setStatus('The cell browser could not start. Reload this result or open PanKbase.'); });
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
    const timer = setTimeout(() => { if (!readyRef.current) setStatus('The cell browser could not start. Reload this result or open PanKbase.'); }, 12000);
    return () => clearTimeout(timer);
  }, [started]);
  useEffect(() => { setStatus(''); send(); }, [context]);
  useEffect(() => { if (isVisible) frame.current?.contentWindow?.postMessage({ protocol: SC_PROTOCOL, type: 'resize' }, window.location.origin); }, [isVisible]);
  return <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
    {!preview && (!context ? <Typography sx={{ p: 2 }}>No single-cell browser resource is available for this result.</Typography> : <>
      {!context.available ? <Typography sx={{ p: 2 }}>{context.reason}</Typography> : null}
      <span role="status" style={{ padding: status ? 8 : 0, fontSize: 12 }}>{status}</span>
      {status && context.available && <Button component="a" href={context.browserUrl} target="_blank" rel="noopener noreferrer">Open PanKbase ↗</Button>}
    </>)}
    {started && <iframe ref={frame} title={preview ? "PanKbase atlas preview" : "PanKgraph single-cell browser"} srcDoc={pageHtml || undefined} onLoad={send} style={{ border: 0, width: '100%', flex: 1, minHeight: preview ? 0 : 300, pointerEvents: preview ? 'none' : 'auto', display: context?.available ? 'block' : 'none' }} />}
  </Box>;
}
