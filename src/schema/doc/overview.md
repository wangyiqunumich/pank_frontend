## What is PanKgraph?

**PanKgraph** is a Type 1 diabetes (T1D)-focused knowledge graph that connects biological datasets, expert-curated knowledge, and literature-derived evidence within a unified, searchable framework. Powered by PanKgraph, **PanKgraph.org** provides a question-driven data portal for exploring pancreas and T1D research knowledge. It integrates multi-omic data, genetic associations, pathways, ontology terms, regulatory signals, and publication evidence, enabling researchers to move from biological questions to connected, evidence-backed answers.

The portal is powered by **PanKagent**, an LLM-based human-language search system. Instead of requiring users to write Neo4j queries, PanKagent translates natural research questions into graph-aware searches, retrieves relevant entities and relationships, and returns evidence-backed answers with provenance from the knowledge graph. This makes PanKgraph both an exploratory research environment and a reliable AI layer for reproducible, collaborative discovery across the pancreas and T1D research community.

## Key Points

- **Question-driven data portal**:
  - Start with a research question and use PanKgraph to discover genes, variants, pathways, cell types, ontology terms, datasets, and literature evidence connected to that question.
- **Human-language search powered by an LLM agent**:
  - PanKagent enables natural-language search over the knowledge graph, helping users ask biological questions without writing OpenCypher queries.
- **Reliable AI supported by evidence and provenance in the knowledge graph**:
  - Responses are grounded in graph relationships, source datasets, curated annotations, and literature evidence so users can trace where results came from and evaluate confidence.

## Key Features

- **Unified Knowledge Representation**: 
  - Genes, variants, pathways, ontology terms, epigenomic signals, literature evidence, and other biological entities are organized into a structured, queryable graph.
- **Multi-source Data Integration**:
  - Integrates curated knowledge resources, graph-based knowledge bases such as GKB, text-mined literature resources such as GLKB, and heterogeneous omics datasets.
- **PanKagent Search**:
  - Lets users search with natural language, generate graph-aware results, and follow evidence trails through linked entities and source records.
- **Interactive Exploration**:
  - Search, filter, and visualize complex biological relationships through a user-friendly web portal.
- **AWS Neptune Backend**:
  - Built with OpenCypher queries and scalable cloud infrastructure.
- **Research Support**:
  - Enables hypothesis generation, target prioritization, evidence review, and biological insight discovery for T1D research.

## System Components

- **Knowledge Graph Database**: 
  - Nodes and edges representing biological entities, datasets, evidence, provenance, and their relationships.
- **Data Loaders**:
  - Custom pipelines for ingesting, transforming, and updating heterogeneous datasets.
- **Web Interface**:
  - Question-driven portal for graph exploration, analytics, visualization, and evidence review.
- **PanKagent**:
  - LLM-powered agent for human-language search, graph query assistance, and evidence-grounded answer generation.
- **Programmatic Access**:
  - APIs and SDKs for advanced queries and data analysis.

## Applications

- Prioritize candidate genes and variants in T1D.
- Ask human-language questions across connected T1D knowledge and datasets.
- Explore molecular mechanisms and regulatory networks.
- Support multi-omics data interpretation.
- Trace claims to supporting datasets, publications, and provenance in the graph.
- Enable machine learning applications in biomedical research.

## Future Directions

- Continued improvement of PanKagent for evidence-grounded question answering.
- Expansion to broader autoimmune disease knowledge graphs.
- Incorporation of causal inference modeling.
- Community-driven data updates and validation.

## Acknowledgements

PanKgraph is developed as part of the collaborative effort under the Human Islet Research Network (HIRN) and supported by the broader T1D research community.

---
*For more information, please contact the PanKgraph development team.*
