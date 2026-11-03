# PanKbase experience integration

Branch: `codex/pankbase_experience`, based on `xuteng/react` at
`8e148225fdfafd27253e3969ca50f1835c238d3e`. This is a frontend review candidate;
no production or vNext service was deployed or restarted.

## Result-page integration

The existing result-page schema (`src/vnext/schema/result_page_schema.json`,
version 0.6.0) owns eligibility, ordering and wording. `pankbaseContext.js`
resolves exact returned node/edge types, stable record identity and selected
record context. Prose keywords cannot enable a module. Selection is scoped to
the current run; previews make no resource requests. The original result-page
controls and graph viewport remain in place.

| Module | Implemented experience | Loading behavior |
| --- | --- | --- |
| Integrated Cell Browser (scBrowser) | Existing map, gene expression, highlighting, violin, source and full-screen controls | Existing compact 448,935-cell atlas retained; expression fetched separately |
| Genome Browser | Upstream PanKbase ATAC tracks, cell-type/track selection and WashU navigation | Runtime deferred until open; one cell type (signal + peaks) initially |
| Differential Expression | Six source comparisons, volcano thresholds, gene highlighting, searchable/sortable paged table, heatmap and full-table download | One prepared comparison; heatmap only on request |
| Gene Browser | Reviewed human UniProt function/GO/pathways, tissue specificity, expression, HuGE and common/rare variant sections | Only the selected section; evidence tables with pagination/downloads |
| Functional Browser | Insulin/glucagon time courses, IEQ/content normalization, donor filters, confidence display, trait distributions, associations and measurement downloads | Metadata, selected hormone and its timepoints initially; other views on demand |
| Cell State Browser | Adapted upstream LIGER tissue, cell-type, state and program exploration | Selected gene/scope; details on demand |
| PCA Explorer | Twelve source cell types, ten PCs, ten color/hover attributes, score plot, top-ten contributions per PC, CSV/TSV/PNG/SVG downloads | One prepared cell-type asset; no browser-side Shiny session |

The six new modules use a lazy Vue island inside the React result shell.
Same-origin source/origin/protocol checks protect the context message boundary.
Tabs and expanded native-dialog views keep their iframe state. Source sections
and an Open PanKbase link remain accessible. This is an integrated adaptation,
not a claim of identical graphics or complete feature parity with every source
application; for example, several Gene Browser evidence views use tables.

## Evidence boundaries

An enabled browser is a **related resource**, not proof of a matching cohort.
Source, dataset, release, comparison and condition are retained when provided.
Gene labels are accepted only from typed Gene records or explicit gene-symbol
fields. Donor identifiers are not placed in external PanKbase URLs.

Graph loci require explicit GRCh38/hg38 assembly, valid coordinates and a known
coordinate convention. One-based inclusive coordinates are converted to
zero-based half-open coordinates. No arbitrary fallback locus is displayed.
When source gene lookup fails, users may explicitly enter a labeled GRCh38
region; this does not establish overlap with the requested gene.

Source failures have visible error/retry states and are not interpreted as
biological absence. Missing measurements remain missing. Expression, inferred
cell states and associations do not establish causality. Functional confidence
calculations retain the upstream browser's method.

## Source and license provenance

The PanKbase portal fork default branch is older than its live site. Its upstream
parent, `broadinstitute/dig-dug-portal` branch `pankbase-main`, contains the current
seven entry points. The adapted code is pinned to
`554859175b9d91dd5d15787e49810be7a5ac23da`.
PCA is pinned to `PanKbase/PanKbase-RNA-expression-PCA-Explorer` commit
`bc187eb072b8719e5dd52f93199757e15db63f06`.

`pankbase-browser/vendor/UPSTREAM.json` records original and adapted code hashes,
reference files and changes. The BSD source license and PCA MIT license are
included and copied to the built runtime. Software licenses do not establish
licenses for every linked dataset. Prepared assets retain their source URLs,
source hashes, release/comparison and methods; live source sections identify
their provider. PCA remains the source v3.3 analysis, not a recomputed v3.4 cohort.

## Payload measurements

Measured locally on 2026-11-03 UTC. MB/kB below are decimal; gzip sizes for
prepared assets are local estimates, not measured deployed HTTP transfer sizes.
These numbers do not measure end-to-end page-load latency.

| Payload | Source decoded bytes | Prepared decoded bytes | Compressed comparison |
| --- | ---: | ---: | --- |
| scmap metadata → compact map | 109,644,935 | 5,387,453 | Prepared gzip estimate 2,971,257 bytes |
| Beta DE, T1D vs control | 1,563,614 | 640,656 | Source gzip 273,055 → prepared gzip 252,778 bytes |
| Beta PCA | 731,928 (source CSV) | 82,162 | Prepared gzip estimate 18,305 bytes |

The reported “112 MB+” scmap problem motivates the deck; this build's measured
original metadata is 109.6 MB decoded. Compacting the map fields reduces decoded
input by 95.1%, retaining all 448,935 cells. Other metadata stays in its source.
This existing scmap optimization was preserved, not newly introduced here.

