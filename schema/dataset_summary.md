# Documentation

## Nodes Statistics

| Entity Type  | Number of Nodes | Data Sources |
|-----------------|-----------------|--------------|
| gene | 44513 | Ensembl |
| sequence variant | 275933 | dbSNP |
| credible set | 15014 | INSPIRE; SusieR |
| open chromatin region | 154437 | PMID 3018115 |
| ontology | 64 | NCBO |
| pathway | 1242 | Gene Ontology |
| literature | 1008 | HIRN |

## Edges Statistics

| Edge Type | Start Node | End Node | Number of Edges |
|-----------|-----------|-----------|-----------------|
| fine mapped eQTL | sequence variant | gene | 326696 |
| credible set for | credible set | gene | 24250 |
| belong to credible set | sequence variant | credible set | 571165 |
| effector gene | ontology | effector gene | 178 |
| belong to pathway | gene | pathway | 28170 |
| regulation | gene | gene | 391462 |

