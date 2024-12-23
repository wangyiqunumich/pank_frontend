# Tutorial

## Table of Contents
1. [Landing Page Overview](#landing-page-overview)
2. [Key Features](#key-features)
3. [Intermediate Page Overview](#intermediate-page-overview)
4. [Result Page Overview](#result-page-overview)

## Landing Page Overview

The landing page serves as your entry point into the PanKgraph environment—an integrated knowledge portal focused on Type 1 Diabetes (T1D) research. This page is designed to help you efficiently navigate and uncover insights within a rich knowledge graph that merges data from diverse sources.

## Key Features
- **Intuitive Input Fields:**  
  Use the three-step menu to define your query:
  1. **Source Term:** Specify the starting point of your search (e.g., sequence variant).
  2. **Relationship:** Select the type of connection or association you wish to explore (e.g., *eQTL of*, *co-expressed with*, etc.).
  3. **Target Term:** Identify the endpoint or node in the graph you’d like to investigate (e.g., a specific gene or phenotype).

- **Dynamic Query Formation:**  
  As you refine your source, relationship, and target terms, the system formulates a guiding question. For example, selecting *SNP* → *eQTL of* → *Gene* might yield the preliminary question: *“Which SNP serves as the eQTL for [Selected Gene]?”*  
  **Live Updates:** This question remains dynamic until you click **Search**, adjusting instantly if you change any of the parameters. Once you initiate the search, the question becomes fixed and will guide the subsequent results page.

- **Search Button (Action Trigger):**  
  After choosing your parameters, click **Search** to proceed. The system then retrieves and structures relevant data, leading you to an intermediate results page where you can review and refine findings before diving deeper.

## Intermediate Page Overview

This intermediate page is displayed once you have specified your “triplets,” such as selecting a Source Term (e.g., *SNP*), a Relationship (e.g., *eQTL of*), and a Target Term (e.g., *Gene*). It provides a dynamic, high-level summary of your configured query before you proceed to the detailed Result Page.

### Current Question (Top Section)
- **Displayed Question:** Once you configure your triplets, the system automatically formulates a guiding question. For example: *“Which SNP is the lead variant for the QTL signal associated with CENPP?”*

### Description & Guidance Section
- **Contextual Information:** This section clarifies the types of QTL data (e.g., gene, exon, or splicing eQTLs) and the relevant tissues (e.g., pancreas or islet) associated with the current query.
- **Purpose:** By reviewing this information, you gain insights into the scope and nature of the results you are about to explore.

### Results Display Section
Here, you will find the main findings organized into collapsible panels, each representing a particular QTL data subtype (e.g., *eQTL GTEx*, *Splicing QTL*, *Exon QTL*).

- **Collapsible Data Panels:**
  - Each panel is clearly labeled (e.g., **“Pancreatic eQTL (2)”**) indicating the tissue type and the count of relevant QTL signals or SNPs.
  - The count in parentheses (e.g., *(2)*, *(4)*, or *(0)* ) reflects how many SNPs or signals are available in that category.

- **Detailed SNP Listings:**
  - **Interactive Links:** By clicking on a SNP entry, you are directed to the comprehensive Result Page, where you can examine the data in greater detail.

### How to Use This Page
Leverage this intermediate page to:
1. Verify that the question aligns with your intended query.
2. Examine the overview of available QTL data types before committing to a full analysis.
3. Quickly identify and compare SNPs of interest, guiding you toward more in-depth evaluation on the Result Page.

## Result Page Overview

The Result Page presents the finalized question and provides both a visual and textual exploration of the query’s outcome. This page helps you understand the biological relationships uncovered by the knowledge graph and AI-driven analysis.

### Current Question
- **Locked Question:** The question that was previously dynamic on the Intermediate Page now becomes fixed and is prominently displayed. For example:  
  *“How does the lead SNP rs75511728 influence the eQTL of PTPN22 in pancreatic tissue?”*  
  This ensures you have a clear reference point as you review the results.

### Knowledge Graph Viewer
- **Visual Representation of Results:**  
  The KG Viewer places your primary query node (e.g., the SNP or gene of interest) at the center and visually maps its relationships to relevant entities—other genes, SNPs, pathways, and more.
- **Consistent Color Coding:**  
  Each entity type (Gene, Sequence Variant, Pathway, etc.) is color-coded. This color scheme matches the text highlights in the accompanying AI overview, creating a cohesive visual experience.
- **Extended Connections:**  
  Lightly colored, semi-transparent nodes indicate associated concepts not directly requested in your initial query. These offer leads for further exploration, hinting at new questions you might pose.

### AI’s Overview
- **Summarized Insight:**  
  An AI-generated summary articulates the significance of the discovered relationships. For example, it may describe how a particular SNP modulates gene expression in the pancreatic tissue and its implications for understanding T1D.
- **Emphasis on Key Entities:**  
  Relevant genes, SNPs, and pathways are highlighted in text with colors matching their representation in the KG Viewer. This integrated approach helps you visually connect the written explanation with the graphical data.
- **Data-Driven Details:**  
  The overview may include statistical values (e.g., **p-values**, **Posterior Inclusion Probabilities (PIPs)**), references to literature (via **PMIDs**), and external resource links (e.g., **Ensembl**, **PanKbase**) for deeper investigation.

### You May Also Ask
- **Suggested Follow-Up Queries:**  
  Based on the extended knowledge graph and identified relationships, this section proposes additional lines of inquiry. These recommendations help you delve further into related variants, genes, diseases, or regulatory mechanisms, guiding your ongoing exploration within the platform.