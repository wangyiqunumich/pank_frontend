# Result page presentation schema

Edit `result_page_schema.json` and rebuild the frontend to change presentation.
The selector in `resultPageSchema.js` checks each visual's requirements; the
scBrowser React panel and Vue browser share the same schema via `scBrowserConfig.js`.

## Single-cell browser

All fields below are under `main_visuals.items.single_cell_browser`:

- `enabled` and `hidden`: enable or suppress both the tab and preview.
- `requires: ["rna_expression_pair"]`: require a supported RNA gene/cell pair.
  Detection, enrichment, expression and marker edges are registered in
  `kg_relation_types`; canonical names match case-insensitively. ATAC is excluded.
- `selection.default_pair`: `first_available_in_graph_order`. The first eligible
  pair initializes the gene and cell type without reshuffling on rerender.
- `preview.enabled`, `height`, `show_caption`, `show_metadata`, `load_expression`:
  default to a 160px whole-atlas map, with no caption, metadata or expression fetch.
  Clicking the preview opens the persistent scBrowser tab.
- `wording`: shared display text. Change `display_release` to edit release labels
  everywhere in this viewer. `atlas_label` interpolates `{display_release}`.
  The current label is `PanKbase scRNAseq V3.3`. Other keys control titles,
  navigation, controls and load/failure messages.

This schema changes display copy. It does not relabel the source dataset, alter
KG releases/conditions, or assert cohort equivalence. The registered technical
atlas remains `islet_of_Langerhans_scRNA_v3-4`; Source & methods exposes its
identity and the original KG source separately.

Validate with the vNext schema and browser tests. Rebuild to publish schema edits to both bundles.
