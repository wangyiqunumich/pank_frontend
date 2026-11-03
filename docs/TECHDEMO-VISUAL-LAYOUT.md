# Tech demo browser layout handoff

Baseline: `wangyiqunumich/pank_frontend` `xuteng/react` at
`85550fa139b3f2e563d5ac1e937d7dcfb5acc6ff` (verified 2026-11-03).
The latest scBrowser visual language is shared across Genome, DE, Functional and PCA.
The source branch is `codex/techdemo-visual-layout`; the deployed source and host
SHAs are recorded at `/techdemo/techdemo-release.json`.

## Tuning entry points

| Concern | Source | Contract |
| --- | --- | --- |
| Panel height, border, radius, host padding | `src/vnext/browserLayout.js` | One white 12px-radius frame, no second padded shell; browser panels use `clamp(600px, 72dvh, 800px)` and respect schema minimums. |
| Results placement | `src/vnext/ResultComponent.js` | Preserve upstream desktop columns and navigation. Use all available single-column width; short overview text has natural height. |
| Module header and iframe | `src/vnext/PanKbaseModule.js` | Header is content-sized; iframe fills remainder with zero minimum height. |
| Genome/DE/PCA tabs and spacing | `pankbase-browser/style.css` | Internal tabs wrap; only the content stage scrolls when required. |
| DE/PCA canvas | `pankbase-browser/ScatterPlot.vue` | Observe the plot viewport, not window height. Canvas fills remaining flex space at device pixel ratio; retain a readable minimum in short windows. |
| scBrowser chrome | `single-cell-browser/browser.css` and `App.vue` | Map and caption fill the stage; Source and cell-type tables retain scrolling. |
| scBrowser canvas resize | `single-cell-browser/vendor/ResearchUmapPlotGL.vue` | Resize both canvases for container/height changes. Preserve camera target and zoom, refit aspect ratio, do not reload atlas or recreate WebGL buffers. |
| PanKgraph functional plot | `src/vnext/PanKgraphFunctionalPlot.js` and `FunctionalVisual.js` | Reuse the native PanKgraph PNG endpoint. Contain the entire image/legend within the available area, including expanded dialog. |

Do not make plots larger with CSS transforms, crop axes/legends, stretch the
functional image, or remount iframes to repair resizing. Genome tracks retain
their native heights; their vertical size depends on selected tracks. Narrow
screens and large track selections legitimately need one content scrollbar.
Long gene tables, heatmaps and source details also remain scrollable. The outer
visualization tab strip keeps upstream navigation controls.

## Acceptance performed

- Production React and both Vue builds; 19 focused React tests, 17 scBrowser
  tests (including a new viewport/pan/zoom regression), 4 component-data tests.
- Desktop 1512x828, tablet 1000x900 and narrow 390x844 browser checks.
- Genome: default desktop content no longer has the old 5px overflow scrollbar;
  track width increases from 281px to 328px at the same desktop window. Region,
  track choices and native navigation controls remain present.
- scBrowser: v3.4, 448,935 cells, CFTR expression 0–5.83; map matches viewport.
  Zoom readout stays 111% through fullscreen and narrow-screen transitions.
- DE: 13,191 source records in the selected Beta comparison; full-screen canvas
  reaches 461px high instead of the former 390px cap. Gene table and pagination
  remain available.
- PCA: 178 Acinar pseudobulk samples, PC/color controls and contributions retained.
- Functional: native PanKgraph plot, 407 donors, response selector, download,
  and expanded image including axes/legend; expanded dialog has no overflow.

The demo graph remains a labeled navigation fixture. Data versions and cohort
labels are unchanged; v3.4 atlas must not be relabeled as v3.3 exact graph evidence.
No backend/API data changes, visualization-preview popup, Gene Browser or
Cell State Browser are introduced here.

## Publish / rollback

Follow `AMPLIFY-TECHDEMO.md`: pin this source commit in the host branch's
`config/techdemo.json`, let Amplify build, then verify the release manifest and
browser behavior at `https://dev.pankgraph.org/techdemo`. Updating the source
branch alone does not publish. Roll back by restoring the previous source pin
`6d6377121f7ad060b28e6253bc44516965e90094` and rebuilding the host.
