# Detailed Node Information

## coding_elements - gene

This section provides details for the `coding_elements - gene` node type, which has 44513 nodes.

### Key Fields:

The following are some of the important fields for this node type:

- :ID
- :LABEL
- id:String
- id_version:Int
- HGNC_id:String

### Possible Relationships:

This node type may be involved in the following relationships:

- variants;sequence_variant;snp - [fine_mapped_eQTL] - coding_elements;gene
- credible_set - [credible_set_for] - coding_elements;gene
- coding_elements;gene - [effector_gene] - ontology
- coding_elements;gene - [belong_to_pathway] - pathway
- coding_elements;gene - [regulation] - coding_elements;gene
- coding_elements;gene - [regulation] - coding_elements;gene



## variants - sequence_variant

This section provides details for the `variants - sequence_variant` node type, which has 260447 nodes.

### Key Fields:

The following are some of the important fields for this node type:

- :ID
- :LABEL
- chr:String
- start_loc:Int
- end_loc:Int

### Possible Relationships:

This node type may be involved in the following relationships:

- variants;sequence_variant;snp - [fine_mapped_eQTL] - coding_elements;gene
- variants;sequence_variant;snp - [belong_to_credible_set] - credible_set

## variants - sequence_variant

This section provides details for the `variants - sequence_variant` node type, which has 6140 nodes.

### Key Fields:

The following are some of the important fields for this node type:

- :ID
- :LABEL
- chr:String
- start_loc:Int
- end_loc:Int

### Possible Relationships:

No specific relationships were identified for this node type.

## variants - sequence_variant

This section provides details for the `variants - sequence_variant` node type, which has 5647 nodes.

### Key Fields:

The following are some of the important fields for this node type:

- :ID
- :LABEL
- chr:String
- start_loc:Int
- end_loc:Int

### Possible Relationships:

No specific relationships were identified for this node type.

## credible_set

This section provides details for the `credible_set` node type, which has 15014 nodes.

### Key Fields:

The following are some of the important fields for this node type:

- :ID
- :LABEL
- id:String
- lead_SNP:String
- pip:Float

### Possible Relationships:

This node type may be involved in the following relationships:

- credible_set - [credible_set_for] - coding_elements;gene
- variants;sequence_variant;snp - [belong_to_credible_set] - credible_set

## open_chromatin_region

This section provides details for the `open_chromatin_region` node type, which has 154437 nodes.

### Key Fields:

The following are some of the important fields for this node type:

- :ID
- :LABEL
- chr:String
- start_loc:Int
- end_loc:Int

### Possible Relationships:

No specific relationships were identified for this node type.

## variants - sequence_variant

This section provides details for the `variants - sequence_variant` node type, which has 3679 nodes.

### Key Fields:

The following are some of the important fields for this node type:

- :ID
- :LABEL
- chr:String
- start_loc:Int
- end_loc:Int

### Possible Relationships:

No specific relationships were identified for this node type.

## variants - sequence_variant

This section provides details for the `variants - sequence_variant` node type, which has 20 nodes.

### Key Fields:

The following are some of the important fields for this node type:

- :ID
- :LABEL
- chr:String
- start_loc:Int
- end_loc:Int

### Possible Relationships:

No specific relationships were identified for this node type.

## ontology

This section provides details for the `ontology` node type, which has 64 nodes.

### Key Fields:

The following are some of the important fields for this node type:

- :ID
- :LABEL
- url:String
- id:String
- definition:String

### Possible Relationships:

This node type may be involved in the following relationships:

- coding_elements;gene - [effector_gene] - ontology

## pathway

This section provides details for the `pathway` node type, which has 1242 nodes.

### Key Fields:

The following are some of the important fields for this node type:

- :ID
- description:String
- data_source:String
- :LABEL
- id:String

### Possible Relationships:

This node type may be involved in the following relationships:

- coding_elements;gene - [belong_to_pathway] - pathway

