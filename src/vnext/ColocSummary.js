import React, { useEffect, useState } from 'react';
import AnswerMarkdown from './AnswerMarkdown';
import { componentsPending, pollResult, request } from './api';

// Only coalesce simultaneous mounts. The service owns durable reuse, including
// the scientific snapshot and shared PanKagent answer-bundle version.
const pending = new Map();
export function createColocSummary(recordId) {
  if (!/^[a-f0-9]{64}$/.test(recordId || '')) return Promise.reject(new Error('A valid recorded colocalization is required.'));
  if (!pending.has(recordId)) {
    const task = request(`/coloc/records/${encodeURIComponent(recordId)}/summary`, { method: 'POST' })
      .then(value => {
        if (!value.result_id || value.source?.kind !== 'coloc' || value.source?.record_id !== recordId) {
          throw new Error('The summary service returned a different record. Reopen this analysis to check its saved summary.');
        }
        return value;
      }).finally(() => pending.delete(recordId));
    pending.set(recordId, task);
  }
  return pending.get(recordId);
}

export default function ColocSummary({ detail, loading = false }) {
  const recordId = detail?.record?.id;
  const [state, setState] = useState(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!recordId || loading) return undefined;
    const controller = new AbortController();
    let current = true;
    const update = result => {
      if (result.source?.kind !== 'coloc' || result.source?.record_id !== recordId) throw new Error('The saved summary does not match this analysis.');
      if (current) setState({ recordId, result, busy: componentsPending(result), error: '' });
    };
    setState({ recordId, result: null, busy: true, error: '' });
    // A navigation cancels reading, never the durable server generation. A later
    // visit reads the same saved result instead of regenerating after uncertainty.
    createColocSummary(recordId).then(async result => {
      if (!current) return;
      update(result);
      if (componentsPending(result)) await pollResult(result.result_id, update, { signal: controller.signal });
    }).catch(error => {
      if (current && error.name !== 'AbortError') setState(previous => ({ ...previous, recordId, busy: false, error: error.message || 'The saved summary could not be read.' }));
    });
    return () => { current = false; controller.abort(); };
  }, [recordId, loading, attempt]);

  const active = state?.recordId === recordId ? state : null;
  const result = active?.result;
  const answer = typeof result?.answer === 'string' ? result.answer : result?.answer?.text || '';
  const answerState = result?.component_status?.answer;
  const failed = ['failed', 'interrupted', 'unavailable', 'skipped'].includes(typeof answerState === 'string' ? answerState : answerState?.status);
  const partial = (typeof answerState === 'string' ? answerState : answerState?.status) === 'partial';
  const busy = loading || !recordId || !active || active.busy;
  return <section className="coloc-card coloc-summary" aria-labelledby="coloc-summary-title" aria-busy={busy}>
    <div className="coloc-panel-heading"><div><h2 id="coloc-summary-title">AI summary</h2><p>PanKagent interpretation of this recorded signal pair</p></div></div>
    {answer && <AnswerMarkdown answer={answer} references={result?.resources?.references || []} density="compact" />}
    {busy && <p className="coloc-loading" role="status">{loading || !recordId ? 'Waiting for credible-set evidence…' : 'Writing the grounded summary…'}</p>}
    {active?.error && <div className="coloc-error" role="alert">{active.error} <button onClick={() => setAttempt(value => value + 1)}>Check saved summary</button></div>}
    {!busy && partial && <p className="coloc-notice" role="status">This saved summary is incomplete or had unsupported reference IDs removed. Use the recorded evidence below to check its interpretation.</p>}
    {!busy && !active?.error && (failed || !answer) && <p className="coloc-notice" role="status">The AI summary is unavailable for this saved result. The recorded evidence and downloads below remain available.</p>}
  </section>;
}
