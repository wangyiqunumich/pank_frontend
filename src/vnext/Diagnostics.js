import React, { useState } from 'react';
import { Box, Button, Typography } from '@mui/material';

export function diagnosticsFor(run) {
  const items = run?.diagnostics || run?.plan?.diagnostics || run?.preview?.diagnostics || [];
  return items.filter(d => /^E\d{2}\.[A-Z_]+$/.test(d?.code || ''));
}

export default function Diagnostics({items = []}) {
  const [copied, setCopied] = useState('');
  if (!items.length) return null;
  // Copy only the public diagnostic contract, never the run, prompt or query payload.
  const safe = items.map(d => Object.fromEntries(['code','module','message','reason','severity','blocking','run_id','step_id','attempts','outcome'].filter(k=>d[k]!==undefined).map(k=>[k,d[k]])));
  const copy = async () => {
    try { await navigator.clipboard.writeText(JSON.stringify(safe,null,2)); setCopied('Copied'); }
    catch (_) { setCopied('Copy unavailable; select the details below.'); }
  };
  return <Box aria-label="Search diagnostics" sx={{borderLeft:'3px solid #b42318',pl:2,my:1}}>
    {safe.map((d,i)=><Box key={`${d.code}-${d.step_id || i}`} sx={{mb:1}}>
      <Typography sx={{color:'#b42318',fontWeight:700}}>{d.code} · {d.module}</Typography>
      <Typography>{d.message}</Typography>
      {d.attempts && <Typography variant="body2">Attempts: {d.attempts.claude_calls ?? '—'} Claude turns; {d.attempts.lookup_batches ?? '—'} lookup batches.</Typography>}
      {d.outcome && <Typography variant="body2">Outcome: {d.outcome.replaceAll('_',' ')}.</Typography>}
    </Box>)}
    <details><summary>Technical details</summary><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(safe,null,2)}</pre></details>
    <Button onClick={copy} size="small">Copy diagnostics</Button><span role="status">{copied}</span>
  </Box>;
}
