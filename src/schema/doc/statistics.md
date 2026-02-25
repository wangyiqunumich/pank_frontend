# Statistics

## Nodes Statistics

| Entity Type            | Number of Nodes |Link to Data Sources                                                           | Link to Pipeline                           |
|-------------------------|----------------|-------------------------------------------------------------------------------|--------------------------------------------|
| gene                   | 78687           | [Ensembl: GRCh38.p14](https://useast.ensembl.org/Homo_sapiens/Info/Index)     |                                            |
| sequence variant       | 21015           | [dbSNP](https://www.ncbi.nlm.nih.gov/snp/)                                    |                                            |
| credible set           | 24953           | [PanKbase Team](https://pankgraph.org/qtldatasource)                          | [Pipeline](https://pankgraph.org/pipeline), [Code](https://github.com/PanKbase/PanKgraph-finemap-coloc) |
| open chromatin region  | 18013           | [PanKbase Team](https://data.pankbase.org/analysis-sets/PKBDS0470WCHR/)       |[Pipeline](https://hugeampkpncms.org/sites/default/files/images/pankbase/pipelines/snATACprocessingpipeline_parul_pankbase.pdf), [Code](https://github.com/PanKbase/HPAP-scATAC-seq/blob/main/clustering_notebooks/query_snatac.ipynb)  |
| gene ontology          | 17448           | [Gene Ontology](https://geneontology.org)                                     |                                            |
| cell type ontology               | 8             | [NCBO](https://bioportal.bioontology.org/)                                    |                                            |
| literature             | 1008            | [HIRN](https://hirnetwork.org/all-hirn-publications)                          |                                            |

## Edges Statistics

| Edge Type | Start Node | End Node | Number of Edges | Link to Data Sources                                               | Link to Pipeline                           |
|-----------|-----------|-----------|-----------------|--------------------------------------------------------------------|--------------------------------------------|
| fine mapped QTL | sequence variant | gene | 411442 |[PanKbase Team](https://pankgraph.org/qtldatasource)                 | [Pipeline](https://pankgraph.org/pipeline), [Code](https://github.com/PanKbase/PanKgraph-finemap-coloc) |
| fine mapped GWAS | sequence variant | disease | 1609 |[PanKbase Team](https://pankgraph.org/qtldatasource)                 | [Pipeline](https://pankgraph.org/pipeline), [Code](https://github.com/PanKbase/PanKgraph-finemap-coloc) |
| Colocalization | gene | disease | 24 |[PanKbase Team](https://pankgraph.org/qtldatasource)                 | [Pipeline](https://pankgraph.org/pipeline), [Code](https://github.com/PanKbase/PanKgraph-finemap-coloc) |
| has expression | gene | ontology | 60285 | [PanKbase Team](https://data.pankbase.org/analysis-sets/PKBDS1349YHGQ/)                | [Pipeline](https://pank-s3-to-share.s3.us-east-1.amazonaws.com/docs/expression_pipeline.pdf), [code](https://github.com/PanKbase/PanKbase-scRNA-seq)  |
| differentially expressed | gene | ontology | 1957 | [PanKbase Team](https://data.pankbase.org/analysis-sets/PKBDS1349YHGQ/)              | [Pipeline](https://pank-s3-to-share.s3.us-east-1.amazonaws.com/docs/deg_pipeline.pdf), [Code](https://github.com/PanKbase/PanKbase-DEG-analysis)  |
| OCR locate in | gene | OCR | 18013 | [PanKbase Team](https://data.pankbase.org/analysis-sets/PKBDS0470WCHR/)             | [Pipeline](https://hugeampkpncms.org/sites/default/files/images/pankbase/pipelines/snATACprocessingpipeline_parul_pankbase.pdf), [Code](https://github.com/PanKbase/HPAP-scATAC-seq/blob/main/clustering_notebooks/query_snatac.ipynb)  |
| OCR in cell type | OCR | cell type | 126092 |[PanKbase Team](https://data.pankbase.org/analysis-sets/PKBDS0470WCHR/)     |[Pipeline](https://hugeampkpncms.org/sites/default/files/images/pankbase/pipelines/snATACprocessingpipeline_parul_pankbase.pdf), [Code](https://github.com/PanKbase/HPAP-scATAC-seq/blob/main/clustering_notebooks/query_snatac.ipynb)  |
| effector gene | ontology | effector gene | 257 | [HuGeAMP](https://hugeamp.org/research.html?pageid=egl_241)             |                                            |
| genetic regulation | gene | gene | 17226 |  [BioGRID](https://thebiogrid.org)                                                   |                                            |
| physical interaction | gene | gene | 926919 |  [BioGRID](https://thebiogrid.org)                                                   |                                            |
