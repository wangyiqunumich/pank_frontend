### PanKgraph Tutorial for Beginners

Welcome to the PanKgraph environment! This tutorial will guide you through the primary features of the platform, especially for those who are new to exploring eQTL data and knowledge graphs related to Type 1 Diabetes (T1D). PanKgraph brings together diverse data sources to give you a more complete picture of genetic associations, disease processes, and functional insights—particularly in T1D research.



#### **1. Landing Page Overview**

The Landing Page is your starting point in PanKgraph. It offers an **intuitive interface** to build your query and move toward uncovering significant relationships between genes, SNPs, pathways, and diseases.

##### **Key Features**

##### **1.1 Intuitive Input Fields**  
On the left side, you’ll see three dropdown menus that shape your query:

1. **Source Term**  
   - Choose what you want to begin exploring (for example, a “sequence variant” or “gene”).  
   - This is your “entry node” into the knowledge graph.

2. **Relationship**  
   - Select the type of connection (e.g., *eQTL of*, *co-expressed with*, *associated with*).  
   - This defines how your source term links to other entities in the graph.

3. **Target Term**  
   - Identify the specific entity you want to investigate (e.g., a certain gene name, phenotype, or biological pathway).  
   - This is the “end node” of your query.

##### **1.2 Dynamic Query Formation**  
- As you update these three menus, PanKgraph generates a **guiding question** at the top of the page. For example:  
  *“Which SNP serves as the eQTL for [Target Gene]?”*

- **Live Updates**: The question text changes immediately if you switch your source or target term. However, once you hit the **Search** button, it becomes “locked in” and will guide the next pages.

##### **1.3 Search Button (Action Trigger)**  
- **Click “Search”** once you have the source, relationship, and target you want.  
- The system retrieves relevant data and displays an **Intermediate Page**, giving you a snapshot of possible results.



#### **2. Intermediate Page Overview**

After you’ve selected your **Source Term → Relationship → Target Term** and clicked “Search,” you’ll reach the Intermediate Page. This page confirms your **finalized query** and reveals an overview of relevant findings before you dive deeper.

##### **2.1 Current Question (Top Section)**
- PanKgraph turns your chosen triplets into a concise question. For instance, if you selected “SNP” → “eQTL of” → “PTPN22,” you might see:  
  *“Which SNP is the lead variant for the QTL signal associated with PTPN22?”*

##### **2.2 Description & Guidance Section**
- **Scope & Tissues**: You’ll see quick details about which tissues (e.g., pancreas, islet) and QTL types (e.g., gene expression QTL, exon QTL, splicing QTL) are relevant.  
- **Why This Matters**: This is especially helpful if you’re investigating whether a SNP affects gene expression (eQTL) or alternative splicing (splicing QTL).  

##### **2.3 Results Display Section**

The page usually shows one or more collapsible panels (like tabs). Each panel represents a different category of QTL data:

1. **Pancreatic eQTL**  
2. **Islet eQTL**  
3. **Pancreatic Splicing QTL**  
4. **Islet Exon QTL**  
   
For instance, you might see “Pancreatic eQTL (2)” indicating there are two SNP signals for the pancreas.

##### **Collapsible Data Panels**
- Each panel’s title shows the tissue and the number of matching signals.  
- When you expand a panel, you’ll see details about each SNP or QTL, including **Purity**, **Lead SNP**, **Posterior Inclusion Probability (PIP)**, and more.

##### **How to Use These Panels**
- **Click a SNP Link**: Each SNP listed can be clicked to load the detailed **Result Page** where you’ll see a knowledge graph visualization and AI-generated interpretations.

##### **2.4 How to Use This Page**
1. **Confirm Your Query**: Ensure the displayed question reflects exactly what you’re interested in.  
2. **Check Available Datasets**: Quickly scan the panels to see if there are any QTL signals and how many.  
3. **Dive Deeper**: Pick a SNP that interests you (such as the one with a high PIP or a relevant p-value) and click it to open the Result Page for more comprehensive details.



#### **3. Result Page Overview**

Once you click a specific SNP or QTL in the Intermediate Page, you arrive at the Result Page. Here, you’ll see a detailed breakdown of what PanKgraph found, including relationships in a visual knowledge graph and an AI-driven summary.

