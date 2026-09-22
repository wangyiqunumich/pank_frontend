/* Recovery dialog — per-variant configuration.
   One shared component (recovery-dialog.js) renders every variant from this table.
   Copy comes from inventories/error-catalog.json (QueryRecoveryDialog.js); recovery semantics follow the
   catalog: "Retry original question" → retryable, "Operator correction or explicit clarification" → not retryable. */
window.RECOVERY_VARIANTS = {
  'error-authentication': {
    eyebrow: 'Authentication', title: 'A search service is unavailable',
    description: 'The server could not authenticate with a required search service. The demo operator needs to restore access; your question does not need changing.',
    userFixable: false, editable: true, editRequired: false, retryable: false,
    primaryLabel: 'Contact operator', secondaryLabel: 'Cancel query',
    placeholder: 'Only if you want the operator to re-run a changed question, e.g. “also include islet eQTL evidence”.'
  },
  'error-authorization': {
    eyebrow: 'Authorization', title: 'A search service is unavailable',
    description: 'A required search service denied the server access. The demo operator needs to restore access; your question does not need changing.',
    userFixable: false, editable: true, editRequired: false, retryable: false,
    primaryLabel: 'Contact operator', secondaryLabel: 'Cancel query',
    placeholder: 'Only if you want the operator to re-run a changed question.'
  },
  'error-billing': {
    eyebrow: 'Billing', title: 'The model service needs operator attention',
    description: 'The model provider could not process this request because of its account billing status. The demo operator needs to restore access; changing your question will not resolve this problem.',
    userFixable: false, editable: true, editRequired: false, retryable: false,
    primaryLabel: 'Contact operator', secondaryLabel: 'Cancel query',
    placeholder: 'Only if you want the operator to re-run a changed question.'
  },
  'error-budget_exhausted': {
    eyebrow: 'Budget exhausted', title: 'The demo’s API budget is exhausted',
    description: 'The demo cannot make more model calls until its operator updates the budget. Changing your question will not resolve this problem.',
    userFixable: false, editable: true, editRequired: false, retryable: false,
    primaryLabel: 'Contact operator', secondaryLabel: 'Cancel query',
    placeholder: 'Only if you want the operator to re-run a changed question once the budget is restored.'
  },
  'error-clarification': {
    eyebrow: 'Clarification required', title: 'Let’s clarify this search',
    description: 'Which stage should be included? The requested stage cannot be uniquely resolved. Pick a suggestion or describe the change; the rest of your question stays as it is.',
    userFixable: true, editable: true, editRequired: true, retryable: true,
    primaryLabel: 'Send clarification', secondaryLabel: 'Cancel query',
    placeholder: 'e.g. “Established T1D only (stage 3), keep the tissue and assay filters.”',
    suggestions: [
      { label: 'All stages, shown separately', recommended: true,
        text: 'Show each recorded T1D stage separately; keep the tissue and assay filters unchanged.' },
      { label: 'Established T1D only', detail: '(stage 3)',
        text: 'Include established T1D only (stage 3); keep the tissue and assay filters unchanged.' },
      { label: 'Pre-symptomatic only', detail: '(stages 1–2)',
        text: 'Include pre-symptomatic T1D only (stages 1–2); keep the tissue and assay filters unchanged.' }
    ]
  },
  'error-graph_identity': {
    eyebrow: 'Graph identity', title: 'The graph release could not be verified',
    description: 'The server could not verify the configured graph release. The demo operator needs to check the connection; do not change your biological question.',
    userFixable: false, editable: true, editRequired: false, retryable: false,
    primaryLabel: 'Contact operator', secondaryLabel: 'Cancel query',
    placeholder: 'Only if you want the operator to re-run a changed question.'
  },
  'error-graph_release_mismatch': {
    eyebrow: 'Graph release mismatch', title: 'This result uses a different graph release',
    description: 'This saved result was produced against another graph release. Start a fresh search against the configured graph; your original question will be retained and does not need changing.',
    userFixable: false, editable: false, editRequired: false, retryable: true,
    primaryLabel: 'Start a fresh search', secondaryLabel: 'Cancel query'
  },
  'error-empty-plan': {
    eyebrow: 'Planning failure', title: 'We couldn’t prepare this search',
    description: 'Your question was received, but we could not create executable search steps. You can retry without changing your question.',
    userFixable: true, editable: true, editRequired: false, retryable: true,
    primaryLabel: 'Try again', secondaryLabel: 'Cancel query',
    placeholder: 'e.g. “Focus on beta-cell genes only” or “limit to islet tissue”.'
  },
  'error-query_validation': {
    eyebrow: 'Query validation', title: 'We couldn’t prepare a reliable database search',
    description: 'The generated database query did not preserve the required search rules. No conclusion about data availability can be drawn. You can retry the same question.',
    userFixable: true, editable: true, editRequired: false, retryable: true,
    primaryLabel: 'Try again', secondaryLabel: 'Cancel query',
    placeholder: 'e.g. “Restrict to a single gene” or “drop the tissue filter”.'
  },
  'error-rate_limited': {
    eyebrow: 'Rate limited', title: 'The search service is busy',
    description: 'The search service temporarily limited requests. Wait briefly, then retry the same question. You do not need to change your filters.',
    userFixable: false, editable: false, editRequired: false, retryable: true, countdownSeconds: 12,
    primaryLabel: 'Try again', secondaryLabel: 'Cancel query'
  },
  'error-timeout': {
    eyebrow: 'Timeout', title: 'The search took longer than expected',
    description: 'The search reached its time limit. This does not mean there are no matching records. Retry the same question; any evidence already retrieved is retained.',
    userFixable: 'partly', editable: true, editRequired: false, retryable: true, countdownSeconds: 12,
    primaryLabel: 'Try again', secondaryLabel: 'Cancel query',
    placeholder: 'e.g. “Narrow to islet eQTL only” to make the search faster.'
  },
  'error-unknown_failure': {
    eyebrow: 'Unknown failure', title: 'The search could not finish',
    description: 'A search service could not finish this request. This does not establish that the requested data is absent. You can retry the same question without changing its filters.',
    userFixable: false, editable: true, editRequired: false, retryable: true,
    primaryLabel: 'Try again', secondaryLabel: 'Cancel query',
    placeholder: 'e.g. “Same question, but only the top 20 results”.'
  }
};
window.RECOVERY_DEFAULTS = {
  originalQuestion: 'Show the evidence connected to INS.',
  originalQuestionLabel: 'Your original question',
  editLabel: 'Tell us what to change', editOptional: 'Optional',
  editHelper: 'Describe only the change. We’ll keep the rest of your question.',
  applyLabel: 'Apply & try again', loadingLabel: 'Trying…',
  suggestionsLabel: 'Suggested changes — select one to edit before submitting:',
  failure1: 'Still unavailable. Try again shortly.',
  failureN: (n) => `Still unavailable after ${n} attempts. Contact the demo operator.`,
  countdownLabel: (s) => `Try again in ${s}s`,
  cancelled: 'Query cancelled', undo: 'Undo',
  operatorNotified: 'Operator notified. In this design snapshot no message is sent.',
  successTarget: 'agent-plan'
};
