# Development agent preview integration

This candidate starts at `f16a5cb417d14e5473c0c86c85830fea31476258` on
`xuteng/react`. The selected vNext modules and retained working fixes are recorded
in `vnext-import-provenance.json` with source SHA-256 hashes. Graph, plan and
loading renderer adaptations live under `src/vnext`; the legacy renderers,
Cognito provider/logout, HIRN clients, global Axios/Redux APIs, conventional
search, tools, IGV and feedback endpoints remain intact.

`/agent-vnext` is the controlled preview and durable v2-history route. Before
rendering any plan/run component it reads `/pankgraph-vnext/api/access`. A 401
shows a top-level sign-in link to `/pankgraph-vnext/access?return_to=%2Fagent-vnext`.
Pending run/question URLs stay in same-tab session storage and are restored after
the authenticated redirect. Browser storage and bundles never hold Basic,
operator or provider credentials.

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
`/agent-vnext` and remain readable while the default switch is false. Unknown
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
