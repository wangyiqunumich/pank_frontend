# Fixed PanKbase demo on Amplify

The `xuteng/react` Amplify build publishes an independent fixed demo at `https://dev.pankgraph.org/techdemo`. Existing development pages continue to use their existing source and routing.

`config/techdemo.json` pins the complete demo source commit and records its `source_branch`. The `postbuild` hook builds that commit in a disposable Git worktree and copies its output to `build/techdemo`. It runs only when `AWS_BRANCH=xuteng/react` (or explicit local `PANK_BUILD_TECHDEMO=1`), so production and the separate jieliu3 frontend updater do not build or replace this demo. A failure stops deployment; the previous Amplify artifact remains active.

The demo bundles its labeled navigation fixture and never calls agent/result APIs. It keeps scBrowser, genome, differential-expression, functional and PCA modules interactive, with data loaded from EC2. Follow-up execution is disabled. The displayed graph fixture is not a live biological graph query.

Amplify proxies `/techdemo/api/pankbase-data/v1/<*>` and `/techdemo/api/functional/api/<*>` to the matching paths on `https://api-dev.pankgraph.org`. This HTTPS origin is the EC2 component service at `52.87.115.143`, not jieliu3. Additive rewrite rules serve `/techdemo`, `/techdemo/`, `/techdemo/index.html`, and `/techdemo/result-new2` from `/techdemo/index.html`. Other routes and the development site's existing authentication remain unchanged.

`/techdemo/techdemo-release.json` records the feature commit, host commit and build timestamp. Verify it after each deployment, then exercise all five modules. Source archives and database/write endpoints are not published by the EC2 HTTPS gateway.

To update the demo, commit/review changes on its source branch, update the pinned commit in `config/techdemo.json`, and push the host change to `xuteng/react`. For a local reproducible build run `PANK_BUILD_TECHDEMO=1 node scripts/build-techdemo.cjs` after the normal application build. To roll back, restore a previously verified source pin and redeploy; do not replace the main development UI with the feature branch.

Backend and HTTPS operations are maintained in the private `RingoMao/pank_backend` repository.

For browser layout tuning and acceptance, see [TECHDEMO-VISUAL-LAYOUT.md](TECHDEMO-VISUAL-LAYOUT.md).
