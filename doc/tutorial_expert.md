### PanKgraph Tutorial for Expert

#### Landing Page Overview

The landing page is the starting point of **PanKgraph**, a specialized knowledge portal for Type 1 Diabetes (T1D) research. It enables precise navigation through a unified knowledge graph integrating data from diverse sources.

##### Key Features

- **Streamlined Input Fields:**  
  Define your query in three steps:
  1. **Source Term:** Select the origin node (e.g., sequence variant).
  2. **Relationship:** Choose the type of connection (e.g., *eQTL of*, *co-expressed with*).
  3. **Target Term:** Specify the endpoint (e.g., a gene or phenotype).

- **Dynamic Query Feedback:**  
  As you define your query, the system generates a guiding question dynamically. For example:  
  *SNP → eQTL of → Gene* translates to:  
  *“Which SNP serves as the eQTL for [Selected Gene]?”*  
  The question updates instantly with any changes until you click **Search**.

- **Search Action:**  
  Click **Search** to execute your query and retrieve results. You’ll proceed to an **Intermediate Page** for further analysis and refinement.

#### Intermediate Page Overview

The intermediate page provides a concise overview of your query, bridging input selection and detailed results.

##### Current Question Display
- **Generated Query Statement:**  
  Displays your configured query as a clear research question, e.g.,  
  *“Which SNP is the lead variant for the QTL signal associated with CENPP?”*

##### Descriptive Context
- **Relevant Data Explanation:**  
  Outlines the types of QTLs (e.g., gene, exon, splicing eQTLs) and associated tissues (e.g., pancreas, islet) for the query.  
  - **Purpose:** Helps you understand the data’s scope before proceeding.

##### Results Overview
Results are grouped into collapsible panels by QTL subtype.

- **Collapsible Panels:**  
  Each panel is labeled (e.g., **“Pancreatic eQTL (2)”**) with the count indicating available QTL signals or SNPs.
- **Interactive SNP Listings:**  
  Click on SNP entries to access detailed data on the **Result Page**.

##### How to Use
1. Confirm your query aligns with your research goal.
2. Review available QTL data types to refine your focus.
3. Select SNPs of interest for in-depth analysis.

#### Result Page Overview

The result page provides finalized query details with graphical and textual insights into your query’s biological context.

##### Current Question
- **Locked Display:**  
  The finalized question from the Intermediate Page is displayed prominently, e.g.,  
  *“How does the lead SNP rs75511728 influence the eQTL of PTPN22 in pancreatic tissue?”*

##### Knowledge Graph Viewer
- **Graphical Data Mapping:**  
  Displays the primary query node (e.g., SNP or gene) and its relationships with related entities (e.g., pathways, SNPs, genes).  
  - **Color Coding:** Consistent across the graph and AI-generated overview.
  - **Extended Nodes:** Semi-transparent nodes represent additional insights for further exploration.

##### AI’s Overview
- **Summarized Findings:**  
  Highlights key relationships, e.g., how a specific SNP impacts gene expression in pancreatic tissue.  
  - **Key Entities:** Genes, SNPs, pathways are emphasized, linking textual and graphical elements.  
  - **Details:** Includes statistical values (e.g., **p-values**, **PIPs**), literature references (**PMIDs**), and external resource links (**Ensembl**, **PanKbase**).

##### Suggested Next Steps
- **Follow-Up Queries:**  
  Recommendations for further exploration (e.g., related variants, pathways) to deepen your research within the knowledge graph.