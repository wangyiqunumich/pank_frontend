# Tech Demo on Amplify

The dedicated [Tech Demo](https://dev.pankgraph.org/techdemo/) and regular results load the same React bundle, stylesheets and module implementations from the current `xuteng/react` build. The dev postbuild step writes a marked entry document at `build/techdemo/index.html` and copies the two embedded browser asset directories to their existing demo paths. Existing Amplify rewrites and module API proxies continue to serve these paths.

The normal and demo extension allowlists live in `src/vnext/schema/result_page_schema.json` under `main_visuals.extension_profiles`. The shared selector applies the active list to graph triggers and Guide actions. The demo document selects the full list under its dedicated path. Regular result parameters, keywords and graph evidence cannot select the demo profile.

The default demo opens a fixed CFTR result with matching contexts for all six extensions. The separate guide fixture starts with an empty graph for manual exploration. Both use the standard result renderer and read-only module APIs. The demo uses a local fixture API for runs and results.

The dev build publishes provenance at `/result-modules-release.json` and `/techdemo/techdemo-release.json`. Both report the same source commit and their respective enabled extensions. For local packaging, run `PANK_BUILD_TECHDEMO=1 npm run build`.
