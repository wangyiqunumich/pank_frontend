export const abortError = () => new DOMException('Aborted', 'AbortError');
export const browserPaused = () => (typeof navigator !== 'undefined' && navigator.onLine === false)
  || (typeof document !== 'undefined' && document.visibilityState === 'hidden');

export function waitForBrowser(signal, onConnection = () => {}) {
  if (signal?.aborted) return Promise.reject(abortError());
  if (!browserPaused()) return Promise.resolve();
  onConnection('paused');
  return new Promise((resolve, reject) => {
    const cleanup = () => { window.removeEventListener('online', check); document.removeEventListener('visibilitychange', check); signal?.removeEventListener('abort', cancel); };
    const check = () => { if (!browserPaused()) { cleanup(); resolve(); } };
    const cancel = () => { cleanup(); reject(abortError()); };
    window.addEventListener('online', check); document.addEventListener('visibilitychange', check); signal?.addEventListener('abort', cancel, { once: true });
    check();
  });
}

export function waitDelay(ms, signal) {
  if (signal?.aborted) return Promise.reject(abortError());
  return new Promise((resolve, reject) => {
    const cancel = () => { clearTimeout(timer); signal?.removeEventListener('abort', cancel); reject(abortError()); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', cancel); resolve(); }, ms);
    signal?.addEventListener('abort', cancel, { once: true });
  });
}

export const retryableRead = error => !error?.protocol && error?.name !== 'AbortError'
  && (!error?.status || [408, 429, 502, 503, 504].includes(error.status));
export const retryDelay = (attempt, baseDelay = 750, random = Math.random) => Math.min(8000, baseDelay * (2 ** attempt)) * (0.8 + random() * 0.4);

// Only callers performing GET reads use this helper. No mutation is replayed here.
export async function readWithRecovery(read, { signal, onConnection = () => {}, maxRetries = 4, baseDelay = 750, random = Math.random } = {}) {
  for (let attempt = 0; ; attempt += 1) {
    await waitForBrowser(signal, onConnection);
    if (signal?.aborted) throw abortError();
    try { const value = await read(); if (signal?.aborted) throw abortError(); onConnection('connected'); return value; }
    catch (error) {
      if (signal?.aborted || error.name === 'AbortError') throw error;
      if (!retryableRead(error) || attempt >= maxRetries) { onConnection('exhausted'); throw error; }
      onConnection('reconnecting');
      await waitDelay(retryDelay(attempt, baseDelay, random), signal);
    }
  }
}
