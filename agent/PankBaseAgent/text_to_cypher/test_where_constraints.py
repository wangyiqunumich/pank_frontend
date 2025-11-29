#!/usr/bin/env python3
"""
Test WHERE constraint validation.

This tests that the validator warns about unconstrained queries
that would return ALL nodes (too much data).
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from cypher_validator import validate_cypher, format_validation_report


def test_unconstrained_snp_query():
    """Test the problematic query: MATCH (sn:snp)-[r:QTL_for]->(g:gene) without WHERE"""
    print("="*70)
    print("TEST 1: Unconstrained SNP Query (returns ALL SNPs)")
    print("="*70)
    
    bad_query = """
    MATCH (sn:snp)-[r:QTL_for]->(g:gene)
    WITH collect(DISTINCT sn)+collect(DISTINCT g) AS nodes, collect(DISTINCT r) AS edges
    RETURN nodes, edges;
    """
    
    print("\nQuery:")
    print(bad_query.strip())
    print("\n" + "-"*70)
    
    result = validate_cypher(bad_query)
    print(format_validation_report(result))
    
    print("\n" + "="*70)
    print("Expected: Warning about missing WHERE constraint")
    print(f"Actual Score: {result['score']}/100")
    print(f"Warnings: {len(result['warnings'])}")
    
    has_where_warning = any('WHERE' in w for w in result['warnings'])
    if has_where_warning:
        print("✓ PASS: Query correctly flagged as needing WHERE constraint")
    else:
        print("✗ FAIL: Should warn about missing WHERE")
    
    print("="*70 + "\n")


def test_constrained_snp_query():
    """Test a good query with WHERE constraint"""
    print("="*70)
    print("TEST 2: Constrained SNP Query (filters by gene name)")
    print("="*70)
    
    good_query = """
    MATCH (sn:snp)-[r:QTL_for]->(g:gene)
    WHERE g.name = 'CFTR'
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
    
    has_where_warning = any('WHERE' in w for w in result['warnings'])
    if not has_where_warning and result['score'] >= 95:
        print("✓ PASS: Query correctly validated with WHERE constraint")
    else:
        print("✗ FAIL: Should pass without WHERE warning")
    
    print("="*70 + "\n")


def test_unconstrained_gene_query():
    """Test unconstrained gene query"""
    print("="*70)
    print("TEST 3: Unconstrained Gene Query (returns ALL genes)")
    print("="*70)
    
    bad_query = """
    MATCH (g:gene)
    WITH collect(DISTINCT g) AS nodes, [] AS edges
    RETURN nodes, edges;
    """
    
    print("\nQuery:")
    print(bad_query.strip())
    print("\n" + "-"*70)
    
    result = validate_cypher(bad_query)
    print(format_validation_report(result))
    
    print("\n" + "="*70)
    print(f"Actual Score: {result['score']}/100")
    
    has_where_warning = any('WHERE' in w for w in result['warnings'])
    if has_where_warning:
        print("✓ PASS: Query correctly flagged as needing WHERE constraint")
    else:
        print("✗ FAIL: Should warn about missing WHERE")
    
    print("="*70 + "\n")


def test_constrained_gene_query():
    """Test a good query with WHERE constraint by name"""
    print("="*70)
    print("TEST 4: Constrained Gene Query (filters by name)")
    print("="*70)
    
    good_query = """
    MATCH (g:gene)
    WHERE g.name = 'CFTR'
    WITH collect(DISTINCT g) AS nodes, [] AS edges
    RETURN nodes, edges;
    """
    
    print("\nQuery:")
    print(good_query.strip())
    print("\n" + "-"*70)
    
    result = validate_cypher(good_query)
    print(format_validation_report(result))
    
    print("\n" + "="*70)
    print(f"Actual Score: {result['score']}/100")
    
    has_where_warning = any('WHERE' in w for w in result['warnings'])
    if not has_where_warning and result['score'] >= 95:
        print("✓ PASS: Query correctly validated with WHERE constraint")
    else:
        print("✗ FAIL: Should pass without WHERE warning")
    
    print("="*70 + "\n")


def test_complex_where_query():
    """Test query with multiple WHERE conditions"""
    print("="*70)
    print("TEST 5: Complex WHERE Query (multiple conditions)")
    print("="*70)
    
    good_query = """
    MATCH (g:gene)-[deg:DEG_in]->(ct:cell_type)
    WHERE ct.name = 'Beta Cell' AND deg.UpOrDownRegulation = 'up'
    WITH collect(DISTINCT g)+collect(DISTINCT ct) AS nodes, collect(DISTINCT deg) AS edges
    RETURN nodes, edges;
    """
    
    print("\nQuery:")
    print(good_query.strip())
    print("\n" + "-"*70)
    
    result = validate_cypher(good_query)
    print(format_validation_report(result))
    
    print("\n" + "="*70)
    print(f"Actual Score: {result['score']}/100")
    
    has_where_warning = any('WHERE' in w for w in result['warnings'])
    if not has_where_warning and result['score'] >= 95:
        print("✓ PASS: Query correctly validated with complex WHERE")
    else:
        print("✗ FAIL: Should pass without WHERE warning")
    
    print("="*70 + "\n")


def main():
    print("\n" + "="*70)
    print("WHERE Constraint Validation Test Suite")
    print("="*70 + "\n")
    
    test_unconstrained_snp_query()
    test_constrained_snp_query()
    test_unconstrained_gene_query()
    test_constrained_gene_query()
    test_complex_where_query()
    
    print("\n" + "="*70)
    print("Test Suite Complete!")
    print("="*70)
    print("\nSummary:")
    print("- Unconstrained queries (no WHERE) should get warnings")
    print("- Constrained queries (with WHERE) should pass with high scores")


if __name__ == "__main__":
    main()

