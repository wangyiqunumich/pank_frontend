import React, { useState } from 'react';
import { Box, Button, CircularProgress, Typography, Dialog } from '@mui/material';
import { sitePath } from './api';

export default function FunctionalVisual({ result }) {
  const [expanded, setExpanded] = useState(false);
  const [failedUrl, setFailedUrl] = useState('');
  const plot = result?.resources_tabs?.empirical_evidence;
  const path = plot?.image_url;
  const url = typeof path === 'string' && path.startsWith('/') && !path.startsWith('//') ? sitePath(path) : '';
  const pending = result?.component_status?.resources === 'pending';
  const available = url && failedUrl !== url;
  const title = plot?.title || 'Selected cohort functional response';
  return <Box sx={{width:'100%',height:'100%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',p:1.5,minHeight:0,minWidth:0,boxSizing:'border-box'}}>
    {available ? <>
      <Box component="img" src={url} alt={title} onError={()=>setFailedUrl(url)} sx={{width:'100%',height:0,minHeight:0,flex:'1 1 0%',objectFit:'contain'}} />
      {<Box sx={{display:'flex',gap:2,flexShrink:0}}>
        <Button onClick={()=>setExpanded(true)}>Expand plot</Button>
        <Button component="a" href={url} target="_blank" rel="noopener noreferrer" download>Download plot</Button>
      </Box>}
      <Dialog open={expanded} onClose={()=>setExpanded(false)} maxWidth="lg" fullWidth PaperProps={{ sx: { height: 'calc(100dvh - 48px)', maxHeight: 'calc(100dvh - 48px)', overflow: 'hidden', p: 1 } }}>
        <Button onClick={()=>setExpanded(false)}>Close plot</Button>
        <Box component="img" src={url} alt={title} sx={{width:'100%',height:0,minHeight:0,flex:'1 1 0%',objectFit:'contain'}} />
      </Dialog>
    </> : pending ? <><CircularProgress size={28}/><Typography>Loading the selected cohort plot…</Typography></>
      : <Typography sx={{p:2,textAlign:'center'}}>The functional plot is unavailable. Available measurements and the answer are preserved.</Typography>}
  </Box>;
}
