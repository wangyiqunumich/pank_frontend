import { ensureIntent, newId, newIntent } from './agentIdentity';

beforeEach(() => localStorage.clear());
test('new intents use distinct UUIDs and preserve a supplied conversation ID', () => {
  const first = newIntent('conversation'), second = newIntent('conversation');
  expect(first.session_id).toBe('conversation');
  expect(first.request_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  expect(first.request_id).not.toBe(second.request_id);
  expect(JSON.parse(localStorage.getItem(`pank-vnext:intent:${first.request_id}`))).toEqual(first);
});
test('reload keeps the request/session identities in the URL', () => {
  const original = newIntent();
  expect(ensureIntent(new URLSearchParams(original))).toEqual(original);
});
test('the getRandomValues fallback still produces valid UUIDs', () => {
  const original = window.crypto;
  Object.defineProperty(window, 'crypto', { configurable: true, value: { getRandomValues: original.getRandomValues.bind(original) } });
  try { expect(newId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/); }
  finally { Object.defineProperty(window, 'crypto', { configurable: true, value: original }); }
});
