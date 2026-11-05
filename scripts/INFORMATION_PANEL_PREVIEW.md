# Information Panel authoring preview

Render actual application components against saved real `/inspect` responses:

```
node scripts/render-information-panels.cjs real-records.json output-directory viewer-schema.json
```

The optional schema enables the release-aware inspected panel. Without it, the
exporter exercises the recorded-result fallback. Each input produces compact and
expanded HTML. The export uses actual React components and their authored CSS;
it is not a second handwritten mockup. Do not commit private input records or
rendered data artifacts. Static HTML verifies appearance only; hover, fullscreen,
filters, pagination and downloads require browser verification.

Presentation policy lives in `src/schema/information_panel_schema.json` and
`card_layout_schema.json`. The allowed tab titles do not grant evidence ownership:
only exact-owned tables returned by the release-paired API can produce tabs.
Marker nodes/edges without an explicit expression mapping remain record-only.
The full record remains available when compact presentation omits lower-priority
fields to meet its height budget.

The host supplies a result release plus backend-issued typed refs. The viewer
uses the existing authenticated `/api/viewer/v1` gateway; no database token or
private origin belongs in browser code. Legacy saved graphs retain recorded
panels. Backend setup and rollback live in PanKagent Ringo's
`deploy_native_agent/VIEWER_PANEL_INTEGRATION.md`.
