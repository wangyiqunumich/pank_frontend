# Module interaction iteration

Goal: scientifically appropriate controls, readable axes, full use of the viewport, and verified local/live behavior. This supersedes the identical-action requirements in the previous toolbar checklist. Common icons and chrome do not require identical capabilities.

Baseline: current xuteng/react 4ea265fcc0312cd98e6cc7a8f0be099677795921, merged into codex/techdemo-module-interactions. Existing retained checkout edits are preserved.

- [x] Knowledge Graph: retain native graph navigation, fit, hover, export and reset; verify fullscreen/Escape.
- [x] scBrowser: retain established cell-map navigation, source atlas identity, selection and export; verify fullscreen and resize.
- [x] Genome: real genomic interval zoom only, horizontal icons and explicit labels; retain native horizontal pan and track-height control. No generic bitmap zoom or redundant fit/info actions.
- [x] Differential Expression / Volcano: D3 axis scaling anchored at (0,0), no arbitrary pan; hover and PNG export reflect visible coordinates; reset restores initial domains.
- [x] Differential Expression / Heatmap: verify real sample IDs against source fields and each expression vector; show x-axis labels in source order, keep readable minimum cell width, include labels and scale legend in SVG export. Horizontal scrolling is intentional for many samples.
- [x] Differential Expression / tables: retain comparison download, search/sort and source provenance.
- [x] PCA: origin-anchored coordinate scaling with no free pan, preserve sample colors and axis labels; retain coordinate download and contributions.
- [x] Functional: response selector shares the tab row; native PanKgraph renderer uses available aspect ratio without cropping or stretching; retain all four response modes and cohort semantics. Fullscreen/download only; no bitmap pan/zoom. Controls overlay a safe corner outside the data axes.
- [x] Shared: unsupported controls are absent; keyboard labels describe actual actions; fullscreen/Escape and resize preserve state; no unnecessary nested scrolling.
- [x] Round 1: targeted unit/integration tests and local browser verification across all module views.
- [x] Round 2: small/wide/fullscreen browser checks, export inspection, live Amplify acceptance and version receipt.

Acceptance evidence is recorded below. Backend health alone is not frontend acceptance.

## Round 1 and 2 evidence (local candidate)

- 30 React tests, 10 module tests, 17 scBrowser tests; production build passed.
- D3 mathematical tests cover positive/negative/mixed/zero domains and reversed y ranges, preserving the zero anchor and exact scale factor.
- Chrome: Genome zoom changed chr7:117480025–117668665 to chr7:117527185–117621505; fullscreen and iframe Escape returned correctly. Unsupported generic controls are absent.
- Chrome: Volcano/PCA use default cursor and origin scaling; attempted Volcano drag did not pan. Fullscreen, zoom/reset and subview navigation work.
- Heatmap Beta: 62 real column labels shown. Browser-triggered SVG download verified against all 62 ordered source labels, 1,240 expression cells and three color-key swatches. Every source heatmap vector was validated against its sample-ID file before publishing.
- Functional: 407 donors, four response modes retained. Native renderer receives measured dimensions; 1512×739 CSS viewport renders without square-image margins, curve/axis cropping or toolbar overlap. Source view can exit via Escape. A second review caught and fixed a collapsed selection label and proportional sizing above the renderer's maximum resolution.
- EC2 Python 3.13: 12 component tests and 3 functional tests passed in separate locked environments. Summary and all four trace JSONs match prior service exactly; original legacy PNG is byte-identical. Eight responsive renders verified dimensions. Published API audit covers 106 assets, 37 range assets, five expression genes, six DE comparisons and twelve PCA types.
- Backend native renderer: 8f2b091a93a3376688cc5b8e9f25a50cf8019b2c. Component snapshot: pankbase-experience-20261103-labels-v1 (original assets unchanged, six label assets added).

## Live acceptance and release receipt

- PR [419](https://github.com/wangyiqunumich/pank_frontend/pull/419) merged; Amplify job 870 completed successfully.
- Deployed frontend source: `c0b28007f93577ce5e03882f1cef8a0146a239e8`; host commit: `fc49d595219b425717a7259678e16e318404c26e`.
- Authenticated live release manifest verified both SHAs, `data_origin: https://api-dev.pankgraph.org`, `fixed_result: true`, and `agent_requests: false`.
- Live Chrome: genomic interval zoom halves the actual interval; Heatmap shows all 62 source sample IDs (intentional scrolling in short/narrow viewports). Functional uses two controls only and fills the available plotting area.
- Live Safari: Functional and Genome enter fullscreen and return with Escape; Genome uses full width, with track-height selection retained. The temporary QA tab was closed without changing the user's original tab.
- Responsive checks include 420×640, 1024×768, 1512×900 and the large Safari viewport. A final narrow-view review found long Functional titles overlapping controls; the backend now wraps titles using measured font metrics. The 420-pixel Insulin content view was visually verified after deployment.
- Functional response/trace JSON and legacy PNG remain unchanged; the native responsive renderer only changes layout. API audit and backend deployment receipt are in the private `RingoMao/pank_backend` repository.
- Scope: fixed demo and component APIs. These checks do not claim scientific validation of the fixture graph or equivalence between independent cohorts.

Goal completed after two implementation/review rounds. This checklist commit is documentation only; the deployed application remains pinned to the source SHA above.
