// Searchable property targets (English-oriented)
// Use as: expand query targets beyond name/id: aliases, symbols, accessions, xrefs, etc.
export const SEARCH_TARGETS = [
  // -------------------------
  // 0) Primary identifiers (highest priority)
  // -------------------------
  "id", "uuid", "uid", "key", "primaryKey",
  "identifier", "identifiers",
  "iri", "uri", "url",
  "accession", "accessionId", "accession_id",
  "stableId", "stable_id",
  "curie", "compactUri", "compactURI",

  // -------------------------
  // 1) Human-readable canonical labels
  // -------------------------
  "name", "label", "title", "displayName", "display_name",
  "preferredName", "preferred_name",
  "canonicalName", "canonical_name",
  "officialName", "official_name",
  "shortName", "short_name",
  "fullName", "full_name",
  "description", "summary", "abstract",

  // -------------------------
  // 2) Alias / synonym / alternate naming (what you asked for)
  // -------------------------
  "alias", "aliases",
  "aka", "alsoKnownAs", "also_known_as",
  "altName", "alt_name", "alternativeName", "alternative_name",
  "synonym", "synonyms",
  "exactSynonym", "exact_synonym",
  "broadSynonym", "broad_synonym",
  "narrowSynonym", "narrow_synonym",
  "relatedSynonym", "related_synonym",
  "abbreviation", "abbreviations",
  "acronym", "acronyms",
  "formerName", "former_name",
  "commonName", "common_name",
  "tradeName", "trade_name",
  "brandName", "brand_name",

  // -------------------------
  // 3) Gene/protein-style names (bio-heavy but broadly useful)
  // -------------------------
  "symbol", "geneSymbol", "gene_symbol",
  "proteinSymbol", "protein_symbol",
  "locus", "locusTag", "locus_tag",
  "geneName", "gene_name",
  "proteinName", "protein_name",
  "ensemblId", "ensembl_id",
  "entrezId", "entrez_id",
  "refseq", "refseqId", "refseq_id",
  "uniprot", "uniprotId", "uniprot_id",
  "hgnc", "hgncId", "hgnc_id",
  "mirbase", "mirbaseId", "mirbase_id",
  "pdb", "pdbId", "pdb_id",

  // -------------------------
  // 4) Ontology / controlled vocabulary fields
  // -------------------------
  "ontologyId", "ontology_id",
  "termId", "term_id",
  "oboId", "obo_id",
  "mesh", "meshId", "mesh_id",
  "mondo", "mondoId", "mondo_id",
  "doid", "doId", "do_id",
  "efo", "efoId", "efo_id",
  "go", "goId", "go_id",
  "uberon", "uberonId", "uberon_id",
  "cl", "clId", "cl_id",

  // -------------------------
  // 5) Cross-references / database links (very common in KGs)
  // -------------------------
  "xref", "xrefs",
  "crossRef", "crossRefs", "cross_ref", "cross_refs",
  "externalId", "externalIds", "external_id", "external_ids",
  "sourceId", "sourceIds", "source_id", "source_ids",
  "databaseId", "database_id",
  "dbXref", "dbxrefs", "db_xref", "db_xrefs",
  "reference", "references",
  "pmid", "pmids",
  "doi", "dois",
  "isbn", "issn",

  // -------------------------
  // 6) Codes / keys used by apps, catalogues, vendors, labs
  // -------------------------
  "code", "codes",
  "shortCode", "short_code",
  "internalId", "internalIds", "internal_id", "internal_ids",
  "legacyId", "legacy_id",
  "recordId", "record_id",
  "catalogId", "catalog_id",
  "sampleId", "sample_id",
  "donorId", "donor_id",
  "patientId", "patient_id",

  // -------------------------
  // 7) Taxonomy / classification-ish searchable fields
  // -------------------------
  "type", "entityType", "entity_type",
  "category", "categories",
  "class", "classes",
  "subtype", "subType", "sub_type",
  "namespace", "prefix",
  "species", "organism",
  "taxon", "taxonId", "taxon_id",

  // -------------------------
  // 8) Location-ish / provenance-ish (optional but useful)
  // -------------------------
  "source", "sources",
  "provider", "providers",
  "dataset", "datasetId", "dataset_id",
  "project", "projectId", "project_id",
  "collection", "collectionId", "collection_id",
  "pipeline", "pipelineId", "pipeline_id",
  "version", "release",

  // -------------------------
  // 9) Textual payload fields for fallback full-text
  // -------------------------
  "comment", "comments",
  "note", "notes",
  "definition",
  "detail", "details",
  "keywords", "tags"
];

// Optional: common nested paths you might see (graph DB exports / JSON-LD-ish)
export const SEARCH_TARGET_PATHS = [
  "properties.name",
  "properties.label",
  "properties.title",
  "properties.synonyms",
  "properties.aliases",
  "properties.symbol",
  "properties.xrefs",
  "meta.name",
  "meta.aliases",
  "meta.synonyms",
  "meta.id",
  "identifiers.*",
  "xrefs.*"
];