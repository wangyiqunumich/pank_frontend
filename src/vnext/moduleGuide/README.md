# Module guide integration

Authoritative manual and action/API documentation live in private `RingoMao/pank_backend`:
- `docs/module-guide.md`: seven-module capability matrix, conversation examples, defaults and Apply/Undo contract.
- `docs/side-chat-api.md`: entity lookups and bounded UI proposals.
- `services/module_guide/manual/*.md` + `manual-index.json`: source of this directory's generated `manual.json`. Run the backend generator and copy its output exactly; never independently edit this JSON.

`ResultSection` accepts guide-open events only for the current, non-planning techdemo result. Registered targets may be appended even without graph/schema triggers. New tabs use independent contexts and a visible exploration notice; no graph nodes, relationships or answer text are synthesized. Known contexts remain usable. Existing pane order is preserved, and module visibility reaches lazy iframe adapters. State is scoped to the result, not persisted with conversation text.

`bridge.js` validates actions, serializes Apply, opens/creates the target, waits for its registered configuration handler and returns the inverse. Module adapters validate again. Open-only actions have no inverse; Undo restores controls, not tab creation. No arbitrary JS, DOM selectors, URLs or model-executed queries are permitted.

Acceptance fixture: `/techdemo/result-new2?provider=vnext&run_id=33333333-3333-4333-8333-333333333333&session_id=module-guide-demo`. It starts with an empty graph and no module triggers. Ask to configure PCA or Genome, Apply, check a new tab and actual controls, then Undo. This is a fixed local result fixture with existing read-only data APIs, not a main-agent run. The original all-module fixture stays unchanged.

Regression checks: `ResultSection.guide.test.js`, `techdemoApi.test.js`, `moduleGuide/ModuleGuide.test.js`; source browser startup/render checks remain in `single-cell-browser/render.test.mjs`.
