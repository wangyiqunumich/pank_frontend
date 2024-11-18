# Graph Summary with LLM

## Overview
Our AI summary feature leverages Large Language Models (LLMs) to provide intelligent analysis and natural language summaries based on query result and HIRN literature. This tool bridges the gap between raw graph query results and meaningful scientific insights.

## Usage

### command line
```
curl -X 'POST' \
  'https://glkb.dcmb.med.umich.edu/api/search/PKG_LLM_QA' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "graph": <PanKgraph result>,
  "question": "What are the eQTLs associated with CENPP?",
}'
```

### python
```
import json
import requests

with open('result_page_with_extend.json') as f:
    graph = json.load(f),

base_url = 'https://glkb.dcmb.med.umich.edu/api/search/PKG_LLM_QA'

response = requests.post(base_url,
json={'graph': graph,
'question': 'summarize the variant rs10156530?'})

print(response.json().get('answer'))
```

## Key Features

### Dynamic Graph Summarization
- Converts graph query results into natural language descriptions
- Highlights key relationships and patterns in the data
- Provides context-aware summaries based on the query type

### Literature-Enhanced Responses
- Integrates relevant information from HIRN literature
- Cross-references graph data with published research
- Enriches summaries with citations and supporting evidence

### Templated Question Answering
- Responds to predefined question templates about graph data
- Offers consistent and structured analysis
- Supports common research queries such as:
  - Relationship analysis between entities
  - Statistical summaries of connections
  - Evidence-based explanations
