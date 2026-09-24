import React, { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Typography, TextField, Button, Box, Alert } from '@mui/material';

const FALLBACK_FAILURE = {
  category: 'service_or_retrieval_failure', title: 'The search could not finish',
  message: 'A search service could not finish this request. This does not establish that the requested data is absent. You can retry the same question without changing its filters.',
  retryable: true, suggestions: [],
};

// Suggestion labels are display text; only the explicit instruction is submitted.
// Recorded stage/tissue alternatives and availability claims must come from the server.
function recoverySuggestions(suggestions) {
  const seen = new Set();
  return (Array.isArray(suggestions) ? suggestions : []).flatMap(value => {
    const instruction = typeof value === 'string' ? value.trim() :
      typeof value?.instruction === 'string' ? value.instruction.trim() : '';
    if (!instruction || seen.has(instruction)) return [];
    seen.add(instruction);
    if (typeof value === 'string') return [instruction];
    return [{ ...value, label: typeof value.label === 'string' && value.label.trim() ? value.label.trim() : instruction, instruction }];
  }).slice(0, 2);
}

function structuredRecovery(value) {
  if (!value || typeof value !== 'object' || !value.category || typeof value.message !== 'string' || !value.message.trim()) return null;
  return { ...FALLBACK_FAILURE, ...value, suggestions: recoverySuggestions(value.suggestions) };
}

function errorCode(error) {
  return typeof error === 'string' ? error : error?.category || error?.code || '';
}

export function queryRecovery(run, error = '') {
  if (['cancelled', 'superseded'].includes(run?.status)) return null;
  const plan = run?.plan;
  const terminalFailure = ['failed', 'interrupted'].includes(run?.status);
  // The latest structured diagnosis includes verified suggestions. A downstream
  // presentation failure must not replace it with an uninformative retry message.
  for (const value of [run?.recovery, plan?.recovery, run?.preview?.recovery, run?.error?.recovery, error?.recovery]) {
    const issue = structuredRecovery(value);
    if (issue) return issue;
  }
  const empty = plan && !(plan.steps || []).length && !plan.answer_mode;
  const generic = /provide a concrete entity|could not prepare|planning.*fail/i.test(plan?.clarification || '');
  if (empty && (!plan.clarification || generic)) return {
    category: 'planning_failure', title: 'We couldn’t prepare this search',
    message: 'Your question was received, but we could not create executable search steps. You can retry without changing your question.',
    retryable: true, suggestions: [],
  };
  if (plan?.clarification && !generic && ['planning', 'awaiting_confirmation', 'failed', 'interrupted'].includes(run?.status)) {
    const issues = (plan.steps || []).flatMap(step => step.semantic_issues || [])
      .map(issue => typeof issue === 'string' ? issue : issue?.message).filter(Boolean);
    const message = [...new Set(issues)].join(' ') || plan.clarification;
    const suggestions = [];
    if (/stage cannot be uniquely|which stage/i.test(message)) {
      suggestions.push('Show each recorded T1D stage separately; keep the tissue and assay filters unchanged.');
    } else if (/Multiple sample tissues/i.test(message)) {
      suggestions.push('Check each requested tissue separately, keeping the donor and assay filters unchanged.');
    } else if (/capability mapping.*HPAP/i.test(message)) {
      suggestions.push('Restrict to HPAP and include documented RNA components of multiome assays.', 'Use only the exact scRNA-seq assay label; exclude multiome assays.');
    }
    return { category: 'clarification_required', title: 'Let’s clarify this search', message, retryable: false, suggestions };
  }
  const codes = [errorCode(error), errorCode(run?.error), errorCode(run?.preview?.error)].filter(Boolean);
  const knownCodes = ['graph_release_mismatch', 'timeout', 'rate_limited', 'budget_exhausted', 'authentication', 'authorization', 'billing', 'query_validation', 'graph_identity'];
  const code = codes.find(value => knownCodes.includes(value)) || codes[0];
  if (code === 'graph_release_mismatch' && (run?.preview?.evidence?.graph_version || run?.evidence?.graph_version)) return {
    category: 'release_mismatch', title: 'This result uses a different graph release',
    message: 'Start a fresh search against the configured graph. Your original question will be retained.', retryable: true, suggestions: [],
  };
  if (terminalFailure || error || (run?.preview?.status === 'failed' && run.preview.preparation_complete !== false)) {
    const known = {
      timeout: ['The search took longer than expected', 'The search reached its time limit. This does not mean there are no matching records. Retry the same question; any evidence already retrieved is retained.', true],
      rate_limited: ['The search service is busy', 'The search service temporarily limited requests. Wait briefly, then retry the same question. You do not need to change your filters.', true],
      budget_exhausted: ['The demo’s API budget is exhausted', 'The demo cannot make more model calls until its operator updates the budget. Changing your question will not resolve this problem.', false],
      authentication: ['A search service is unavailable', 'The server could not authenticate with a required search service. The demo operator needs to restore access; your question does not need changing.', false],
      authorization: ['A search service is unavailable', 'A required search service denied the server access. The demo operator needs to restore access; your question does not need changing.', false],
      billing: ['The model service needs operator attention', 'The model provider could not process this request because of its account billing status. The demo operator needs to restore access; changing your question will not resolve this problem.', false],
      query_validation: ['We couldn’t prepare a reliable database search', 'The generated database query did not preserve the required search rules. No conclusion about data availability can be drawn. You can retry the same question.', true],
      graph_identity: ['The graph release could not be verified', 'The server could not verify the configured graph release. The demo operator needs to check the connection; do not change your biological question.', false],
      graph_release_mismatch: ['The graph connection needs operator attention', 'The connected graph does not match the release required by this demo. The operator needs to check the connection. This is not a problem with your biological question and does not show that matching data is absent.', false],
    }[code];
    return known ? { category: code, title: known[0], message: known[1], retryable: known[2], suggestions: [] } : FALLBACK_FAILURE;
  }
  return null;
}