##### **3.1 Current Question**
- **Locked & Visible**: At the top, the guiding question—like *“How does the SNP rs17510162 influence the eQTL of PTPN22 in pancreatic tissue?”*—is prominently displayed.  
- This fixed question ensures you don’t lose track of your focus while exploring the results.

##### **3.2 Knowledge Graph Viewer**

##### **3.2.1 Visual Representation of Results**
- **Central Node**: The query entity (e.g., your chosen SNP) sits in the middle.  
- **Connecting Nodes**: Lines extend to show how your SNP relates to other genes, pathways, or variants.  

##### **3.2.2 Color Coding**
- **Entities**: Genes, SNPs, and Pathways each have unique colors (e.g., *blue for genes, orange for SNPs*).  
- **Contextual Highlights**: These colors match the text highlights in the AI summary, making it easier to cross-reference details.

##### **3.2.3 Extended Connections**
- Sometimes you’ll see semi-transparent nodes. These represent additional relationships or relevant concepts not directly asked for in your initial query.  
- If you’re curious, you can click on these to explore new questions like *“Is this SNP also associated with a different gene?”*

##### **3.3 AI’s Overview**

In addition to the graph, an AI-powered text section helps you interpret the data:

- **What You’ll See**:
  - **Biological Context**: For instance, if the SNP is linked to changes in gene expression that affect T1D risk.  
  - **Statistical Evidence**: Key metrics often appear:
    - **Posterior Inclusion Probability (PIP)**: Higher PIP \(\rightarrow\) more evidence the SNP truly affects the trait.  
    - **Log Bayes Factor (LBF)**: The bigger the LBF, the stronger the support for a non-zero effect of that SNP.  
    - **Nominal p-value**: A measure of association between the SNP and the trait without correction for multiple testing.  
    - **Slope**: Indicates whether the SNP increases (+) or decreases (–) expression for the associated gene.  
  - **References & Links**: AI may show PMIDs for literature, Ensembl links, or PanKbase pages for deeper background.

##### **3.4 You May Also Ask**

Below the AI overview, you’ll often see suggestions for **related queries**, such as:
- **Other eQTLs** for the same gene or SNP  
- **Other Genes** regulated by the same variant  
- **Pathways** or phenotypes that could be impacted  

These suggestions help you continue your exploration without having to start over at the Landing Page.



##### **Additional Biological Context**

Because PanKgraph focuses heavily on eQTL analysis and fine-mapping for T1D, here are some brief definitions:

- **Fine-Mapping**: The process of pinpointing the most probable causal variants within a region of the genome associated with a trait or disease.  
- **Credible Sets**: Collections of variants that are statistically probable to include the causal SNP(s). They’re designed to be as small as possible while capturing likely causal variants.  
- **Posterior Inclusion Probability (PIP)**: Measures how likely it is that a particular SNP has a **non-zero effect** on the trait. The higher the PIP, the more confident we are in that SNP’s role.  
- **Log Bayes Factor (LBF)**: A log-scale measure comparing the likelihood of a SNP having an effect versus having no effect. Higher LBF = stronger evidence of an effect.  
- **Nominal P-value**: The uncorrected p-value for SNP-trait associations. Useful for quick checks but typically must be corrected for multiple comparisons in large-scale studies.  
- **Slope**: Derived from linear regression; indicates the direction and magnitude of effect. Positive slope means the SNP likely increases expression; negative slope means it likely decreases expression.



##### **Key Takeaways**

1. **Start with a Clear Query**: Select your **Source Term**, **Relationship**, and **Target Term** to craft a focused question about T1D genetics.  
2. **Intermediate Page**: Get an **overview** of potential results—quickly see how many signals or SNPs match your question.  
3. **Dive into the Result Page**: View the **Knowledge Graph**, read the **AI’s Overview**, and check **statistical details** (like PIP, LBF, slope) for each SNP.  
4. **Explore Further**: Use **You May Also Ask** or the semi-transparent nodes in the Knowledge Graph to formulate new, deeper questions about T1D biology.

We hope this beginner-friendly tutorial helps you navigate PanKgraph with confidence. Feel free to explore the references, investigate more SNPs, and continue refining your queries to advance your T1D research journey!