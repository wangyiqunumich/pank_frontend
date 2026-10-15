import React, { useEffect, useState } from 'react';
import { Box, Button, Typography, CircularProgress, Dialog } from '@mui/material';
import { QTL_CONFIG } from './qtlContext';
import { loadQtlPlot } from './qtlPlotApi';
const copy = QTL_CONFIG.wording;
export default function QtlFineMapping({ contexts = [], isVisible, preview = false }) {
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
  const setNumber = /credibleSet(\d+)$/i.exec(current?.credibleSet || '')?.[1];
  const shortSet = setNumber ? copy.set_number.replace('{number}', setNumber) : copy.credible_set_label;
  const metadata = QTL_CONFIG.context_fields.map(field => current?.context?.[field]).filter(value => typeof value === 'string').filter((value, i, values) => values.indexOf(value) === i).join(' · ');
  const plot = !current?.available ? <Typography role="status" sx={{ p: 2, fontSize: 12 }}>{copy[current?.reason] || copy.no_context}</Typography>
    : state?.status === 'unavailable' ? <Box role="alert" sx={{ p: 2, fontSize: 12 }}>{copy.failed}<Button onClick={() => setRetry(value => value + 1)}>{copy.retry}</Button></Box>
    : !url ? <Box role="status" sx={{ minHeight: preview ? 100 : 200, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, fontSize: 12 }}><CircularProgress size={20} />{copy.loading}</Box>
    : <Box component="img" src={url} alt={copy.image_alt} onError={() => setLoaded({ key: currentKey, status: 'unavailable' })} sx={{ width: '100%', height: '100%', maxHeight: preview ? '100%' : QTL_CONFIG.plot.max_height, objectFit: 'contain', bgcolor: '#fff' }} />;
  if (preview) return <Box sx={{ width: '100%', height: '100%', p: 0.5, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>{plot}</Box>;
  return <Box component="section" aria-label={copy.title} sx={{ p: { xs: 1, sm: 1.5 }, width: '100%', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 1, overflow: 'auto', minWidth: 0 }}>
    <Box sx={{ borderBottom: '1px solid #dce8e9', pb: 1 }}>
      <Typography component="h2" sx={{ fontSize: 16, fontWeight: 700, color: '#244a51' }}>{copy.title}</Typography>
      <Typography sx={{ fontSize: 13, mt: 0.5, fontWeight: 600 }}>{[current?.geneLabel || copy.gene_fallback, current?.sourceLabel, shortSet].filter(Boolean).join(' · ')}</Typography>
      {metadata && <Typography sx={{ fontSize: 11, color: '#64748b', mt: 0.25 }}>{metadata}</Typography>}
    </Box>
    {contexts.length > 1 && <Box component="label" sx={{ display: 'block', fontSize: 11, color: '#526d77' }}>{copy.source_picker}<select aria-label={copy.source_picker} value={current?.key || ''} onChange={event => { setSelected(event.target.value); setExpanded(false); }} style={{ display: 'block', width: '100%', padding: 6, marginTop: 4, border: '1px solid #c6dadd', borderRadius: 6, background: 'white' }}>
      {contexts.map(context => <option key={context.key} value={context.key}>{[context.geneLabel, context.sourceLabel, context.credibleSet || copy.unrecorded_set].filter(Boolean).join(' · ')}</option>)}
    </select></Box>}
    {url ? <Button aria-label={copy.expand} onClick={() => setExpanded(true)} sx={{ width: '100%', p: 0.5, flex: '1 1 220px', minHeight: 180, overflow: 'hidden', bgcolor: '#fff', border: '1px solid #edf1f2', borderRadius: 1 }}>{plot}</Button> : plot}
    <Typography sx={{ fontSize: 12, color: '#526d77', lineHeight: 1.5 }}>{copy.description}</Typography>
    <Box component="details" sx={{ fontSize: 11, color: '#64748b', '& summary': { cursor: 'pointer', color: '#357b83', fontWeight: 600 }, '& p': { my: 0.75 } }}>
      <summary>{copy.details}</summary>
      <Typography sx={{ fontSize: 'inherit', overflowWrap: 'anywhere' }}>{copy.credible_set_label}: {current?.credibleSet || copy.unrecorded_set}</Typography>
      <Typography sx={{ fontSize: 'inherit' }}>{copy.legend}</Typography>
      <Typography sx={{ fontSize: 'inherit' }}>{copy.provenance}</Typography>
    </Box>
    {current?.downloadUrl && <Button component="a" href={current.downloadUrl} target="_blank" rel="noopener noreferrer" sx={{ alignSelf: 'flex-start', fontSize: 12, color: '#287d84', p: 0, textTransform: 'none' }}>{copy.download}</Button>}
    {expanded && url && <Dialog open onClose={() => setExpanded(false)} aria-label={copy.expand} maxWidth={false} PaperProps={{ sx: { maxWidth: '95vw', maxHeight: '95vh' } }}><Box sx={{ position: 'relative', maxWidth: '100%', maxHeight: '100%' }}><Button aria-label={copy.close} onClick={() => setExpanded(false)} sx={{ position: 'absolute', right: 0, top: 0, bgcolor: 'white' }}>×</Button><Box component="img" src={url} alt={copy.image_alt} sx={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', bgcolor: 'white' }} /></Box></Dialog>}
  </Box>;
}
