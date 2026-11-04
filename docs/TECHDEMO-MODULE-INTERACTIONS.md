# Module interaction iteration

Goal: scientifically appropriate controls, readable axes, full use of the viewport, and verified local/live behavior. This supersedes the identical-action requirements in the previous toolbar checklist. Common icons and chrome do not require identical capabilities.

Baseline: current xuteng/react 4ea265fcc0312cd98e6cc7a8f0be099677795921, merged into codex/techdemo-module-interactions. Existing retained checkout edits are preserved.

- [ ] Knowledge Graph: retain native graph navigation, fit, hover, export and reset; verify fullscreen/Escape.
- [ ] scBrowser: retain established cell-map navigation, source atlas identity, selection and export; verify fullscreen and resize.
- [ ] Genome: real genomic interval zoom only, horizontal icons and explicit labels; retain native horizontal pan and track-height control. No generic bitmap zoom or redundant fit/info actions.
- [ ] Differential Expression / Volcano: D3 axis scaling anchored at (0,0), no arbitrary pan; hover and PNG export reflect visible coordinates; reset restores initial domains.
- [ ] Differential Expression / Heatmap: verify real sample IDs against source fields and each expression vector; show x-axis labels in source order, keep readable minimum cell width, include labels and scale legend in SVG export. Horizontal scrolling is intentional for many samples.
- [ ] Differential Expression / tables: retain comparison download, search/sort and source provenance.
- [ ] PCA: origin-anchored coordinate scaling with no free pan, preserve sample colors and axis labels; retain coordinate download and contributions.
- [ ] Functional: response selector shares the tab row; native PanKgraph renderer uses available aspect ratio without cropping or stretching; retain all four response modes and cohort semantics. Fullscreen/download only; no bitmap pan/zoom. Controls overlay a safe corner outside the data axes.
- [ ] Shared: unsupported controls are absent; keyboard labels describe actual actions; fullscreen/Escape and resize preserve state; no unnecessary nested scrolling.
- [ ] Round 1: targeted unit/integration tests and local browser verification across all module views.
- [ ] Round 2: small/wide/fullscreen browser checks, export inspection, live Amplify acceptance and version receipt.

Evidence and remaining issues will be recorded here as verification proceeds. Backend health alone is not frontend acceptance.

## Round 1 and 2 evidence (local candidate)

- 30 React tests, 10 module tests, 17 scBrowser tests; production build passed.
- D3 mathematical tests cover positive/negative/mixed/zero domains and reversed y ranges, preserving the zero anchor and exact scale factor.
- Chrome: Genome zoom changed chr7:117480025–117668665 to chr7:117527185–117621505; fullscreen and iframe Escape returned correctly. Unsupported generic controls are absent.
- Chrome: Volcano/PCA use default cursor and origin scaling; attempted Volcano drag did not pan. Fullscreen, zoom/reset and subview navigation work.
- Heatmap Beta: 62 real column labels shown. Browser-triggered SVG download verified against all 62 ordered source labels, 1,240 expression cells and three color-key swatches. Every source heatmap vector was validated against its sample-ID file before publishing.
- Functional: 407 donors, four response modes retained. Native renderer receives measured dimensions; 1512×739 CSS viewport renders without square-image margins, curve/axis cropping or toolbar overlap. Source view can exit via Escape. A second review caught and fixed a collapsed selection label and proportional sizing above the renderer's maximum resolution.
- EC2 Python 3.13: 12 component tests and 2 functional tests passed in separate locked environments. Summary and all four trace JSONs match prior service exactly; original legacy PNG is byte-identical. Eight responsive renders verified dimensions. Published API audit covers 106 assets, 37 range assets, five expression genes, six DE comparisons and twelve PCA types.
- Backend native renderer: b040804c430fae5a227ea6e5baac2fb90afb8620. Component snapshot: pankbase-experience-20261103-labels-v1 (original assets unchanged, six label assets added).

Live deployment and final cross-browser acceptance pending below.
