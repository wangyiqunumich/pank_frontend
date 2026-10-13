# Compact map and automatic KG expression — 2026-10-13

Candidate based on dev `xuteng/react` at `53c74bdbbafdef09b3878fd53d2007637d51eb57`.

- Source metadata: 109,644,935 bytes. Compact gzip: 2,971,257 bytes;
  decoded compact envelope: 5,387,453 bytes. All 448,935 cells retained in
  original order; coordinates retain the existing Float32 renderer precision.
- Build-time projection includes only coordinates and cell-type codes. SHA-256
  source and generated-asset identity is recorded in the build manifest. Raw
  data and generated assets are excluded from Git.
- Matching RNA edges automatically initialize the expression card. KG evidence
  inspection updates the matching gene/cell context. Detection, enrichment and
  marker relationships, including HGNC_symbol genes, are covered. ATAC and
  unregistered dataset identities remain unavailable.
- The preview now colors cells by the selected gene rather than only cell type.
  Atlas context remains related, with source release and condition kept distinct.

Validation: 28 vNext suites / 271 tests pass using
`CI=true npm test -- --watchAll=false --runInBand --testPathPattern=vnext --transformIgnorePatterns=^$`.
The transform override handles the existing ReactMarkdown ESM dependency in
AnswerMarkdown tests. Nine loader/renderer tests pass. Production build passes
with pre-existing repository lint/dependency warnings; `git diff --check` passes.

Rendered Chrome acceptance used navigation fixture KG records with real public
PanKbase INS and GCG expression. Automatic INS preview, map and violin rendering,
gene switching, edge navigation and a 390px mobile render passed, without uncaught
page errors. Network inspection confirmed no fields.json, coordinates.tsv or
catalog requests from the browser. This does not establish independent barcode
alignment, exact KG cohort equivalence or general biological coverage.

Deployment status is reported separately; these checks are loopback acceptance.

Hosted acceptance found that the existing Amplify SPA rule rewrites .json.gz
URLs to index.html, despite successful build/deploy checks. The follow-up serves
the compact envelope as ordinary .json, preserving the hosting configuration.
Its payload is 5,387,453 bytes, 95% below source metadata; CDN compression is an
additional transport optimization rather than a required client contract.

Automatic-context follow-up: RNA edges from older/different source datasets now
show the matching gene in the registered atlas as related context. The original
dataset remains in edgeDatasetId and is disclosed in the card and source pane.
ATAC remains unavailable. All 28 vNext suites / 273 tests and production build
pass. This intentionally replaces earlier dataset-mismatch suppression; it does
not claim source/cohort equivalence.
