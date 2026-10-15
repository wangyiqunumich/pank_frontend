import { safeLocalStorage } from './safeStorage';

export const newId = () => {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map(value => value.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
};
export function newIntent(sessionId = newId()) {
  const intent = { session_id: sessionId, request_id: newId() };
  safeLocalStorage.setItem(`pank-vnext:intent:${intent.request_id}`, JSON.stringify(intent));
  return intent;
}
export function ensureIntent(params) {
  const intent = { session_id: params.get('session_id') || newId(), request_id: params.get('request_id') || newId() };
  safeLocalStorage.setItem(`pank-vnext:intent:${intent.request_id}`, JSON.stringify(intent));
  return intent;
}
