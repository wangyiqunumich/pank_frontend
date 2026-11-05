# Graph viewer panel contract

Canonical dev configuration: `PanKgraph_1104.schema.json`.
The viewer API exposes its `panel_presentation` alongside profiles and exact-object table contracts.
React consumes the response for the current release. Bundled policy is a generated compatibility fallback, not a second editable design.

After editing the canonical file:

```sh
node scripts/sync-viewer-panel.cjs config/graph-viewer/PanKgraph_1104.schema.json
CI=true npm test -- --watchAll=false --runInBand src/vnext/evidence
```

Edit `profiles` for modality fields and section priorities. Edit `panel_presentation` for the header, controls, footer, source navigation, compact summaries, record designs, layout, field labels and evidence tab declarations. `table_downloads.sources[].href` is a human-readable source page; `artifact_url` preserves source provenance and is not a panel navigation target.

Deploy the same canonical JSON as the release's viewer.schema.json, retaining exact table bindings. Back up first, restart only the owned viewer API, and read back schema version/hash. Publishing the frontend alone does not activate API changes.

## Independent result modules

Result page schema and module manifests own scmap, DEG browser and other module availability/activation by graph node/edge types. This contract only owns graph inspection panels and object-local evidence tabs. It does not register, suppress or activate result modules. No visualization-preview overlay is introduced.

## Verification

`panelSchema.test.js` mutates the API policy and verifies rendered title alignment/line count, button labels, footer fields, tab labels and compact summary columns. Existing evidence tests cover exact object scoping, CSV pagination/cancellation, missing values, source navigation, record designs and numeric presentation.
