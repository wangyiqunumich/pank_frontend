// Local, content-free UX observations. They never gate query execution.
import { request } from './api';

let pageId;
const sent = new Set();
let failures = 0;
export const telemetryStatus = () => ({ failed: failures, observed: sent.size });
export function referenceKey(value) {
  let hash = 2166136261;
  for (const char of String(value)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return `ref-${(hash >>> 0).toString(16)}`;
}
export function recordInteraction(runId, kind, targetId, scope = 'run') {
  if (!runId || typeof crypto === 'undefined' || typeof crypto.randomUUID !== 'function') return Promise.resolve(false);
  pageId ||= crypto.randomUUID();
  const key = JSON.stringify([scope, runId, kind, targetId]);
  if (sent.has(key)) return Promise.resolve(false);
  sent.add(key);
  let actorSource = 'user';
  try { const value = sessionStorage.getItem('pank-vnext:actor-source'); if (['audit_replay', 'synthetic_fault'].includes(value)) actorSource = value; } catch (_) { /* optional audit attribution */ }
  const payload = { actor_source: actorSource, event_id: crypto.randomUUID(), page_id: pageId, kind, target_id: targetId,
    client_timestamp: new Date().toISOString(), client_elapsed_ms: Math.min(performance.now(), 86400000) };
  return request(`${scope === 'result' ? '/results' : '/agent/v2/runs'}/${encodeURIComponent(runId)}/interactions`, {
    method: 'POST', body: JSON.stringify(payload),
  }).then(() => true).catch(() => {
    failures += 1;
    // No user text, resource URLs, credentials, or provider output in logs.
    console.warn('[PanKgraph] UX observation unavailable.');
    return false;
  });
}
