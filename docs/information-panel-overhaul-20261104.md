# Information panel overhaul — 2026-11-04

Release scope: PanKgraph_1104. Display changes preserve source records, exact-object ownership, API filters and existing authentication. No new visualization preview. Frontend baseline: xuteng/react 2c41f9b, reconciled with c04f2e2 before release.

## Implemented contract

Complete record uses ordered two-column section cards (one column below 760px), open additional details and no duplicate all-fields fallback. Gene/SNP production formats and provenance footer remain. Sparse cards do not expand; compact cards have no close control. Evidence tabs use simple full-width source-record tables. No row expansion, internal IDs or mapping/support statuses. Meaningful coordinate/allele variant IDs remain.

Expression identifies cell-type versus other-cell comparisons separately from disease contrasts. Disease rows retain source condition/reference direction. RUV reads explicitly owned source sample rows, separately for each source normalization/matrix; no new condition aggregates. Coloc member tables and CSV retain QTL/GWAS roles separately. Source annotations are structured fields, never evaluated code.

## Validation scope

- 98 real inspections across all 50 registered profiles: structural field placement/duplicate/internal-field audit. This is not all-record scientific acceptance.
- Actual nonempty evidence samples: accessions, coordinates, expression, RUV, credible members, CCC, donor annotations, sample crosswalk and memberships.
- Regression tests exercise zero/false/missing, exact filters, disease direction, exports, ownership, stale responses and fullscreen behavior.
- Removed the obsolete scBrowser preview branch that still dereferenced deleted configuration.
- Blue-corner cause remains under visual investigation; canvas selection is disabled without introducing an overlay or extra clipping.
- Source data and screenshots stay in private audit artifacts, not this repository. Real donor records are never committed.

## Profile audit

“Checked” means real inspection transformed by the candidate renderer policy with no duplicate keys or forbidden fields. It does not claim every profile received browser screenshot or complete scientific source validation.

| Profile | Real samples | Structure | Evidence tabs observed |
|---|---:|---|---|
| edge:ADJACENT_TO__anatomical_structure__anatomical_structure | 2 | Checked |  |
| edge:ANNOTATED_USING__donor__donor_provenance | 2 | Checked |  |
| edge:ANNOTATED_USING__sample__sample_provenance | 2 | Checked |  |
| edge:EFFECTOR_GENE_OF__Gene__disease | 2 | Checked |  |
| edge:FGSEA_ENRICHED_IN__Reactome_pathway__anatomical_structure | 2 | Checked |  |
| edge:FUNCTION_ANNOTATION__Gene__GO_term | 2 | Checked |  |
| edge:FUNCTION_ANNOTATION__Gene__KEGG_pathway | 2 | Checked |  |
| edge:FUNCTION_ANNOTATION__Gene__Reactome_pathway | 2 | Checked |  |
| edge:GENETIC_INTERACTION__Gene__Gene | 2 | Checked |  |
| edge:GENE_ACTIVITY_SCORE_IN__Gene__anatomical_structure | 2 | Checked |  |
| edge:GENE_DETECTED_IN__Gene__anatomical_structure | 2 | Checked | Expression evidence summary |
| edge:GENE_ENRICHED_IN__Gene__anatomical_structure | 2 | Checked | Expression evidence summary |
| edge:HAS_CELL_TYPE__anatomical_structure__anatomical_structure | 2 | Checked |  |
| edge:HAS_SAMPLE__anatomical_structure__sample | 2 | Checked |  |
| edge:HAS_SAMPLE__data_modality__sample | 2 | Checked |  |
| edge:HAS_SAMPLE__donor__sample | 2 | Checked |  |
| edge:HAS_STATE__anatomical_structure__anatomical_structure | 2 | Checked |  |
| edge:HAS_STATE__disease__donor | 2 | Checked |  |
| edge:HAS_STATE__disease__sample | 2 | Checked |  |
| edge:HAS_SUBPATHWAY__Reactome_pathway__Reactome_pathway | 2 | Checked |  |
| edge:HAS_SUBUNIT__Molecular_complex__Gene | 2 | Checked |  |
| edge:LIGAND_RECEPTOR__Gene__Gene | 2 | Checked | Cell–cell context summary |
| edge:LIGAND_RECEPTOR__Gene__Molecular_complex | 2 | Checked | Cell–cell context summary |
| edge:LYMPH_FLOWS_TO__anatomical_structure__anatomical_structure | 2 | Checked |  |
| edge:MARKER_GENE_OF__Gene__anatomical_structure | 2 | Checked | Expression evidence summary |
| edge:OCR_PEAK_IN__ocr_peak__anatomical_structure | 2 | Checked |  |
| edge:PART_OF_GWAS_SIGNAL__Variant__disease | 2 | Checked | Credible-set summary |
| edge:PART_OF_QTL_SIGNAL__Variant__Gene | 2 | Checked | Credible-set summary |
| edge:PART_OF__anatomical_structure__anatomical_structure | 2 | Checked |  |
| edge:PHYSICAL_INTERACTION__Gene__Gene | 2 | Checked |  |
| edge:REPRESENTS_COMPOSITE_LABEL__anatomical_structure__anatomical_structure | 2 | Checked |  |
| edge:SIGNAL_COLOC_WITH__Gene__disease | 2 | Checked | Credible-set summary |
| edge:SUBCLASS_OF__anatomical_structure__anatomical_structure | 2 | Checked |  |
| edge:T1D_DEG_IN__Gene__anatomical_structure | 2 | Checked |  |
| node:Cell | 2 | Checked |  |
| node:GO_term | 2 | Checked |  |
| node:Gene | 2 | Checked | Genomic coordinates, Related links |
| node:KEGG_pathway | 2 | Checked |  |
| node:Molecular_complex | 2 | Checked |  |
| node:Reactome_pathway | 2 | Checked |  |
| node:Region | 2 | Checked |  |
| node:Tissue | 2 | Checked |  |
| node:Variant | 2 | Checked |  |
| node:data_modality | 2 | Checked |  |
| node:disease | 2 | Checked |  |
| node:donor | 2 | Checked | Source annotations |
| node:donor_provenance | 1 | Checked |  |
| node:ocr_peak | 2 | Checked |  |
| node:sample | 2 | Checked | Sample crosswalk, Source memberships |
| node:sample_provenance | 1 | Checked |  |

## Deployment and rollback

Use the existing xuteng/react deployment chain. The display-only schema migration is `scripts/update-viewer-panel-schema.cjs INPUT CANDIDATE [LIVE_DESCRIPTOR]`; never overwrite the source in place. Back up the current viewer schema, verify its hash and exact release, preserve table bindings, validate the candidate, then restart only the owned viewer API when necessary. Results/agent/database services are not part of this restart. Rollback restores the recorded schema backup and previous frontend selector/commit.
