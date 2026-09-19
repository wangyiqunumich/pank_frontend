import React, { useEffect, useState } from 'react';
import { Box, Button, CircularProgress, TextField, Typography } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import AgentSidebar from '../components/AgentSidebar';
import AgentResultView from './ResultView';
import { request } from './api';
import { safeSessionStorage } from '../utils/safeStorage';

const RETURN_KEY = 'pank-vnext:access-return';
export const accessLink = '/pankgraph-vnext/access?return_to=%2Fagent-vnext';
export function savedAccessReturn(value) {
  return typeof value === 'string' && (value === '/agent-vnext' || value.startsWith('/agent-vnext?')) && !/[\r\n\\]/.test(value) ? value : null;
}
export default function AgentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [access, setAccess] = useState('checking');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [question, setQuestion] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setAccess('checking'); setError('');
    request('/access', { signal: controller.signal }).then((value) => {
      if (value.authenticated !== true) throw new Error('Unable to verify preview access.');
      if (controller.signal.aborted) return;
      const saved = savedAccessReturn(safeSessionStorage.getItem(RETURN_KEY));
      safeSessionStorage.removeItem(RETURN_KEY);
      setAccess('ready');
      if (!location.search && saved && saved !== '/agent-vnext') navigate(saved, { replace: true });
    }).catch((err) => {
      if (controller.signal.aborted) return;
      setAccess(err.status === 401 ? 'signin' : 'failed');
      setError(err.status === 401 ? '' : err.status === 408
        ? 'Checking preview access timed out. Sign in to preview or refresh access.'
        : err.message);
    });
    return () => controller.abort();
  }, [attempt, navigate, location.search]);
  const params = new URLSearchParams(location.search);
  const hasInvestigation = ['run_id', 'session_id', 'question'].some((key) => params.has(key));
  const submit = (event) => {
    event.preventDefault();
    if (!question.trim()) return;
    const encoded = btoa(unescape(encodeURIComponent(question.trim())));
    const intent = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    navigate(`/agent-vnext?question=${encodeURIComponent(encoded)}&intent=${encodeURIComponent(intent)}`);
  };
  return <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
    <AgentSidebar activeNav="new-chat" />
    <Box component="main" sx={{ flex: 1, minWidth: 0 }}>
      <Box sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Agent preview</Typography>
        <Button onClick={() => { setQuestion(''); navigate('/agent-vnext'); }}>New investigation</Button>
      </Box>
      {access !== 'ready' ?
        <Box sx={{ p: 4 }}>
          {access === 'checking' && <CircularProgress aria-label="Checking preview access" />}
          <Typography>{access === 'checking' ? 'Checking preview access. You can sign in while this check completes.'
            : access === 'signin' ? 'Sign in with your preview access to open the new agent.' : error}</Typography>
          <Button component="a" href={accessLink} onClick={() => safeSessionStorage.setItem(RETURN_KEY, savedAccessReturn(`${location.pathname}${location.search}`) || '/agent-vnext')}>Sign in to preview</Button>
          {access !== 'checking' && <Button onClick={() => setAttempt((value) => value + 1)}>Refresh access</Button>}
        </Box> : hasInvestigation ? <AgentResultView key={location.search} /> :
        <Box component="form" onSubmit={submit} sx={{ maxWidth: 800, m: 'auto', p: 4 }}>
          <Typography sx={{ mb: 2 }}>Ask a question, review the proposed investigation, then confirm execution.</Typography>
          <TextField label="Your question" multiline minRows={3} fullWidth value={question} onChange={(event) => setQuestion(event.target.value)} />
          <Button type="submit" variant="contained" disabled={!question.trim()} sx={{ mt: 2 }}>Review plan</Button>
        </Box>}
    </Box>
  </Box>;
}
