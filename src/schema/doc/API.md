# PanKgraph Query API

## Table of Contents
1. [Overview](#overview)
2. [Usage](#usage)
3. [Writing a Valid Query](#writing-a-valid-query)
4. [Example Queries](#example-queries)
5. [Interpreting query results](#interpreting-query-results)

---

## Overview
The PanKgraph Query API provides a portal for users to submit queries and download query results. 

It is built on a robust and secure AWS infrastructure, leveraging API Gateway, Lambda, and Neptune for secure and efficient operations.

---

## Usage

### command line
Use the following commands in your command line tool (e.g., Terminal for macOS or CMD for Windows) to submit queries. Replace `YOUR_QUERY` with your openCypher query.

```bash
curl -X POST \
  'http://dev-neo4j.pankgraph.org/db/neo4j/query/v2' \
  -H 'Content-Type: application/json' \
  -u 'neo4j:PanK_development_password' \
  -d '{"statement": "YOUR_QUERY"}'
```

To save the output to a file, append ` > result.txt` to the command.
```bash
curl -X POST \
  'http://dev-neo4j.pankgraph.org/db/neo4j/query/v2' \
  -H 'Content-Type: application/json' \
  -u 'neo4j:PanK_development_password' \
  -d '{"statement": "YOUR_QUERY"}' > result.txt
```

---

## Writing a Valid Query

### Cypher For PanKgraph schema
Because PanKgraph is continuously updated, users are encouraged to explore the current node and relationship schema directly from the graph using Cypher. To list all node types and their counts in the latest database schema, run:

```bash
curl -X POST \
  'http://dev-neo4j.pankgraph.org/db/neo4j/query/v2' \
  -H 'Content-Type: application/json' \
  -u 'neo4j:PanK_development_password' \
  -d '{"statement": "MATCH (n) RETURN labels(n) AS NodeType, COUNT(n) AS Count ORDER BY Count DESC"}'
```
To inspect all supported relationship (edge) types and their frequencies:
```bash
curl -X POST \
  'http://dev-neo4j.pankgraph.org/db/neo4j/query/v2' \
  -H 'Content-Type: application/json' \
  -u 'neo4j:PanK_development_password' \
  -d '{"statement": "MATCH ()-[r]->() RETURN type(r) AS RelationshipType, COUNT(r) AS Count ORDER BY Count DESC"}'
```

### Cypher Query Grammar
The PanKgraph Query API accepts queries in the Cypher query language, a declarative graph query language designed for expressive and efficient querying in property graphs.

#### Syntax Overview
A valid Cypher query includes:
- Keywords: including `MATCH`, `RETURN`, `WHERE`, `AS`, `ORDER BY`, `LIMIT`, etc.
- Representation of nodes (`(movie:Movie)`), edges (`[:ACTED_IN]`), and properties (`movie.year`).

To learn more about the cyhper, you can visit: [Wikipedia page for Cypher](https://en.wikipedia.org/wiki/Cypher_(query_language)).

Once a node or relationship type is identified, you can inspect its attribute schema by querying one representative instance. For example, to view all properties associated with the gene node type:
```cypher
MATCH (n:gene) 
RETURN properties(n) 
LIMIT 1
```

Resources:
- To learn basic openCypher query syntax, refer to [this guide](https://neo4j.com/docs/cypher-manual/current/queries/basic/?utm_source=GSearch&utm_medium=PaidSearch&utm_campaign=Evergreen&utm_content=AMS-Search-SEMCE-DSA-None-SEM-SEM-NonABM&utm_term=&utm_adgroup=DSA&gad_source=1&gclid=CjwKCAiArva5BhBiEiwA-oTnXXVaj70Ck95TVwLXHnxpcTNpX0Vl_4xFUjGR7sQFMkm8mC3dFyfmWRoCNh0QAvD_BwE#find-nodes).
- To learn openCypher grammar, please refer to [this page](https://opencypher.org/resources/).

## Attention

Due to how quotation marks are interpreted in `JSON` strings,
when submitting queries via the command line,
please ensure the query be within one line,
and all quotation marks (`"` or `'`) replaced with `\"` to avoid syntax error.


For example,
```cypher
MATCH (n:gene {name: 'CFTR'})
RETURN n
```
should be written into 
```cypher
MATCH (n:gene {name: \"CFTR\"}) RETURN n
```

## Example queries

Below are some example queries to help you get started.

- Get detailed information for gene `CFTR` (Ensembl ID = `ENSG00000001626
`)
```cypher
MATCH (n:gene {id:\"ENSG00000001626\"}) RETURN n
```
or
```cypher
MATCH (n:gene) WHERE n.id=\"ENSG00000001626\" RETURN n
```

- Count all genes on chromosome `X`
```cypher
MATCH (n:gene {chr:\"X\"}) RETURN COUNT(n)
```

- Find all fine-mapped eQTLs for gene `LIG3` in pancreas and return rs IDs
```cypher
MATCH (v)-[r:fine_mapped_eQTL]->(g:gene {name:\"CFTR\"}) WHERE r.tissue_id = \"UBERON_0001264\" RETURN v.id
```
Note: cell type names are represented with biomedical ontology IDs in PanKgraph.
So `Pancreas` is represented as `tissue_id = UBERON_0001264`.
To get the list of supported cell types and corresponding ontology IDs, refer to [PanKgraph documentation (not finished)]().

- Find all effectors genes for `type 1 diabetes` and return gene names
```cypher
MATCH (g)-[r:effector_gene]->(o:ontology {id:\"MONDO_0005147\"}) RETURN g.name
```
Note: similar to cell types, disease and phenotype names are also represented as ontology IDs.
To get the list of supported diseases/phenotypes and corresponding ontology IDs, refer to [PanKgraph documentation (not finished)]().

- Find 10 eQTL variants of genes in `hormone-mediated signaling pathway` (`GO:0009755`).
```cypher
MATCH (p:pathway {id: \"GO:0009755\"})<-[belong_to_pathway]-(g:gene)<-[fine_mapped_eQTL]-(v:sequence_variant) RETURN v LIMIT 10
```
Note: similar to cell types and disease names, pathway names are also represented as ontology IDs.
To get the list of supported pathway names and corresponding ontology IDs, refer to [PanKgraph documentation (not finished)]().



### Graph Metadata
To view nodes (entities) types, edges (relationships) types, and properties (attributes) in PanKgraph,
you can refer to [PanKgraph documentation (not finished)]().

By running the following queries with the query API, you could also get the most recent graph metadata.

- Show all node types
```cypher
MATCH (n) RETURN labels(n) AS NodeType, COUNT(n) AS Count ORDER BY Count DESC
```
- Show all edge types
```cypher
MATCH ()-[r]->() RETURN type(r) AS RelationshipType, COUNT(r) AS Count ORDER BY Count DESC
```
- Show the properties of a node type (e.g., `gene`) by query one example node 
```cypher
MATCH (n:gene) RETURN properties(n) LIMIT 1
```
- Show the properties of an edge type (e.g., `effector_gene`) by query one example edge 
```cypher
MATCH ()-[r:effector_gene]-() RETURN properties(r) LIMIT 1
```

---

## Interpreting query results

### Output

The PanKgraph API returns results as a JSON string.

Example output:
```json
{
  "results": [{
      "n": {
        "~id": "ENSG00000001626",
        "~entityType": "node",
        "~labels": ["coding_elements", "gene"],
        "~properties": {
          "id": "ENSG00000001626",
          "id_version": 18,
          "name": "CFTR",
          "HGNC_id": "HGNC:1884",
          "HGNC_symbol": "CFTR",
          "description": "CF transmembrane conductance regulator [Source:HGNC Symbol;Acc:HGNC:1884]",
          "chr": "7",
          "start_loc": 117287120,
          "end_loc": 117715971,
          "strand": "1",
          "GC_percentage": 36.9,
          "type": "protein_coding",
          "link": "https://www.ensembl.org/id/ENSG00000001626",
          "gencode_annotation": "nan",
          "synonym": "ABC35;MRP7;TNR-CFTR;CFTR/MRP;ABCC7;CF;DJ760C5.1",
          "data_version": "GRCh38.p14",
          "data_source": "Ensembl"
        }
      }
    }]
}
```
Query results can be processed using programming libraries,
e.g., [`json` package](https://docs.python.org/3/library/json.html) of Python.

### Error messages
If the query fails, the response starts with `"Error"`.
- Error 400: Query failed. Check your Cypher query syntax.
- Error 404: Access denied. Contact the PanKgraph team (`fan.feng@vumc.org`) for support.
- Internal server error: Query took longer than 30 seconds and was terminated.

