# Statistics

## Nodes Statistics

| Entity Type | Number of Nodes | Link to Data Sources | Link to Pipeline |
|---|---:|---|---|
| gene | 78687 | [Ensembl: GRCh38.p14](https://useast.ensembl.org/Homo_sapiens/Info/Index) |  |
| sequence variant | 21043 | [dbSNP](https://www.ncbi.nlm.nih.gov/snp/) |  |
| open chromatin region | 5294421 | [PanKbase Team](https://data.pankbase.org/analysis-sets/PKBDS0470WCHR/) | [Pipeline](https://hugeampkpncms.org/sites/default/files/images/pankbase/pipelines/snATACprocessingpipeline_parul_pankbase.pdf), [Code](https://github.com/PanKbase/HPAP-scATAC-seq/blob/main/clustering_notebooks/query_snatac.ipynb) |
| gene ontology | 17448 | [Gene Ontology](https://geneontology.org) |  |
| KEGG pathway | 370 | [KEGG](https://www.genome.jp/kegg/) |  |
| Reactome pathway | 2277 | [Reactome](https://reactome.org/) |  |
| anatomical structure | 58 | [NCBO BioPortal](https://bioportal.bioontology.org/) |  |
| sample | 8987 | [HPAP](https://hpap.pmacs.upenn.edu) |  |
| donor | 193 | [HPAP](https://hpap.pmacs.upenn.edu) |  |
| data modality | 17 | [PanKbase Team](https://pankgraph.org) |  |
| disease | 3 | [MONDO](https://mondo.monarchinitiative.org/) |  |

## Edges Statistics


| Edge Type | Start Node | End Node | Number of Edges | Link to Data Sources | Link to Pipeline |
|---|---|---|---:|---|---|
| fine mapped QTL | sequence variant | gene | 23256 | [PanKbase Team](https://pankgraph.org/qtldatasource) | [Pipeline](https://pankgraph.org/pipeline), [Code](https://github.com/PanKbase/PanKgraph-finemap-coloc) |
| fine mapped GWAS | sequence variant | disease | 1608 | [PanKbase Team](https://pankgraph.org/qtldatasource) | [Pipeline](https://pankgraph.org/pipeline), [Code](https://github.com/PanKbase/PanKgraph-finemap-coloc) |
| colocalization | gene | disease | 24 | [PanKbase Team](https://pankgraph.org/qtldatasource) | [Pipeline](https://pankgraph.org/pipeline), [Code](https://github.com/PanKbase/PanKgraph-finemap-coloc) |
| GO functional annotation | gene | gene ontology | 262622 | [Gene Ontology](https://geneontology.org) |  |
| KEGG pathway annotation | gene | KEGG pathway | 38463 | [KEGG](https://www.genome.jp/kegg/) |  |
| Reactome pathway annotation | gene | Reactome pathway | 48545 | [Reactome](https://reactome.org/) |  |
| physical interaction | gene | gene | 926919 | [BioGRID](https://thebiogrid.org) |  |
| genetic interaction | gene | gene | 17226 | [BioGRID](https://thebiogrid.org) |  |
| effector gene of | gene | disease | 257 | [HuGeAMP](https://hugeamp.org/research.html?pageid=egl_241) |  |
| gene activity score in | gene | anatomical structure | 126091 | [PanKbase Team](https://data.pankbase.org/analysis-sets/PKBDS0470WCHR/) | [Pipeline](https://hugeampkpncms.org/sites/default/files/images/pankbase/pipelines/snATACprocessingpipeline_parul_pankbase.pdf), [Code](https://github.com/PanKbase/HPAP-scATAC-seq/blob/main/clustering_notebooks/query_snatac.ipynb) |
| open chromatin region in | open chromatin region | anatomical structure | 5294421 | [PanKbase Team](https://data.pankbase.org/analysis-sets/PKBDS0470WCHR/) | [Pipeline](https://hugeampkpncms.org/sites/default/files/images/pankbase/pipelines/snATACprocessingpipeline_parul_pankbase.pdf), [Code](https://github.com/PanKbase/HPAP-scATAC-seq/blob/main/clustering_notebooks/query_snatac.ipynb) |
| differentially expressed in T1D | gene | anatomical structure | 1956 | [PanKbase Team](https://data.pankbase.org/analysis-sets/PKBDS1349YHGQ/) | [Pipeline](https://pankbase.org/diff-exp.html?comparison=dea_comp_1&dataset=islet_of_Langerhans_scRNA_v3-3_Pseudobulk_Acinar), [Code](https://github.com/PanKbase/PanKbase-DEG-analysis) |
| gene enriched in | gene | anatomical structure | 14028 | [PanKbase Team](https://data.pankbase.org/analysis-sets/PKBDS1349YHGQ/) | [Pipeline](https://pank-s3-to-share.s3.us-east-1.amazonaws.com/docs/expression_pipeline.pdf), [Code](https://github.com/PanKbase/PanKbase-scRNA-seq) |
| gene detected in ND | gene | anatomical structure | 50927 | [PanKbase Team](https://data.pankbase.org/analysis-sets/PKBDS1349YHGQ/) | [Pipeline](https://pank-s3-to-share.s3.us-east-1.amazonaws.com/docs/expression_pipeline.pdf), [Code](https://github.com/PanKbase/PanKbase-scRNA-seq) |
| gene detected in T1D | gene | anatomical structure | 55788 | [PanKbase Team](https://data.pankbase.org/analysis-sets/PKBDS1349YHGQ/) | [Pipeline](https://pank-s3-to-share.s3.us-east-1.amazonaws.com/docs/expression_pipeline.pdf), [Code](https://github.com/PanKbase/PanKbase-scRNA-seq) |
| fGSEA pathway enriched in | Reactome pathway | anatomical structure | 81 | [PanKbase Team](https://data.pankbase.org/analysis-sets/PKBDS1349YHGQ/) |  |
| has donor | disease | donor | 192 | [HPAP](https://hpap.pmacs.upenn.edu) |  |
| has sample | anatomical structure, data modality, donor, disease | sample | 40285 | [HPAP](https://hpap.pmacs.upenn.edu) |  |

