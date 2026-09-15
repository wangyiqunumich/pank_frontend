# PanKgraph error and state coverage

Source audit completed 2026-09-15 against the local current checkouts. This is a designer handoff inventory, with no live fault injection, no model calls, and no application mutation.

## Coverage

- **108 active frontend messages and states:** recovery dialogs, result connection banners, plan/answer/graph states, QTL and match validation, record selection, functional plots, supplementary evidence, feedback, no-data and loading states.
- **46 backend-exposed messages:** HTTP authentication and endpoint detail strings plus sanitized dependency errors. Depending on caller they become a recovery dialog, generic status fallback, raw download response or native Basic-auth prompt; they are not all separate on-page alerts.
- **8 dynamic contracts:** server semantic clarification, stage availability, population completeness, upstream/browser errors, HTTP detail and graph display notices.
- **29 standalone PanKagent (8794) messages:** the separately served assets/index.html has different preview, graph, citation and connection notices from the main results frontend.
- **22 inactive HIRN messages** and **2 standalone Graph Viewer demo messages**, explicitly labeled and excluded from active-frontend count.
- **281 internal diagnostic/validation strings** form a separate annex. These include resource, graph layout, identity, transport, schema and guard codes; backend diagnostics do not automatically correspond to visible UX.

The catalog has **215 message/state entries**. All **235 message source references** and **281 internal diagnostic references** were checked for readable files and valid line numbers. Exact variants retain separate entries; duplicates retain multiple source references.

## Finite-scope boundary

The inventory covers fixed source copy and dynamic message contracts in the current frontend, owning results/agent services and independent graph demo. It cannot enumerate every possible server semantic clarification, browser/network Error.message, provider text, future response, or Pydantic/framework validation string. Each dynamic field is shown as a template. This package should say “fixed messages plus dynamic error contracts,” rather than “every possible literal error.”

Current src/index.js sends /review/*, /hirn-literature, /debug and /igv to the same “Unavailable in this demo” screen. Legacy resultpage_new.js and historical API markdown are not current route wiring and were not presented as live page behavior. The standalone 8794 UI is a separate surface.

## Current design gaps to expose to the designer

1. **Empty records and failed requests are conflated.** IntermediatePage sets the same error flag for lookup failure and no records, then displays schema copy such as “No QTL data found.” QTL SNP validation similarly displays “SNP not found” on a request exception. A request failure is not a verified zero result.
2. **Functional summary/donor failures lack an explicit rendered alert.** Errors are stored in state while chart errors have a visible placeholder. A designer needs a summary/filter/table failure state and a clear retry affordance.
3. **GWAS validation fails silently.** The current validator sends raw query parameters to the typed search adapter, which rejects them. The catch only clears validation. The screen does not explain service/validation failure to the user.
4. **Browser authentication is outside the frontend.** Results middleware uses native HTTP Basic login. The React auth provider is an anonymous/no-op placeholder, so there is no working in-app login/error design to reuse.
5. **Layout failure is not given a dedicated banner.** The service can record worker_busy, worker_failed, worker_unavailable or deadline_exceeded while showing a fallback/partial graph. The frontend preserves evidence, but does not separately communicate those diagnostic layout outcomes.
6. **Some resource failures are only distinguishable via backend state.** Source-download and image failures need consistent retry/download-only/unavailable treatment. FunctionalVisual handles image onError explicitly; some legacy resource images only test URL presence.
7. **Error copy has multiple levels.** Server recovery overrides frontend fallback; HTTP detail can become generic “Request failed (status)” when detail is structured. Use the same dialog hierarchy, preserve the original question and usable evidence, and vary recovery actions according to transient vs operator problems.
8. **Disabled tools are still routable.** The HIRN, review, debug and IGV routes share the generic unavailable card. Treat inactive tool implementations as future concepts, not currently enabled tools.
9. **Missing and pending content need distinct treatment.** No graph matches, retrieval failure, partial evidence, pending literature, no validated perspectives, plot failure and unverified source availability already have distinct scientific meanings that should remain visible during redesign.

Main current full-page error actions are **Back to Home** and **View Tutorial**. The recovery dialog contains the original question, “Why it didn’t work,” up to two verified suggestions, “Tell us what to change,” and **Cancel query / Retry original question (when retryable) / Apply changes**.
