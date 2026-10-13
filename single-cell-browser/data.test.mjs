import test from 'node:test';
import assert from 'node:assert/strict';
import { DATASET, FIELD, validateAtlas, validateExpression, summaries, createLoader, validateCompact, readPublic } from './data.mjs';
const fields = { NAME: ['one', 'two', 'three'], metadata_labels: { [FIELD]: ['Alpha', 'Beta'] }, metadata: { [FIELD]: [0, 1, 1] } };
const coords = 'X\tY\n0\t1\n2\t3\n4\t5\n';
const bytes = Buffer.alloc(27);
[0, 2, 4].forEach((x, i) => { bytes.writeFloatLE(x, i * 9); bytes.writeFloatLE(x + 1, i * 9 + 4); bytes[i * 9 + 8] = i ? 1 : 0; });
const packed = { version: 1, datasetId: DATASET, labels: fields.metadata_labels[FIELD], cells: bytes.toString('base64') };
const manifest = { version: 1, datasetId: DATASET, count: 3, asset: `map-${'a'.repeat(64)}.json.gz`, retrievedAt: '2026-10-13T00:00:00Z' };
const payload = { data: [{ dataset: DATASET, gene: 'INS', expression: [0, 2, 4] }] };
test('preserves alignment and includes zeros in cell denominators', () => {
  const atlas = validateAtlas(fields, coords, 3);
  const expression = validateExpression(payload, 'INS', 3);
  const rows = summaries(atlas, expression, 'INS');
  assert.equal(rows[0].count, 1); assert.equal(rows[0].median, 0);
  assert.equal(rows[1].median, 3); assert.equal(rows[1].q1, 2.5);
  assert.equal(atlas.NAME, undefined);
});
test('rejects truncated vectors, restricted data, missing genes and malformed coordinates', () => {
  assert.throws(() => validateExpression(payload, 'INS', 4), /alignment/);
  assert.throws(() => validateExpression({ ...payload, restricted: true }, 'INS', 3), /restricted/);
  assert.throws(() => validateExpression({ ...payload, continuation: 'next' }, 'INS', 3), /incomplete/);
  assert.throws(() => validateExpression(payload, 'GCG', 3), /not available/);
  assert.throws(() => validateAtlas(fields, coords.replace('0\t1', 'NaN\t1'), 3), /alignment/);
});
test('caches shared atlas reads and gene vectors, evicts failed gene requests', async () => {
  const calls = [];
  const read = async path => { calls.push(path);
    if (path.endsWith('manifest.json')) return JSON.stringify(manifest);
    if (path.startsWith('./atlas/')) return JSON.stringify(packed);
    if (path.includes(',MISSING')) throw new Error('offline');
    return JSON.stringify(payload);
  };
  const load = createLoader(read);
  await Promise.all([load('INS'), load('INS')]);
  assert.equal(calls.length, 3);
  await assert.rejects(load('MISSING')); await assert.rejects(load('MISSING'));
  assert.equal(calls.filter(path => path.includes(',MISSING')).length, 2);
});
test('packed map retains source order and skips large metadata on a return visit', async () => {
  const atlas = validateAtlas(fields, coords, 3);
  assert.ok(atlas.points.X instanceof Float32Array);
  assert.deepEqual([...atlas.points.Y], [1, 3, 5]);
  assert.ok(atlas.codes instanceof Uint8Array);
  const cached = packed;
  const calls = [];
  const read = async path => { calls.push(path); return path.endsWith('manifest.json') ? JSON.stringify(manifest) : JSON.stringify(payload); };
  const load = createLoader(read, { get: async () => cached, set: async () => {} });
  let atlasShown = false;
  const result = await load('INS', atlas => { atlasShown = true; assert.equal(atlas.cacheHit, true); });
  assert.equal(atlasShown, true); assert.equal(result.stats[1].median, 3);
  assert.equal(calls.length, 2);
  assert.ok(!calls.some(path => /fields|coordinates/.test(path)));
});
test('starts expression before atlas completes and presents the map before expression', async () => {
  let finishExpression;
  const pending = new Promise(resolve => { finishExpression = resolve; });
  const events = [];
  const read = async path => {
    if (path.includes('single-cell-lognorm')) { events.push('expression-start'); return pending; }
    if (path.endsWith('manifest.json')) return JSON.stringify(manifest);
    return JSON.stringify(packed);
  };
  const load = createLoader(read, { get: async () => undefined, set: async () => {} });
  const result = load('INS', () => { events.push('atlas-visible'); finishExpression(JSON.stringify(payload)); });
  await result;
  assert.deepEqual(events, ['expression-start', 'atlas-visible']);
});
test('compact atlas never fetches full upstream metadata or coordinates', async () => {
  const paths = [];
  const read = async path => { paths.push(path);
    if (path.endsWith('manifest.json')) return JSON.stringify(manifest);
    return JSON.stringify(packed);
  };
  const load = createLoader(read, { get: async () => undefined, set: async () => {} });
  const atlas = await load.atlas();
  assert.equal(atlas.points.count, 3);
  assert.equal(paths.length, 2);
  assert.ok(paths.every(path => !path.includes('single-cell-lognorm')));
});

test('compact projection preserves all cells, order and aligned gene coloring', async () => {
  const atlas = validateCompact(packed, 3);
  assert.deepEqual([...atlas.points.X], [0, 2, 4]);
  assert.deepEqual([...atlas.codes], [0, 1, 1]);
  assert.throws(() => validateCompact({ ...packed, cells: bytes.subarray(0, 9).toString('base64') }, 3), /alignment/);
  assert.throws(() => validateCompact({ ...packed, labels: ['Alpha'] }, 3), /alignment/);
  assert.throws(() => validateCompact({ ...packed, cells: 'malformed' }, 3), /alignment/);
  const reads = [];
  const load = createLoader(async path => { reads.push(path); return JSON.stringify(path.endsWith('manifest.json') ? manifest : path.startsWith('./atlas/') ? packed : payload); }, { get: async () => undefined, set: async () => {} });
  const result = await load('INS');
  assert.deepEqual(result.expression, [0, 2, 4]);
  assert.ok(reads.every(path => !/fields.json|coordinates.tsv|dataset_metadata/.test(path)));
});

test('worker asset path resolves to the atlas beside index.html', async () => {
  const originalFetch = globalThis.fetch, originalLocation = globalThis.location;
  const paths = [];
  try {
    globalThis.location = { origin: 'https://local.example', pathname: '/scbrowser/assets/data.worker-123.js' };
    globalThis.fetch = async url => { paths.push(String(url)); return new Response('{}'); };
    assert.equal(await readPublic('./atlas/manifest.json'), '{}');
    assert.deepEqual(paths, ['https://local.example/scbrowser/atlas/manifest.json']);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalLocation === undefined) delete globalThis.location; else globalThis.location = originalLocation;
  }
});
