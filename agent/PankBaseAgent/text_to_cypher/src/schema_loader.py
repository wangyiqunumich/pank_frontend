#!/usr/bin/env python3
"""
schema_loader.py
Fast, memoised accessor for the Neo4j schema JSON and optional hints.
Also provides a simplified, distilled view of the schema for LLM prompting.

Usage
-----
from schema_loader import get_schema, get_schema_hints, get_simplified_schema, get_minimal_schema_for_llm
schema = get_schema()                # full dict, loaded once per process
hints = get_schema_hints()           # dict or None, loaded once per process
simple = get_simplified_schema()     # slim dict (labels, properties, relationships)
minimal = get_minimal_schema_for_llm()  # ultra-compact string for small models
"""

from __future__ import annotations
import json, os
from pathlib import Path
from typing import Dict, Any, Optional

from dotenv import load_dotenv

load_dotenv()
_SCHEMA_PATH = (Path(__file__).resolve().parent.parent / "data" / "input" / "neo4j_schema.json")

_HINTS_PATH = (Path(__file__).resolve().parent.parent / "data" / "input" / "schema_hints.json")

_VALID_VALUES_PATH = (Path(__file__).resolve().parent.parent / "data" / "input" / "valid_property_values.json")


# ── internal cache --------------------------------------------------------
_cached_schema: Dict[str, Any] | None = None
_cached_hints: Dict[str, Any] | None = None
_cached_simple: Dict[str, Any] | None = None
_cached_minimal: str | None = None
_cached_valid_values: Dict[str, Any] | None = None
_property_cache: Dict[str, str] = {}
_hints_loaded: bool = False
_valid_values_loaded: bool = False

def get_schema() -> Dict[str, Any]:
    """Return the full Neo4j schema as a JSON dict (cached)."""
    global _cached_schema
    if _cached_schema is None:
        with _SCHEMA_PATH.open() as f:
            _cached_schema = json.load(f)
    return _cached_schema

def get_schema_hints() -> Optional[Dict[str, Any]]:
    """Return schema hints/clarifications if available (cached)."""
    global _cached_hints, _hints_loaded
    if not _hints_loaded:
        _hints_loaded = True
        if _HINTS_PATH and _HINTS_PATH.exists():
            with _HINTS_PATH.open() as f:
                _cached_hints = json.load(f)
    return _cached_hints

def get_valid_property_values() -> Optional[Dict[str, Any]]:
    """Return valid property values for constrained properties (cached)."""
    global _cached_valid_values, _valid_values_loaded
    if not _valid_values_loaded:
        _valid_values_loaded = True
        if _VALID_VALUES_PATH and _VALID_VALUES_PATH.exists():
            with _VALID_VALUES_PATH.open() as f:
                _cached_valid_values = json.load(f)
    return _cached_valid_values

def get_simplified_schema() -> Dict[str, Any]:
    """Return a distilled schema aligned with the new schema format (node_types, edge_types)."""
    global _cached_simple
    if _cached_simple is None:
        schema = get_schema()

        # Extract node labels and their property names
        nodes = {
            label.split(";")[-1]: list(spec.get("properties", {}).keys())
            for label, spec in schema.get("node_types", {}).items()
        }

        # Extract relationships and source/target node types
        relationships = {
            rel.split(";")[-1]: {
                "source": spec.get("source_node_type", ""),
                "target": spec.get("target_node_type", "")
            }
            for rel, spec in schema.get("edge_types", {}).items()
        }

        # Ensure QTL_for is always included if missing
        if "QTL_for" not in relationships:
            relationships["QTL_for"] = {
                "source": "snp",
                "target": "gene"
            }

        # Define preferred lookup keys for quick name matching
        preferred_lookup = {
            "gene": ["name", "id"],
            "ontology": ["name", "id"],
            "cell_type": ["name", "id"],
            "disease": ["name", "id"],
            "snp": ["id"],
            "OCR": []
        }

        # Add brief contextual notes for special node types and relationships
        Notes = {
            "ontology": "Ontology nodes (e.g., diseases, GO terms, cell types) can be queried by 'name' or 'id'.",
            "gene": "Gene nodes correspond to Ensembl/GENCODE identifiers and may include 'id' or 'name'.",
            "snp": "SNP nodes represent variants and are primarily identified by rsID (snp.id).",
            "QTL_for": (
                "QTL_for connects SNPs to genes showing variant-expression associations. "
                "Use pattern: (s:snp)-[:QTL_for]->(g:gene). Commonly used in eQTL and fine-mapping analyses."
            )
        }

        _cached_simple = {
            "NodeLabels": list(nodes.keys()),
            "NodeProperties": nodes,
            "Relationships": relationships,
            "PreferredLookup": preferred_lookup,
            "Notes": Notes
        }

    return _cached_simple

