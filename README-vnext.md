# Isolated jieliu3 frontend

Baseline: upstream `xuteng/react`, `bc27e3f272057ba161ac827bd91adfb7823d7b07`.
This independent checkout preserves the existing layout, styles, graph controls,
plan confirmation, answer tables, and supplementary-resource tab positions.

Build with `npm ci --ignore-scripts --no-audit --no-fund` then `npm run build`.
The checked-in public configuration builds for `/pankgraph-vnext/`.
Serve `build/` with SPA fallback at that prefix and proxy the following routes
on the same origin, retaining shared-password HTTP authentication:

- `/pankgraph-vnext/api/agent/v2/*`: vNext plans, revisions, confirmations,
  run snapshots, cancellation, and SSE. Disable proxy buffering for SSE.
- `/pankgraph-vnext/api/results`: create an immutable result presentation;
  `GET .../results/{id}` supplies graph/layout, answer, and resource updates.
- `/pankgraph-vnext/api/search`: typed gene, variant, and credible-set search.
- `/pankgraph-vnext/api/resources/*`: local cached downloads and plots.

Conventional template IDs are `qtl_by_gene`, `qtl_by_variant_gene`,
`qtl_by_variant`, `gwas_by_variant`, `coloc_by_gene`, `expression_by_gene`.
Parameters use `gene_id`, `variant_id`, and optional selected
`credible_set_id`, `lead_variant_id`, `data_source`.

Preview presentation starts after preflight completes, and final presentation
starts after the final graph-answer event. Reconnect uses a persisted snapshot
and its `event_sequence`, then resumes SSE after that cursor. Saved run IDs and
result IDs avoid repeating inference or graph execution on refresh. Failed
creation with an uncertain network outcome is not retried automatically.
The results API is polled while optional components are still pending, even
when the graph/layout is already ready. Literature references append from
validated agent output without an extra browser bibliographic request.

Production planner fallback, analytics, Cognito, legacy AWS query/summary calls,
standalone tools, IGV, and feedback submission are disabled in this demo.
Existing external source/navigation links and passive PanKbase image assets
remain intentional links/assets; query data and downloads use the local APIs.

Run `CI=true npm test -- --watchAll=false --runInBand src/vnext` for transport,
SSE, lifecycle, revision, graph binding, resource-linkage, and upstream
presentation parity checks. These tests use fixtures and do not run inference.
No current PanKgraph/PanKagent deployment is controlled by this checkout.
