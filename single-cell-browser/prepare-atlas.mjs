// Build-time projection. Full upstream metadata never enters the browser bundle.
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { DATASET, readPublic, validateAtlas, validateCompact } from './data.mjs';
const directory = new URL('./public/atlas/', import.meta.url);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
await mkdir(directory, { recursive: true });
if (!process.argv.includes('--refresh')) {
  try {
    const manifest = JSON.parse(await readFile(new URL('manifest.json', directory)));
    const bytes = await readFile(new URL(manifest.asset, directory));
    if (manifest.datasetId === DATASET && manifest.asset === `map-${digest(bytes)}.json`) {
      console.log(`Using verified compact atlas: ${bytes.length} bytes, ${manifest.count} cells.`);
      process.exit(0);
    }
  } catch { /* First build or missing asset: regenerate. */ }
}
const sourceLimit = 160 * 1024 * 1024;
const paths = ['/api/raw/file/single_cell_all_metadata/dataset_metadata.json.gz', `/api/raw/file/single_cell/${DATASET}/fields.json.gz`, `/api/raw/file/single_cell/${DATASET}/coordinates.tsv.gz`];
const [catalog, fields, coordinates] = await Promise.all(paths.map(path => readPublic(path, sourceLimit)));
const entry = catalog.trim().split('\n').map(JSON.parse).find(row => row.datasetId === DATASET && row.method === 'scRNAseq');
if (!entry) throw new Error('Registered scRNA atlas is missing.');
const atlas = validateAtlas(JSON.parse(fields), coordinates, entry.totalCells);
const cells = Buffer.alloc(entry.totalCells * 9);
for (let i = 0; i < entry.totalCells; i++) {
  cells.writeFloatLE(atlas.points.X[i], i * 9); cells.writeFloatLE(atlas.points.Y[i], i * 9 + 4); cells[i * 9 + 8] = atlas.codes[i];
}
const packed = { version: 1, datasetId: DATASET, labels: atlas.labels, cells: cells.toString('base64') };
validateCompact(packed, entry.totalCells);
const json = JSON.stringify(packed), bytes = gzipSync(json, { level: 9 });
if (bytes.length > 8 * 1024 * 1024 || Buffer.byteLength(json) > 16 * 1024 * 1024) throw new Error('Compact atlas exceeds delivery budget.');
const asset = `map-${digest(json)}.json`;
const manifest = { version: 1, datasetId: DATASET, count: entry.totalCells, title: entry.datasetName, asset, retrievedAt: new Date().toISOString(), source: paths.map((path, i) => ({ path, sha256: digest([catalog, fields, coordinates][i]) })), estimatedGzipBytes: bytes.length, assetBytes: Buffer.byteLength(json), decodedBytes: Buffer.byteLength(json), originalMetadataBytes: Buffer.byteLength(fields) };
await writeFile(new URL(asset, directory), json);
await writeFile(new URL('manifest.json.tmp', directory), JSON.stringify(manifest, null, 2));
await rename(new URL('manifest.json.tmp', directory), new URL('manifest.json', directory));
console.log(JSON.stringify(manifest, null, 2));
