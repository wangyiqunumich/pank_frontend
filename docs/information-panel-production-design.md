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
