# T1D Coloc Explorer

The explorer browses recorded T1D colocalization analyses. It does not calculate
new posterior probabilities, run a model, or infer causality from variant overlap.
The catalog is supplied by the read-only results-service `/api/coloc/records`
endpoint; selecting a source-defined signal pair reads `/api/coloc/records/{id}`.
All requests use the authenticated same-origin `/pankgraph-vnext/api` namespace.

## Activation

The route `/coloc-explorer` and its Tools card require the separate boolean
`colocEnabled: true` in `/pankgraph-dev-config.json` on dev.pankgraph.org or
localhost. It defaults to false independently of `vnextEnabled`, and is always
false on production hosts. Keep it disabled until the API and browser acceptance
below pass. Turning the flag off removes the card and redirects the route to
Tools; it does not alter any saved results, sessions, agent or graph services.

Deploy the results-service endpoints before enabling the frontend flag. Check
the currently owned results release and concurrent changes before deployment.
The graph viewer backend and its deployment are outside this change.

## Evidence semantics

- Each catalog item is one recorded source/version/gene/disease/GWAS-signal/QTL-
  signal/dataset comparison; show multiple comparisons separately.
- H0–H4 are the recorded coloc analysis probabilities. Trait 1/2 ordering must
  follow source metadata; do not guess it from the visual ordering of GWAS/QTL.
- Variant PIPs belong to their respective fine-mapping analyses. They are not
  variant-specific coloc posterior probabilities. Never multiply them to invent
  shared-variant probabilities.
- `nsnp` is the original coloc analysis denominator. Credible-set member counts,
  overlap counts, and coordinate coverage are independent displayed quantities.
- A source file containing only credible-set variants cannot support a full-
  region interpretation. Use the explicit credible-set coverage label on tracks,
  exports and source tables. Missing source membership is not biological absence.
- Empty, missing, inaccessible and pending source data are different states.
  Keep recorded posterior evidence available if variant data fails.
- T1D and T2D collections are not interchangeable. V1 excludes the separate
  T2D workbook. Assembly and source-version mismatches must prevent overlaying
  sources; unavailable positions are excluded with counts.

## Sources

The results adapter resolves registered public S3 QTL objects by exact signal
identity, reads GWAS memberships from the configured Neo4j release, and uses
existing verified coordinate lookup. Source URLs, hashes, build, release and
observation time accompany available data. It never accepts browser-supplied
filesystem paths or arbitrary object URLs.

Turbo full-region plots are conditional on a validated, checksum-locked
pre-indexed source extract with matching release/build. The observed nominal
islet eQTL file is too large for request-time scanning. No matching full T1D GWAS
or LD source was established during the initial bounded inventory, so v1 must
not add LD coloring or pretend its credible-set points cover the entire region.

## Acceptance

1. Check catalog count and ADCY3/GSDMB source identities against active Neo4j.
2. Check exact QTL S3 downloads and full GWAS membership, independent of displayed
   graph nodes. Verify count/coverage and source-failure handling.
3. Test loading, missing-vs-zero, coordinate exclusions, invalid probabilities,
   stale-response cancellation, multiple records, and unchanged saved graph flow.
4. Verify desktop/mobile catalog filters, record selection, linked variants,
   evidence graph, and TSV/SVG/PNG downloads with their provenance labels.
5. Confirm legacy Tools and result routes still work, then enable only on dev.

## Initial acceptance (2026-09-21)

The local browser preview used the real identity-verified `PanKgraph_08_04`
catalog and exact registered S3 source files: 23 comparisons across 17 genes.
ADCY3 eQTL returned 102 GWAS and 28 QTL members (125 union, 5 shared); GSDMB
eQTL returned 79 and 100 (112 union, 67 shared). The exonQTL comparisons were
also checked against their separate source identities.

Catalog filtering, loading that retains the overview and recorded posteriors,
keyboard variant selection, table/plot linking, and the rendered existing graph
were verified in the browser. Responsive checks retained internal table/plot
scrolling without page overflow. SVG XML validation catches duplicate namespace
attributes, and graph layout has an explicit container height.

Legacy graph coordinates were found to have an unverified convention. Only
independently verified coordinates are plotted; three non-rs variants in each
acceptance comparison remain in the table with an explicit coverage notice.
The source panel distinguishes all retrieved graph rows from a complete original
credible set. Turbo extracts remain optional and require source validation;
no raw regional file or T2D workbook is silently substituted.
