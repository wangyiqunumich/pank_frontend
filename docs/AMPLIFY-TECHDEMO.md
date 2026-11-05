# Fixed PanKbase demo on Amplify

The `xuteng/react` Amplify build publishes an independent fixed demo at `https://dev.pankgraph.org/techdemo`. Existing development pages continue to use their existing source and routing.

`config/techdemo.json` pins the complete, reviewed demo source commit and records its source branch. The `postbuild` hook builds that commit in a disposable Git worktree and copies its output to `build/techdemo`. It runs only when `AWS_BRANCH=xuteng/react` (or explicit local `PANK_BUILD_TECHDEMO=1`), so production and the separate jieliu3 frontend updater do not build or replace this demo. A failure stops deployment; the previous Amplify artifact remains active.

The demo bundles its labeled navigation fixture and never calls agent/result APIs. It keeps scBrowser, genome, differential-expression, functional and PCA modules interactive, with data loaded from EC2. Follow-up execution is disabled. The displayed graph fixture is not a live biological graph query.

Amplify proxies only `/techdemo/api/pankbase-data/v1/<*>` to `https://api-dev.pankgraph.org/api/pankbase-data/v1/<*>`. This HTTPS origin is the EC2 component service at `52.87.115.143`, not jieliu3. Additive rewrite rules serve `/techdemo`, `/techdemo/`, `/techdemo/index.html`, and `/techdemo/result-new2` from `/techdemo/index.html`. Other routes and the development site's existing authentication remain unchanged.

`/techdemo/techdemo-release.json` records the feature commit, host commit and build timestamp. Verify it after each deployment, then exercise all five modules. Source archives and database/write endpoints are not published by the EC2 HTTPS gateway.

To update the demo, commit/review changes on its source branch, update the pinned commit in `config/techdemo.json`, and push the host change to `xuteng/react`. For a local reproducible build run `PANK_BUILD_TECHDEMO=1 node scripts/build-techdemo.cjs` after the normal application build. To roll back, restore a previously verified source pin and redeploy; do not replace the main development UI with the feature branch.

For download changes, run `scripts/verify-graph-download.cjs` against a local `/techdemo/` build (`GRAPH_QA_URL`). It verifies JSON and PNG downloads with compact/expanded toolbars in both inline/fullscreen views, mobile menu placement, and the original underline tabs. The demo pin must include UI fixes; updating the main development source alone does not update this independent snapshot.

Backend and HTTPS operations are maintained in the private `RingoMao/pank_backend` repository.
