# Statistics

## Nodes Statistics

| Entity Type            | Number of Nodes |Link to Data Sources                                                           | Link to Pipeline                           |
|-------------------------|----------------|-------------------------------------------------------------------------------|--------------------------------------------|
| gene                   | 78687           | [Ensembl: GRCh38.p14](https://useast.ensembl.org/Homo_sapiens/Info/Index)     |                                            |
| sequence variant       | 19449           | [dbSNP](https://www.ncbi.nlm.nih.gov/snp/)                                    |                                            |
| credible set           | 24879           | [PanKbase Team](https://pankgraph.org/qtldatasource)                          | [Pipeline](https://pankgraph.org/pipeline), [Code](https://www.google.com/url?q=https://github.com/PanKbase/PanKgraph-finemap-coloc&sa=D&source=docs&ust=1750170583489108&usg=AOvVaw0_w91mev1cU0JwRyPwNJ1k) |
| open chromatin region  | 18013           | [PanKbase Team](https://data.pankbase.org/analysis-sets/PKBDS0470WCHR/)       |[Pipeline](https://hugeampkpncms.org/sites/default/files/images/pankbase/pipelines/snATACprocessingpipeline_parul_pankbase.pdf), [Code](https://github.com/PanKbase/HPAP-scATAC-seq/blob/main/clustering_notebooks/query_snatac.ipynb)  |
| gene ontology          | 17449           | [Gene Ontology](https://geneontology.org)                                     |                                            |
| ontology               | 64              | [NCBO](https://bioportal.bioontology.org/)                                    |                                            |
| literature             | 1008            | [HIRN](https://hirnetwork.org/all-hirn-publications)                          |                                            |

## Edges Statistics

| Edge Type | Start Node | End Node | Number of Edges | Link to Data Sources                                               | Link to Pipeline                           |
|-----------|-----------|-----------|-----------------|--------------------------------------------------------------------|--------------------------------------------|
| fine mapped QTL | sequence variant | gene | 411442 |[PanKbase Team](https://pankgraph.org/qtldatasource)                 | [Pipeline](https://pankgraph.org/pipeline), [Code](https://www.google.com/url?q=https://github.com/PanKbase/PanKgraph-finemap-coloc&sa=D&source=docs&ust=1750170583489108&usg=AOvVaw0_w91mev1cU0JwRyPwNJ1k) |
| has expression | gene | ontology | 60285 | [PanKbase Team](Wait for expression data library link)                | [Pipeline](https://docs.google.com/document/d/1vEgWq8c0nIHuJ-0I4Ffn9Ejw7jMOnffUypNeSYZNtEI/edit?tab=t.0#heading=h.df825imw1mpu), [code](https://github.com/PanKbase/PanKbase-scRNA-seq)  |
| differentially expressed | gene | ontology | 1957 | [PanKbase Team](Wait for DEG data library link)              | [Pipeline](https://docs.google.com/document/d/1Aiv0XokLWerxvGIPWcgXFF-bvjNfNVzqfwS1TFTgXMc/edit?tab=t.0), [Code](https://www.google.com/url?q=https://github.com/PanKbase/PanKbase-DEG-analysis&sa=D&source=docs&ust=1750170583487441&usg=AOvVaw0Isgr-cuzcsh4-626q3bLv)  |
| OCR locate in | gene | OCR | 18013 | [PanKbase Team](https://data.pankbase.org/analysis-sets/PKBDS0470WCHR/)             | [Pipeline](https://hugeampkpncms.org/sites/default/files/images/pankbase/pipelines/snATACprocessingpipeline_parul_pankbase.pdf), [Code](https://github.com/PanKbase/HPAP-scATAC-seq/blob/main/clustering_notebooks/query_snatac.ipynb)  |
| OCR in cell type | OCR | cell type | 126092 |[PanKbase Team](https://data.pankbase.org/analysis-sets/PKBDS0470WCHR/)     |
| effector gene | ontology | effector gene | 178 | [HuGeAMP](https://hugeamp.org/research.html?pageid=egl_241)             |                                            |
| regulation | gene | gene | 944146 |  [BioGRID](https://thebiogrid.org)                                                   |                                            |
