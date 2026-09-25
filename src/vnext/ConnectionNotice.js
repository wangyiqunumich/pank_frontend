import React from 'react';
import { Alert, Button } from '@mui/material';

export default function ConnectionNotice({ status, onReconnect }) {
  if (status !== 'exhausted') return null;
  return <Alert severity="warning" action={onReconnect ? <Button color="inherit" onClick={onReconnect}>Retry</Button> : undefined}>Unable to load updates. Your available result is preserved.</Alert>;
}
