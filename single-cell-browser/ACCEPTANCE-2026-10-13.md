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

The hosting rule also rewrites .html entry pages. The final embed loads a fixed
same-origin embed.json build manifest into iframe srcdoc, with an explicit base
URL and preview meta flag. The child uses its inherited parent origin for the
existing message checks. No shared hosting rules change. All 28 suites / 274
frontend tests and production build pass. Local Chrome acceptance passes for
real INS/GCG expression, navigation to an older-source HGNC marker gene, source
disclosure, map/violin rendering and mobile layout, without full metadata reads.

Canonical KG format repair: the backend preserves uppercase raw ~type and exposes
lowercase display_type separately. Lowercase navigation fixtures missed that
contract. The detector now matches registered types case-insensitively, retains
rawRelation and never changes KG records. Unknown types are rejected and ATAC is
still unavailable. A CFTR uppercase-enrichment fixture with HGNC_symbol and the
recorded anatomical labels verifies the automatic card/tab and real atlas
expression, including Ductal and MUC5B+ Ductal highlights. All 28 suites / 283
frontend tests and production build pass.

Schema integration follow-up: the result-page schema owns scBrowser eligibility,
registered relations, preview options and shared React/Vue wording. Expression
keywords alone cannot activate it; a registered RNA gene/cell pair must exist.
The first eligible pair in graph order initializes the full browser. The default
preview shows the complete cell-type atlas without statistics, metadata or a
gene request. Pair navigation stays in the full browser. Display release is V3.3;
the technical atlas ID remains islet_of_Langerhans_scRNA_v3-4.

All 28 suites / 279 frontend tests, nine loader/renderer tests and the production
build pass. Updated tests replace the previous verbose-card assertions. Browser
inspection verified map-only preview, CFTR/Ductal autofill, actual CFTR expression
and V3.3 header wording. Screenshot: /tmp/scmap-schema-preview.jpg.

Compact preview labeling follow-up: the existing label canvas now draws preview
cluster names with 8px outlined text, wrapped long names, bounded collision placement
and leader lines. Full-browser labels keep their existing style. One schema-owned
Open scBrowser hint returns below the preview; metadata/captions remain disabled.
Ten loader/render tests pass, including narrow-window label bounds and collisions.
All 31 vNext suites / 288 tests and the production build pass. Browser inspection
verified all atlas cluster names in the small preview, the one-line opening hint,
and its activation of the existing scBrowser tab. Local screenshot:
/tmp/scmap-preview-labels-detail.jpg. No extra visualization component is added.

Compact full-browser follow-up: smaller header/controls/navigation, short violin
explanation, no separate expression badge, and no pair-navigation row for a single
pair. The V3.3 header now has an inline PanKbase link using schema-configured
PKBdatasetId/PKBgene plus compatibility aliases. Browser checks confirm the
external portal opens CFTR expression in the correct 448,935-cell atlas and the
embedded link changes to GCG when exploring GCG. All 31 suites / 288 frontend
tests, eleven data/render tests and production build pass. Screenshot:
/tmp/scbrowser-compact-detail.jpg.

Expression-cache follow-up (2026-10-14): same-origin sparse Float64 vectors,
atlas-hash identity checks, preview prefetch and persistent browser reuse. All 32
vNext suites / 292 tests, thirteen data/render tests and production build pass.
Four backend cache/route tests pass. Cached CFTR/GCG/INS data was prewarmed;
public cached CFTR checks took 0.34–0.46 seconds. Browser verification renders
actual CFTR expression colors and violin plots after prefetch. The renderer
continues to receive freeze-safe ordinary arrays with exact source values.