def get_minimal_schema_for_llm() -> str:
    """Return ultra-compact schema string optimized for small models (9B with 8k context).
    
    This function drastically reduces token usage by:
    - Using compact string format instead of JSON
    - Including only critical properties (name, id for lookup)
    - Listing only filterable edge properties
    - Providing brief usage notes
    
    Returns a string consuming ~300-400 tokens vs ~2000+ for full schema.
    """
    global _cached_minimal
    if _cached_minimal is None:
        schema = get_schema()
        
        # Define which node types have which critical properties
        node_props = {
            "gene": ["name", "id"],
            "cell_type": ["name", "id"],
            "disease": ["name", "id"],
            "gene_ontology": ["name", "id"],
            "snp": ["id"],
            "OCR": []
        }
        
        # Build compact node list
        node_parts = []
        for label, spec in schema.get("node_types", {}).items():
            simple_label = label.split(";")[-1]
            props = node_props.get(simple_label, [])
            if props:
                node_parts.append(f"{simple_label}({','.join(props)})")
            else:
                node_parts.append(simple_label)
        
        # Define critical filterable properties for edges
        edge_filter_props = {
            "DEG_in": ["Log2FoldChange", "UpOrDownRegulation", "P_value", "Adjusted_P_value"],
            "expression_level_in": ["NonDiabetic__expression_mean", "Type1Diabetic__expression_mean", "All__expression_mean"],
            "QTL_for": ["pip", "slope", "nominal_p"],
            "OCR_activity": ["OCR_GeneActivityScore_mean", "type_1_diabetes__OCR_GeneActivityScore_mean"]
        }
        
        # Build compact edge list with source→target and critical properties
        edge_parts = []
        for rel, spec in schema.get("edge_types", {}).items():
            simple_rel = rel.split(";")[-1]
            source = spec.get("source_node_type", "?")
            target = spec.get("target_node_type", "?")
            
            # Add filterable properties if defined
            filter_props = edge_filter_props.get(simple_rel, [])
            if filter_props:
                edge_parts.append(f"{simple_rel}({source}→{target})[{','.join(filter_props)}]")
            else:
                edge_parts.append(f"{simple_rel}({source}→{target})")
        
        # Ensure QTL_for is included
        if not any("QTL_for" in e for e in edge_parts):
            qtl_props = edge_filter_props.get("QTL_for", [])
            edge_parts.append(f"QTL_for(snp→gene)[{','.join(qtl_props)}]")
        
        # Build the compact schema string
        nodes_str = "Nodes: " + ", ".join(node_parts)
        edges_str = "Edges: " + ", ".join(edge_parts)
        
        # Add brief usage notes
        notes = """
Notes:
- Lookup nodes: Use .name or .id (e.g., gene.name='CFTR', disease.name='type 1 diabetes')
- Filter DEG: deg.UpOrDownRegulation='up' or 'down', deg.Log2FoldChange>threshold, deg.P_value<0.05
- Filter expression: edge.NonDiabetic__expression_mean>value or edge.Type1Diabetic__expression_mean>value
- Filter QTL: qtl.pip>0.5 (posterior inclusion probability), qtl.nominal_p<threshold
- Disease name: ALWAYS use 'type 1 diabetes' (lowercase, full spelling, not T1D/Type 1 Diabetes)
- Gene/cell type: Use exact names from data (e.g., 'beta cell', 'INS', 'CFTR')"""
        
        _cached_minimal = nodes_str + "\n" + edges_str + "\n" + notes
    
    return _cached_minimal


