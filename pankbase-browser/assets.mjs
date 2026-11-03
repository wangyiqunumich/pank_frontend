import { assetUrl } from './source.mjs';
const entries = new Map();
export async function localJson(path, maxBytes = 4 * 1024 * 1024) {
  if (!/^data\/(?:manifest|(?:de|pca)-[a-f0-9]{64})\.json$/.test(path)) throw new Error('Unregistered local asset.');
  if (entries.has(path)) return entries.get(path);
  const promise = (async () => {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(assetUrl(path), { credentials: 'same-origin', signal: controller.signal });
      if (!response.ok) throw new Error('The prepared source asset is unavailable.');
      const reader = response.body.getReader(); const chunks = []; let size = 0;
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        size += value.byteLength;
        if (size > maxBytes) { await reader.cancel(); throw new Error('The source asset exceeds its delivery budget.'); }
        chunks.push(value);
      }
      const bytes = new Uint8Array(size); let offset = 0;
      chunks.forEach(chunk => { bytes.set(chunk, offset); offset += chunk.length; });
      if (path !== 'data/manifest.json') {
        const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(v => v.toString(16).padStart(2, '0')).join('');
        if (!path.includes(hash)) throw new Error('The source asset identity changed.');
      }
      return JSON.parse(new TextDecoder().decode(bytes));
    } finally { clearTimeout(timer); }
  })().catch(error => { entries.delete(path); throw error; });
  entries.set(path, promise);
  // Each asset is <=4 MiB; retain at most four selected views plus manifest.
  if (entries.size > 5) entries.delete(entries.keys().next().value);
  return promise;
}
export function downloadText(text, name, type = 'text/tab-separated-values') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
