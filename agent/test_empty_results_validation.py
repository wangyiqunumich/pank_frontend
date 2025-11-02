#!/usr/bin/env python3
"""
Test script to validate the empty results detection logic
"""

def test_empty_results_validation():
    """Test cases for detecting empty nodes and edges in results"""
    
    test_cases = [
        # (result_string, should_be_filtered, description)
        ("No results", True, "Standard 'No results' message"),
        ("", True, "Empty string"),
        ("nodes, edges\n[], []", True, "Empty nodes and edges arrays"),
        ("nodes, edges\n[],[]", True, "Empty arrays without space"),
        ("nodes, edges\n  [],  []  ", True, "Empty arrays with extra whitespace"),
        ("NODES, EDGES\n[], []", True, "Case insensitive check"),
        ("nodes, edges\n[{...}], []", False, "Has nodes data"),
        ("nodes, edges\n[], [{...}]", False, "Has edges data"),
        ("nodes, edges\n[{...}], [{...}]", False, "Has both nodes and edges"),
        ("Some other result", False, "Regular result text"),
    ]
    
    print("Testing Empty Results Validation Logic")
    print("=" * 70)
    
    passed = 0
    failed = 0
    
    for result_string, should_filter, description in test_cases:
        # Simulate the validation logic
        has_data = True
        results_value = result_string
        
        # Check if results is "No results" (case-insensitive)
        if isinstance(results_value, str) and results_value.strip().lower() == "no results":
            has_data = False
        # Also check if results is empty string
        elif isinstance(results_value, str) and not results_value.strip():
            has_data = False
        # Check for empty nodes and edges: "nodes, edges\n[], []" or "nodes, edges\n[],[]"
        elif isinstance(results_value, str):
            # Normalize whitespace and check for empty arrays pattern
            normalized = ' '.join(results_value.split())
            # Check for both "[], []" and "[][]" patterns (with or without space)
            if 'nodes, edges' in normalized.lower() and ('[], []' in normalized or '[][]' in normalized.replace(' ', '')):
                has_data = False
        
        # Determine if it should be filtered (has_data = False means filtered)
        is_filtered = not has_data
        test_passed = is_filtered == should_filter
        
        if test_passed:
            status = "✓ PASS"
            passed += 1
        else:
            status = "✗ FAIL"
            failed += 1
        
        print(f"\n{status}: {description}")
        print(f"  Input: {repr(result_string)}")
        print(f"  Expected filtered: {should_filter}, Got filtered: {is_filtered}")
    
    print("\n" + "=" * 70)
    print(f"Results: {passed} passed, {failed} failed")
    print("=" * 70)
    
    return failed == 0


if __name__ == "__main__":
    success = test_empty_results_validation()
    exit(0 if success else 1)

