import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { sitePath } from './api';

// The resolver supplies registered insertions and verified source-data links.
// Markdown, including native tables and their controls, stays in AnswerMarkdown.
export default function SummaryInsertions({ insertions = [] }) {
  return insertions.map((insertion) => (
    <Box key={insertion.id} component="section" aria-label={insertion.title} sx={{ border: '1px solid #E6EAF2', borderRadius: 2, bgcolor: '#F9FAFB', p: 2 }}>
      <Typography component="h3" sx={{ fontSize: 14, fontWeight: 700, color: '#334155' }}>{insertion.title}</Typography>
      {insertion.description ? <Typography sx={{ mt: 0.5, fontSize: 13, color: '#64748B' }}>{insertion.description}</Typography> : null}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1, mt: 1.5 }}>
        {insertion.links.map((link) => (
          <Box key={link.id}>
            <Button component="a" href={sitePath(link.url)} target="_blank" rel="noopener noreferrer" download variant="outlined" size="small">{link.label}</Button>
            {link.description ? <Typography sx={{ mt: 0.5, fontSize: 12, color: '#64748B' }}>{link.description}</Typography> : null}
          </Box>
        ))}
      </Box>
    </Box>
  ));
}
