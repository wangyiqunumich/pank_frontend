import React, { useEffect, useState } from 'react';
import { Box, Typography, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import FunctionalVisual from './FunctionalVisual';
import { sitePath } from './api';

const TRACES = {
  ins_ieq: 'Insulin · per IEQ', ins_content: 'Insulin · % content',
  gcg_ieq: 'Glucagon · per IEQ', gcg_content: 'Glucagon · % content',
};

// Reuse the PanKgraph result plot and backend layout used by jieliu3.
export default function PanKgraphFunctionalPlot({ isVisible = false }) {
  const [trace, setTrace] = useState('ins_ieq');
  const [count, setCount] = useState(null);
  useEffect(() => {
    if (!isVisible) return undefined;
    const controller = new AbortController();
    fetch(sitePath('/api/functional/api/data/summary'), { signal: controller.signal, credentials: 'same-origin' })
      .then(response => { if (!response.ok) throw new Error('Summary unavailable'); return response.json(); })
      .then(value => setCount(value.summary?.available_donors ?? null)).catch(() => {});
    return () => controller.abort();
  }, [isVisible]);
  if (!isVisible) return null;
  const path = `/api/functional/api/charts/cohort-traces.png?trace_type=${trace}&result_page=Yes`;
  const result = { resources_tabs: { empirical_evidence: { image_url: path, title: `PanKgraph functional response · ${TRACES[trace]}` } } };
  return <Box sx={{ height:'100%', minHeight:520, display:'flex', flexDirection:'column', bgcolor:'#fff' }}>
    <Box sx={{ p:2, display:'flex', alignItems:'center', gap:2, flexWrap:'wrap' }}>
      <Box sx={{ flex:1 }}><Typography sx={{ fontSize:14, fontWeight:600, color:'#0f766e' }}>PanKgraph functional plot</Typography>
        <Typography sx={{ fontSize:12, color:'#64748b' }}>All available donors{count !== null ? ` · ${count} donors` : ''}. Independent functional cohort.</Typography></Box>
      <FormControl size="small" sx={{ minWidth:200 }}><InputLabel id="functional-response-label">Response</InputLabel>
        <Select labelId="functional-response-label" label="Response" value={trace} onChange={event => setTrace(event.target.value)}>
          {Object.entries(TRACES).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
        </Select></FormControl>
    </Box>
    <Box sx={{ flex:1, minHeight:430 }}><FunctionalVisual key={trace} result={result} /></Box>
  </Box>;
}
