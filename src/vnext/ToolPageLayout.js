import React from 'react';
import { Box } from '@mui/material';
import AgentSidebar from '../components/AgentSidebar';

// Keep navigation present while a tool loads, selects a record, or reports an error.
export default function ToolPageLayout({ children }) {
  return <Box sx={{ display: 'flex', flex: 1, minHeight: 0, width: '100%' }}>
    <AgentSidebar activeNav="skills" />
    <Box component="main" sx={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, overflowX: 'auto' }}>
      {children}
    </Box>
  </Box>;
}
