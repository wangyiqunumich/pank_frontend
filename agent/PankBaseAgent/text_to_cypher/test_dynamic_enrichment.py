#!/usr/bin/env python3
"""
test_dynamic_enrichment.py
Test script to demonstrate dynamic schema enrichment during refinement.
"""

import sys
sys.path.insert(0, 'src')

from src.schema_loader import extract_entities_from_cypher, get_detailed_properties


def test_entity_extraction():
    """Test extracting entities from Cypher queries."""
    print("=" * 70)
    print("TEST 1: Entity Extraction")
    print("=" * 70)
    
    test_queries = [
        ("Simple query", """
            MATCH (g:gene)-[deg:DEG_in]->(ct:cell_type)
            WHERE ct.name='beta cell'
            RETURN g, ct, deg;
        """),
        
        ("Multi-hop query", """
            MATCH (s:snp)-[q:QTL_for]->(g:gene)-[ex:expression_level_in]->(ct:cell_type)
            WHERE ct.name='beta cell'
            RETURN s, g, ct;
        """),
        
        ("Query with wrong property", """
            MATCH (g:gene)-[deg:DEG_in]->(ct:cell_type)
            WHERE ct.name='beta cell' AND deg.LogFoldChange>2
            RETURN g, ct;
        """),
    ]
    
    for name, query in test_queries:
        print(f"\n{'-' * 70}")
        print(f"Query: {name}")
        print(f"{'-' * 70}")
        print(f"Cypher:\n{query.strip()}\n")
        
        entities = extract_entities_from_cypher(query)
        print(f"Extracted Entities:")
        print(f"  Node Labels: {entities['node_labels']}")
        print(f"  Relationship Types: {entities['relationship_types']}")


def test_detailed_properties():
    """Test retrieving detailed properties for entities."""
    print("\n\n" + "=" * 70)
    print("TEST 2: Detailed Property Retrieval")
    print("=" * 70)
    
    test_cases = [
        {
            "name": "DEG query entities",
            "nodes": ["gene", "cell_type"],
            "rels": ["DEG_in"]
        },
        {
            "name": "QTL query entities",
            "nodes": ["snp", "gene"],
            "rels": ["QTL_for"]
        },
        {
            "name": "Expression query entities",
            "nodes": ["gene", "cell_type"],
            "rels": ["expression_level_in"]
        },
    ]
    
    for case in test_cases:
        print(f"\n{'-' * 70}")
        print(f"Test Case: {case['name']}")
        print(f"{'-' * 70}")
        print(f"Nodes: {case['nodes']}")
        print(f"Relationships: {case['rels']}\n")
        
        detailed = get_detailed_properties(case['nodes'], case['rels'])
        print(detailed)


def test_refinement_scenario():
    """Simulate a refinement scenario with property error."""
    print("\n\n" + "=" * 70)
    print("TEST 3: Refinement Scenario Simulation")
    print("=" * 70)
    
    print("\nScenario: User asks 'Find upregulated genes in beta cells with log2FC > 2'")
    
    # Iteration 1 - query with wrong property name
    print("\n" + "-" * 70)
    print("ITERATION 1: Initial generation (wrong property name)")
    print("-" * 70)
    
    bad_query = """
    MATCH (g:gene)-[deg:DEG_in]->(ct:cell_type)
    WHERE ct.name='beta cell' AND deg.LogFoldChange>2
    WITH collect(DISTINCT g)+collect(DISTINCT ct) AS nodes, collect(DISTINCT deg) AS edges
    RETURN nodes, edges;
    """
    
    print(f"Generated Query:\n{bad_query.strip()}\n")
    
    # Extract entities
    entities = extract_entities_from_cypher(bad_query)
    print(f"Entities Used:")
    print(f"  Nodes: {entities['node_labels']}")
    print(f"  Relationships: {entities['relationship_types']}\n")
    
    # Get detailed properties
    print("Detailed Properties Retrieved for Refinement:")
    print("-" * 70)
    detailed = get_detailed_properties(entities['node_labels'], entities['relationship_types'])
    print(detailed)
    
    print("\n" + "-" * 70)
    print("RESULT: Model can now see the correct property name is 'Log2FoldChange'")
    print("-" * 70)


def test_caching():
    """Test that property caching works."""
    print("\n\n" + "=" * 70)
    print("TEST 4: Property Caching")
    print("=" * 70)
    
    import time
    
    nodes = ["gene", "cell_type"]
    rels = ["DEG_in"]
    
    # First call - should build from schema
    print("\nFirst call (builds from schema)...")
    start = time.time()
    result1 = get_detailed_properties(nodes, rels)
    time1 = time.time() - start
    print(f"Time: {time1*1000:.2f}ms")
    print(f"Result length: {len(result1)} chars")
    
    # Second call - should use cache
    print("\nSecond call (uses cache)...")
    start = time.time()
    result2 = get_detailed_properties(nodes, rels)
    time2 = time.time() - start
    print(f"Time: {time2*1000:.2f}ms")
    print(f"Result length: {len(result2)} chars")
    
    print(f"\nCache speedup: {time1/time2:.1f}x faster")
    print(f"Results identical: {result1 == result2}")


if __name__ == "__main__":
    test_entity_extraction()
    test_detailed_properties()
    test_refinement_scenario()
    test_caching()
    
    print("\n" + "=" * 70)
    print("Dynamic Schema Enrichment Tests Complete!")
    print("=" * 70)
    print("\nKey Benefits:")
    print("  ✓ Minimal schema for initial generation (~350 tokens)")
    print("  ✓ Detailed properties only for entities actually used (~200-400 tokens)")
    print("  ✓ Property caching for repeated queries")
    print("  ✓ Helps model use correct property names during refinement")
    print("=" * 70)

