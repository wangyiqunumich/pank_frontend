# Development agent preview integration

This candidate starts at `f16a5cb417d14e5473c0c86c85830fea31476258` on
`xuteng/react`. The selected vNext modules and retained working fixes are recorded
in `vnext-import-provenance.json` with source SHA-256 hashes. Graph, plan and
loading renderer adaptations live under `src/vnext`; the legacy renderers,
Cognito provider/logout, HIRN clients, global Axios/Redux APIs, conventional
search, tools, IGV and feedback endpoints remain intact.

New questions use the native `/result-new2` route when the dev runtime switch is
enabled. `/agent-vnext` remains a bookmark alias, not an additional login page:
saved identities redirect to the native result route and an empty bookmark
returns to the original landing page. API requests use same-origin credentials;
browser storage and bundles never hold Basic, operator or provider credentials.

The server/edge must serve the access endpoints and `/pankgraph-vnext/api/*`
before its SPA fallback, preserving application authentication and stream
semantics. API resources remain under that namespace while UI routes stay at `/`.
The operator health page has its own deployment/authentication and is not added
to normal application navigation.

`/pankgraph-dev-config.json` is read with `cache: no-store` and a 3-second limit.
It defaults to `{"vnextEnabled":false,"apiBase":"/pankgraph-vnext/api"}`. Only a
literal true on `dev.pankgraph.org` or localhost selects v2 for new questions;
production ignores it. The API origin/prefix is fixed in this release. Missing,
invalid or unavailable configuration leaves legacy routing in place. Existing
session URLs always use their old handler. Versioned v2 recent chats link to
`/result-new2?provider=vnext&session_id=...` and remain readable while the default switch is false. Unknown
saved v2 sessions produce a recoverable read error without new inference.

Normal rollback restores the disabled runtime config with this compatibility
artifact. A pre-v2 artifact cannot render the v2 history route; retain the
compatibility artifact/read endpoint when performing an emergency rollback.

Validation command:

```sh
CI=true npm test -- --watchAll=false --runInBand src/vnext src/utils/safeStorage.test.js src/utils/hirnLiteratureApi.test.js src/utils/hirnAgentApi.test.js src/skills/HIRNLiteraturePage.test.js
```

Build with the deployment's public environment values and the existing lockfile.
Do not substitute `.env.development` for the production build's environment.
Live acceptance must cover both legacy flows and authenticated plan/run/result
streaming from the actual dev origin; unit tests/build do not establish it.

## Integration checks, October 15, 2026

- The deployed dev config enables vNext. API access returned HTTP 200 without a
  `WWW-Authenticate` challenge. This does not rule out browser-specific cached
  authentication or a challenge from another upstream service.
- A live graph-only question completed plan creation, checked preview,
  confirmation, final answer, and final graph reads. The replayed event stream
  includes `followup_ready`; subscribe to it and `literature_sources` rather than
  waiting for the final snapshot to expose follow-ups and independent sources.
- Cancellation returned `cancel_accepted: true` and `cleanup: requested`; later
  snapshots remained `cancelled`. This verifies the public API state, not that
  every external provider has stopped billing or executing. Cancel known runs
  immediately, even while confirm/revise is unresolved, and cancel a late
  replacement run separately if it receives another identity.
- Loading the actual CRA proxy middleware locally forwarded both run reads and
  cancel POSTs successfully. No proxy path rewrite or credentials were needed.
- The legacy planner's primary host is healthy. The separate
  `https://agent.pankgraph.org` host used by the legacy debug stream returned HTTP
  503. The primary planner's published OpenAPI has no cancel operation; aborting
  its browser requests alone cannot establish server-side cancellation.

These checks and fixes do not change the skills pages or deploy a backend.
