# Dev chat extension modules

Baseline: `xuteng/react` at `680a5f5`, merged through `c97526c` before release. Module implementation ported from the
fixed techdemo at `c646acfc50df5419157d865d304aa33a0bb86826` without replacing
current answer, source-link, session, streaming or graph projection logic.

## One registry per answer

`src/vnext/schema/result_page_schema.json` is the registry. Its
`main_visuals.default_order`, `extension`, `enabled`, `hidden`, `context_adapter`,
`pankbase_trigger` and `guide_open` fields control extensions. `ResultModules.js`
is the shared adapter/lifecycle implementation; it performs no graph requests.

1. Read returned edges in their order, then nodes in their order. Context adapters
   require valid identity (for example a valid RNA gene or exact QTL dataset/set).
2. Capture the first eligible context for each module as an owned snapshot.
3. Append unseen modules once. Existing entries, keys, context and user settings
   survive new graph revisions, reordered records, removed records and new matches.
4. The graph itself continues receiving live revisions; module activation never
   writes graph/session state or waits for the graph to be complete.
5. A different answer scope starts a new registry. Refresh reconstructs from the
   currently saved result; this is not persistent cross-refresh configuration.

| Module | Trigger / initial context |
| --- | --- |
| scBrowser | First supported RNA expression edge with a valid gene; schema relation list |
| Genome Browser | First Gene node or registered activity/overlap/location edge with a gene |
| Differential Expression | First T1D_DEG_IN / DIFFERENTIALLY_EXPRESSED_IN edge with a gene |
| Functional Browser | First registered donor/sample node or functional/sample/donor edge |
| PCA Explorer | First registered donor/sample node or sample/donor edge |
| QTL Browser | First supported QTL edge with exact dataset identity and complete credible-set ID |

These are related exploration resources, not automatically matching cohorts or
new biological evidence. Functional/PCA node triggers do not infer donor filters.
QTL uses the source dataset + full set ID, never generic legacy source keywords;
identical IDs from different QTL types remain distinct identities, but only the
first valid context initializes the one QTL module. Unsupported QTL identities
remain in graph/source evidence and do not silently open an unrelated plot.

Old `qtl_fine_mapping` and `functional_data` visual definitions are disabled with
`replaced_by` pointers. Recorded cohort images remain supporting evidence rather
than being replaced by an unrelated default cohort. Native module controls and
explicit guide Apply actions may change configuration after activation; later
**automatic graph updates** may not.

## Chat coverage and side guide

- vNext saved/new agent runs, progressive previews/final results and conventional
  template results use `ResultView.ResultSection`.
- Legacy `/result-new` and `/result-new2`, including historical/follow-up answers,
  use `DevResultPage`, which adds the same registry without changing their stream
  or backend contracts. Plan confirmation retains its existing controls.
- The current answer receives Module Guide actions; historical answers do not
  compete for them. The guide can explicitly create an absent module as labeled
  independent exploration. Later graph matches cannot replace that module.
- Apply validates supported actions; Undo restores supported settings. No generic
  DOM execution, graph mutation, arbitrary queries or automatic configuration.

## Hosting and data

Root dev assets are built under `/scbrowser/` and `/pankbase-browser/`. The main
agent/results API remains unchanged. Module requests reuse existing approved
same-origin `/techdemo/api/{pankbase-data/v1,functional,qtl,module-guide}` proxies
to EC2. No new public endpoint, credentials, permissions or model budget is added.
The fixed `/techdemo` continues its separately pinned build and fixed results.

## Acceptance

Regression coverage includes late endpoints, first-match selection, immutable
snapshots, graph updates and removal, duplicate matches, configuration/mount
preservation, answer scope reset, exact QTL identity, guide-created modules and
Apply/Undo. React tests exercise the real result panel and shared lifecycle;
Vue tests validate native data/controls. Browser release acceptance is recorded
with the deployed commit after rollout.
