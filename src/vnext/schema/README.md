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

## QTL fine-mapping

`main_visuals.items.qtl_fine_mapping` owns the production QTL visual:

- `enabled`, `hidden`, `requires` and `kg_relation_types` control activation. A
  returned `PART_OF_QTL_SIGNAL` or `PART_OF_QTL` edge activates the tab even if its
  source metadata is missing, in which case an explicit unavailable message appears.
- `sources` contains the four existing production QTL source aliases, display
  labels and exact S3 folders. `context_fields` controls the recorded context shown.
  Request keys use the returned source and credible-set ID; no set is guessed.
- `selection` documents first-in-graph-order initialization and deduplication by
  source/set. The source picker allows switching between distinct pairs.
- `request` records the existing AWS **production** `/typeToImage` endpoint,
  `manhattan` image type, timeout, response limit and memory-cache limit. The API
  returns plain base64 with an image/jpeg content type; quoted JSON base64 is also
  accepted. No credentials, Cypher, new graph retrieval or model work is sent.
- `plot` records the production renderer's three tracks, LD color/lead-marker
  semantics and editable maximum display height. These statistical descriptors
  describe the AWS image; changing them does not change the AWS renderer itself.
- `wording` owns title, full description, source-picker label, image accessibility
  text, loading/failure/missing-context messages, expansion and download labels.
- `download_origin` binds exact source/set downloads to the existing public S3
  origin. `supporting_material: main_visual_only` promotes the matching QTL plot
  out of supporting material; other empirical sources and raw downloads remain.

The frontend displays the original AWS image rather than reconstructing its
statistics, LD or axes. The previous vNext coordinate-based two-track image remains
in the saved resource payload but is not shown for the promoted QTL source/set.

The scBrowser preview also supports `preview.labels`: enable/disable labels,
set `font_size` and collision `gap`, and customize wrapped display names through
`names` (use `\n` for line breaks). Labels use the actual cluster projections,
white text outlines and short leader lines when shifted to avoid overlap.
`preview.show_open_hint` controls one footer hint using `wording.preview_open_hint`.
These settings add no legend, statistics or extra visual tab.
