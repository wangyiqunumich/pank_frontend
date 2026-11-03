import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import PersistentGraphViewport from '../components/PersistentGraphViewport';
import schema from './schema/result_page_schema.json';
import { pankbaseUrl } from './pankbaseContext';
import { sitePath } from './api';
import { BROWSER_FILL_SX, BROWSER_HEADER_SX, BROWSER_IFRAME_STYLE } from './browserLayout';

const PROTOCOL = 'pankgraph.pankbase.v1';
let entryPromise;
function entry() {
  if (!entryPromise) entryPromise = fetch(sitePath('/pankbase-browser/embed.json'), { credentials: 'same-origin' })
    .then(async response => {
      if (!response.ok) throw new Error('The module could not start.');
      const page = await response.json();
      if (page.version !== 1 || typeof page.html !== 'string' || page.html.length > 8000 || !/^<!doctype html/i.test(page.html)) throw new Error('Invalid module entry.');
      return page.html.replace('<head>', `<head><base href="${window.location.origin}${sitePath('/pankbase-browser/')}">`);
    }).catch(error => { entryPromise = undefined; throw error; });
  return entryPromise;
}

export default function PanKbaseModule({ moduleId, context, preview = false, isVisible = false }) {
  const definition = schema.main_visuals.items[moduleId];
  const frame = useRef(null), current = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [html, setHtml] = useState(''), [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
  const [ready, setReady] = useState(false);
  current.current = { context, moduleId, definition };
  const send = useCallback(() => frame.current?.contentWindow?.postMessage({ protocol: PROTOCOL, type: 'context', ...current.current }, window.location.origin), []);
  useEffect(() => {
    if (preview || !isVisible || html) return undefined;
    let cancelled = false;
    entry().then(value => { if (!cancelled) setHtml(value); }).catch(err => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, [preview, isVisible, html, attempt]);
  useEffect(() => {
    const receive = event => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow || event.data?.protocol !== PROTOCOL) return;
      if (event.data.type === 'ready') { setReady(true); setError(''); send(); }
      if (event.data.type === 'error') setError(String(event.data.message || 'Unable to load this view.').slice(0, 300));
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [send]);
  useEffect(() => { if (ready) send(); }, [context, ready, moduleId, send]);
  useEffect(() => {
    if (!html || ready) return undefined;
    const timer = setTimeout(() => setError('The module did not start. Retry or open PanKbase.'), 15000);
    return () => clearTimeout(timer);
  }, [html, ready]);
  if (preview) return <Box sx={{ p: 1.5 }}>
    <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{context?.geneSymbol || definition.title}</Typography>
    <Typography sx={{ fontSize: 12, color: '#64748b', mt: 1 }}>{context?.cellType || 'Explore the related PanKbase resource'}</Typography>
    <Typography sx={{ fontSize: 11, color: '#64748b', mt: 1 }}>Data loads when you open this view.</Typography>
  </Box>;
  return <PersistentGraphViewport fullscreen={expanded} onExit={() => setExpanded(false)} label={definition.title}><Box sx={{ ...BROWSER_FILL_SX, overflow: 'hidden' }}>
    <Box component="header" sx={BROWSER_HEADER_SX}>
      <Typography sx={{ fontSize: 12, fontWeight: 500, flex: 1 }}>{definition.source_title || definition.title}</Typography>
      <Button component="a" href={pankbaseUrl(moduleId, context)} target="_blank" rel="noopener noreferrer" size="small" sx={{ fontSize: 11, textTransform: 'none', color: '#0f766e' }}>Original resource ↗</Button>
      <Button aria-label={expanded ? 'Exit full screen' : 'Expand view'} title={expanded ? 'Exit full screen' : 'Expand view'} size="small" sx={{ minWidth: 28, color: '#64748b' }} onClick={() => setExpanded(value => !value)}>⛶</Button>
    </Box>
    {!ready && !error && <Typography role="status" sx={{ p: 2 }}>{definition.wording.loading}</Typography>}
    {error && <Box role="alert" sx={{ p: 2 }}>{error} <Button onClick={() => { setError(''); setReady(false); setHtml(''); setAttempt(value => value + 1); }}>Retry</Button></Box>}
    {html && <iframe ref={frame} title={definition.title} srcDoc={html} onLoad={send} style={BROWSER_IFRAME_STYLE} />}
  </Box></PersistentGraphViewport>;
}
