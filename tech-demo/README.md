# Public scmap demo

`/tech_demo` displays the specified saved CFTR result using the dev application's
actual ResultSection, KnowledgeGraph and scBrowser components pinned in
manifest.json. Only public/tech_demo and this source package are added to production.
No production root React source or dependency changes are needed.

The result is a fixed graph-revision-1 snapshot, not a new inference. No follow-up,
agent request or session telemetry is exposed. Expression lookup remains live via
the existing anonymous same-origin `/pankgraph-vnext/api/scbrowser/expression`
endpoint and its registered public BioIndex fallback. No authentication changes
or backend restarts are required. Public expression availability depends on those
existing services. Atlas/source distinctions and scientific caveats remain visible.

Rebuild with `python3 tech-demo/build.py`, then review public/tech_demo and its
manifest hashes. The script uses a temporary checkout, pinned upstream commit,
locked npm dependencies and the maintained atlas preparation pipeline. source.patch
contains only demo API shutdown, asset-prefix and follow-up/telemetry adaptations.
index.js replaces the temporary entry; index.html replaces its public template.
The normal production build copies this prebuilt isolated artifact from public.

Hosting requires the exact `/tech_demo` and `/tech_demo/` paths rewritten to
`/tech_demo/index.html` before the existing SPA fallback. Asset paths remain
under `/tech_demo/`. Do not enable a blanket dev proxy or remove site authentication.
Rollback: revert this additive commit and remove those two exact hosting rules.

Initial validation: production bundle compiled; local browser renders the saved
answer, graph and scBrowser tab; anonymous production expression CFTR response is
HTTP 200, sparse-u32-f64-le, 448935 cells. Hosted browser acceptance is recorded
separately after deployment.
