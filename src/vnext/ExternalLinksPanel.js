import React, { useState } from 'react';
import { Box, Button, ButtonBase, Collapse, Link, Stack, TextField, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

export default function ExternalLinksPanel({ groups = [] }) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState({});
  const [searchExpanded, setSearchExpanded] = useState({});
  const [showAll, setShowAll] = useState({});
  const search = query.trim().toLowerCase();
  const total = groups.reduce((count, group) => count + group.entries.length, 0);
  const filtered = groups.map(group => ({ ...group, matches: group.entries.filter(entry =>
    [group.display_name, entry.label, ...entry.entities.flatMap(e => [e.name, e.id, ...(e.types || [])])].join(' ').toLowerCase().includes(search)) })).filter(group => group.matches.length);
  return <Box aria-label="External links by source">
    {total > 10 && <TextField fullWidth size="small" label="Search sources or node names" value={query} onChange={event => { setQuery(event.target.value); setSearchExpanded({}); }} sx={{ mb: 2 }} />}
    {search && <Typography role="status" variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>{filtered.reduce((count, group) => count + group.matches.length, 0)} / {total} links match</Typography>}
    <Stack spacing={1.25}>{filtered.map(group => {
      const key = group.source_key;
      if (['local', 'other ontology'].includes(String(group.display_name).trim().toLowerCase())) return <Box key={key} sx={{ background: '#fff', border: '1px solid #E7EBEF', borderRadius: '10px', p: 1.25 }}>
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#1E293B', mb: 0.35 }}>Other ontology</Typography>
        <Typography variant="body2" sx={{ fontSize: 9.5, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.05em', overflowWrap: 'anywhere' }}>Where suitable public ontology terms are unavailable, we use locally adapted terms. The PanKgraph team is working to refine these terms for inclusion in public ontologies.</Typography>
      </Box>;
      const open = search ? searchExpanded[key] !== false : Boolean(expanded[key]);
      const names = [...new Set(group.matches.flatMap(entry => entry.entities.length ? entry.entities.map(e => e.name || e.id) : [entry.label]).filter(Boolean))];
      const preview = names.slice(0, 3).join(', ') + (names.length > 3 ? ', …' : '');
      const rows = showAll[key] ? group.matches : group.matches.slice(0, 10);
      return <Box key={key} sx={{ background: '#fff', border: '1px solid #E7EBEF', borderRadius: '10px', overflow: 'hidden' }}>
        <ButtonBase aria-expanded={open} onClick={() => search ? setSearchExpanded(old => ({ ...old, [key]: !open })) : setExpanded(old => ({ ...old, [key]: !old[key] }))} sx={{ width: '100%', p: 1.25, textAlign: 'left', justifyContent: 'flex-start', alignItems: 'flex-start', gap: 3, transition: 'all 0.2s ease', '&:hover': { background: '#F0F4F4' }, '&.Mui-focusVisible': { outline: '2px solid #008C8C', outlineOffset: '-3px' } }}>
          <Box aria-hidden="true" sx={{ mt: 0.2, flexShrink: 0, width: '24px', height: '24px', boxSizing: 'border-box', border: '1px solid #008C8C', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#008C8C' }}><ExpandMoreIcon sx={{ fontSize: 16, transform: open ? 'none' : 'rotate(-90deg)' }} /></Box>
          <Box sx={{ flex: 1, minWidth: 0 }}><Stack direction="row" spacing={1} justifyContent="space-between" alignItems="baseline">
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#1E293B', mb: 0.35, overflowWrap: 'anywhere' }}>{group.display_name}</Typography>
            <Typography variant="body2" sx={{ fontSize: 9.5, fontWeight: 700, color: '#94A3B8', whiteSpace: 'nowrap' }}>{search ? `${group.matches.length} / ${group.entries.length}` : group.entries.length} {group.entries.length === 1 ? 'link' : 'links'}</Typography>
          </Stack><Typography variant="body2" sx={{ fontSize: 9.5, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.05em', overflowWrap: 'anywhere' }}>{preview}</Typography></Box>
        </ButtonBase>
        <Collapse in={open} unmountOnExit><Box sx={{ px: 2, pb: 1 }}>
          {rows.map(entry => <Link key={entry.url} href={entry.url} target="_blank" rel="noopener noreferrer" underline="none" sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1.25, borderTop: '1px solid #E2E8F0', color: '#1E293B', '&:hover': { color: '#008C8C' } }}>
            <Box sx={{ flex: 1, minWidth: 0 }}><Typography sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{entry.label}</Typography>
              {entry.entities.length > 0 && <Typography variant="body2" sx={{ color: '#64748B', overflowWrap: 'anywhere' }}>{entry.entities.map(e => [e.id, ...(e.types || [])].filter(Boolean).join(' · ')).filter(Boolean).join('; ')}</Typography>}
            </Box><OpenInNewIcon fontSize="small" sx={{ color: '#008C8C', flexShrink: 0 }} />
          </Link>)}
          {group.matches.length > 10 && <Button onClick={() => setShowAll(old => ({ ...old, [key]: !old[key] }))} sx={{ color: '#008C8C' }}>{showAll[key] ? 'Show fewer' : `Show all ${group.matches.length} links`}</Button>}
        </Box></Collapse>
      </Box>;
    })}</Stack>
    {!filtered.length && <Typography variant="body2" sx={{ color: 'text.secondary' }}>{search ? 'No matching links.' : 'No external links available.'}</Typography>}
  </Box>;
}
