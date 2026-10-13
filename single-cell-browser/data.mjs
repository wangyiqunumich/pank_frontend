import { atlasCache } from './cache.mjs';
export const ORIGIN = 'https://bioindex.pankbase.org';
export const DATASET = 'islet_of_Langerhans_scRNA_v3-4';
export const FIELD = 'Cell Type';
export async function readPublic(path, limit = 16 * 1024 * 1024) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90000);
  try {
    // Workers live under assets/ in production, while atlas/ is beside index.html.
    const localBase = globalThis.location ? `${location.origin}${location.pathname.replace(/\/(?:assets\/)?[^/]*$/, '/')}` : import.meta.url;
    const response = await fetch(path.startsWith('./atlas/') ? new URL(path, localBase) : `${ORIGIN}${path}`, { credentials: 'omit', signal: controller.signal });
    if (!response.ok) throw new Error(`Atlas request failed (${response.status}).`);
    const reader = response.body.getReader(); const chunks = []; let size = 0;
    for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > limit) { controller.abort(); throw new Error('Atlas response exceeds the browser size limit.'); } chunks.push(value); }
    let bytes = new Uint8Array(size); let offset = 0; chunks.forEach(chunk => { bytes.set(chunk, offset); offset += chunk.length; });
    if (bytes[0] === 31 && bytes[1] === 139) {
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
      const reader = stream.getReader(); const expanded = []; let length = 0;
      for (;;) { const { done, value } = await reader.read(); if (done) break; length += value.length; if (length > limit) { await reader.cancel(); throw new Error('Expanded atlas exceeds the browser size limit.'); } expanded.push(value); }
      bytes = new Uint8Array(length); let at = 0; expanded.forEach(chunk => { bytes.set(chunk, at); at += chunk.length; });
    }
    return new TextDecoder().decode(bytes);
  } finally { clearTimeout(timer); }
}
export function validateAtlas(fields, tsv, expectedCount) {
  const labels = fields.metadata_labels?.[FIELD]; const codes = fields.metadata?.[FIELD];
  if (!Array.isArray(labels) || !labels.length || !Array.isArray(codes) || !Array.isArray(fields.NAME)) throw new Error('Atlas cell-type metadata is unavailable.');
  const lines = tsv.trim().split(/\r?\n/);
  if (lines.shift() !== 'X\tY') throw new Error('Unsupported atlas coordinate columns.');
  const X = new Float32Array(lines.length), Y = new Float32Array(lines.length);
  lines.forEach((line, index) => { const pair = line.split('\t'); X[index] = pair.length === 2 && pair[0].trim() ? Number(pair[0]) : NaN; Y[index] = pair.length === 2 && pair[1].trim() ? Number(pair[1]) : NaN; });
  const points = { count: lines.length, X, Y, Z: null };
  if (points.count !== codes.length || fields.NAME.length !== points.count || points.count !== expectedCount
    || X.some(value => !Number.isFinite(value)) || Y.some(value => !Number.isFinite(value))
    || codes.some(code => !Number.isInteger(code) || code < 0 || code >= labels.length)) throw new Error('Atlas coordinate/metadata alignment failed.');
  return { points, labels, codes: labels.length <= 256 ? new Uint8Array(codes) : new Uint16Array(codes) };
}
export function validateExpression(payload, gene, count) {
  if (payload.restricted || payload.continuation) throw new Error('Expression response is restricted or incomplete.');
  const row = payload.data?.find(row => row.dataset === DATASET && row.gene === gene);
  if (!row) throw new Error(`Gene ${gene} is not available in this atlas.`);
  if (!Array.isArray(row.expression) || row.expression.length !== count || row.expression.some(value => typeof value !== 'number' || !Number.isFinite(value) || value < 0)) throw new Error('Expression/coordinate alignment failed.');
  return row.expression;
}
export function summaries(atlas, expression, gene) {
  const values = atlas.labels.map(() => []);
  expression.forEach((value, index) => values[atlas.codes[index]].push(value));
  const quantile = (sorted, p) => { const at = (sorted.length - 1) * p, lo = Math.floor(at); return sorted[lo] + (sorted[Math.ceil(at)] - sorted[lo]) * (at - lo); };
  return values.flatMap((list, index) => {
    if (!list.length) return []; list.sort((a, b) => a - b);
    return [{ [FIELD]: atlas.labels[index], gene, count: list.length, min: list[0], max: list[list.length - 1], q1: quantile(list, .25), median: quantile(list, .5), q3: quantile(list, .75), exprValues: list }];
  });
}
export function createLoader(read = readPublic, cache = atlasCache, refresh = false) {
  let atlasPromise; const genes = new Map();
  async function atlas() {
    if (!atlasPromise) atlasPromise = (async () => {
      const manifest = JSON.parse(await read('./atlas/manifest.json'));
      if (manifest.version !== 1 || manifest.datasetId !== DATASET || !Number.isInteger(manifest.count)
        || manifest.count < 1 || !/^map-[a-f0-9]{64}\.json\.gz$/.test(manifest.asset)) throw new Error('Invalid compact atlas manifest.');
      const cacheKey = `${DATASET}:${manifest.asset}`;
      const cached = refresh ? null : await cache.get(cacheKey);
      if (cached) {
        try { return { ...validateCompact(cached, manifest.count), title: manifest.title, retrievedAt: manifest.retrievedAt, cacheHit: true }; }
        catch (_) { await cache.clear(cacheKey); }
      }
      const packed = JSON.parse(await read(`./atlas/${manifest.asset}`));
      const atlas = { ...validateCompact(packed, manifest.count), title: manifest.title, retrievedAt: manifest.retrievedAt };
      await cache.set(cacheKey, packed);
      return { ...atlas, cacheHit: false };
    })().catch(error => { atlasPromise = null; throw error; });
    return atlasPromise;
  }
  const load = async (gene, onAtlas = () => {}) => {
    if (!/^[A-Z0-9][A-Z0-9._-]{0,79}$/.test(gene)) throw new Error('Invalid gene symbol.');
    // Start expression alongside the shared atlas. Wrap errors immediately to avoid
    // unhandled rejections while the larger first atlas request is still in flight.
    if (!genes.has(gene)) {
      if (genes.size >= 3) genes.delete(genes.keys().next().value);
      genes.set(gene, read(`/api/bio/query/single-cell-lognorm?q=${DATASET},${encodeURIComponent(gene)}`)
        .then(text => ({ payload: JSON.parse(text) })).catch(error => { genes.delete(gene); return { error }; }));
    }
    const pending = genes.get(gene);
    const data = await atlas();
    onAtlas(data);
    const result = await pending;
    if (result.error) throw result.error;
    let expression;
    try { expression = validateExpression(result.payload, gene, data.points.count); }
    catch (error) { genes.delete(gene); throw error; }
    return { atlas: data, expression, stats: summaries(data, expression, gene) };
  };
  load.atlas = atlas;
  return load;
}

