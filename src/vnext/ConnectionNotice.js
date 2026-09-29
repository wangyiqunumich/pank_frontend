import React from 'react';
import { Alert, Box, Button } from '@mui/material';

const floatingNoticeSx = {
  position: 'fixed', top: { xs: 54, sm: 58 }, left: '50%', transform: 'translateX(-50%)',
  width: 'calc(100% - 32px)', maxWidth: 960, zIndex: 1900, pointerEvents: 'none',
  display: 'flex', flexDirection: 'column', gap: 1,
  '& .MuiAlert-root': { pointerEvents: 'auto', boxShadow: '0 4px 16px rgba(15, 23, 42, 0.12)' },
};

function NoticeAlert({ status, onReconnect }) {
  return <Alert severity="warning" action={onReconnect ? <Button color="inherit" onClick={onReconnect}>Retry</Button> : undefined}>
    Unable to load updates. Your available result is preserved.
  </Alert>;
}

export function ConnectionNoticeGroup({ notices = [] }) {
  const visible = notices.filter(({ status }) => status === 'exhausted');
  if (!visible.length) return null;
  return <Box data-testid="connection-notice-container" sx={floatingNoticeSx}>
    {visible.map(({ status, onReconnect }, index) => <NoticeAlert key={`${status}-${index}`} status={status} onReconnect={onReconnect} />)}
  </Box>;
}

export default function ConnectionNotice({ status, onReconnect }) {
  return <ConnectionNoticeGroup notices={[{ status, onReconnect }]} />;
}
