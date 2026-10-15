# PanKbase data preparation and expression cache

## Version contract

The display label V3.3 is editable copy. The registered source is
`islet_of_Langerhans_scRNA_v3-4`, with 448,935 cells. Never change a display label
as a substitute for changing data identity. The compact atlas asset hash, dataset
and cell count bind every expression vector. All cells remain in source row order.
This relies on PanKbase's positional-vector contract; it is not an independent
barcode alignment, since cell IDs are omitted from the viewer asset.

## Prepare the map from a PanKbase version

1. Inspect the public BioIndex catalog and source `fields.json.gz` and
   `coordinates.tsv.gz`. Check dataset, assay, count, labels, coordinate columns
   and source row order. `prepare-atlas.mjs` performs these checks.
2. Set `DATASET` in `data.mjs` to the reviewed version. Run
   `node single-cell-browser/prepare-atlas.mjs --refresh` from the frontend root.
   This fetches source data on the build host, not in the user's browser.
3. The output packs Float32 X/Y and one cell-type byte per cell, then base64 wraps
   it in JSON. No sampling, donor metadata or cell IDs are included. The generated
   manifest records source hashes, count, retrieval time and immutable asset hash.
4. Review `single-cell-browser/public/atlas/manifest.json`. Update the backend
   registry constants DATASET, ATLAS and COUNT in `scbrowser_expression.py` to
   exactly match this manifest before enabling that version. Validate using:
   `python -m pankgraph_results.scbrowser_expression --verify-manifest manifest.json`.
5. Run frontend/data/backend tests, rebuild, deploy the cache registry first and
   then the frontend. Check a real gene's count, zero values and source identity.
   Keep generated assets and cache files out of Git. Preserve the previous release.

## Expression processing

The dev results service exposes the fixed same-origin path
`/pankgraph-vnext/api/scbrowser/expression?dataset=…&atlas=…&gene=…`.
Only the registered dataset/atlas and validated gene symbols are accepted.
A cache miss calls the fixed public PanKbase `single-cell-lognorm` endpoint.
It rejects incomplete/restricted responses, ambiguous/missing genes, incorrect
vector lengths, nonfinite values and negative values.

The cache stores nonzero cell indices as little-endian Uint32 and their values
as little-endian Float64, base64 wrapped in a gzip JSON envelope. Zeros are implicit.
This preserves the source JSON's numerical values exactly: no quantization,
normalization, interpolation or cell sampling. Compression is not guaranteed to
beat the upstream gzip for every gene; the main speed gain is eliminating repeated
upstream query latency. Each object records a SHA-256 of the canonical parsed source
response and its retrieval time. This hash is not the raw HTTP-byte hash.

Cache keys include dataset, atlas hash and gene. Files live outside releases/Git
under the dev results state directory in `scbrowser-expression-v1`, with owner-only
permissions. TTL is 24 hours, up to 128 genes / 256 MiB; oldest files are evicted.
Two source fetches run concurrently, up to 16 pending distinct genes. Concurrent
requests for one gene share one fetch. Failed fetches never create valid entries.
The first unseen gene can still incur PanKbase latency. No whole-transcriptome copy
or new model/graph query is performed.

## Browser behavior and schema controls

`single_cell_browser.full_view.expression_cache` in the result-page schema controls
the endpoint, enablement, default-gene prefetch and direct-PanKbase fallback.
The preview fetches expression in the background but remains a cell-type map;
rendering the preview does not wait for expression. The full tab reuses the cache.
A browser IndexedDB copy, also bound to dataset/atlas/gene and expiring after 24
hours, avoids another expression request after reload. Three genes remain in worker
memory. Cache failures fall back to the original validated public BioIndex request.

To prewarm public genes using the results runtime:

```sh
python -m pankgraph_results.scbrowser_expression \
  --cache-dir /path/to/results-state/scbrowser-expression-v1 --warm CFTR INS GCG
```

Ordinary viewer refresh bypasses the browser's local saved copy; it does not force
an upstream refresh of a still-valid server entry. For an intentional upstream
snapshot refresh, stop/drain the owned results service and remove only the reviewed
cache entries, or allow their TTL to expire. Rewarm and check provenance afterward.
For a new atlas version, use a new registered atlas identity rather than silently
reusing old vectors. No changes to ports 8794, 8796 or production services are needed.
