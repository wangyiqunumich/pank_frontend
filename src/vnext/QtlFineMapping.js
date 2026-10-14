import React, { useEffect, useState } from 'react';
import { Box, Button, Typography, CircularProgress, Dialog } from '@mui/material';
import { QTL_CONFIG } from './qtlContext';
import { loadQtlPlot } from './qtlPlotApi';
const copy = QTL_CONFIG.wording;
export default function QtlFineMapping({ contexts = [], isVisible }) {
  const [selected, setSelected] = useState('');
  const [loaded, setLoaded] = useState(null);
  const [retry, setRetry] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [started, setStarted] = useState(false);
  const current = contexts.find(context => context.key === selected) || contexts[0];
  const currentKey = current?.key;
  const currentAvailable = current?.available;
  useEffect(() => { if (isVisible !== false) setStarted(true); }, [isVisible]);
  useEffect(() => {
    if (!started || !currentAvailable) return undefined;
    let cancelled = false;
    setLoaded({ key: currentKey, status: 'pending' });
    loadQtlPlot({ key: currentKey, available: currentAvailable }).then(url => { if (!cancelled) setLoaded({ key: currentKey, status: 'available', url }); })
      .catch(() => { if (!cancelled) setLoaded({ key: currentKey, status: 'unavailable' }); });
    return () => { cancelled = true; };
  }, [started, currentKey, currentAvailable, retry]);
  const state = loaded?.key === current?.key ? loaded : null;
  const url = currentAvailable ? state?.url : null;
  return <Box component="section" aria-label={copy.title} sx={{ p: { xs: 1, sm: 2 }, width: '100%', height: '100%', overflow: 'auto' }}>
    <Typography component="h2" sx={{ fontSize: 18, fontWeight: 700 }}>{copy.title}</Typography>
    {contexts.length > 1 && <Box component="label" sx={{ display: 'block', my: 1 }}>{copy.source_picker}<select aria-label={copy.source_picker} value={current?.key || ''} onChange={event => { setSelected(event.target.value); setExpanded(false); }} style={{ display: 'block', width: '100%', padding: 8 }}>
      {contexts.map(context => <option key={context.key} value={context.key}>{context.sourceLabel} · {context.credibleSet || copy.unrecorded_set}</option>)}
    </select></Box>}
    {current && <Typography sx={{ fontSize: 12, mt: 1, overflowWrap: 'anywhere' }}>{current.sourceLabel} · {current.credibleSet}</Typography>}
    {current && <Typography sx={{ fontSize: 12, color: '#64748b' }}>{QTL_CONFIG.context_fields.map(field => current.context[field]).filter(value => typeof value === 'string').filter((value, i, values) => values.indexOf(value) === i).join(' · ')}</Typography>}
    {!current?.available ? <Typography role="status" sx={{ my: 2 }}>{copy[current?.reason] || copy.no_context}</Typography> : state?.status === 'unavailable' ? <Box role="alert" sx={{ my: 2 }}>{copy.failed}<Button onClick={() => setRetry(value => value + 1)}>{copy.retry}</Button></Box> : !url ? <Box role="status" sx={{ minHeight: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}><CircularProgress size={24} />{copy.loading}</Box> : <Button aria-label={copy.expand} onClick={() => setExpanded(true)} sx={{ width: '100%', p: 0, my: 1 }}><Box component="img" src={url} alt={copy.image_alt} sx={{ width: '100%', maxHeight: QTL_CONFIG.plot.max_height, objectFit: 'contain' }} /></Button>}
    <Typography sx={{ fontSize: 13, whiteSpace: 'pre-line', my: 1 }}>{copy.description}</Typography>
    <Typography sx={{ fontSize: 11, color: '#64748b', mb: 1 }}>{copy.provenance}</Typography>
    {current?.downloadUrl && <Button component="a" href={current.downloadUrl} target="_blank" rel="noopener noreferrer" sx={{ bgcolor: '#219197', color: 'white', px: 2, '&:hover': { bgcolor: '#287d84' } }}>{copy.download}</Button>}
    {expanded && url && <Dialog open onClose={() => setExpanded(false)} aria-label={copy.expand} maxWidth={false} PaperProps={{ sx: { maxWidth: '95vw', maxHeight: '95vh' } }}><Box sx={{ position: 'relative', maxWidth: '100%', maxHeight: '100%' }}><Button aria-label={copy.close} onClick={() => setExpanded(false)} sx={{ position: 'absolute', right: 0, top: 0, bgcolor: 'white' }}>×</Button><Box component="img" src={url} alt={copy.image_alt} sx={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', bgcolor: 'white' }} /></Box></Dialog>}
  </Box>;
}
