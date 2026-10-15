import React, { useEffect, useState } from 'react';
import { Box, Button, Typography, CircularProgress, Dialog, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { QTL_CONFIG } from './qtlContext';
import { loadQtlPlot } from './qtlPlotApi';
import './QtlFineMapping.css';
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
  const plot = !current?.available ? <Typography role="status" className="pk-qtl-state">{copy[current?.reason] || copy.no_context}</Typography>
    : state?.status === 'unavailable' ? <Box role="alert" className="pk-qtl-state pk-qtl-error">{copy.failed}<Button className="pk-qtl-action" onClick={() => setRetry(value => value + 1)}>{copy.retry}</Button></Box>
    : !url ? <Box role="status" className="pk-qtl-state pk-qtl-loading" sx={{ minHeight: preview ? 100 : 200 }}><CircularProgress size={20} sx={{ color: '#3A838B' }} />{copy.loading}</Box>
    : <Box component="img" className="pk-qtl-image" src={url} alt={copy.image_alt} onError={() => setLoaded({ key: currentKey, status: 'unavailable' })} sx={{ maxHeight: preview ? '100%' : QTL_CONFIG.plot.max_height }} />;
  if (preview) return <Box sx={{ width: '100%', height: '100%', p: 0.5, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>{plot}</Box>;
  return <Box component="section" className="pk-qtl-panel" aria-label={copy.title}>
    <Box className="pk-qtl-header">
      <Typography component="h2">{copy.title}</Typography>
      <Typography className="pk-qtl-signal">{[current?.geneLabel || copy.gene_fallback, current?.sourceLabel, shortSet].filter(Boolean).join(' · ')}</Typography>
      {metadata && <Typography className="pk-qtl-metadata">{metadata}</Typography>}
    </Box>
    {contexts.length > 1 && <Box component="label" className="pk-qtl-picker">{copy.source_picker}<select aria-label={copy.source_picker} value={current?.key || ''} onChange={event => { setSelected(event.target.value); setExpanded(false); }}>
      {contexts.map(context => <option key={context.key} value={context.key}>{[context.geneLabel, context.sourceLabel, context.credibleSet || copy.unrecorded_set].filter(Boolean).join(' · ')}</option>)}
    </select></Box>}
    {url ? <Button className="pk-qtl-plot" aria-label={copy.expand} onClick={() => setExpanded(true)}>{plot}</Button> : plot}
    <Typography className="pk-qtl-description">{copy.description}</Typography>
    <Box component="details" className="pk-qtl-details">
      <summary>{copy.details}</summary>
      <Typography>{copy.credible_set_label}: {current?.credibleSet || copy.unrecorded_set}</Typography>
      <Typography>{copy.legend}</Typography>
      <Typography>{copy.provenance}</Typography>
    </Box>
    {current?.downloadUrl && <Button className="pk-qtl-action pk-qtl-download" component="a" href={current.downloadUrl} target="_blank" rel="noopener noreferrer">{copy.download}</Button>}
    {expanded && url && <Dialog open onClose={() => setExpanded(false)} aria-label={copy.expand} maxWidth={false} PaperProps={{ className: 'pk-qtl-dialog' }}><Box className="pk-qtl-fullsize"><IconButton className="pk-qtl-close" aria-label={copy.close} onClick={() => setExpanded(false)}><CloseIcon fontSize="small" /></IconButton><Box component="img" src={url} alt={copy.image_alt} /></Box></Dialog>}
  </Box>;
}
