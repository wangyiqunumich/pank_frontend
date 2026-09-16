// Navigation model for the offline designer atlas.
// Edit this file to review page hierarchy separately from the captured UI.
const NAVIGATION_MAP = {
  "root": {
    "id": "landing",
    "title": "Landing / new chat",
    "kind": "page",
    "screen": "landing",
    "edge": "Start here",
    "description": "Primary entry to PanKgraph. Choose a question, a specialist tool, documentation or the retained classic workflow.",
    "children": [
      {
        "id": "group-agent",
        "title": "Agent investigation",
        "kind": "group",
        "edge": "Ask a question",
        "children": [
          {
            "id": "agent-loading",
            "title": "Preparing investigation",
            "kind": "state",
            "screen": "agent-loading",
            "edge": "Submit question",
            "description": "Loading and progress on the agent result route; no new route is created by each stage.",
            "children": [
              {
                "id": "agent-plan",
                "title": "Review execution plan",
                "kind": "state",
                "screen": "agent-plan",
                "edge": "Plan ready",
                "description": "Confirm execution steps or revise the request before proceeding.",
                "children": [
                  {
                    "id": "agent-result",
                    "title": "Agent result",
                    "kind": "page",
                    "screen": "agent-result",
                    "edge": "Confirm plan",
                    "description": "The complete answer, graph and supporting material share one result route. References are represented in this overview capture.",
                    "children": [
                      {
                        "id": "group-answer",
                        "title": "Answer details",
                        "kind": "group",
                        "edge": "Contains",
                        "children": [
                          {
                            "id": "result-source-data",
                            "title": "Source data download",
                            "kind": "state",
                            "screen": "result-source-data",
                            "edge": "View source data"
                          },
                          {
                            "id": "result-table-fullscreen",
                            "title": "Answer table fullscreen",
                            "kind": "overlay",
                            "screen": "result-table-fullscreen",
                            "edge": "Expand table"
                          }
                        ],
                        "description": "Controls within the AI Overview; these captures do not create new routes."
                      },
                      {
                        "id": "group-graph",
                        "title": "Knowledge graph",
                        "kind": "group",
                        "edge": "Contains",
                        "children": [
                          {
                            "id": "result-graph-fullscreen",
                            "title": "Graph fullscreen",
                            "kind": "overlay",
                            "screen": "result-graph-fullscreen",
                            "edge": "Expand graph"
                          },
                          {
                            "id": "result-graph-legend",
                            "title": "Graph legend",
                            "kind": "overlay",
                            "screen": "result-graph-legend",
                            "edge": "Show legend"
                          },
                          {
                            "id": "result-node-inspector",
                            "title": "Node inspector",
                            "kind": "overlay",
                            "screen": "result-node-inspector",
                            "edge": "Inspect node"
                          },
                          {
                            "id": "result-edge-inspector",
                            "title": "Relationship inspector",
                            "kind": "overlay",
                            "screen": "result-edge-inspector",
                            "edge": "Inspect relationship"
                          },
                          {
                            "id": "result-graph-list",
                            "title": "Ordered relationship list",
                            "kind": "state",
                            "screen": "result-graph-list",
                            "edge": "Layout variant"
                          }
                        ],
                        "description": "Graph panel views and display variants on the result page; the atlas uses a synthetic graph."
                      },
                      {
                        "id": "group-supporting-material",
                        "title": "Supporting material",
                        "kind": "group",
                        "edge": "Contains",
                        "children": [
                          {
                            "id": "result-empirical-evidence",
                            "title": "Empirical evidence",
                            "kind": "state",
                            "screen": "result-empirical-evidence",
                            "edge": "Open tab",
                            "children": [
                              {
                                "id": "result-plot-lightbox",
                                "title": "Evidence plot lightbox",
                                "kind": "overlay",
                                "screen": "result-plot-lightbox",
                                "edge": "Expand plot"
                              }
                            ]
                          },
                          {
                            "id": "result-external-links",
                            "title": "External links",
                            "kind": "state",
                            "screen": "result-external-links",
                            "edge": "Open tab",
                            "children": [
                              {
                                "id": "result-external-expanded",
                                "title": "Expanded source group",
                                "kind": "state",
                                "screen": "result-external-expanded",
                                "edge": "Expand source group"
                              }
                            ]
                          },
                          {
                            "id": "result-pankbase-links",
                            "title": "PanKbase links",
                            "kind": "state",
                            "screen": "result-pankbase-links",
                            "edge": "Open tab"
                          },
                          {
                            "id": "result-functional",
                            "title": "Functional result plot",
                            "kind": "state",
                            "screen": "result-functional",
                            "edge": "Open tab",
                            "children": [
                              {
                                "id": "result-functional-expanded",
                                "title": "Expanded functional plot",
                                "kind": "overlay",
                                "screen": "result-functional-expanded",
                                "edge": "Expand plot"
                              }
                            ]
                          }
                        ],
                        "description": "Tabs within the existing result route, alongside References in the main result capture."
                      },
                      {
                        "id": "result-feedback",
                        "title": "Feedback form",
                        "kind": "overlay",
                        "screen": "result-feedback",
                        "edge": "Share feedback",
                        "children": [
                          {
                            "id": "result-feedback-error",
                            "title": "Feedback unavailable",
                            "kind": "error",
                            "screen": "result-feedback-error",
                            "edge": "Submit feedback",
                            "description": "Submission always reports unavailable in the isolated demo. No successful submission state is implied."
                          }
                        ]
                      },
                      {
                        "id": "group-result-states",
                        "title": "Result states",
                        "kind": "group",
                        "edge": "Has variants",
                        "children": [
                          {
                            "id": "result-streaming",
                            "title": "Answer streaming",
                            "kind": "state",
                            "screen": "result-streaming",
                            "edge": "Content arriving"
                          },
                          {
                            "id": "result-empty",
                            "title": "No matching graph evidence",
                            "kind": "state",
                            "screen": "result-empty",
                            "edge": "Empty evidence"
                          },
                          {
                            "id": "result-partial",
                            "title": "Partial resources",
                            "kind": "state",
                            "screen": "result-partial",
                            "edge": "Partial response"
                          }
                        ],
                        "description": "Alternative states of the same result, not additional steps after a completed answer."
                      }
                    ]
                  }
                ]
              }
            ]
          },
          {
            "id": "group-recovery",
            "title": "Recovery & errors",
            "kind": "group",
            "edge": "May need recovery",
            "children": [
              {
                "id": "error-clarification",
                "title": "Clarification required",
                "kind": "error",
                "screen": "error-clarification",
                "edge": "Needs clarification",
                "description": "Apply the requested change to prepare a revised plan; the original question remains visible."
              },
              {
                "id": "error-empty-plan",
                "title": "Planning failure",
                "kind": "error",
                "screen": "error-empty-plan",
                "edge": "Planning fails",
                "description": "No executable search plan was prepared. Retry the original question or apply an explicit change."
              },
              {
                "id": "error-timeout",
                "title": "Search timeout",
                "kind": "error",
                "screen": "error-timeout",
                "edge": "Time limit reached",
                "description": "Retry is available. A timeout does not establish that matching records are absent."
              },
              {
                "id": "error-rate_limited",
                "title": "Search service busy",
                "kind": "error",
                "screen": "error-rate_limited",
                "edge": "Rate limit reached",
                "description": "Wait briefly, then retry the same question."
              },
              {
                "id": "error-query_validation",
                "title": "Query validation failure",
                "kind": "error",
                "screen": "error-query_validation",
                "edge": "Query validation fails",
                "description": "Retry is available; no conclusion about data availability can be drawn."
              },
              {
                "id": "error-unknown_failure",
                "title": "Unknown service failure",
                "kind": "error",
                "screen": "error-unknown_failure",
                "edge": "Search fails",
                "description": "Retry the same question without changing its filters."
              },
              {
                "id": "error-budget_exhausted",
                "title": "API budget exhausted",
                "kind": "error",
                "screen": "error-budget_exhausted",
                "edge": "Budget exhausted",
                "description": "The demo operator must restore the API budget. Rewording the question does not resolve this condition."
              },
              {
                "id": "error-authentication",
                "title": "Service authentication failure",
                "kind": "error",
                "screen": "error-authentication",
                "edge": "Authentication fails",
                "description": "The server could not authenticate with a required service. Operator attention is required; this is not a user login page."
              },
              {
                "id": "error-authorization",
                "title": "Service access denied",
                "kind": "error",
                "screen": "error-authorization",
                "edge": "Access denied",
                "description": "A service denied the server access. The demo operator must restore access."
              },
              {
                "id": "error-billing",
                "title": "Model billing unavailable",
                "kind": "error",
                "screen": "error-billing",
                "edge": "Billing fails",
                "description": "The provider account needs operator attention. Changing the biological question does not resolve billing."
              },
              {
                "id": "error-graph_identity",
                "title": "Graph identity unverified",
                "kind": "error",
                "screen": "error-graph_identity",
                "edge": "Verification fails",
                "description": "The demo operator needs to check the configured graph connection."
              },
              {
                "id": "error-graph_release_mismatch",
                "title": "Graph release mismatch",
                "kind": "error",
                "screen": "error-graph_release_mismatch",
                "edge": "Release mismatch",
                "description": "This capture shows a saved result from a different recorded graph release. Start a fresh search against the configured graph while retaining the original question. A separate connection-release mismatch requires operator attention and is documented in the error library."
              }
            ],
            "description": "These dialogs can interrupt preparation, plan review or execution. Retry links are shown only for retryable captures; operator problems do not imply a user-editable solution."
          }
        ],
        "description": "The main question-to-answer journey. Tree nesting shows its primary sequence; the connection list includes revision, cancellation and follow-up paths."
      },
      {
        "id": "tools",
        "title": "Tool library",
        "kind": "page",
        "screen": "tools",
        "edge": "Open tools",
        "children": [
          {
            "id": "group-qtl",
            "title": "QTL explorer modes",
            "kind": "group",
            "edge": "Open QTL explorer",
            "children": [
              {
                "id": "tool-qtl-gene",
                "title": "QTL · Gene",
                "kind": "page",
                "screen": "tool-qtl-gene",
                "edge": "Select gene mode",
                "children": [
                  {
                    "id": "tool-qtl-suggestions",
                    "title": "Gene suggestions",
                    "kind": "state",
                    "screen": "tool-qtl-suggestions",
                    "edge": "Enter a gene"
                  }
                ]
              },
              {
                "id": "tool-qtl-snp",
                "title": "QTL · SNP",
                "kind": "state",
                "screen": "tool-qtl-snp",
                "edge": "Select SNP mode"
              },
              {
                "id": "tool-qtl-pair",
                "title": "QTL · SNP + Gene",
                "kind": "state",
                "screen": "tool-qtl-pair",
                "edge": "Select pair mode"
              }
            ],
            "description": "Three peer search modes on /qtl-explorer. All can continue to the shared credible-set selection flow."
          },
          {
            "id": "tool-gwas",
            "title": "GWAS explorer",
            "kind": "page",
            "screen": "tool-gwas",
            "edge": "Open GWAS explorer"
          },
          {
            "id": "intermediate",
            "title": "Credible-set selection",
            "kind": "page",
            "screen": "intermediate",
            "edge": "Shared search step",
            "description": "A shared step reached from QTL, GWAS and relevant classic templates. It is grouped under Tools once to avoid duplicating the same page.",
            "children": [
              {
                "id": "intermediate-source-tab",
                "title": "Islet eQTL source tab",
                "kind": "state",
                "screen": "intermediate-source-tab",
                "edge": "Switch source tab"
              },
              {
                "id": "intermediate-wide",
                "title": "Wide desktop layout",
                "kind": "state",
                "screen": "intermediate-wide",
                "edge": "Viewport variant"
              },
              {
                "id": "intermediate-empty",
                "title": "No matching QTL records",
                "kind": "state",
                "screen": "intermediate-empty",
                "edge": "No records returned"
              },
              {
                "id": "conventional-result",
                "title": "Structured tool result",
                "kind": "page",
                "screen": "conventional-result",
                "edge": "View chosen signal",
                "description": "The /result-new layout is shared by structured QTL, GWAS, functional-filter and other supported queries. Related links point to common panel examples."
              }
            ]
          },
          {
            "id": "functional-populated",
            "title": "Functional data explorer",
            "kind": "page",
            "screen": "functional-populated",
            "edge": "Open functional explorer",
            "description": "Cohort filters, functional response plots and metadata on /functional-data. Step 2, Interpret plot with AI, opens the structured result with the selected functional filters. Step 3 trait interpretation is disabled. The related functional result capture shows the shared visual layout.",
            "children": [
              {
                "id": "functional-metadata",
                "title": "Donor metadata fullscreen",
                "kind": "overlay",
                "screen": "functional-metadata",
                "edge": "Expand metadata",
                "description": "The capture contains explicit synthetic donor placeholders."
              },
              {
                "id": "functional-chart-error",
                "title": "Functional chart unavailable",
                "kind": "error",
                "screen": "functional-chart-error",
                "edge": "Chart request fails"
              },
              {
                "id": "tool-functional",
                "title": "Functional service unavailable",
                "kind": "error",
                "screen": "tool-functional",
                "edge": "Service unavailable",
                "description": "The current tool controls with a synthetic service failure. No donor records are included."
              },
              {
                "id": "tool-functional-populated",
                "title": "Functional layout variant",
                "kind": "state",
                "screen": "tool-functional-populated",
                "edge": "Layout variant",
                "description": "An additional populated layout fixture with neutral chart areas and synthetic metadata.",
                "children": [
                  {
                    "id": "tool-functional-table",
                    "title": "Donor table overlay",
                    "kind": "overlay",
                    "screen": "tool-functional-table",
                    "edge": "Show more",
                    "description": "All table rows are synthetic design placeholders."
                  }
                ]
              }
            ]
          },
          {
            "id": "unavailable",
            "title": "Feature unavailable",
            "kind": "error",
            "screen": "unavailable",
            "edge": "Open unavailable tool",
            "description": "The shared unavailable view represents /hirn-literature, /review/*, /debug and /igv. These routes do not expose usable tools in the isolated demo."
          }
        ]
      },
      {
        "id": "group-learn",
        "title": "Documentation & reference",
        "kind": "group",
        "edge": "Browse reference pages",
        "children": [
          {
            "id": "documentation",
            "title": "Documentation concept",
            "kind": "page",
            "screen": "documentation",
            "edge": "Read documentation",
            "description": "One representative article with the searchable documentation tree. Other /docs/* articles share this concept."
          },
          {
            "id": "ontology",
            "title": "Ontology browser",
            "kind": "page",
            "screen": "ontology",
            "edge": "Explore ontology"
          },
          {
            "id": "pipeline",
            "title": "Pipeline",
            "kind": "page",
            "screen": "pipeline",
            "edge": "Read pipeline"
          },
          {
            "id": "qtl-data-source",
            "title": "QTL & GWAS data sources",
            "kind": "page",
            "screen": "qtl-data-source",
            "edge": "Read source overview"
          },
          {
            "id": "statistics",
            "title": "Statistics",
            "kind": "page",
            "screen": "statistics",
            "edge": "View statistics"
          },
          {
            "id": "tutorial",
            "title": "Tutorial",
            "kind": "page",
            "screen": "tutorial",
            "edge": "Read tutorial"
          },
          {
            "id": "usecases",
            "title": "Use cases",
            "kind": "page",
            "screen": "usecases",
            "edge": "Read use cases"
          }
        ],
        "description": "Documentation and standalone reference routes grouped for design review. Their placement here is an information hierarchy, not a claim that every link is inside the overview article."
      },
      {
        "id": "landing-classic",
        "title": "Classic search",
        "kind": "page",
        "screen": "landing-classic",
        "edge": "Open classic search",
        "children": [
          {
            "id": "match",
            "title": "Configure matched question",
            "kind": "page",
            "screen": "match",
            "edge": "Choose a template",
            "description": "Configure a conventional template. Its query type determines whether it opens credible-set selection or a result.",
            "children": [
              {
                "id": "legacy-result",
                "title": "Classic result layout",
                "kind": "page",
                "screen": "legacy-result",
                "edge": "Legacy result variant",
                "description": "The retained /result layout. Template and credible-set flows can also use the newer structured result presentation."
              }
            ]
          }
        ]
      },
      {
        "id": "group-navigation",
        "title": "Navigation & entry states",
        "kind": "group",
        "edge": "Has navigation variants",
        "children": [
          {
            "id": "navigation-menu",
            "title": "Desktop navigation menu",
            "kind": "overlay",
            "screen": "navigation-menu",
            "edge": "Open menu"
          },
          {
            "id": "landing-mobile",
            "title": "Mobile landing",
            "kind": "state",
            "screen": "landing-mobile",
            "edge": "Viewport variant",
            "children": [
              {
                "id": "navigation-mobile",
                "title": "Mobile navigation drawer",
                "kind": "overlay",
                "screen": "navigation-mobile",
                "edge": "Open drawer"
              }
            ]
          },
          {
            "id": "group-external",
            "title": "External navigation exits",
            "kind": "group",
            "edge": "Global menu exits",
            "children": [
              {
                "id": "external-data",
                "title": "PanKbase · Data",
                "kind": "external",
                "edge": "Leave PanKgraph",
                "description": "External destinations: Donor Summary, Data Library and APIs. No internal page is invented for these links."
              },
              {
                "id": "external-resources",
                "title": "PanKbase · Resources",
                "kind": "external",
                "edge": "Leave PanKgraph",
                "description": "External destinations include the integrated cell, genome, differential expression, gene and functional browsers; PCA Explorer; Analytical Library; standards; tools and pipelines; and publications."
              },
              {
                "id": "external-about",
                "title": "PanKbase · About",
                "kind": "external",
                "edge": "Leave PanKgraph",
                "description": "External destinations: PanKbase Program, People, Policies, Related Programs, Collaborate and Funding Opportunities."
              },
              {
                "id": "external-help",
                "title": "PanKbase · Help",
                "kind": "external",
                "edge": "Leave PanKgraph",
                "description": "External destinations: Contact / Feedback, Tutorials, GitHub and News. These are outside the captured internal page collection."
              }
            ],
            "description": "Source-audited navigation categories that leave PanKgraph. These labels describe destinations without creating offline pages or asserting current external availability."
          }
        ],
        "description": "Shared entry and navigation controls. /agent-landing redirects to the main landing; /callback and unmatched routes render that landing. Search, Analysis and Login in the external header are disabled; there is no functional internal login page."
      }
    ]
  },
  "links": [
    {
      "from": "tool-qtl-gene",
      "to": "intermediate",
      "label": "Continue search",
      "kind": "flow"
    },
    {
      "from": "tool-qtl-gene",
      "to": "qtl-data-source",
      "label": "Read source context",
      "kind": "flow"
    },
    {
      "from": "tool-qtl-snp",
      "to": "intermediate",
      "label": "Continue search",
      "kind": "flow"
    },
    {
      "from": "tool-qtl-snp",
      "to": "qtl-data-source",
      "label": "Read source context",
      "kind": "flow"
    },
    {
      "from": "tool-qtl-pair",
      "to": "intermediate",
      "label": "Continue search",
      "kind": "flow"
    },
    {
      "from": "tool-qtl-pair",
      "to": "qtl-data-source",
      "label": "Read source context",
      "kind": "flow"
    },
    {
      "from": "tool-gwas",
      "to": "intermediate",
      "label": "Continue search",
      "kind": "flow"
    },
    {
      "from": "tool-gwas",
      "to": "qtl-data-source",
      "label": "Read source context",
      "kind": "flow"
    },
    {
      "from": "match",
      "to": "intermediate",
      "label": "Open credible-set selection",
      "kind": "flow"
    },
    {
      "from": "match",
      "to": "conventional-result",
      "label": "Open structured result",
      "kind": "flow"
    },
    {
      "from": "intermediate",
      "to": "legacy-result",
      "label": "Classic result variant",
      "kind": "related"
    },
    {
      "from": "agent-plan",
      "to": "agent-loading",
      "label": "Revise plan",
      "kind": "flow"
    },
    {
      "from": "agent-result",
      "to": "agent-loading",
      "label": "Ask a follow-up",
      "kind": "flow"
    },
    {
      "from": "agent-loading",
      "to": "landing",
      "label": "Cancel query",
      "kind": "flow"
    },
    {
      "from": "agent-plan",
      "to": "landing",
      "label": "Cancel query",
      "kind": "flow"
    },
    {
      "from": "group-recovery",
      "to": "landing",
      "label": "Cancel query",
      "kind": "recovery"
    },
    {
      "from": "error-clarification",
      "to": "agent-loading",
      "label": "Apply clarification",
      "kind": "recovery"
    },
    {
      "from": "error-empty-plan",
      "to": "agent-loading",
      "label": "Retry original question",
      "kind": "recovery"
    },
    {
      "from": "error-timeout",
      "to": "agent-loading",
      "label": "Retry original question",
      "kind": "recovery"
    },
    {
      "from": "error-rate_limited",
      "to": "agent-loading",
      "label": "Retry original question",
      "kind": "recovery"
    },
    {
      "from": "error-query_validation",
      "to": "agent-loading",
      "label": "Retry original question",
      "kind": "recovery"
    },
    {
      "from": "error-unknown_failure",
      "to": "agent-loading",
      "label": "Retry original question",
      "kind": "recovery"
    },
    {
      "from": "error-graph_release_mismatch",
      "to": "agent-loading",
      "label": "Start fresh search",
      "kind": "recovery"
    },
    {
      "from": "conventional-result",
      "to": "group-graph",
      "label": "Shared panel examples",
      "kind": "related"
    },
    {
      "from": "conventional-result",
      "to": "group-supporting-material",
      "label": "Shared panel examples",
      "kind": "related"
    },
    {
      "from": "conventional-result",
      "to": "group-answer",
      "label": "Shared panel examples",
      "kind": "related"
    },
    {
      "from": "functional-populated",
      "to": "conventional-result",
      "label": "Interpret plot with AI",
      "kind": "flow"
    },
    {
      "from": "functional-populated",
      "to": "result-functional",
      "label": "Related result layout",
      "kind": "related"
    },
    {
      "from": "navigation-menu",
      "to": "tools",
      "label": "Open tool library",
      "kind": "flow"
    },
    {
      "from": "navigation-menu",
      "to": "group-learn",
      "label": "Browse reference destinations",
      "kind": "related"
    },
    {
      "from": "navigation-mobile",
      "to": "tools",
      "label": "Open tool library",
      "kind": "flow"
    },
    {
      "from": "navigation-mobile",
      "to": "group-learn",
      "label": "Browse reference destinations",
      "kind": "related"
    }
  ],
  "notes": [
    "The tree shows primary journeys and design grouping. Cross-links show shared destinations, revision loops and related panel examples without duplicating captured screens.",
    "Page nodes represent distinct route families. State, overlay and error nodes show variations within a route; group nodes organize the atlas and are not application pages.",
    "Coverage includes every one of the 66 captured screens exactly once. One documentation example stands in for its article family; disabled route aliases share the unavailable capture.",
    "This map describes the audited interface snapshot and its source-backed navigation, not live service health. Preview captures use synthetic fixtures.",
    "Recovery can occur during preparation, plan review or execution. The captured saved-release mismatch supports a fresh search. Only retryable captures have retry connections; account, budget and graph connection problems require operator attention.",
    "External exits describe navigation categories only. The independent graph-layout developer demo remains in the inventory appendix and is not part of the application tree."
  ]
};