export default function QueryRecoveryDialog({issue, question, busy, onRevise, onRetry, onCancel}) {
  const [instruction,setInstruction]=useState('');
  useEffect(()=>setInstruction(''),[question,issue?.category]);
  return <Dialog open={Boolean(issue)} maxWidth="lg" fullWidth aria-labelledby="query-recovery-title" PaperProps={{sx:{width:'90vw',maxWidth:1100,minHeight:'65vh',borderRadius:3}}}>
    <DialogTitle id="query-recovery-title" sx={{fontSize:28,fontWeight:700}}>{issue?.title}</DialogTitle>
    <DialogContent sx={{display:'flex',flexDirection:'column',gap:3}}>
      <Box sx={{p:3,bgcolor:'#f0f7f8',borderRadius:2}}><Typography variant="overline">Your original question</Typography><Typography sx={{fontSize:20,whiteSpace:'pre-wrap'}}>{question}</Typography></Box>
      <Box><Typography variant="h6">Why it didn’t work</Typography><Typography sx={{mt:1}}>{issue?.message}</Typography></Box>
      {issue?.suggestions?.length > 0 && <Box><Typography sx={{mb:1}}>Suggested changes — select one to edit before submitting:</Typography>{issue.suggestions.map(s=><Button key={typeof s === 'string' ? s : s.instruction} variant="outlined" onClick={()=>setInstruction(typeof s === 'string' ? s : s.instruction)} disabled={busy} sx={{mr:1,mb:1,textTransform:'none',textAlign:'left'}}>{typeof s === 'string' ? s : s.label}</Button>)}</Box>}
      <TextField label="Tell us what to change" placeholder="Describe only the change. We’ll keep the rest of your question." multiline minRows={3} value={instruction} onChange={e=>setInstruction(e.target.value)} disabled={busy} fullWidth />
      {busy && <Alert severity="info">Updating your search…</Alert>}
    </DialogContent>
    <DialogActions sx={{p:3,gap:1}}>
      <Button onClick={onCancel} disabled={busy}>Cancel query</Button>
      {issue?.retryable && <Button variant="outlined" onClick={onRetry} disabled={busy}>Retry original question</Button>}
      <Button variant="contained" onClick={()=>onRevise(instruction.trim())} disabled={busy || !instruction.trim()}>Apply changes</Button>
    </DialogActions>
  </Dialog>;
}