def extract_entities_from_cypher(cypher: str) -> Dict[str, list]:
    """
    Extract node labels and relationship types from Cypher query.
    
    Args:
        cypher: The Cypher query string
        
    Returns:
        {
            'node_labels': ['gene', 'cell_type', ...],
            'relationship_types': ['DEG_in', 'regulation', ...]
        }
    """
    import re
    
    node_labels = set()
    relationship_types = set()
    
    # Extract node labels from patterns like (var:Label) or (:Label)
    node_patterns = re.findall(r'\([^)]*:(\w+)[^)]*\)', cypher)
    for label in node_patterns:
        # Handle compound labels like "ontology;gene_ontology" -> extract last part
        simple_label = label.split(';')[-1]
        node_labels.add(simple_label)
    
    # Extract relationship types from patterns like [var:Type] or [:Type]
    rel_patterns = re.findall(r'\[[^]]*:(\w+)[^]]*\]', cypher)
    for rel_type in rel_patterns:
        # Handle compound types like "interaction;regulation" -> extract last part
        simple_type = rel_type.split(';')[-1]
        relationship_types.add(simple_type)
    
    return {
        'node_labels': sorted(list(node_labels)),
        'relationship_types': sorted(list(relationship_types))
    }


def get_detailed_properties(node_labels: list, relationship_types: list) -> str:
    """
    Get detailed property information for specific entities.
    
    Args:
        node_labels: List of node labels to get properties for
        relationship_types: List of relationship types to get properties for
        
    Returns:
        Formatted string with detailed properties for the specified entities
    """
    global _property_cache
    
    # Check cache first
    cache_key = f"{sorted(node_labels)}_{sorted(relationship_types)}"
    if cache_key in _property_cache:
        return _property_cache[cache_key]
    
    schema = get_schema()
    valid_values = get_valid_property_values()
    result_lines = ["Detailed Properties for Query Entities:"]
    
    # Get node properties
    if node_labels:
        result_lines.append("\nNode Properties:")
        for label in node_labels:
            # Find matching node type in schema
            matching_key = None
            for key in schema.get("node_types", {}).keys():
                if key.split(";")[-1] == label:
                    matching_key = key
                    break
            
            if matching_key:
                node_spec = schema["node_types"][matching_key]
                properties = node_spec.get("properties", {})
                
                if properties:
                    result_lines.append(f"\n  {label}:")
                    for prop_name, prop_type in properties.items():
                        result_lines.append(f"    - {prop_name} ({prop_type})")
                        
                        # Add valid values if available
                        if valid_values and label in valid_values.get("node_properties", {}):
                            prop_values = valid_values["node_properties"][label].get(prop_name)
                            if prop_values:
                                result_lines.append(f"      Valid values: {prop_values['values']}")
                                if prop_values.get('note'):
                                    result_lines.append(f"      Note: {prop_values['note']}")
                else:
                    result_lines.append(f"\n  {label}: (no properties)")
    
    # Get relationship properties
    if relationship_types:
        result_lines.append("\nRelationship Properties:")
        for rel_type in relationship_types:
            # Find matching edge type in schema
            matching_key = None
            for key in schema.get("edge_types", {}).keys():
                if key.split(";")[-1] == rel_type:
                    matching_key = key
                    break
            
            if matching_key:
                edge_spec = schema["edge_types"][matching_key]
                properties = edge_spec.get("properties", {})
                source = edge_spec.get("source_node_type", "?")
                target = edge_spec.get("target_node_type", "?")
                
                if properties:
                    result_lines.append(f"\n  {rel_type} ({source}→{target}):")
                    for prop_name, prop_type in properties.items():
                        result_lines.append(f"    - {prop_name} ({prop_type})")
                        
                        # Add valid values if available
                        if valid_values and rel_type in valid_values.get("relationship_properties", {}):
                            prop_values = valid_values["relationship_properties"][rel_type].get(prop_name)
                            if prop_values:
                                result_lines.append(f"      Valid values: {prop_values['values']}")
                                if prop_values.get('note'):
                                    result_lines.append(f"      Note: {prop_values['note']}")
                else:
                    result_lines.append(f"\n  {rel_type} ({source}→{target}): (no properties)")
    
    result = '\n'.join(result_lines)
    
    # Cache the result
    _property_cache[cache_key] = result
    
    return result
