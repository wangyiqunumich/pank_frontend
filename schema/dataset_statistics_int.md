# Dataset Statistics and Data Modality

## Summary Tables

### Nodes Summary

| Entity Type | Entity Sub-type | Number of Nodes | Number of Fields | Data Sources | Data Versions |
|-------------|-----------------|-----------------|------------------|--------------|---------------|
| coding_elements | gene | 44513 | 19 | Ensembl | Ensembl 104 |
| variants | sequence_variant | 275933 | 27 | dbSNP, from id | 0, 2016-03-3T10:51Z, 2021-05-13 |
| credible_set |  | 15014 | 16 | INSPIRE; SusieR | 2024-10-25 |
| open_chromatin_region |  | 154437 | 10 | PMID_3018115 | 2024-10-07 |
| ontology |  | 64 | 11 | NCBO | 2024-2-20 |
| pathway |  | 1242 | 5 | Biological Process (Gene Ontology) | Unknown |

### Edges Summary

| Edge Type | Number of Edges | Number of Fields | Data Sources | Data Versions |
|-----------|-----------------|------------------|--------------|---------------|
| fine_mapped_eQTL | 326696 | 13 | INSPIRE; SusieR | 2024-10-25 |
| credible_set_for | 24250 | 5 | INSPIRE; SusieR | 2024-10-25 |
| belong_to_credible_set | 571165 | 13 | INSPIRE; SusieR | 2024-10-25 |
| effector_gene | 178 | 9 | HuGeAMP | 2024-11-14 |
| belong_to_pathway | 28170 | 5 | Biological Process (Gene Ontology) | 10/3/24 |
| regulation | 391462 | 8 | BioGRID | - (-) (-) (-) (-) (-) |

## Nodes Details

### Entity Type: `coding_elements`

**Entity Sub-type:** gene

**Number of Nodes:** 44513

**Data Sources:** Ensembl

**Data Versions:** Ensembl 104

**Fields:**

- :ID
- :LABEL
- GC_percentage:Float
- HGNC_id:String
- HGNC_symbol:String
- chr:String
- data_source:String
- data_version:String
- description:String
- end_loc:Int
- gencode_annotation:String
- id:String
- id_version:Int
- link:String
- name:String
- start_loc:Int
- strand:String
- synonym:String
- type:String

### Entity Type: `variants`

**Entity Sub-type:** sequence_variant

**Number of Nodes:** 275933

**Data Sources:** dbSNP, from id

**Data Versions:** 0, 2016-03-3T10:51Z, 2021-05-13

**Fields:**

- :ID
- :LABEL
- HGVS_name:String
- alt:String
- chr:String
- common_SNP:String
- data_source:String
- data_version:String
- end_loc:Int
- freq:String
- id:String
- in_3prime_UTR:String
- in_3prime_gene_region:String
- in_5prime_UTR:String
- in_5prime_gene_region:String
- in_acceptor_splice_site:String
- in_donor_splice_site:String
- in_intron:String
- link:String
- non_synonymous_frameshift:String
- non_synonymous_missense:String
- non_synonymous_nonsense:String
- ref:String
- start_loc:Int
- type:String
- variant_allele_origin:String
- variant_suspect_reason:String

### Entity Type: `credible_set`

**Number of Nodes:** 15014

**Data Sources:** INSPIRE; SusieR

**Data Versions:** 2024-10-25

**Fields:**

- :ID
- :LABEL
- data_source:String
- data_version:String
- effect_allele:String
- id:String
- lbf:Float
- lead_SNP:String
- n_snp:Int
- nominal_p:Float
- noneffect_allele:String
- pip:Float
- purity:Float
- slope:Float
- tissue_id:String
- tissue_name:String

### Entity Type: `open_chromatin_region`

**Number of Nodes:** 154437

**Data Sources:** PMID_3018115

**Data Versions:** 2024-10-07

**Fields:**

- :ID
- :LABEL
- average_ATAC_ND:Float
- average_ATAC_T2D:Float
- chr:String
- data_source:String
- data_version:String
- end_loc:Int
- id:String
- start_loc:Int

### Entity Type: `ontology`

**Number of Nodes:** 64

**Data Sources:** NCBO

**Data Versions:** 2024-2-20

**Fields:**

- :ID
- :LABEL
- _label:String
- all_labels:String
- data_source:String
- data_version:String
- definition:String
- id:String
- link:String
- synonyms:String
- url:String

### Entity Type: `pathway`

**Number of Nodes:** 1242

**Data Sources:** Biological Process (Gene Ontology)

**Data Versions:** Unknown

**Fields:**

- :ID
- :LABEL
- data_source:String
- description:String
- id:String

## Edges Details

### Edge Type: `fine_mapped_eQTL`

**Number of Edges:** 326696

**Data Sources:** INSPIRE; SusieR

**Data Versions:** 2024-10-25

**Fields:**

- :END_ID
- :START_ID
- :TYPE
- data_source:String
- data_version:String
- effect_allele
- lbf
- nominal_p
- other_allele
- pip
- slope
- tissue_id:String
- tissue_name:String

### Edge Type: `credible_set_for`

**Number of Edges:** 24250

**Data Sources:** INSPIRE; SusieR

**Data Versions:** 2024-10-25

**Fields:**

- :END_ID
- :START_ID
- :TYPE
- data_source:String
- data_version:String

### Edge Type: `belong_to_credible_set`

**Number of Edges:** 571165

**Data Sources:** INSPIRE; SusieR

**Data Versions:** 2024-10-25

**Fields:**

- :END_ID
- :START_ID
- :TYPE
- data_source:String
- data_version:String
- effect_allele
- lbf
- nominal_p
- other_allele
- pip
- slope
- tissue_id:String
- tissue_name:String

### Edge Type: `effector_gene`

**Number of Edges:** 178

**Data Sources:** HuGeAMP

**Data Versions:** 2024-11-14

**Fields:**

- :END_ID
- :START_ID
- :TYPE
- data_source:String
- data_version:String
- evidence:String
- reference:String
- related_publications:String
- related_variants:String

### Edge Type: `belong_to_pathway`

**Number of Edges:** 28170

**Data Sources:** Biological Process (Gene Ontology)

**Data Versions:** 10/3/24

**Fields:**

- :END_ID
- :START_ID
- :TYPE
- data_source:String
- data_version:String

### Edge Type: `regulation`

**Number of Edges:** 391462

**Data Sources:** BioGRID

**Data Versions:** - (-) (-) (-) (-) (-)

**Fields:**

- :END_ID
- :START_ID
- :TYPE
- biogrid_interaction_id:String
- cDSD_distance:Float
- data_source:String
- data_version:String
- pubmed_id

