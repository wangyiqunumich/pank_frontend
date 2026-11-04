# Tech demo browser layout handoff

Current acceptance checklist: [TECHDEMO-MODULE-CHECKLIST.md](TECHDEMO-MODULE-CHECKLIST.md).
Baseline: `wangyiqunumich/pank_frontend` `xuteng/react` at
`ddf6fe4024a143e3e6d14bb3bd8c1dff2b96beb5` (verified 2026-11-03).
Source branch: `codex/techdemo-module-contract`. The deployed source and host
SHAs are recorded at `/techdemo/techdemo-release.json`.

## Layout contract

Source header with right-aligned **PanKbase xxx browser** link → sub-tabs →
filters/selection → remaining visualization space → fixed basic-information footer.
Download, fullscreen, zoom and fit live in a shared right-side toolbar. Tables
and Source pages retain a fullscreen exit button; zoom is offered only where
it has a real visualization operation. Long content retains one necessary scrollbar.

## Tuning entry points

| Concern | Source | Contract |
| --- | --- | --- |
| Shared controls, tabs, input/select, footer, toolbar | `src/vnext/browserChrome.css`, `browserChrome.js` | scMap visual language; names and icons shared by React and Vue. |
| Toolbar implementations | `src/vnext/BrowserToolbar.js`, `pankbase-browser/BrowserToolbar.vue` | Same accessible actions; loading disables plot operations, never fullscreen exit. |
| Panel/header geometry | `src/vnext/browserLayout.js` | White 12px-radius frame, no padded second shell; panels use `clamp(600px, 72dvh, 800px)`. Narrow headers wrap rather than squeezing source names. |
| Results placement/navigation | `src/vnext/ResultComponent.js` | Upstream desktop columns, full single-column width, no reserved disabled tab-arrow gutter. |
| iframe fullscreen | `src/vnext/PanKbaseModule.js`, `pankbase-browser/browserControls.mjs` | Origin/source-validated messages and stable iframe DOM through fullscreen. |
| Genome viewport | `pankbase-browser/vendor/genome/AtacSeq.vue`, `browserBridge.mjs` | Public Redux actions change actual coordinates and native signal-track heights. Label column 85–110px. Native controls under More tools. Never CSS-stretch genomic coordinates. |
| Genome export | `pankbase-browser/vendor/genome/exportGenome.mjs` | Rendered SVG annotations and canvas signal layers with track clipping and current locus. |
| DE/PCA plot | `pankbase-browser/ScatterPlot.vue` | Container-sized DPR canvas, data-domain zoom/pan, fit and actual PNG export. |
| Heatmap | `pankbase-browser/DifferentialExpression.vue`, `plotExport.mjs` | Fit table to available space, readable minimum sample width, zoom with intentional scrolling, SVG export preserving source order/colors. |
| scBrowser | `single-cell-browser/App.vue`, `browser.css` | Fixed source/controls/footer; one scroll container for long expression/source content. Common toolbar for map and expression. |
| scMap renderer | `single-cell-browser/vendor/ResearchUmapPlotGL.vue` | Preserve camera and WebGL data across resizing; labels with visible anchors stay within canvas edges. |
| Functional | `src/vnext/PanKgraphFunctionalPlot.js`, `BrowserImagePlot.js` | Native PanKgraph result-page PNG and 407-donor cohort. Fit keeps entire axes/legend and original aspect ratio; explicit zoom/pan explores the image. No altered data, stretched image or replacement PanKbase renderer. |
| KG fit | `src/vnext/graphBindings.js`, `techdemoFixture.json` | Reserve search/toolbar/legend space; compact only the fixed fixture's positions. Keep normal graph camera persistence and semantics. |

The graph remains a labeled navigation fixture. Data versions and cohort labels
are unchanged; v3.4 atlas is not relabeled as exact v3.3 graph evidence. Backend
APIs, data, preview popup, Gene Browser and Cell State Browser are unchanged/absent.

## Publish / rollback

Follow `AMPLIFY-TECHDEMO.md`: pin the source commit in the host branch's
`config/techdemo.json`, let Amplify build, then verify release manifest and browser
behavior at `https://dev.pankgraph.org/techdemo`. Updating the source branch alone
does not publish. Prior deployed source (rollback pin):
`3f15c17219d03b79b8ac4da6fff420a30ebfca90`.
