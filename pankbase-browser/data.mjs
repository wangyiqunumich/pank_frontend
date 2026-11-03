// Bounded public reads, complete BioIndex pages, and retryable session reuse.
const ORIGINS = new Set(['https://bioindex.pankbase.org', 'https://bioindex.hugeamp.org', 'https://rest.uniprot.org', 'https://cfde.hugeampkpnbi.org', 'https://bioindex-dev.hugeamp.org']);
const cache = new Map();
const MAX_BYTES = 8 * 1024 * 1024;
let cachedBytes = 0;
export async function readPublic(url, { maxBytes = MAX_BYTES, timeout = 30000, fetcher = fetch } = {}) {
  const target = new URL(url);
  if (!ORIGINS.has(target.origin) || target.username || target.password) throw new Error('Unregistered source.');
  const existing = cache.get(url);
  if (existing) {
    cache.delete(url); cache.set(url, existing);
    const content = await existing.promise;
    if (existing.bytes > maxBytes) throw new Error('Source exceeds the browser transfer budget.');
    return content;
  }
  const record = { bytes: 0 };
  record.promise = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetcher(target.href, { credentials: 'omit', signal: controller.signal });
      if (!response.ok) throw new Error(`Source returned HTTP ${response.status}.`);
      const reader = response.body?.getReader();
      let content;
      if (reader) {
        const chunks = []; let size = 0;
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > maxBytes) { await reader.cancel(); throw new Error('Source exceeds the browser transfer budget.'); }
          chunks.push(value);
        }
        const bytes = new Uint8Array(size); let offset = 0;
        for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
        content = new TextDecoder().decode(bytes);
        record.bytes = size;
      } else {
        content = await response.text(); record.bytes = new TextEncoder().encode(content).length;
        if (record.bytes > maxBytes) throw new Error('Source exceeds the browser transfer budget.');
      }
      if (cache.get(url) === record) cachedBytes += record.bytes;
      while (cache.size > 24 || cachedBytes > 24 * 1024 * 1024) {
        const oldest = cache.keys().next().value;
        cachedBytes -= cache.get(oldest).bytes; cache.delete(oldest);
      }
      return content;
    } catch (error) { if (cache.get(url) === record) cache.delete(url); throw error; }
    finally { clearTimeout(timer); }
  })();
  cache.set(url, record);
  return record.promise;
}

export async function readBioIndex(url, options) {
  let target = url; const rows = []; const seen = new Set(); let bytes = 0;
  for (let page = 0; page < 40; page++) {
    if (seen.has(target)) throw new Error('The source returned a repeated continuation.');
    seen.add(target);
    const raw = await readPublic(target, options); bytes += new TextEncoder().encode(raw).length;
    if (bytes > MAX_BYTES) throw new Error('Complete results exceed the browser transfer budget.');
    let payload;
    try {
      payload = JSON.parse(raw);
      if (!payload || typeof payload !== 'object') throw new Error('Invalid source response.');
      if (payload.restricted > 0) throw new Error('This source includes restricted records.');
    } catch (error) {
      const entry = cache.get(target);
      if (entry) { cachedBytes -= entry.bytes; cache.delete(target); }
      throw error;
    }
    if (!Array.isArray(payload.data)) return payload;
    rows.push(...payload.data);
    if (rows.length > 100000) throw new Error('Complete results exceed the row budget.');
    if (!payload.continuation) return { ...payload, data: rows, count: rows.length };
    target = `${new URL(url).origin}/api/bio/cont?token=${encodeURIComponent(payload.continuation)}`;
  }
  throw new Error('The source did not finish within the page budget.');
}
