#!/usr/bin/env python3
"""
Test WITH clause validation - specifically for the error you reported.

This tests the custom regex-based check that catches:
  WITH DISTINCT sn, r AS nodes, edges

Without needing CyVer (which requires a Neo4j driver).
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from cypher_validator import validate_cypher, format_validation_report


def test_your_bad_query():
    """Test the exact bad query you reported"""
    print("="*70)
    print("TEST 1: Your Bad Query - WITH DISTINCT sn, r AS nodes, edges")
    print("="*70)
    
    bad_query = """
    MATCH (sn:snp)-[r:QTL_for]->(g:gene) 
    WITH DISTINCT sn, r AS nodes, edges 
    RETURN nodes, edges;
    """
    
    print("\nQuery:")
    print(bad_query.strip())
    print("\n" + "-"*70)
    
    result = validate_cypher(bad_query)
    print(format_validation_report(result))
    
    print("\n" + "="*70)
    print("Expected Errors:")
    print("  1. DISTINCT must be inside collect() functions")
    print("  2. Variables assigned to 'nodes' must use collect()")
    print("  3. Variables assigned to 'edges' must use collect()")
    print(f"\nActual Score: {result['score']}/100")
    print(f"Errors Found: {len(result['errors'])}")
    
    if result['score'] < 70:
        print("✓ PASS: Query correctly flagged as bad (score < 70)")
    else:
        print("✗ FAIL: Query should have lower score")
    
    print("="*70 + "\n")


def test_missing_collect():
    """Test missing collect() functions"""
    print("="*70)
    print("TEST 2: Missing collect() - WITH sn AS nodes, r AS edges")
    print("="*70)
    
    bad_query = """
    MATCH (sn:snp)-[r:QTL_for]->(g:gene)
    WITH sn AS nodes, r AS edges
    RETURN nodes, edges;
    """
    
    print("\nQuery:")
    print(bad_query.strip())
    print("\n" + "-"*70)
    
    result = validate_cypher(bad_query)
    print(format_validation_report(result))
    
    print("\n" + "="*70)
    print(f"Actual Score: {result['score']}/100")
    
    if result['score'] < 70:
        print("✓ PASS: Query correctly flagged as bad")
    else:
        print("✗ FAIL: Query should have lower score")
    
    print("="*70 + "\n")


def test_correct_query():
    """Test a correctly formatted query"""
    print("="*70)
    print("TEST 3: Correct Query")
    print("="*70)
    
    good_query = """
    MATCH (sn:snp)-[r:QTL_for]->(g:gene)
    WITH collect(DISTINCT sn)+collect(DISTINCT g) AS nodes, collect(DISTINCT r) AS edges
    RETURN nodes, edges;
    """
    
    print("\nQuery:")
    print(good_query.strip())
    print("\n" + "-"*70)
    
    result = validate_cypher(good_query)
    print(format_validation_report(result))
    
    print("\n" + "="*70)
    print(f"Actual Score: {result['score']}/100")
    
    if result['score'] >= 95:
        print("✓ PASS: Query correctly validated as good")
    else:
        print("✗ FAIL: Query should have high score")
    
    print("="*70 + "\n")


def test_partial_collect():
    """Test inconsistent collect usage"""
    print("="*70)
    print("TEST 4: Inconsistent collect() - only nodes has collect")
    print("="*70)
    
    bad_query = """
    MATCH (sn:snp)-[r:QTL_for]->(g:gene)
    WITH collect(DISTINCT sn) AS nodes, r AS edges
    RETURN nodes, edges;
    """
    
    print("\nQuery:")
    print(bad_query.strip())
    print("\n" + "-"*70)
    
    result = validate_cypher(bad_query)
    print(format_validation_report(result))
    
    print("\n" + "="*70)
    print(f"Actual Score: {result['score']}/100")
    
    if result['score'] < 70:
        print("✓ PASS: Query correctly flagged as bad")
    else:
        print("✗ FAIL: Query should have lower score")
    
    print("="*70 + "\n")


def main():
    print("\n" + "="*70)
    print("WITH Clause Validation Test Suite")
    print("Testing custom regex-based checks (no CyVer driver needed)")
    print("="*70 + "\n")
    
    test_your_bad_query()
    test_missing_collect()
    test_correct_query()
    test_partial_collect()
    
    print("\n" + "="*70)
    print("Test Suite Complete!")
    print("="*70)
    print("\nNote: CyVer is skipped because it requires a Neo4j driver.")
    print("The custom regex-based checks catch the same errors!")


if __name__ == "__main__":
    main()

