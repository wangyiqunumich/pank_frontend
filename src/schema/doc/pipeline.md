### Pipeline Overview

To investigate the potential shared genetic architecture between Type 1 Diabetes (T1D) and gene expression in pancreatic tissues, we employed the following analytical pipeline:

#### Data Integration

1. **GWAS Data**: Utilized T1D summary statistics from Chiou et al. (2021). 

2. **eQTL Data**:
   - **Pancreatic Islets**: Incorporated eQTL data from the InsPIRE study. 
   - **Pancreatic Tissue**: Included eQTL data from the GTEx Project (v8). 

#### Fine-Mapping

Applied the "Sum of Single Effects" (SuSiE) approach using the `susieR` package (v0.11.96) to identify independent association signals and their 95% credible sets. [oai_citation_attribution:2‡GitHub](https://github.com/stephenslab/susieR?utm_source=chatgpt.com)

- **Reference Panel**: Employed genotype data from 40,000 unrelated British individuals in the UK Biobank.

- **Region of Interest**: Focused on single nucleotide polymorphisms (SNPs) within ±250 kb of lead GWAS SNPs or eGene transcription start sites for eQTLs.

- **Filtering**:
  - **GWAS Credible Sets**: Retained sets containing lead SNPs or variants in high linkage disequilibrium (R² ≥ 0.5) with lead SNPs.
  - **eQTL Credible Sets**: No additional filtering applied.

#### Colocalization Analysis

Assessed the colocalization of GWAS and eQTL signals using the `coloc` package (v5.2.3). [oai_citation_attribution:1‡GitHub](https://github.com/chr1swallace/coloc?utm_source=chatgpt.com)

- **Criteria**: Analyzed signal pairs with lead variants located within 250 kb of each other.

- **Colocalization Threshold**: Defined colocalization as a posterior probability for shared causal variants (PPH4) exceeding 0.5.

This integrative approach enabled the identification of shared genetic factors influencing T1D susceptibility and gene expression in pancreatic tissues.

#### Acknowledgments

We extend our gratitude to Thi Hong Ha Vu and the Stephen C.J. Parker Lab for their invaluable contributions in analyzing the eQTL and GWAS datasets. Their expertise has been instrumental in advancing our understanding of the genetic architecture of complex traits and diseases.