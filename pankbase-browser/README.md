# PanKgraph module integration

The five retained modules are scBrowser (in `single-cell-browser/`), Genome Browser, Differential Expression, Functional Browser and PCA Explorer. The visualization preview popup, Gene Browser and Cell State Browser are removed from result-page navigation and runtime imports.

All modules follow **source → subtabs → primary visualization**, using the existing scmap typography, teal source text, rounded gray tab strip and compact controls. Secondary PCA settings/contributions, DE thresholds, functional donor filters/confidence choices and genome track selection remain available without pushing the primary plot below the initial panel. Expansion preserves the iframe and selected state.

Data requests go to the same-origin `/api/pankbase-data/v1/` service (or the equivalent application-prefix route). It hosts immutable source snapshots on jieliu3 independently of the PanKbase repository, data APIs and runtime CDNs. Genome reference annotations use the explicitly recorded UCSC RefGene hg38 snapshot. Raw sources, prepared files and transformation metadata are available in the backend manifest. Gene expression does not fall back to PanKbase if the local service is unavailable.

Normal Vite/React builds compile vendored source without fetching datasets. `npm run prepare:data` inside either island is an explicit source refresh, not a prebuild step. Prepared data is hosted by the backend and excluded from static UI builds. Original resource/method links remain optional user navigation.

Local demo:

```sh
ssh -N -o RemoteCommand=none -o ExitOnForwardFailure=yes -L 127.0.0.1:18818:127.0.0.1:8818 jieliu3
SC_PREVIEW_PORT=4198 PANKBASE_DATA_PORT=18818 node scripts/preview-scbrowser-build.cjs --pankbase
```

The fixture graph is synthetic navigation context; module data is real source data. API hosting does not establish a matched cohort or scientific causality. scRNA v3.4, pseudobulk v3.3 and functional v1 remain separate releases.

Validation: root Jest suite, both island tests, production builds, all 37 ATAC/reference byte-range assets, all-cell reference expression comparisons, and browser inspection of all five primary views. The frontend branch is `codex/pankbase_experience`; the independent service implementation and reproducible registry/export scripts are in PanKagent `deploy/pankbase-data/`.
