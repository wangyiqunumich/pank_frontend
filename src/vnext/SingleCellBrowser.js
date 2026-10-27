import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { SC_PROTOCOL } from './singleCellContext';
import { SC_WORDING } from './scBrowserConfig';
import { sitePath } from './api';
import PersistentGraphViewport from '../components/PersistentGraphViewport';

export default function SingleCellBrowser({ context, isVisible, preview = false }) {
  const frame = useRef(null);
  const readyRef = useRef(false);
  const contextRef = useRef(context);
  contextRef.current = context;
  const [started, setStarted] = useState(false);
  const [status, setStatus] = useState('');
  const [pageHtml, setPageHtml] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
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
      if (event.data.type === 'toggle-fullscreen' && !preview) setFullscreen(value => !value);
      if (event.data.type === 'status' && event.data.edgeId === contextRef.current?.edgeId) setStatus(typeof event.data.message === 'string' ? event.data.message.slice(0, 500) : '');
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [preview]);
  useEffect(() => { frame.current?.contentWindow?.postMessage({ protocol: SC_PROTOCOL, type: 'fullscreen-state', fullscreen }, window.location.origin); }, [fullscreen]);
  useEffect(() => {
    if (!started) return undefined;
    const timer = setTimeout(() => { if (!readyRef.current) setStatus(SC_WORDING.start_failed); }, 12000);
    return () => clearTimeout(timer);
  }, [started]);
  useEffect(() => { setStatus(''); send(); }, [context]);
  useEffect(() => { if (isVisible) frame.current?.contentWindow?.postMessage({ protocol: SC_PROTOCOL, type: 'resize' }, window.location.origin); }, [isVisible]);
  return <PersistentGraphViewport fullscreen={fullscreen} label={SC_WORDING.fullscreen_title} onExit={() => setFullscreen(false)}><Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0, bgcolor: '#fff' }}>
    {!preview && (!context ? <Typography sx={{ p: 2 }}>{SC_WORDING.no_resource}</Typography> : <>
      {!context.available ? <Typography sx={{ p: 2 }}>{context.reason}</Typography> : null}
      <span role="status" style={{ padding: status ? 8 : 0, fontSize: 12 }}>{status}</span>
      {status && context.available && <Button component="a" href={context.browserUrl} target="_blank" rel="noopener noreferrer">{SC_WORDING.external_browser}</Button>}
    </>)}
    {started && <iframe ref={frame} title={preview ? "PanKbase atlas preview" : "PanKgraph single-cell browser"} srcDoc={pageHtml || undefined} onLoad={send} style={{ border: 0, width: '100%', flex: 1, minHeight: preview ? 0 : 300, pointerEvents: preview ? 'none' : 'auto', display: context?.available ? 'block' : 'none' }} />}
  </Box></PersistentGraphViewport>;
}
