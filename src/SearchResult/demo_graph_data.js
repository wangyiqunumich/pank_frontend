export const demoGraphData = {
    nodes: [
        {
            "~id": "ENSG00000001626",
            "~entityType": "node",
            "~labels": ["coding_elements", "gene"],
            "~properties": {
                id: "ENSG00000001626",
                name: "CFTR",
                chr: "7",
                GC_percentage: 36.9,
                type: "protein_coding",
                link: "https://www.ensembl.org/id/ENSG00000001626",
                data_source: "Ensembl",
                data_version: "GRCh38.p14",
            },
        },
        {
            "~id": "rs2402203",
            "~entityType": "node",
            "~labels": ["variants", "sequence_variant", "non_core_snp"],
            "~properties": {
                id: "rs2402203",
                chr: "7",
                start_loc: 117431166,
                end_loc: 117431167,
                type: "SNP",
                link: "https://www.ncbi.nlm.nih.gov/snp/rs2402203",
                data_source: "ensembl",
                data_version: "GRCh38",
            },
        },
        {
            "~id": "MONDO_0005147",
            "~entityType": "node",
            "~labels": ["ontology"],
            "~properties": {
                id: "MONDO_0005147",
                name: "type 1 diabetes",
                data_source: "NCBO",
                data_version: "2024-2-20",
            },
        },
    ],
    edges: [
        {
            "~id": "edge-1",
            "~entityType": "relationship",
            "~start": "rs2402203",
            "~end": "ENSG00000001626",
            "~type": "fine_mapped_eQTL",
            "~properties": {
                data_source: "GTEx",
                tissue_name: "Pancreas",
                pip: "0.1153",
                nominal_p: "0.00075",
            },
        },
        {
            "~id": "edge-2",
            "~entityType": "relationship",
            "~start": "ENSG00000001626",
            "~end": "MONDO_0005147",
            "~type": "effector_gene_of",
            "~properties": {
                data_source: "PanKGraph",
            },
        },
    ],
};

export const demoCoordData = {
    ENSG00000001626: { x: 0, y: 0, Level: "Core" },
    rs2402203: { x: -140, y: 120, Level: "Neighbor" },
    MONDO_0005147: { x: 140, y: 120, Level: "Neighbor" },
};
