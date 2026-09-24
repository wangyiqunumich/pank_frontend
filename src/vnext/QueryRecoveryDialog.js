import React, { useEffect, useState } from 'react';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { Dialog, DialogTitle, DialogContent, DialogActions, Typography, TextField, Button, Box, Alert, IconButton } from '@mui/material';
import './QueryRecoveryDialog.css';
import Diagnostics, { diagnosticsFor } from './Diagnostics';

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

function recoveryFor(run, error = '') {
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

const OPERATOR_CATEGORIES = new Set(['authentication', 'authorization', 'billing', 'budget_exhausted', 'graph_identity']);
const RELEASE_MISMATCH_CATEGORIES = new Set(['release_mismatch', 'graph_release_mismatch']);
const NON_EDITABLE_CATEGORIES = new Set(['rate_limited', 'release_mismatch', 'graph_release_mismatch']);
const SUPPORT_EMAILS = 'wyq@umich.edu, runbomao@umich.edu, drjieliu@umich.edu, fan.feng@vumc.org, help@pankbase.org';

function recoveryEyebrow(category = '') {
  const labels = {
    authentication: 'Authentication', authorization: 'Authorization', billing: 'Billing',
    budget_exhausted: 'Budget exhausted', clarification_required: 'Clarification required',
    graph_identity: 'Graph identity', graph_release_mismatch: 'Graph release mismatch', release_mismatch: 'Graph release mismatch',
    planning_failure: 'Planning failure', query_validation: 'Query validation', rate_limited: 'Rate limited',
    timeout: 'Timeout', service_or_retrieval_failure: 'Unknown failure',
  };
  return labels[category] || 'Search recovery';
}

export function queryRecovery(run, error = '') {
  const issue = recoveryFor(run, error);
  return issue ? {...issue, diagnostics: diagnosticsFor(run)} : null;
}

export default function QueryRecoveryDialog({issue, question, busy, onRevise, onRetry, onCancel}) {
  const [instruction, setInstruction] = useState('');
  const [countdown, setCountdown] = useState(0);
  const category = issue?.category || '';
  const isOperatorIssue = OPERATOR_CATEGORIES.has(category);
  const isReleaseMismatch = RELEASE_MISMATCH_CATEGORIES.has(category);
  const editRequired = category === 'clarification_required';
  const editable = issue?.editable ?? (!NON_EDITABLE_CATEGORIES.has(category));
  const countDownSeconds = ['rate_limited', 'timeout'].includes(category) ? 12 : 0;

  useEffect(() => {
    setInstruction('');
    setCountdown(countDownSeconds);
  }, [question, category, countDownSeconds]);

  useEffect(() => {
    if (!countdown) return undefined;
    const timer = window.setTimeout(() => setCountdown(value => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  const contactOperator = () => {
    const body = [
      'Hello PanKgraph team,', '',
      `I need help with a search recovery issue (${recoveryEyebrow(category)}).`, '',
      `Original question: ${question || 'Unavailable'}`,
      `Details: ${issue?.message || ''}`,
      instruction.trim() ? `Additional context: ${instruction.trim()}` : '', '',
      'Please check the search service configuration.',
    ].filter(Boolean).join('\n');
    window.location.href = `mailto:${SUPPORT_EMAILS}?subject=${encodeURIComponent(`PanKgraph: ${recoveryEyebrow(category)} recovery`)}&body=${encodeURIComponent(body)}`;
  };

  const primaryLabel = countdown > 0
    ? `Try again in ${countdown}s`
    : isOperatorIssue
      ? 'Contact operator'
      : isReleaseMismatch
        ? 'Start a fresh search'
        : editRequired
          ? 'Send clarification'
          : instruction.trim()
            ? 'Apply changes'
            : issue?.retryable
              ? 'Retry original question'
              : 'Apply changes';

  const handlePrimary = () => {
    if (busy || countdown > 0 || (editRequired && !instruction.trim())) return;
    if (isOperatorIssue) return contactOperator();
    if (countdown === 0 && countDownSeconds > 0 && !instruction.trim() && issue?.retryable) return onRetry?.();
    if (isReleaseMismatch || (!editable && issue?.retryable)) return onRetry?.();
    if (instruction.trim()) return onRevise?.(instruction.trim());
    if (issue?.retryable) return onRetry?.();
  };

  return <Dialog
    className="query-recovery-dialog"
    open={Boolean(issue)}
    onClose={onCancel}
    aria-labelledby="query-recovery-title"
    aria-describedby="query-recovery-description"
    maxWidth={false}
    scroll="paper"
    PaperProps={{ className: 'query-recovery-paper', role: 'alertdialog' }}
  >
    <DialogTitle className="query-recovery-title" id="query-recovery-title">
      <span className="query-recovery-eyebrow">{recoveryEyebrow(category)}</span>
      <span>{issue?.title}</span>
    </DialogTitle>
    <IconButton className="query-recovery-close" aria-label="Close and cancel query" onClick={onCancel} disabled={busy}>
      <CloseRoundedIcon />
    </IconButton>

    <DialogContent className="query-recovery-content">
      <Diagnostics key={JSON.stringify(issue)} description={issue?.message} items={issue?.diagnostics || []} />
      <Box className="query-recovery-original" aria-label="Your original question">
        <Typography className="query-recovery-supporting">Your original question</Typography>
        <Typography>{question}</Typography>
      </Box>
      {issue?.suggestions?.length > 0 && <Box className="query-recovery-section">
        <Typography className="query-recovery-section-label">Suggested changes — select one to edit before submitting:</Typography>
        <Box className="query-recovery-options">
          {issue.suggestions.map(s => {
            const suggestionText = typeof s === 'string' ? s : s.instruction;
            const isSelected = instruction === suggestionText;
            return <Button
              key={suggestionText}
              className={`query-recovery-option${isSelected ? ' is-selected' : ''}`}
              aria-pressed={isSelected}
              onClick={() => setInstruction(suggestionText)}
              disabled={busy}
            >
              <span className="query-recovery-radio" aria-hidden="true" />
              <span>{typeof s === 'string' ? s : s.label}</span>
            </Button>;
          })}
        </Box>
      </Box>}
      {editable && <Box className="query-recovery-section">
        <Typography component="label" htmlFor="query-recovery-instruction" className="query-recovery-section-label">
          Tell us what to change{!editRequired && <span className="query-recovery-tag">Optional</span>}
        </Typography>
        <TextField
          id="query-recovery-instruction"
          className="query-recovery-edit"
          placeholder="Describe only the change. We’ll keep the rest of your question."
          multiline
          minRows={3}
          value={instruction}
          onChange={event => setInstruction(event.target.value)}
          disabled={busy}
          required={editRequired}
          inputProps={{ 'aria-label': 'Tell us what to change', 'aria-required': editRequired }}
          fullWidth
        />
        <Typography className="query-recovery-helper">Describe only the change. We’ll keep the rest of your question.</Typography>
      </Box>}
      {busy && <Alert className="query-recovery-busy" severity="info">Updating your search…</Alert>}
    </DialogContent>

    <DialogActions className="query-recovery-actions">
      <Button className="query-recovery-cancel" onClick={onCancel} disabled={busy}>Cancel query</Button>
      <Button className="query-recovery-primary" variant={primaryLabel === 'Retry original question' ? 'outlined' : 'contained'} onClick={handlePrimary} disabled={busy || countdown > 0 || (editRequired && !instruction.trim()) || (!issue?.retryable && !isOperatorIssue && !isReleaseMismatch && !instruction.trim())}>
        {primaryLabel}
      </Button>
    </DialogActions>
  </Dialog>;
}
