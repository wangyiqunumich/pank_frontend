#!/usr/bin/env python3
"""
test_value_validation.py
Test script to demonstrate property value validation against valid_property_values.json
"""

import sys
sys.path.insert(0, 'src')

from src.cypher_validator import validate_cypher, format_validation_report


def test_case(name: str, query: str, expected_issues: list):
    """Run a test case and display results."""
    print("=" * 80)
    print(f"TEST: {name}")
    print("=" * 80)
    print(f"\nQuery:\n{query.strip()}\n")
    
    validation = validate_cypher(query)
    print(format_validation_report(validation))
    
    print(f"\nExpected issues: {', '.join(expected_issues) if expected_issues else 'None'}")
    print("=" * 80 + "\n")


def main():
    print("\n" + "🔍 PROPERTY VALUE VALIDATION TESTS" + "\n")
    
    # Test 1: Valid cell type name
    test_case(
        "Valid Cell Type Name",
        """
        MATCH (g:gene)-[deg:DEG_in]->(ct:cell_type)
        WHERE ct.name='Beta Cell'
        WITH collect(DISTINCT g)+collect(DISTINCT ct) AS nodes, collect(DISTINCT deg) AS edges
        RETURN nodes, edges;
        """,
        []
    )
    
    # Test 2: Invalid cell type name (wrong case)
    test_case(
        "Invalid Cell Type Name - Wrong Case",
        """
        MATCH (g:gene)-[deg:DEG_in]->(ct:cell_type)
        WHERE ct.name='beta cell'
        WITH collect(DISTINCT g)+collect(DISTINCT ct) AS nodes, collect(DISTINCT deg) AS edges
        RETURN nodes, edges;
        """,
        ["Invalid cell_type.name value"]
    )
    
    # Test 3: Invalid cell type name (completely wrong)
    test_case(
        "Invalid Cell Type Name - Hallucinated Value",
        """
        MATCH (g:gene)-[deg:DEG_in]->(ct:cell_type)
        WHERE ct.name='Pancreatic Beta Cell'
        WITH collect(DISTINCT g)+collect(DISTINCT ct) AS nodes, collect(DISTINCT deg) AS edges
        RETURN nodes, edges;
        """,
        ["Invalid cell_type.name value"]
    )
    
    # Test 4: Valid disease name
    test_case(
        "Valid Disease Name",
        """
        MATCH (g:gene)-[r:effector_gene_of]->(d:disease)
        WHERE d.name='type 1 diabetes'
        WITH collect(DISTINCT g)+collect(DISTINCT d) AS nodes, collect(DISTINCT r) AS edges
        RETURN nodes, edges;
        """,
        []
    )
    
    # Test 5: Invalid disease name (T1D)
    test_case(
        "Invalid Disease Name - T1D Abbreviation",
        """
        MATCH (g:gene)-[r:effector_gene_of]->(d:disease)
        WHERE d.name='T1D'
        WITH collect(DISTINCT g)+collect(DISTINCT d) AS nodes, collect(DISTINCT r) AS edges
        RETURN nodes, edges;
        """,
        ["Invalid disease.name value", "Use 'type 1 diabetes' instead of 'T1D'"]
    )
    
    # Test 6: Invalid disease name (wrong case)
    test_case(
        "Invalid Disease Name - Wrong Case",
        """
        MATCH (g:gene)-[r:effector_gene_of]->(d:disease)
        WHERE d.name='Type 1 Diabetes'
        WITH collect(DISTINCT g)+collect(DISTINCT d) AS nodes, collect(DISTINCT r) AS edges
        RETURN nodes, edges;
        """,
        ["Invalid disease.name value", "Use 'type 1 diabetes' instead"]
    )
    
    # Test 7: Valid regulation value
    test_case(
        "Valid DEG Regulation Value",
        """
        MATCH (g:gene)-[deg:DEG_in]->(ct:cell_type)
        WHERE deg.UpOrDownRegulation='up'
        WITH collect(DISTINCT g)+collect(DISTINCT ct) AS nodes, collect(DISTINCT deg) AS edges
        RETURN nodes, edges;
        """,
        []
    )
    
    # Test 8: Invalid regulation value
    test_case(
        "Invalid DEG Regulation Value - Upregulated",
        """
        MATCH (g:gene)-[deg:DEG_in]->(ct:cell_type)
        WHERE deg.UpOrDownRegulation='upregulated'
        WITH collect(DISTINCT g)+collect(DISTINCT ct) AS nodes, collect(DISTINCT deg) AS edges
        RETURN nodes, edges;
        """,
        ["Invalid DEG_in.UpOrDownRegulation value"]
    )
    
    # Test 9: Multiple invalid values
    test_case(
        "Multiple Invalid Values",
        """
        MATCH (g:gene)-[deg:DEG_in]->(ct:cell_type)-[r:related_to]->(d:disease)
        WHERE ct.name='beta cell' AND d.name='T1D' AND deg.UpOrDownRegulation='UP'
        WITH collect(DISTINCT g)+collect(DISTINCT ct)+collect(DISTINCT d) AS nodes, 
             collect(DISTINCT deg)+collect(DISTINCT r) AS edges
        RETURN nodes, edges;
        """,
        ["Invalid cell_type.name", "Invalid disease.name", "Invalid DEG_in.UpOrDownRegulation"]
    )
    
    # Test 10: All valid values
    test_case(
        "All Valid Values - Perfect Query",
        """
        MATCH (g:gene)-[deg:DEG_in]->(ct:cell_type)
        WHERE ct.name='Beta Cell' AND deg.UpOrDownRegulation='up' AND deg.Log2FoldChange>2
        WITH collect(DISTINCT g)+collect(DISTINCT ct) AS nodes, collect(DISTINCT deg) AS edges
        RETURN nodes, edges;
        """,
        []
    )
    
    print("\n" + "=" * 80)
    print("✅ PROPERTY VALUE VALIDATION COMPLETE")
    print("=" * 80)
    print("\nKey Benefits:")
    print("  ✓ Catches invalid property values that would return empty results")
    print("  ✓ Provides exact valid values in error messages")
    print("  ✓ Includes helpful notes (case-sensitivity, format requirements)")
    print("  ✓ Deducts 20 points from score (critical error)")
    print("  ✓ Helps LLM fix errors during refinement")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    main()

