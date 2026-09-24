import React from 'react';
import { Alert, Box, Button } from '@mui/material';

const messageFor = status => status === 'exhausted' ? 'Live updates stopped. Your available result is preserved. Reconnect to read the saved result.'
    : 'Reconnecting to the saved result. Your available result is preserved.';

const floatingNoticeSx = {
  position: 'fixed', top: { xs: 54, sm: 58 }, left: '50%', transform: 'translateX(-50%)',
  width: 'calc(100% - 32px)', maxWidth: 960, zIndex: 1900, pointerEvents: 'none',
  display: 'flex', flexDirection: 'column', gap: 1,
  '& .MuiAlert-root': { pointerEvents: 'auto', boxShadow: '0 4px 16px rgba(15, 23, 42, 0.12)' },
};

function NoticeAlert({ status, onReconnect }) {
  return <Alert severity="info" action={status === 'exhausted' && onReconnect ? <Button color="inherit" onClick={onReconnect}>Reconnect</Button> : undefined}>
    {messageFor(status)}
  </Alert>;
}

export function ConnectionNoticeGroup({ notices = [] }) {
  const visible = notices.filter(({ status }) => status && !['connected', 'paused'].includes(status));
  if (!visible.length) return null;
  return <Box data-testid="connection-notice-container" sx={floatingNoticeSx}>
    {visible.map(({ status, onReconnect }, index) => <NoticeAlert key={`${status}-${index}`} status={status} onReconnect={onReconnect} />)}
  </Box>;
}

export default function ConnectionNotice({ status, onReconnect }) {
  return <ConnectionNoticeGroup notices={[{ status, onReconnect }]} />;
}
