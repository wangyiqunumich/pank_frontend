# Statistics page: PanKgraph 11/04/2026 version

The `/docs/statistics` page uses the public release name
**PanKgraph 11/04/2026 version**. Internal build IDs remain implementation and
provenance identifiers, never public release labels. `/statistics` redirects to it.
The surrounding site navigation is preserved; page styles are scoped.

Source baseline: `wangyiqunumich/pank_frontend`, `xuteng/react`,
`a118ee464d9c9b9e607163df7f523feaaec8a3e6`.
Initial inspection used `c1fcea34c91cac4e547fa1ea1ccc4064b9f7b6a8`; the
subsequent upstream hover-card fix was fast-forwarded before the final build.

## Data provenance

The aggregate catalog `src/statistics/statistics20261104.json` was projected from
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
source URLs and filesystem locations are excluded. Raw license values are preserved. The public usage-policy column links PanKbase
and PanKgraph source records to https://pankbase.org/policies.html with “Follow
PanKbase policy”. Owned Metadata/Functional API aliases use that same policy.
HPAP/PANC-DB records link to https://hpap.pmacs.upenn.edu/user-agreement with
“Follow HPAP policy”. Mixed source groups display both applicable policies.
External sources retain explicit licenses or neutral “See source terms” text.
Related PanKbase library links alone do not trigger the PanKbase policy label.
Combined external terms remain combined.
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

Public naming correction baseline: `04149aa` on `xuteng/react`. No DOI is
displayed until a version-specific record is actually registered.