// The build projects only these fields, in original source row order. No sampling.
export function validateCompact(value, count) {
  const { labels, cells } = value || {};
  if (value?.version !== 1 || value.datasetId !== DATASET || !Array.isArray(labels) || !labels.length
    || labels.length > 256 || labels.some(label => typeof label !== 'string')
    || typeof cells !== 'string' || cells.length > Math.ceil(count * 9 / 3) * 4) {
    throw new Error('Compact atlas coordinate/metadata alignment failed.');
  }
  let raw;
  try { raw = Uint8Array.from(atob(cells), char => char.charCodeAt(0)); }
  catch { throw new Error('Compact atlas coordinate/metadata alignment failed.'); }
  if (raw.length !== count * 9) throw new Error('Compact atlas coordinate/metadata alignment failed.');
  const bytes = new DataView(raw.buffer), X = new Float32Array(count), Y = new Float32Array(count), codes = new Uint8Array(count);
  for (let i = 0; i < count; i++) {
    X[i] = bytes.getFloat32(i * 9, true); Y[i] = bytes.getFloat32(i * 9 + 4, true); codes[i] = raw[i * 9 + 8];
    if (!Number.isFinite(X[i]) || !Number.isFinite(Y[i]) || codes[i] >= labels.length) throw new Error('Compact atlas coordinate/metadata alignment failed.');
  }
  return { points: { count, X, Y, Z: null }, labels, codes };
}
