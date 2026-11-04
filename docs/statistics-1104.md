# Statistics page: PanKgraph 1104

The `/docs/statistics` page presents a pinned development snapshot, independently
of the database selected by the query backend. `/statistics` redirects to it.
The surrounding site navigation is preserved; page styles are scoped.

Source baseline: `wangyiqunumich/pank_frontend`, `xuteng/react`,
`a118ee464d9c9b9e607163df7f523feaaec8a3e6`.
Initial inspection used `c1fcea34c91cac4e547fa1ea1ccc4064b9f7b6a8`; the
subsequent upstream hover-card fix was fast-forwarded before the final build.

## Data provenance

The aggregate catalog `src/statistics/statistics1104.json` was projected from
`RingoMao/PanKgraph_codex`:

- `Research/Reports/release_1104/data_schema.json`: every node category and
  relationship endpoint group, exact counts, stored licenses and versions.
- `configs/pankgraph-1104-demo.json`: accepted build totals and supporting-row total.
- `docs/modalities/Sources.library-links.json`: reviewed PanKbase resource mappings
  (2026-10-20). Related resources retain that distinction; recorded dataset links
  come from the 1104 schema. A dataset link is not a claim of exact file identity.
- Existing statistics documentation: retained applicable pipeline and code links.

The JSON contains the input-manifest and source-schema SHA-256 values. Totals are
5,454,692 nodes, 7,262,719 relationships and 25,687,709 supporting rows in 10 tables.
Relationship groups are type + endpoints; the 34 groups are not 34 unique types.
The 14 node categories distinguish donor/sample provenance ownership.

Only aggregate metadata is exported. Raw examples, donor-level records, private
source URLs and filesystem locations are excluded. License values are preserved;
`unknown` is displayed as “Not yet verified.” Combined terms remain combined.
Source terms are not inferred from related library resources. In particular,
metadata and CCC are not assigned an open license, and the GWAS summary dataset
is not represented as the exact fine-mapping source.

## Maintenance and checks

Update the catalog from a newly validated build schema and its reviewed resource
mapping; reconcile both graph totals before publication. Do not derive counts
from the broader source catalog, which also contains excluded source products.
Run `src/pages/StatPage.test.js` for count reconciliation, public-metadata bounds,
link shape and interactive filtering. Existing frontend API/scBrowser integration
checks and the complete build remain required for deployment. Test desktop and
narrow layouts; the data table scrolls horizontally on narrow screens.
