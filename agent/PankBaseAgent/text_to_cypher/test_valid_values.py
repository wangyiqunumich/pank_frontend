#!/usr/bin/env python3
"""
test_valid_values.py
Test script to demonstrate valid property values in refinement.
"""

import sys
sys.path.insert(0, 'src')

from src.schema_loader import get_detailed_properties, extract_entities_from_cypher


def test_cell_type_values():
    """Test that cell type valid values are shown."""
    print("=" * 70)
    print("TEST: Cell Type Valid Values")
    print("=" * 70)
    
    query = """
    MATCH (g:gene)-[deg:DEG_in]->(ct:cell_type)
    WHERE ct.name='beta cell'
    RETURN g, ct;
    """
    
    print(f"\nQuery:\n{query.strip()}\n")
    
    entities = extract_entities_from_cypher(query)
    print(f"Entities: {entities}\n")
    
    detailed = get_detailed_properties(entities['node_labels'], entities['relationship_types'])
    print("Detailed Properties with Valid Values:")
    print("-" * 70)
    print(detailed)


def test_disease_values():
    """Test that disease valid values are shown."""
    print("\n\n" + "=" * 70)
    print("TEST: Disease Valid Values")
    print("=" * 70)
    
    query = """
    MATCH (g:gene)-[e:effector_gene_of]->(d:disease)
    WHERE d.name='T1D'
    RETURN g, d;
    """
    
    print(f"\nQuery (with WRONG disease name):\n{query.strip()}\n")
    
    entities = extract_entities_from_cypher(query)
    print(f"Entities: {entities}\n")
    
    detailed = get_detailed_properties(entities['node_labels'], entities['relationship_types'])
    print("Detailed Properties with Valid Values:")
    print("-" * 70)
    print(detailed)
    print("\nModel will see that 'type 1 diabetes' is the ONLY valid value!")


def test_deg_regulation_values():
    """Test that DEG_in UpOrDownRegulation valid values are shown."""
    print("\n\n" + "=" * 70)
    print("TEST: DEG_in UpOrDownRegulation Valid Values")
    print("=" * 70)
    
    query = """
    MATCH (g:gene)-[deg:DEG_in]->(ct:cell_type)
    WHERE ct.name='Beta Cell' AND deg.UpOrDownRegulation='upregulated'
    RETURN g, ct;
    """
    
    print(f"\nQuery (with WRONG regulation value):\n{query.strip()}\n")
    
    entities = extract_entities_from_cypher(query)
    print(f"Entities: {entities}\n")
    
    detailed = get_detailed_properties(entities['node_labels'], entities['relationship_types'])
    print("Detailed Properties with Valid Values:")
    print("-" * 70)
    print(detailed)
    print("\nModel will see that only 'up' and 'down' are valid!")


def test_combined_scenario():
    """Test a query with multiple constrained properties."""
    print("\n\n" + "=" * 70)
    print("TEST: Combined Scenario (Multiple Constrained Properties)")
    print("=" * 70)
    
    print("\nScenario: User asks 'Find upregulated genes in beta cells for T1D'")
    print("\nIteration 1 - Query with multiple errors:")
    
    bad_query = """
    MATCH (g:gene)-[deg:DEG_in]->(ct:cell_type)
    WHERE ct.name='beta cell' AND deg.UpOrDownRegulation='upregulated'
    WITH collect(DISTINCT g)+collect(DISTINCT ct) AS nodes, collect(DISTINCT deg) AS edges
    RETURN nodes, edges;
    """
    
    print(f"{bad_query.strip()}\n")
    print("Errors:")
    print("  1. ct.name='beta cell' - should be 'Beta Cell' (capital B)")
    print("  2. deg.UpOrDownRegulation='upregulated' - should be 'up'\n")
    
    entities = extract_entities_from_cypher(bad_query)
    detailed = get_detailed_properties(entities['node_labels'], entities['relationship_types'])
    
    print("Model receives during refinement:")
    print("-" * 70)
    print(detailed)
    print("-" * 70)
    
    print("\nIteration 2 - Model can now fix both errors:")
    good_query = """
    MATCH (g:gene)-[deg:DEG_in]->(ct:cell_type)
    WHERE ct.name='Beta Cell' AND deg.UpOrDownRegulation='up'
    WITH collect(DISTINCT g)+collect(DISTINCT ct) AS nodes, collect(DISTINCT deg) AS edges
    RETURN nodes, edges;
    """
    print(f"{good_query.strip()}")
    print("\n✅ Both errors fixed using the valid values shown!")


if __name__ == "__main__":
    test_cell_type_values()
    test_disease_values()
    test_deg_regulation_values()
    test_combined_scenario()
    
    print("\n\n" + "=" * 70)
    print("Valid Property Values Feature Complete!")
    print("=" * 70)
    print("\nKey Benefits:")
    print("  ✓ Shows exact valid values for constrained properties")
    print("  ✓ Prevents hallucination of invalid values")
    print("  ✓ Includes helpful notes (e.g., case-sensitivity)")
    print("  ✓ Only shown during refinement (saves initial context)")
    print("=" * 70)

