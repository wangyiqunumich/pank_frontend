# PanKgraph Query API

## Overview
The PanKgraph Query API provides a portal for users to submit queries and download query results. 

Our system is built on a robust and secure AWS infrastructure, leveraging API Gateway, Lambda, and Neptune.

---

## Usage

### command line
Use the following commands in your command line tool (e.g., Terminal for macOS or CMD for Windows) to submit queries. Replace `YOUR_QUERY` with your openCypher query.

```bash
curl -X 'POST' \
  'HTTPS://vcr7lwcrnh.execute-api.us-east-1.amazonaws.com/development/api' \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "YOUR_QUERY"
}'
```
---

## Writing a Valid Query

### Retrieve Graph Metadata
To show which nodes (entities), edges (relationships), and properties (attributes) are currently supported in PanKgraph,
use the following queries.

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

### Cypher grammar
PanKgraph Query API supports most openCypher query constructs.

- To learn basic openCypher query syntax, refer to [this guide](https://neo4j.com/docs/cypher-manual/current/queries/basic/?utm_source=GSearch&utm_medium=PaidSearch&utm_campaign=Evergreen&utm_content=AMS-Search-SEMCE-DSA-None-SEM-SEM-NonABM&utm_term=&utm_adgroup=DSA&gad_source=1&gclid=CjwKCAiArva5BhBiEiwA-oTnXXVaj70Ck95TVwLXHnxpcTNpX0Vl_4xFUjGR7sQFMkm8mC3dFyfmWRoCNh0QAvD_BwE#find-nodes).
- To learn openCypher grammar, please refer to [this page](https://opencypher.org/resources/).

### Example queries

Below are some example queries to help you get started.

- Get detailed information for gene `RFX6`
```cypher
MATCH (n:gene {name:'RFX6'}) RETURN n
```
or
```
MATCH (n:gene) WHERE n.name='RFX6' RETURN n
```

- Count all genes on chromosome `X`
```
MATCH (n:gene {chr:'X'}) RETURN COUNT(n)
```

- Find all fine-mapped eQTLs for gene `ACTA2` and return rs IDs
```
MATCH (v)-[r:fine_mapped_eQTL]->(g:gene {name:'ACTA2'}) RETURN v.id
```

- Find all effectors genes for `type 1 diabetes` and return gene names
```
MATCH (g)-[r:effector_gene]->(o:ontology {id:'MONDO_0005147'}) RETURN g.name
```

### References
- PanKgraph metadata are on [this page]()
- All ontology terms (e.g., diseases, cell types, phenotypes) supported by PanKgraph are on [this page]()

---

## How to interpret query results

### Output

The PanKgraph API returns results as a JSON string.
If the query fails, the response starts with `"Error"`.

### Error messages
- Error 400: Query failed. Check your openCypher query syntax
- Error 404: Access denied. Please contact the PanKgraph team for support

### Obtain output

If the query is successful, the results are provided as a JSON string.
E.g., 
```json
[{
      "n": {
        "~id": "ENSG00000228037",
        "~entityType": "node",
        "~labels": ["coding_elements", "gene"],
        "~properties": {
          "id": "ENSG00000228037",
          "id_version": 1,
          "name": "nan",
          "HGNC_id": "nan",
          "HGNC_symbol": "nan",
          "description": "novel transcript",
          "chr": "1",
          "start_loc": 2581560,
          "end_loc": 2584533,
          "strand": "1",
          "GC_percentage": 51.11,
          "type": "lncRNA",
          "link": "https://www.ensembl.org/id/ENSG00000228037",
          "gencode_annotation": "GENCODE basic",
          "synonym": "nan",
          "data_version": "GRCh38.p14",
          "data_source": "Ensembl"
        }
      }
    }]
```


