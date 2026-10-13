# Local acceptance — 2026-09-21

Implemented in the existing isolated `pank_frontend_vnext` checkout. Existing
unrelated edits were preserved. No deployment, service restart, nginx edit,
production query, graph import, or model call was performed.

## Automated checks

- Full vNext regression suite: 27 suites / 245 tests passed.
- Worker loader suite: 3 tests passed (alignment, denominators, missing/restricted/
  incomplete data, shared caching and failed-request eviction).
- Final context/card suite: 6 tests passed, including legacy port/parameter dataset
  URLs, unavailable old releases, ATAC exclusion, tab persistence, result reset,
  and rejected foreign-window messages.
- Registry validator passed, including rejection of 34 invalid configurations.
- Production React + separately bundled Vue browser build passed. Existing CRA,
  Browserslist and unrelated lint warnings remain; no new warnings in the added
  single-cell components.
- `git diff --check` passed.

## Rendered acceptance

`scripts/verify-scbrowser.cjs` ran against a loopback build in installed Chrome.
Graph records were explicitly labeled navigation fixtures. The child viewer
fetched real public PanKbase v3.4 atlas data and INS expression from BioIndex.
Catalog, coordinate, cell-type and expression vectors each contained 448,935
cells. These checks validate the upstream positional-vector interface, not an
independent barcode join or equivalence to any production edge's source analysis.

Passed: card minimize/restore, selecting another edge, graph/browser tab round
trips with filters retained, Beta filtering and return to all cells, UMAP and
violin rendering, source information, missing gene, deliberately aborted network
request, unavailable v3.3 dataset, narrow 390px card layout, keyboard minimize,
and mobile Open in scBrowser action. No uncaught browser errors were observed.
UMAP fitting, cleanup on resize, and transposed upstream expression-axis labels
were repaired during rendered verification. A horizontally scrollable expression
plot retains readable labels at narrow widths; the accompanying table is available.

## Boundaries

All current atlas mappings are explicitly related context. An exact source match
requires a separately verified source/cohort/analysis mapping; it is not asserted
by this implementation. The atlas's large metadata payload is loaded on demand
in a worker (about 112 MiB decoded); first-load cost remains a limitation.
Vue 2 is pinned to match the upstream components and is EOL. Build output includes
source and dependency license notices. A deployment still needs the existing
isolated vNext rollout process and a smoke test at the actual serving origin.

## Upstream and usability update — 2026-09-21

Updated plotting components and helpers to Broad Institute dig-dug-portal
`pankbase-main` commit `15ce7e948f226ab9010def31cece912c53436da4`
(August 21, 2026). Original file hashes and local adaptations are recorded in
`vendor/UPSTREAM.json`. This replaces the older PanKbase fork pin.

- Packed Float32 coordinate columns and integer cell-type codes; new upstream
  hover grid and draw ordering; frozen Vue boundaries; visibility-mask filtering.
- Expression fetching starts alongside atlas loading; the map can appear first.
- Only a compact public atlas projection is persisted in IndexedDB (24-hour TTL).
  Return-visit cache reuse was confirmed through the rendered Source & methods
  view after a full reload; full source metadata remains a first-load cost.
- Gene search, cell-type picker, clickable legend, plot explanations, provenance,
  clearer graph card, and expandable browser with Escape/Back to result.

Validation: production build passed; 27 vNext suites / 247 tests passed;
5 loader tests passed, including packed alignment, persistent-cache reuse,
parallel fetching and map-before-expression behavior. In-app browser rendered
real PanKbase 448,935-cell UMAP and INS violin plots (including axis labels),
verified Beta filtering (120,502 cells), graph/browser round trips, missing-gene
feedback, cache reuse after reload, expanded view and Escape from the iframe.
Desktop (1280px) and narrow (390px) layouts were inspected. Existing initial
acceptance above covers the earlier failure/unavailable-edge scenarios; those
are not new performance benchmarks. No controlled before/after latency benchmark
was established. No deployment or production services were changed.

### Result-page integration correction

Removed full-page expansion and its Escape message/handler. Removed the standalone
browser title/header and dataset branding block. Kept the existing Visual Material
tabs and result-page shell; reduced the embedded controls and plots to the existing
Open Sans/Inter typography, teal accents, white background and compact spacing.
The upstream renderer, cache and loading improvements remain unchanged.

### Compact data-view card, following the scFM reference

Used the local T1D Immune GPS `EmbeddingPortalCard` and the supplied screenshot
as layout references only. Retained PanKgraph colors and its result-page shell.
Removed ExpressionEdgePicker; introduced one compact right-hand card with live
atlas thumbnail, gene/cell title, one-line assay, short source-match note, and
Open interactive UMAP. Added previous/next expression navigation to both card
and browser; selection wraps across the result’s edges, including unavailable
releases. Thumbnail rendering uses the pinned upstream UMAP and public atlas
only, without an expression query. The chart skips initialization at zero width
so a hidden tab cannot produce a collapsed camera/thumbnail.

Build and six data-loader tests pass. Four targeted React tests pass, including
single-card cycling, no dropdown, graph/tab preservation and origin checks.
Live UI verified the 448,935-cell thumbnail, Beta → Ductal → unavailable v3.3
arrow navigation, and explicit disabled open action for the old release.

### Independent resource card (2026-09-21)

Restored KnowledgeGraph.js to its original implementation: no resource-specific
selection callback, edge tap handler, or highlight class. Supported result
resources automatically initialize the card. Its own arrows control browser
context; minimize and close do not change graph selection. Closing persists while
interacting with the graph. New results reset card context and tab selection.

Validation: production build passed; 10 focused React/context tests passed,
including automatic availability, hide persistence, no graph resource hooks,
minimize/restore, tab persistence and new-result reset. Live localhost demo showed
the automatic card and real atlas thumbnail; closing and clicking a graph edge
left it hidden. Original graph controls remained present. No deployment changes.

### Filter redraw repair (2026-09-21)

Removed the older-release INS/Beta fixture from the user demo, leaving Beta and
Ductal. Release mismatch validation remains covered separately. Fixed renderer
cleanup to clear the queued-frame flag when cancelling a pending animation frame;
otherwise replacement atlas data could leave subsequent filter/color changes
without any redraw. Added an actual component-method regression test for this
cancel/requeue sequence. All seven loader/renderer tests and the build passed.
Live browser verification: Endothelial filter rendered only 3,385 cells; Show all
cells restored 448,935; INS expression changed the actual map to gray/blue colors.

### Compact resource layout (2026-09-21)

The minimized card names the resource Single cell browser; the expanded card
retains its carousel. Removed the browser-page carousel and graph-edge badge.
The browser uses the original KG panel height instead of the 760px override.
Sub-navigation is fixed at the bottom of the iframe, with independently scrolling
content for provenance and distributions. Gene, highlight, filter and color
controls remain available. The map adapts to iframe height; cluster labels start
hidden and the legend is collapsible. Detailed source-match caveats remain in
Source & methods. Focused React/context tests (10) and loader/renderer tests (7)
passed during this layout change.
