# Information panel production design restoration

Production reference: `33ba32cc5cf44f4bdda1554683308a56cf02cee9`,
`src/schema/graph_viewer_schema.json` and `src/components/KnowledgeGraph.js`.
Dev continues to deploy from `xuteng/react`; production is read-only reference.

- Compact panels use section headings and label/value columns, not summary tables.
- Source, version, actual source link and license remain in the shaded footer.
- Gene and Variant section order and formats are registered in the application
  information-panel schema from production: chromosome/GC pills and population
  frequency bars retain the production design. Missing current-release fields
  are not reconstructed from an old dataset.
- Compact priorities select whole fields under the shared layout budget. Expanded
  Complete record uses two columns, preserves complete annotations and all SNP
  populations (including zero frequencies), with local scrolling.
- Enlarge is shown only for omitted non-empty annotations or exact owned evidence.
  Repeated provenance alone does not qualify; sparse cells have no enlarge action.
- SQL evidence tabs retain the same release/typed-ref ownership contract.

Validation: production build; 14 focused tests; real 1104 Gene, Cell and Variant
render inspection. The three-real-card schema validator found no schema errors;
Gene/Variant full-profile height estimates exceeded compact limits, addressed by
compact field selection and retained internal scrolling. No database changes.
The backend inspection bridge requests complete annotations so expanded cards
never silently reuse a compact-only response.

## Current expression lists

Compact relationships display graph-resolved endpoint names alongside stable IDs, method and current data context. Expression views render current registered methods as direct read-only lists, without historical V3.3 selection, per-row expand controls or repetitive explanatory prose. The all-treatment preset supersedes its baseline subset; conditions, treatment, reference, units and source versions remain distinct. Exact object ownership and complete CSV export are unchanged.

### 2026-11-04 exact-object evidence audit

Panel-only policy hides record, snapshot, context, signal and credible-set lookup IDs;
source IDs, PanKbase IDs, RRIDs and public accessions remain visible. Lookup keys and
CSV source records are unchanged. SuSiE and QTL class tokens are literal. Expanded
record sections and credible-set metadata open by default. Unknown effect units
remain documented in field definitions without a verbose unit suffix.

Saved 1104 graphs lacking a typed viewer handle can recover it only from an exact
raw object ID and one unambiguous same-release schema profile. Invalid handles,
ambiguous profiles and cross-release graphs do not use this recovery. The API
continues to enforce exact-object ownership.

Authenticated PanKgraph_1104 inspect/table checks returned owned records for:

| Objects | Expanded view | Verification |
| --- | --- | --- |
| QTL, GWAS, coloc edges | Credible-set summary | Each returned members; screenshot QTL exact object also verified |
| Detect, enrich edges | Expression evidence summary | Expression and RUV records returned |
| Marker edge | Expression evidence summary when explicitly mapped | Sampled marker has no mapping; no borrowed evidence |
| CCC edge | Cell–cell context summary | Context records returned |
| Gene | Genomic coordinates; Related links | Placement and accession records returned |
| Donor | Source annotations | Source annotation returned |
| Sample | Sample crosswalk; Source memberships | Both tables returned |

These are real-object samples, not all-record coverage or scientific validation.
Three-real-card layout validation has no schema errors; long Gene/Variant cards
retain internal scrolling for their existing compact content budgets.