Beta DE reduces decoded input by 59.0%, but gzip transfer by only 7.4%. All source
rows and numeric values are retained; repeated labels are stored once. PCA's
source CSV was input to the server-side Shiny application, so comparing its size
to the prepared asset is **not** an old-versus-new browser-transfer benchmark.
All ten source PC scores and selected attributes remain available.

The eighteen DE/PCA assets total 4,271,690 decoded bytes, but are not downloaded
all at once. Functional initial work is three files (metadata, selected hormone,
timepoints), compared with six measurement tables plus two timepoint files in
the source startup. Associations were already lazy upstream; no claim is made
that all association files previously loaded at startup. Genome initially
selects two ATAC tracks rather than all twelve cell types' twenty-four tracks;
reference tracks remain. Heavy Genome runtime bytes are deferred, not eliminated.

## Build and operation

Use Node 20+ with npm, Python 3, and base R (`Rscript`, for source PCA loadings).
A fresh build requires access to the pinned public sources and npm registry.

```sh
npm ci
npm run build
```

The root prebuild builds the existing single-cell browser and new PanKbase
island. `prepare-data.py --if-valid` reuses all eighteen assets only when their
manifest hashes validate; otherwise it fetches sources and regenerates the
projection. To explicitly refresh the candidate, run `npm run prepare:pankbase`,
then review changed source hashes, revalidate and rebuild. Mutable upstream DE
resources are hashed at preparation time; refreshing them requires review.

Deploy the complete generated `build/` tree, including its `pankbase-browser/`
assets, through the existing application deployment process. Generated data,
raw donor tables, node_modules and build output are ignored by Git. Do not deploy
only the committed source tree. The runtime uses the existing `sitePath` prefix
for same-origin assets and an allowlist for public remote data, omitting remote
credentials. Responses are capped at 8 MiB/30 seconds; BioIndex pagination is
complete up to forty pages/100,000 rows, with explicit errors at limits.
Prepared assets have SHA-256 verification and a 4 MiB/20-second cap. Session
reuse is bounded; failed responses are evicted so retry can recover.

## Verification and remaining limits

Completed locally:

- Production React and Vue builds pass. Existing unrelated React lint warnings
  remain; the new integration files do not add lint warnings.
- Forty vNext suites / 341 tests pass, including typed eligibility, context,
  selection changes, schema routing, lazy loading and persistent frames.
- Four public-data tests pass for pagination, bounded responses, cache limits
  and failure recovery; fourteen existing scBrowser data/render tests pass.
- Source validation checks every row in six DE comparisons (71,265 rows) and
  every source score/selected attribute across twelve PCA cell types
  (1,957 samples; 19,570 PC scores). Contributions are checked structurally;
  their calculation is taken from the source RDS loadings during preparation.
- Real browser smoke checks cover all seven tabs: CFTR scmap expression and
  UniProt, Beta DE volcano/heatmap, Beta PCA, functional normalization and filters,
  LIGER cell states/programs, and ATAC tracks at an explicit fixture locus.
  Expanded views preserve frames. Screenshots use a labeled navigation fixture,
  not a retrieved biological answer.
- Nine native Google Slides reviewed visually, with editable text/tables and
  a linked editable chart. Supporting chart values were read back from Sheets.

An early full-suite run exposed a null-selection regression; it was fixed before
the final 341-test pass. Browser checks also caught and fixed the upstream D3
version mismatch and a normalization-remount state issue.

Some upstream gene evidence and gene-location endpoints returned 403 or failed
in the browser during review. Their error/retry states are intentional; no
substitute source or default region conceals the failure. A later browser check successfully retrieved 1,551 CFTR HuGE records with
pagination, so the earlier service failures were not universal or permanent.
Core UniProt, PanKbase DE, functional, PCA, LIGER and explicit-locus ATAC views loaded.
A narrow-layout smoke check was performed, but the browser reported a 582 CSS-px
viewport despite a requested 390-px override; exact 390-px acceptance remains
unverified. Controlled cold/warm latency, production route activation and a
full cross-browser acceptance run remain deployment-stage checks.

Reproduction commands:

```sh
CI=true npm test -- --watchAll=false --runInBand src/vnext
npm --prefix pankbase-browser test
npm --prefix single-cell-browser test
python3 pankbase-browser/validate-assets.py /path/to/pinned/PCA-checkout
SC_PREVIEW_PORT=4198 node scripts/preview-scbrowser-build.cjs --pankbase
```

## Presentation

[Google Slides: PanKbase experience — from the scmap payload problem to seven integrated tools](https://docs.google.com/presentation/d/1o9z794y-gUk4pe649pNOCjkq0C-z55xTo6szpo6W8xo)

The deck starts with the reported scmap problem, separates decoded/compressed
measurements, demonstrates the result-page workflow, and records evidence and
source-availability limits. Implementation is a review branch, not a deployment.
