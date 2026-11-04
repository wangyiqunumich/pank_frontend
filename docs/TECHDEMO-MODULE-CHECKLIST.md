# Goal: consistent, fully usable module browsers

User acceptance contract (2026-11-03): source header with right-aligned **PanKbase xxx browser** link → sub-tabs → filters/selection → visualization → fixed basic-information footer. Every visualization uses the scMap-style right-side download/fullscreen/zoom toolbar. No wasted nested frame space or inaccessible controls; retain genuine data and scientific semantics.

Baseline: xuteng/react `ddf6fe4024a143e3e6d14bb3bd8c1dff2b96beb5`.
Source branch: `codex/techdemo-module-contract`.

## Shared acceptance
- [x] Same header, sub-tab, input/select, action, footer and toolbar styles across modules.
- [x] External link labels use `PanKbase xxx browser` (text requirement takes precedence over screenshot's earlier wording).
- [x] Header → sub-tabs → filters → visualization → fixed footer; source/method details remain available.
- [x] Toolbar download, fullscreen and zoom perform real actions and have accessible names.
- [x] Charts use remaining space; only long tables/tracks/content scroll; no forced empty left navigation gutter.
- [x] Desktop, narrow screen, fullscreen, return-from-fullscreen and tab switching verified.
- [x] Production builds and meaningful regression tests verified.
- [x] Amplify publication and deployed version/data acceptance.

## Knowledge Graph
- [x] Remove reserved disabled previous-tab gutter; align tabs with visualization frame.
- [x] Initial fixture is readable and fitted to available panel; retain graph pan, zoom, fit, hover, download and reset.
- [x] Retain explicit fixture disclosure and graph semantics; browser-specific source/filter controls are not invented for KG.

## scBrowser
- [x] Keep reference layout/style and PanKbase single cell browser link.
- [x] Add download to the common right toolbar; maintain fullscreen/zoom/camera persistence.
- [x] Keep fixed cell count, scale/navigation information and authentic atlas release.
- [x] Cell-map, expression and source tabs remain usable.

## Genome
- [x] PanKbase genome browser external link; scMap-style sub-tabs and region selection.
- [x] Right toolbar drives genuine viewport zoom/fullscreen and plot download.
- [x] Remove excess label-column width; distribute remaining height into actual signal tracks without CSS-distorting coordinates.
- [x] Advanced native navigation remains accessible; region and selected tracks survive resizing.
- [x] Fixed footer describes current assembly/locus/track count; source and track-selection pages remain available.

## Differential Expression
- [x] PanKbase differential expression browser link.
- [x] Consistent sub-tabs and dataset/threshold/highlight selectors above the plot.
- [x] Common right toolbar; actual zoom and download; no redundant buttons below the plot.
- [x] Fixed dataset/comparison/count/status footer; volcano, heatmap, gene table and source remain functional.

## Functional
- [x] Source header, PanKbase functional browser link, response/source sub-tabs, response selector below tabs.
- [x] Continue using native PanKgraph functional plotting/data; do not substitute PanKbase's internal renderer.
- [x] Common right toolbar with download, fullscreen and image zoom/pan; remove bottom Expand/Download actions.
- [x] Fixed cohort/normalization information; complete axes/legend at fit; all four response modes work.

## PCA
- [x] PanKbase PCA browser link.
- [x] Consistent sub-tabs, cell type/color/PC/hover selectors above plot.
- [x] Common right toolbar for genuine zoom/fullscreen/download.
- [x] Fixed sample count/source coordinates/legend information; contribution table and data exports remain accessible.

## Completion evidence
Local acceptance on 2026-11-03:
- React: 47 tests / 8 suites; scBrowser: 17 tests; module data/Genome adapter: 7 tests. Production React + both Vue builds pass.
- Real EC2 data through local same-origin proxy: scRNA v3.4 448,935 cells / CFTR 0–5.83; DE Beta 13,191 genes; PCA Acinar 178 samples; Functional 407 donors and four native response modes.
- Actual downloads: DE and PCA PNGs, 1800×1800 native Functional PNG, scMap PNG, expression SVG, Genome SVG (53 text elements / 2 signal images for six tracks), heatmap SVG.
- Genome: 954×371 normal viewport, native tracks occupy 367px; 390px fullscreen viewport has no horizontal overflow. Zoom updates coordinates and input; adding Ductal yields six tracks and retains the zoomed locus. Manual region entry and More tools verified.
- Desktop/fullscreen and 390×844: common toolbars, fixed footers, real chart zoom/fit, Source-page fullscreen exit and all sub-tabs checked. Heatmap fills stage with intentional narrow-screen sample scrolling; expression page no longer has a nested 5px vertical scrollbar.
- Fullscreen uses stable DOM to preserve camera. An untouched fitted KG view refits for a shorter viewport (1043×494 checked); a user-adjusted 120% view remains 120% through fullscreen return. Original native functional image is fitted without clipping or stretching; its source aspect ratio is preserved.
- Exact deployed source/host SHAs: `/techdemo/techdemo-release.json` after the host pin is published. Previous source for rollback: `3f15c17219d03b79b8ac4da6fff420a30ebfca90`.

## Published acceptance

Goal completed on 2026-11-03 (America/Detroit; release timestamp is UTC).
- Final application source: `81c90bc33dcb672f378cc37786f11f176e7423f9`.
- Amplify host: `c2392f9009828466c18e5a80349f6e74b2f969df`.
- Amplify app `d1de5p4691hcl7`, branch `xuteng/react`, job **867 SUCCEED** (BUILD / DEPLOY / VERIFY all succeeded).
- Deployment PRs: [#415](https://github.com/wangyiqunumich/pank_frontend/pull/415), [#416](https://github.com/wangyiqunumich/pank_frontend/pull/416).
- [Live demo](https://dev.pankgraph.org/techdemo); [release manifest](https://dev.pankgraph.org/techdemo/techdemo-release.json) verified in the authenticated browser.
- All six modules opened online with the expected genuine module data; top-right PanKbase browser labels, toolbar and fixed footer verified. The final short-window KG correction was rechecked online at 1029×493; nodes remain below the search field and above the legend.
- All four Functional modes returned HTTP 200 / image/png / 1800×1800 from the EC2 API with distinct response images. Native PanKgraph curves are retained.
- Fixed-result mode remains enabled; `agent_requests` remains false; data origin remains `https://api-dev.pankgraph.org`.

This final acceptance entry is documentation-only; the application is pinned to the exact source above.
