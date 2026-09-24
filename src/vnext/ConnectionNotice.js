import React from 'react';
import { Alert, Button } from '@mui/material';

export default function ConnectionNotice({ status, onReconnect }) {
  if (!status || status === 'connected') return null;
  const message = status === 'paused' ? 'Updates are paused while this page is offline or hidden.'
    : status === 'exhausted' ? 'Live updates stopped. Your available result is preserved. Reconnect to read the saved result.'
      : 'Reconnecting to the saved result. Your available result is preserved.';
  return <Alert severity="info" action={status === 'exhausted' && onReconnect ? <Button color="inherit" onClick={onReconnect}>Reconnect</Button> : undefined}>{message}</Alert>;
}
