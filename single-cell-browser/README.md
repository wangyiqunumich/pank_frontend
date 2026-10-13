# Focused PanKbase browser for PanKgraph

The React result view owns one fixed expression card and a persistent scBrowser tab.
The tab loads a fixed same-origin `scbrowser/embed.json` build manifest and
renders its bundled HTML with iframe srcdoc. A base URL resolves scripts/styles
to scbrowser, and a meta flag selects the thumbnail. The child validates messages
against the inherited parent origin. This avoids Amplify rewriting HTML URLs. This reuses the actual PanKbase
UMAP and violin components, pinned at `15ce7e948f226ab9010def31cece912c53436da4` from
Broad Institute’s upstream `pankbase-main` (August 21, 2026).
See `vendor/UPSTREAM.json` for original hashes and local adaptations, and
`vendor/LICENSE` for the BSD notice. Build output includes dependency notices.
Vue 2 is retained for upstream compatibility; it is EOL, so keep this bundle isolated
and consider an upstream Vue migration separately.

## Build and run

From the frontend root:

```sh
npm ci
npm --prefix single-cell-browser ci
PUBLIC_URL=/pankgraph-vnext npm run build
```

`prebuild` and `prestart` build the browser into ignored `public/scbrowser/`.
The production build copies it to `build/scbrowser/`. Serve it under the same
prefix as the React app. Do not serve the parent React fallback for missing
scbrowser files. Deployment remains the existing isolated results deployment;
this implementation does not deploy, modify nginx, or restart any service.

## Context and data contract

`src/vnext/singleCellContext.js` resolves registered expression relationships from
returned graph records. Only a validated gene symbol and the registered public
scRNA v3.4 atlas may enter the loader. Recorded source dataset IDs remain in edgeDatasetId and are disclosed in the
card and source pane. The matching RNA gene is shown in the registered v3.4
reference atlas as related context even when the source dataset differs. All current mappings remain `related`:
none have enough cohort/analysis provenance to assert exact evidence equivalence.
The edge's original release and condition remain visible. ATAC gene activity
is explicitly unavailable in this scRNA viewer.

Messages use `pankgraph.scbrowser.v1`; both sides validate origin, source window,
and message type. The child validates dataset, assay, gene and cell-type context.
The worker receives gene symbols only; source URLs never become fetch targets.
No browser credentials are sent to BioIndex. No new backend/model work is started.

The build runs `prepare-atlas.mjs`: catalog, full metadata and coordinates are
read once on the build host, validated, and projected in original cell order into
little-endian Float32 X/Y plus one cell-type byte per cell. The JSON asset is named
by SHA-256 and its manifest records source hashes, dataset, count and retrieval
time. No sampling, cell IDs, donor metadata or unused annotations enter the asset.
Generated assets are ignored by Git; deployments generate them during prebuild.
`node prepare-atlas.mjs --refresh` explicitly refreshes the build snapshot.

Measured 2026-10-13: 448,935 cells; compact JSON 5,387,453 bytes (95% smaller
than 109,644,935 bytes of source metadata alone). Hosting may compress it further;
the build records an estimated gzip size. A .json extension preserves existing
Amplify SPA routing; .json.gz is rewritten to HTML on the current host. The browser
fetches only this same-origin map and the requested BioIndex gene vector; it never
requests the full fields, catalog or coordinate files. The thumbnail also loads
and colors the selected gene. Gene vectors are checked for dataset identity,
restriction/continuation, length and finite nonnegative values. Vector row order
follows the source positional contract, not an independent barcode join.

The compact map is cached by immutable asset identity for 24 hours, with optional
IndexedDB failure fallback. Refresh in the viewer reloads the deployed snapshot;
updating its source requires rebuilding. In-memory workers keep three gene
requests. Requests have a 90-second timeout and 16 MiB decoded limit.

The first available RNA expression relationship initializes the card automatically.
Inspecting a detection, enrichment or marker edge in the KG updates the matching
gene/cell context and reopens the card. ATAC stays unavailable; differing source datasets remain explicitly disclosed
as related atlas context. Expression is cell-level source
log-normalized RNA, including zeros, not a reconstruction of the edge statistic.

## Verification

```sh
npm --prefix single-cell-browser test
CI=true npm test -- --watchAll=false --runInBand --testPathPattern=vnext
node scripts/validate-result-page-schema.cjs --self-test
```

Browser acceptance must include a real public gene vector, UMAP and violin
rendering, edge switching, minimize/restore/close, graph/browser tab round trips,
source metadata, missing gene, unavailable dataset, network failure, narrow
layout and keyboard activation. Synthetic graph records used for navigation QA
are fixtures and must not be described as production biological evidence.

For rendered acceptance, serve the built frontend in a separate terminal:

```sh
node scripts/preview-scbrowser-build.cjs --demo
```

Then run `node scripts/verify-scbrowser.cjs`. It requires Playwright and a Chromium
installation; optional `PLAYWRIGHT_MODULE` and `CHROME_EXECUTABLE` select installed
runtimes. `SC_QA_OUTPUT` selects the screenshot directory (default
`/tmp/pankgraph-scbrowser-qa`). This harness only visits loopback, supplies clearly
labeled graph navigation fixtures, and loads live public atlas data in the actual
browser. It makes no requests to deployed PanKgraph services. The browser uses only the compact atlas asset and requested gene vectors.

## Biologist-facing navigation

The card separates the graph relationship from related atlas context. The browser
provides a gene search, a cell-type picker and clickable legend, plain-language
plot explanations, explicit filtering, and Source & methods. The browser stays inside the existing Visual Material tab panel. It has no
separate page header or full-page expansion. Graph and browser tab switching
preserves selection and loaded data.
