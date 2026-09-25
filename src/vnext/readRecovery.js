export const abortError = () => new DOMException('Aborted', 'AbortError');

export function waitDelay(ms, signal) {
  if (signal?.aborted) return Promise.reject(abortError());
  return new Promise((resolve, reject) => {
    const cancel = () => { clearTimeout(timer); signal?.removeEventListener('abort', cancel); reject(abortError()); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', cancel); resolve(); }, ms);
    signal?.addEventListener('abort', cancel, { once: true });
  });
}

// Saved reads are independent of tab visibility. Failures are surfaced to the caller.
export async function readWithRecovery(read, { signal, onConnection = () => {} } = {}) {
  if (signal?.aborted) throw abortError();
  try {
    const value = await read();
    if (signal?.aborted) throw abortError();
    onConnection('connected');
    return value;
  } catch (error) {
    if (signal?.aborted || error.name === 'AbortError') throw error;
    onConnection('exhausted');
    throw error;
  }
}
