# Module guide sidebar

Built from current `xuteng/react` upstream `dafec157aecf88ec45d5f5c62ee803de1c9e8b73` with the retained fixed-demo UI source. The main site/agent remain unchanged; launcher is gated by `TECH_DEMO` and sits above the actual Feedback button geometry.

Implementation: `src/vnext/moduleGuide/ModuleGuide.js`, style `guide.css`, client action contract `actions.mjs`, and `bridge.js`. English/Chinese manual is copied exactly from private backend `services/module_guide/manual.json`; edit the backend Markdown and regenerate with `scripts/build-module-guide-manual.py`, then copy the JSON. The backend operator guide is `RingoMao/pank_backend/docs/module-guide.md`.

UI: nonmodal, keyboard-accessible side panel, Chat/Manual, module selector, six starter/module categories, searchable ten-section manual, source buttons, conversation in sessionStorage (last 24 messages), bounded last-six-turn requests. No key in frontend; POST to `sitePath('/api/module-guide/chat')`. Health failure leaves manual and preset cards available. No paid auto-retry, automatic send, automatic apply or generated HTML. Typed messages/selected module go to the AI provider; do not include private/donor data. Reset/closing does not cancel already billed requests.

Allowed direct controls: module/subtab opening; Genome exact cell/track types/height and explicit region; DE display thresholds; distinct PCA axes; Functional response mode. No arbitrary DOM selectors, JS, SQL/Cypher, file paths or URLs accepted. Parent/iframe messages require matching same origin, frame source and protocol. Genome actions wait up to nine seconds for its initial data; failures show a message. The model proposes cards; user Apply triggers validated controls, acknowledgement and Undo. Acknowledgement does not assert successful remote data loading. scBrowser/graph retain native detailed controls.

Each iframe remains mounted; applying a configuration doesn't remount the entire result. Genome native track remount is its existing Apply tracks path, preserving the current locus. Region action now returns the initialization promise so success isn't reported before initialization completes.

## Acceptance checklist (2026-11-04)

- [x] Production `/techdemo` build and existing fixed-demo React tests (3 suites/8 tests).
- [x] Browser island tests, including new action validation and inverse operations (15 tests).
- [x] Backend module-guide tests: 11 including concurrency, restart, idempotency, timeout reservations, billing anomaly halt, schema/grounding and manual-only mode; existing component/functional/inventory tests also passed.
- [x] Desktop browser: launcher above Feedback; manual opens; Apply comparison changes Genome from 14 to 8 tracks; Undo restores 14.
- [ ] Final narrow viewport/live deployed checks (record below after deployment).
- [ ] Real Haiku auth, citations, multi-turn, scope refusal canaries: blocked by jieliu3 `/var/log` full, preventing sudo access to designated provider configuration. Do not represent mocked provider tests as live model acceptance.

Backend is independently deployed on loopback8822 with a persistent total $20 ledger and public exact guide routes. Missing key is explicitly manual-only. Existing fixed-result/`agent_requests:false`, component/functional endpoints and databases remain unchanged. Amplify needs the one additive guide rewrite described in backend docs. Pin the reviewed feature commit in host `config/techdemo.json` to publish. Roll back via previous source pin; keep backend budget ledger across upgrades/rollbacks.
