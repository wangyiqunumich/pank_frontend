import { QTL_CONFIG } from './qtlContext';
const cache = new Map();
// Reuse production's AWS renderer and exact source/set key. No local plot or LD reconstruction.
export function loadQtlPlot(context) {
  if (!context?.available) return Promise.reject(new Error('Unavailable QTL context'));
  if (cache.has(context.key)) return cache.get(context.key);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), QTL_CONFIG.request.timeout_ms);
  const task = fetch(QTL_CONFIG.request.endpoint, {
    method: 'POST', credentials: 'omit', signal: controller.signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageType: QTL_CONFIG.request.image_type, link: context.key }),
  }).then(async response => {
    if (!response.ok) throw new Error('Plot request failed');
    const raw = await response.text();
    if (raw.length > QTL_CONFIG.request.max_base64_chars + 2) throw new Error('Plot response exceeds limit');
    let data = raw.trim();
    if (data.startsWith('"')) { try { data = JSON.parse(data); } catch (_) { throw new Error('Invalid production plot'); } }
    if (typeof data !== 'string' || data.length > QTL_CONFIG.request.max_base64_chars || !/^[A-Za-z0-9+/]+={0,2}$/.test(data) || !/^(iVBORw0KGgo|\/9j\/)/.test(data)) throw new Error('Invalid production plot');
    return `data:image/${data.startsWith('iVBOR') ? 'png' : 'jpeg'};base64,${data}`;
  }).catch(error => { cache.delete(context.key); throw error; }).finally(() => clearTimeout(timer));
  cache.set(context.key, task);
  while (cache.size > QTL_CONFIG.request.cache_entries) cache.delete(cache.keys().next().value);
  return task;
}
