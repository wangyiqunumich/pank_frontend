import React, { useState } from 'react';
import { Box, Typography, IconButton, Tooltip, Link, ClickAwayListener } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AnswerMarkdown from './AnswerMarkdown';

export function LiteratureInfo({ source }) {
  const [open, setOpen] = useState(false);
  const hirn = source === 'hirn';
  const name = hirn ? 'HIRN' : 'GLKB';
  const text = hirn ? 'Focused on publications from the Human Islet Research Network (HIRN).' : 'A broader literature view, including complementary perspectives, alternative explanations, controversies, and evidence gaps.';
  return <ClickAwayListener onClickAway={() => setOpen(false)}><span>
    <Tooltip open={open} onOpen={() => setOpen(true)} onClose={() => setOpen(false)} leaveDelay={250}
      title={<Box>{text}{!hirn && <> Explore more with <Link href="https://glkb.org/" target="_blank" rel="noopener noreferrer" color="inherit" underline="always">GLKB</Link>.</>}</Box>}>
      <IconButton size="small" aria-label={`About ${name} Literature`} aria-expanded={open} onClick={() => setOpen(value => !value)} onKeyDown={event => { if (event.key === 'Escape') setOpen(false); }}><InfoOutlinedIcon sx={{ fontSize: 16 }} /></IconButton>
    </Tooltip>
  </span></ClickAwayListener>;
}

export default function LiteratureSections({ literature, references }) {
  const sources = literature.sources || { hirn: { ...literature, perspectives: literature.perspectives || [] } };
  return <Box>{['hirn', 'glkb'].filter(source => sources[source]).map(source => {
    const value = sources[source];
    const units = value.perspectives || (value.answer ? [value] : []);
    const pending = ['pending', 'queued', 'running'].includes(value.status);
    const failed = ['unavailable', 'failed', 'timeout', 'interrupted', 'cancelled'].includes(value.status);
    return <Box key={source} sx={{ mt: 2 }} data-literature-source={source}>
      <Typography component="h3" sx={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>{source === 'hirn' ? 'HIRN' : 'GLKB'} Literature <LiteratureInfo source={source} /></Typography>
      {pending && <Typography role="status" sx={{ fontSize: 14, color: '#64748B' }}>Loading {source.toUpperCase()} literature…</Typography>}
      {failed && <Typography role="status" sx={{ fontSize: 14, color: '#64748B' }}>{source.toUpperCase()} literature {value.status === 'interrupted' ? 'was interrupted' : 'is unavailable'}. Available answers are preserved.</Typography>}
      {value.status === 'partial' && <Typography role="status" sx={{ fontSize: 14, color: '#64748B' }}>Some literature evidence or references are incomplete.</Typography>}
      {value.status === 'no_evidence' && <Typography role="status" sx={{ fontSize: 14, color: '#64748B' }}>No directly supported literature evidence was returned.</Typography>}
      {units.map((unit, index) => <Box key={unit.id || index}>{units.length > 1 && unit.label && <Typography component="h4" sx={{ fontSize: 14, fontWeight: 600 }}>{unit.label}</Typography>}<AnswerMarkdown answer={unit.display_answer || unit.answer || ''} references={references} /></Box>)}
    </Box>;
  })}</Box>;
}
