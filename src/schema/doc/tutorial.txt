### PanKgraph Tutorial

#### Landing Page Overview
Welcome to the **PanKgraph** environment—a user-friendly portal that integrates multi-source data for Type 1 Diabetes (T1D) research. Here, you can quickly navigate a rich knowledge graph to uncover genetic, molecular, and clinical insights.

##### Key Features
- **Intuitive Input Fields**  
  Define your query step by step:
  1. **Source Term** (e.g., *sequence variant*): Your starting point.
  2. **Relationship** (e.g., *eQTL of*, *co-expressed with*): The connection you want to explore.
  3. **Target Term** (e.g., *a specific gene*): The endpoint of your investigation.

- **Dynamic Query Formation**  
  - As you update each menu, PanKgraph generates a guiding question (e.g., *“Which SNP serves as the eQTL for [Selected Gene]?”*).
  - **Live Updates**: This question changes in real-time until you click **Search**, then becomes fixed for the subsequent pages.

- **Search Button (Action Trigger)**  
  - Clicking **Search** retrieves and structures relevant data, taking you to an **Intermediate Page** where you can refine your findings.

#### Intermediate Page Overview
Once you’ve set up your “triplets” (e.g., *SNP* → *eQTL of* → *Gene*) and hit **Search**, you’ll see a high-level summary of potential results.

##### Current Question (Top Section)
- **Displayed Question**  
  PanKgraph automatically forms a question based on your selections (e.g., *“Which SNP is the lead variant for the QTL signal associated with CENPP?”*).

##### Description & Guidance Section
- **Contextual Information**  
  Outlines QTL types (gene/exon/splicing) and relevant tissues (pancreas/islet).
- **Purpose**  
  Provides a concise overview so you can confirm the scope of your results before proceeding.

##### Results Display Section
Results are shown in collapsible panels, each representing a QTL data subtype (e.g., *eQTL GTEx*, *Splicing QTL*, *Exon QTL*).

- **Collapsible Data Panels**  
  - Each panel title (e.g., **“Pancreatic eQTL (2)”**) shows the tissue and the number of QTL signals or SNPs available.
- **Detailed SNP Listings**  
  - **Interactive Links**  
    Clicking a SNP navigates to a comprehensive **Result Page** with in-depth data.

##### How to Use This Page
1. Confirm your question aligns with what you intended to ask.  
2. Scan the overview of QTL data types and see how many signals are available.  
3. Identify SNPs of interest for deeper exploration on the **Result Page**.

#### Result Page Overview
The **Result Page** shows your finalized question, a knowledge graph visualization, and an AI-generated summary of findings.

##### Current Question
- **Locked Question**  
  Now that you’ve clicked a SNP, the question is fixed (e.g., *“How does the lead SNP rs75511728 influence the eQTL of PTPN22 in pancreatic tissue?”*). Use this as a reference while exploring the results.

##### Knowledge Graph Viewer
- **Visual Representation of Results**  
  Places the SNP or gene at the center, highlighting relationships to other entities (genes, SNPs, pathways).
- **Consistent Color Coding**  
  Each entity type (Gene, Sequence Variant, Pathway, etc.) is color-coded, matching text highlights in the AI overview.
- **Extended Connections**  
  Semi-transparent nodes represent related concepts not directly specified in your query, providing avenues for further investigation.

##### AI’s Overview
- **Summarized Insight**  
  An AI-generated summary explains how the discovered relationships may influence T1D.  
- **Emphasis on Key Entities**  
  Relevant genes, SNPs, or pathways are highlighted in the same colors shown in the Knowledge Graph for clarity.
- **Data-Driven Details**  
  Includes crucial metrics (p-values, Posterior Inclusion Probability, etc.), along with references (PMIDs) and external resource links (Ensembl, PanKbase).

##### You May Also Ask
- **Suggested Follow-Up Queries**  
  Based on the observed relationships, this section provides additional questions (e.g., investigating related variants, genes, or regulatory pathways), guiding your continued exploration of T1D genetics.