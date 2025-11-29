#!/usr/bin/env python3
"""
test_refinement.py
Test script to demonstrate iterative refinement with validation.
"""

import sys
sys.path.insert(0, 'src')

from src.cypher_validator import validate_cypher, format_validation_report


def test_validator():
    """Test the validator with known good and bad queries."""
    print("=" * 70)
    print("TESTING CYPHER VALIDATOR")
    print("=" * 70)
    
    test_cases = [
        ("Good Query - Gene Regulation", """
            MATCH (g1:gene)-[reg:regulation]->(g2:gene)
            WITH collect(DISTINCT g1)+collect(DISTINCT g2) AS nodes, collect(DISTINCT reg) AS edges
            RETURN nodes, edges;
        """),
        
        ("Bad Query - Unnamed Relationships", """
            MATCH (g:gene)-[:function_annotation]->(fo:gene_ontology)-[:DEG_in]->(ct:cell_type)
            WITH collect(DISTINCT g)+collect(DISTINCT fo)+collect(DISTINCT ct) AS nodes,
                 collect(DISTINCT r1)+collect(DISTINCT r2) AS edges
            RETURN nodes, edges;
        """),
        
        ("Bad Query - Missing DISTINCT", """
            MATCH (g:gene)-[r:regulation]->(g2:gene)
            WITH collect(g)+collect(g2) AS nodes, collect(r) AS edges
            RETURN nodes, edges;
        """),
        
        ("Bad Query - Wrong Disease Name", """
            MATCH (g:gene)-[e:effector_gene_of]->(d:disease)
            WHERE d.name='T1D'
            WITH collect(DISTINCT g)+collect(DISTINCT d) AS nodes, collect(DISTINCT e) AS edges
            RETURN nodes, edges;
        """),
        
        ("Bad Query - Invalid Cell Type Value", """
            MATCH (g:gene)-[deg:DEG_in]->(ct:cell_type)
            WHERE ct.name='beta cell'
            WITH collect(DISTINCT g)+collect(DISTINCT ct) AS nodes, collect(DISTINCT deg) AS edges
            RETURN nodes, edges;
        """),
        
        ("Bad Query - Invalid Regulation Value", """
            MATCH (g:gene)-[deg:DEG_in]->(ct:cell_type)
            WHERE deg.UpOrDownRegulation='upregulated'
            WITH collect(DISTINCT g)+collect(DISTINCT ct) AS nodes, collect(DISTINCT deg) AS edges
            RETURN nodes, edges;
        """),
        
        ("Bad Query - Wrong Return Format", """
            MATCH (g:gene)-[r:regulation]->(g2:gene)
            RETURN g, g2, r;
        """),
    ]
    
    for name, query in test_cases:
        print(f"\n{'-' * 70}")
        print(f"Test: {name}")
        print(f"{'-' * 70}")
        print(f"Query:\n{query.strip()}\n")
        
        validation = validate_cypher(query)
        print(format_validation_report(validation))
        print()


def test_refinement_simulation():
    """Simulate what refinement would look like."""
    print("\n" + "=" * 70)
    print("SIMULATING REFINEMENT PROCESS")
    print("=" * 70)
    
    print("\nScenario: User asks 'Find genes with GO annotations that are DEGs in beta cells'")
    
    # Simulate iteration 1 - bad query
    print("\n" + "-" * 70)
    print("ITERATION 1: Initial Generation")
    print("-" * 70)
    
    query_v1 = """
    MATCH (g:gene)-[:function_annotation]->(fo:gene_ontology)-[:DEG_in]->(ct:cell_type)
    WHERE ct.name='beta cell'
    WITH collect(DISTINCT g)+collect(DISTINCT fo)+collect(DISTINCT ct) AS nodes,
         collect(DISTINCT r1)+collect(DISTINCT r2) AS edges
    RETURN nodes, edges;
    """
    
    print(f"Generated Query:\n{query_v1.strip()}\n")
    validation_v1 = validate_cypher(query_v1)
    print(format_validation_report(validation_v1))
    
    # Simulate iteration 2 - fixed relationships
    print("\n" + "-" * 70)
    print("ITERATION 2: After Refinement (fixing relationship variables)")
    print("-" * 70)
    
    query_v2 = """
    MATCH (g:gene)-[r1:function_annotation]->(fo:gene_ontology), (g)-[r2:DEG_in]->(ct:cell_type)
    WHERE ct.name='beta cell'
    WITH collect(DISTINCT g)+collect(DISTINCT fo)+collect(DISTINCT ct) AS nodes,
         collect(DISTINCT r1)+collect(DISTINCT r2) AS edges
    RETURN nodes, edges;
    """
    
    print(f"Generated Query:\n{query_v2.strip()}\n")
    validation_v2 = validate_cypher(query_v2)
    print(format_validation_report(validation_v2))
    
    # Summary
    print("\n" + "=" * 70)
    print("REFINEMENT SUMMARY")
    print("=" * 70)
    print(f"Iteration 1 Score: {validation_v1['score']}/100")
    print(f"Iteration 2 Score: {validation_v2['score']}/100")
    print(f"Improvement: +{validation_v2['score'] - validation_v1['score']} points")
    print(f"\nBest Query (Iteration 2) would be used for execution.")


if __name__ == "__main__":
    test_validator()
    test_refinement_simulation()
    
    print("\n" + "=" * 70)
    print("To test with actual LLM, run:")
    print("  python3 -c 'from src.text2cypher_agent import Text2CypherAgent; agent = Text2CypherAgent(); result = agent.respond_with_refinement(\"Find upregulated genes in beta cells\"); print(result)'")
    print("=" * 70)

