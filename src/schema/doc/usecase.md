# Use Case: Asking T1D Questions in PanKgraph

PanKgraph is built for researchers who want to ask practical questions about Type 1 Diabetes (T1D) and pancreas biology without first translating those questions into graph query syntax. A user can ask in ordinary language, and PanKagent helps find the relevant genes, variants, cell types, pathways, disease links, and supporting evidence in the knowledge graph.

The graph brings together several kinds of data that are commonly needed in T1D research. It includes gene and variant information, fine-mapped QTL and GWAS signals, gene-disease colocalization evidence, gene expression and differential expression across pancreatic cell types, chromatin accessibility and gene activity from single-cell ATAC data, pathway and ontology annotations, protein or genetic interaction evidence, donor and sample metadata from HPAP, and links back to PanKbase or external resources.

Because these data are connected in one graph, PanKgraph can support questions that cross data modalities. For example, a researcher can ask whether a T1D GWAS signal also has molecular QTL support for a nearby gene, whether a candidate gene is active in a relevant pancreatic cell type, whether a gene is part of an immune or endocrine pathway, or whether the evidence points more toward a beta-cell, ductal, immune, or broader pancreatic mechanism.

PanKagent is useful when the question is not a single table lookup. It can break a natural-language question into the graph searches needed to answer it, retrieve the supporting records, and return an answer with references and provenance. Example questions include:

- For ADCY3, does the T1D-associated GWAS signal rs13393590 colocalize with ADCY3 molecular QTL evidence?
- Is PLEKHM1 a T1D effector gene or key marker gene in pancreatic cell types?
- What pathways and interaction partners connect HLA-DRA to antigen presentation in T1D?
- Is CFTR specifically enriched in ductal cells?
- For CFTR, does the T1D GWAS signal colocalize with a pancreas splicing QTL?

PanKgraph also includes direct tools for users who already know which data type they want to inspect. These tools are useful for fast, focused access to QTL, GWAS, or functional islet data without going through the full question-answer workflow. For example, the Pancreatic Islet Functional Data Tool supports interactive filtering of HIPP pancreatic islet function data and can use the agent to help explain selected feature plots.

In the future, PanKgraph can become more useful as additional data modalities, stronger provenance, and better agent planning are added. The goal should remain conservative: PanKagent should help researchers navigate complex connected data, but its answers should stay grounded in graph evidence, source records, and traceable links rather than unsupported model interpretation.
