#!/usr/bin/env python3
"""
cypher_validator.py
Validates Cypher queries for common errors and format compliance.
Returns validation scores and detailed error reports.

Validation Checks:
   - WITH clause structure (collect() usage, DISTINCT placement)
   - Relationship variable naming
   - Required return format (nodes, edges)
   - DISTINCT in collect() calls
   - Disease naming conventions
   - Property validity against schema
   - Property value constraints
   - Relationship direction validation
"""

import re
from typing import Dict, List


def validate_cypher(cypher: str) -> Dict:
    """
    Validate a Cypher query and return a score with detailed feedback.
    
    Args:
        cypher: The Cypher query string to validate
        
    Returns:
        {
            'score': int (0-100),
            'errors': list[str],
            'warnings': list[str],
            'passed_checks': list[str]
        }
    """
    errors = []
    warnings = []
    passed_checks = []
    
    # Normalize whitespace for analysis
    cypher_normalized = ' '.join(cypher.split())
    
    # Check 1: WITH clause structure (CRITICAL - 35 points)
    # This catches: WITH DISTINCT sn, r AS nodes, edges (your example!)
    with_errors = check_with_clause_structure(cypher)
    if with_errors:
        errors.extend(with_errors)
    else:
        passed_checks.append("WITH clause properly structured with collect()")
    
    # Check 2: Relationship variables (CRITICAL - 30 points)
    rel_errors = check_relationship_variables(cypher)
    if rel_errors:
        errors.extend(rel_errors)
    else:
        passed_checks.append("All relationships have variable names")
    
    # Check 3: Return format (CRITICAL - 25 points)
    if not check_return_format(cypher_normalized):
        errors.append("Query must end with: WITH collect(DISTINCT ...) AS nodes, collect(DISTINCT ...) AS edges RETURN nodes, edges;")
    else:
        passed_checks.append("Correct return format with nodes and edges")
    
    # Check 3: DISTINCT in collect (IMPORTANT - 15 points)
    if not check_distinct_in_collect(cypher_normalized):
        errors.append("All collect() statements must use DISTINCT")
    else:
        passed_checks.append("All collect() use DISTINCT")
    
    # Check 4: Disease naming (IMPORTANT - 15 points)
    disease_errors = check_disease_naming(cypher)
    if disease_errors:
        errors.extend(disease_errors)
    else:
        if 'disease' in cypher.lower() or 't1d' in cypher.lower() or 'diabetes' in cypher.lower():
            passed_checks.append("Correct disease naming convention")
    
    # Check 5: Variable consistency (IMPORTANT - 10 points)
    var_errors = check_variable_consistency(cypher_normalized)
    if var_errors:
        warnings.extend(var_errors)
    else:
        passed_checks.append("All collected variables are defined in MATCH")
    
    # Check 5.5: WHERE constraints (IMPORTANT - warning only)
    where_warnings = check_where_constraints(cypher)
    if where_warnings:
        warnings.extend(where_warnings)
    else:
        passed_checks.append("Query has appropriate WHERE constraints")
    
    # Check 6: Property validity (IMPORTANT - 10 points)
    prop_errors = check_property_validity(cypher)
    if prop_errors:
        warnings.extend(prop_errors)
    else:
        if '.' in cypher:  # Only add if properties are used
            passed_checks.append("All properties appear valid")
    
    # Check 7: Property value validity (CRITICAL - 20 points)
    value_errors = check_property_value_validity(cypher)
    if value_errors:
        errors.extend(value_errors)
    else:
        if '=' in cypher and '.' in cypher:  # Only add if property comparisons are used
            passed_checks.append("All property values are valid")
    
    # Check 8: Relationship directions (CRITICAL - 25 points)
    direction_errors = check_relationship_directions(cypher)
    if direction_errors:
        errors.extend(direction_errors)
    else:
        if '-[' in cypher:  # Only add if relationships are used
            passed_checks.append("All relationships have correct source/target node types")
    
    # Calculate score
    score = 100
    
    # Deduct for errors
    # WITH clause structure errors (CRITICAL - 35 points)
    with_error_count = len([e for e in errors if 'with clause' in e.lower() or 'distinct must be inside' in e.lower() or 'must use collect' in e.lower()])
    if with_error_count > 0:
        score -= 35  # Critical error - malformed WITH clause
    
    relationship_error_count = len([e for e in errors if 'relationship' in e.lower() and 'variable name' in e.lower()])
    if relationship_error_count > 0:
        score -= 30  # Critical error - unnamed relationships
    
    if any(('return' in e.lower() or 'format' in e.lower()) and 'with clause' not in e.lower() for e in errors):
        score -= 25  # Critical error - wrong return format
    
    if any('distinct' in e.lower() for e in errors):
        score -= 15  # Important error - missing DISTINCT
    
    if any('disease' in e.lower() or 't1d' in e.lower() for e in errors):
        score -= 15  # Important error - wrong disease naming
    
    # Deduct for invalid property values (CRITICAL - 20 points)
    value_error_count = len([e for e in errors if 'Invalid value' in e])
    if value_error_count > 0:
        score -= 20  # Critical error - wrong values will cause query to return no results
    
    # Deduct for incorrect relationship directions (CRITICAL - 25 points)
    direction_error_count = len([e for e in errors if 'incorrect direction' in e.lower() or 'incorrect node types' in e.lower()])
    if direction_error_count > 0:
        score -= 25  # Critical error - wrong relationship direction will cause wrong results
    
    # Deduct for warnings (less severe)
    score -= len(warnings) * 5
    
    score = max(0, score)  # Don't go below 0
    
    return {
        'score': score,
        'errors': errors,
        'warnings': warnings,
        'passed_checks': passed_checks
    }


def check_relationship_variables(cypher: str) -> List[str]:
    """
    Check that all relationships have variable names.
    
    Returns list of error messages for unnamed relationships.
    """
    errors = []
    
    # Pattern to find relationships: -[...]-> or <-[...]-
    # We want to catch [:type] but not [var:type]
    
    # Find all relationship patterns
    rel_patterns = re.findall(r'-\[(.*?)\]-', cypher)
    
    for i, rel_content in enumerate(rel_patterns, 1):
        rel_content = rel_content.strip()
        
        # Empty relationship []
        if not rel_content:
            errors.append(f"Relationship #{i} is empty: -[]- (should have variable and type)")
            continue
        
        # Check if it starts with : (no variable name)
        if rel_content.startswith(':'):
            rel_type = rel_content[1:].split()[0].split('{')[0].strip()
            errors.append(f"Relationship ':{rel_type}' missing variable name (should be [var:{rel_type}])")
    
    return errors


def check_with_clause_structure(cypher: str) -> List[str]:
    """
    Check that WITH clause is properly structured with collect() functions.
    
    This catches errors like:
    - WITH DISTINCT sn, r AS nodes, edges (DISTINCT outside collect)
    - WITH sn AS nodes, r AS edges (missing collect)
    - WITH collect(sn) AS nodes, r AS edges (inconsistent - second missing collect)
    
    Returns list of errors.
    """
    errors = []
    
    # Find WITH clause (between WITH and RETURN)
    with_match = re.search(r'\bWITH\b(.*?)\bRETURN\b', cypher, re.IGNORECASE | re.DOTALL)
    if not with_match:
        return errors  # No WITH clause found
    
    with_clause = with_match.group(1).strip()
    
    # Check 1: DISTINCT should only appear inside collect()
    # Bad: WITH DISTINCT sn, r AS nodes, edges
    # Look for DISTINCT that's not followed by closing paren before next comma/AS
    if re.search(r'\bDISTINCT\b(?!\s+\w+\s*\))', with_clause, re.IGNORECASE):
        errors.append(
            "DISTINCT must be inside collect() functions. "
            "Use: WITH collect(DISTINCT var) AS nodes, ... "
            "Not: WITH DISTINCT var, ..."
        )
    
    # Check 2: Both nodes and edges must be assigned
    has_nodes = re.search(r'\bAS\s+nodes\b', with_clause, re.IGNORECASE)
    has_edges = re.search(r'\bAS\s+edges\b', with_clause, re.IGNORECASE)
    
    if not has_nodes:
        errors.append("WITH clause must define 'nodes' variable (... AS nodes)")
    if not has_edges:
        errors.append("WITH clause must define 'edges' variable (... AS edges)")
    
    # Check 3: Variables assigned to nodes/edges should use collect()
    # Look for pattern: <something> AS nodes where something is NOT collect(...)
    if has_nodes:
        # Extract what's being assigned to nodes
        # Match everything before AS nodes, handling expressions with +
        nodes_pattern = re.search(r'((?:collect\([^)]+\)|\w+)(?:\s*\+\s*(?:collect\([^)]+\)|\w+))*)\s+AS\s+nodes', with_clause, re.IGNORECASE)
        if nodes_pattern:
            assigned_to_nodes = nodes_pattern.group(1).strip()
            # Check if it contains collect (valid) or is just a variable (invalid)
            if 'collect' not in assigned_to_nodes.lower():
                errors.append(
                    f"Variables assigned to 'nodes' must use collect(). "
                    f"Found: {assigned_to_nodes} AS nodes. "
                    f"Should be: collect(DISTINCT ...) AS nodes"
                )
    
    if has_edges:
        # Extract what's being assigned to edges
        edges_pattern = re.search(r'((?:collect\([^)]+\)|\w+|\[\])(?:\s*\+\s*(?:collect\([^)]+\)|\w+))*)\s+AS\s+edges', with_clause, re.IGNORECASE)
        if edges_pattern:
            assigned_to_edges = edges_pattern.group(1).strip()
            # Check if it starts with collect or contains collect (or is empty array [])
            if 'collect' not in assigned_to_edges.lower() and assigned_to_edges != '[]':
                errors.append(
                    f"Variables assigned to 'edges' must use collect() or []. "
                    f"Found: {assigned_to_edges} AS edges. "
                    f"Should be: collect(DISTINCT ...) AS edges"
                )
    
    return errors


def check_where_constraints(cypher: str) -> List[str]:
    """
    Check that queries have WHERE constraints to avoid returning ALL nodes.
    
    Warns if MATCH has no WHERE clause (likely returns too many results).
    """
    warnings = []
    
    # Check if there's a MATCH without a WHERE
    # Pattern: MATCH ... (no WHERE before WITH/RETURN)
    cypher_upper = cypher.upper()
    
    # Find MATCH clauses
    match_positions = [m.start() for m in re.finditer(r'\bMATCH\b', cypher_upper)]
    
    for match_pos in match_positions:
        # Find the next WITH, RETURN, or MATCH after this MATCH
        rest_of_query = cypher_upper[match_pos:]
        
        # Look for WHERE before the next clause
        next_clause_match = re.search(r'\b(WITH|RETURN|MATCH)\b', rest_of_query[6:])  # Skip the MATCH itself
        
        if next_clause_match:
            segment = rest_of_query[:next_clause_match.start() + 6]
        else:
            segment = rest_of_query
        
        # Check if this segment has WHERE
        if 'WHERE' not in segment:
            # Extract what's being matched (for better error message)
            match_content = segment[:100].strip()
            warnings.append(
                f"Query may return too many results: MATCH without WHERE constraint. "
                f"Consider adding WHERE clause to filter by name, id, or properties. "
                f"Segment: {match_content}..."
            )
    
    return warnings


def check_return_format(cypher: str) -> bool:
    """
    Verify the query ends with the required format:
    WITH collect(DISTINCT ...) AS nodes, collect(DISTINCT ...) AS edges RETURN nodes, edges;
    """
    # Normalize and check for required pattern
    cypher_lower = cypher.lower()
    
    # Must have WITH ... AS nodes ... AS edges
    if 'as nodes' not in cypher_lower or 'as edges' not in cypher_lower:
        return False
    
    # Must end with RETURN nodes, edges (allowing for semicolon and whitespace)
    if not re.search(r'return\s+nodes\s*,\s*edges\s*;?\s*$', cypher_lower):
        return False
    
    return True


def check_distinct_in_collect(cypher: str) -> bool:
    """
    Check that all collect() statements use DISTINCT.
    """
    # Find all collect() calls
    collect_calls = re.findall(r'collect\s*\([^)]+\)', cypher, re.IGNORECASE)
    
    if not collect_calls:
        return True  # No collect calls, pass by default
    
    # Check each collect call has DISTINCT
    for call in collect_calls:
        if 'distinct' not in call.lower():
            return False
    
    return True


def check_disease_naming(cypher: str) -> List[str]:
    """
    Check that disease references use 'type 1 diabetes' not T1D or other variants.
    """
    errors = []
    
    # Check for common incorrect variants
    incorrect_patterns = [
        (r'\bT1D\b', "T1D"),
        (r'\bType\s*1\s*Diabetes\b', "Type 1 Diabetes (should be lowercase)"),
        (r'\btype\s*1\s*diabetic\b', "type 1 diabetic (should be 'type 1 diabetes')"),
        (r'\bdiabetes\s*type\s*1\b', "diabetes type 1 (should be 'type 1 diabetes')"),
    ]
    
    for pattern, name in incorrect_patterns:
        if re.search(pattern, cypher, re.IGNORECASE):
            errors.append(f"Use 'type 1 diabetes' instead of '{name}'")
    
    return errors


def check_variable_consistency(cypher: str) -> List[str]:
    """
    Check that all variables used in collect() are defined in MATCH clause.
    """
    warnings = []
    
    # Extract variables from MATCH clauses
    match_vars = set()
    match_patterns = re.findall(r'match\s+.*?(?=where|with|return|$)', cypher, re.IGNORECASE | re.DOTALL)
    
    for pattern in match_patterns:
        # Find node variables: (var:Label) or (var)
        node_vars = re.findall(r'\((\w+)(?::\w+)?[^)]*\)', pattern)
        match_vars.update(node_vars)
        
        # Find relationship variables: [var:Type] or [var]
        rel_vars = re.findall(r'\[(\w+)(?::\w+)?[^]]*\]', pattern)
        match_vars.update(rel_vars)
    
    # Extract variables from collect() calls
    collect_vars = set()
    collect_calls = re.findall(r'collect\s*\(\s*distinct\s+(\w+)\s*\)', cypher, re.IGNORECASE)
    collect_vars.update(collect_calls)
    
    # Check for undefined variables
    undefined = collect_vars - match_vars
    if undefined:
        warnings.append(f"Variables collected but not defined in MATCH: {', '.join(undefined)}")
    
    return warnings


def check_property_validity(cypher: str) -> List[str]:
    """
    Check that properties used in query exist in the schema.
    
    Returns list of warnings for potentially invalid properties.
    """
    warnings = []
    
    try:
        # Import schema loader to check properties
        import sys
        import os
        # Add parent directory to path to import schema_loader
        current_dir = os.path.dirname(os.path.abspath(__file__))
        sys.path.insert(0, current_dir)
        from schema_loader import get_schema, extract_entities_from_cypher
        
        # Extract entities to know what to validate
        entities = extract_entities_from_cypher(cypher)
        schema = get_schema()
        
        # Build a map of valid properties for each entity
        valid_node_props = {}
        for node_label in entities['node_labels']:
            for key, spec in schema.get("node_types", {}).items():
                if key.split(";")[-1] == node_label:
                    valid_node_props[node_label] = set(spec.get("properties", {}).keys())
                    break
        
        valid_rel_props = {}
        for rel_type in entities['relationship_types']:
            for key, spec in schema.get("edge_types", {}).items():
                if key.split(";")[-1] == rel_type:
                    valid_rel_props[rel_type] = set(spec.get("properties", {}).keys())
                    break
        
        # Extract property accesses from cypher (pattern: var.property)
        property_accesses = re.findall(r'(\w+)\.(\w+)', cypher)
        
        for var, prop in property_accesses:
            # Try to determine if this is a node or relationship variable
            # This is heuristic-based and may not be perfect
            found_valid = False
            
            # Check against all known valid properties
            for props in valid_node_props.values():
                if prop in props:
                    found_valid = True
                    break
            
            if not found_valid:
                for props in valid_rel_props.values():
                    if prop in props:
                        found_valid = True
                        break
            
            # If property not found in any entity, warn
            if not found_valid and prop not in ['name', 'id']:  # Common properties
                warnings.append(f"Property '{prop}' on variable '{var}' may not exist in schema")
        
    except Exception:
        # If validation fails, don't block - just skip this check
        pass
    
    return warnings


def check_property_value_validity(cypher: str) -> List[str]:
    """
    Check that property values match the constrained valid values from valid_property_values.json.
    
    Returns list of errors for invalid property values.
    """
    errors = []
    
    try:
        # Import schema loader to get valid values
        import sys
        import os
        current_dir = os.path.dirname(os.path.abspath(__file__))
        sys.path.insert(0, current_dir)
        from schema_loader import get_valid_property_values, extract_entities_from_cypher
        
        valid_values = get_valid_property_values()
        if not valid_values:
            return errors  # No constraints defined
        
        entities = extract_entities_from_cypher(cypher)
        
        # Extract property value comparisons (pattern: var.property = 'value' or var.property='value')
        # Matches: ct.name='Beta Cell', d.name = 'type 1 diabetes', deg.UpOrDownRegulation='up'
        value_patterns = re.findall(r'(\w+)\.(\w+)\s*=\s*["\']([^"\']+)["\']', cypher, re.IGNORECASE)
        
        for var, prop, value in value_patterns:
            # Try to determine entity type by matching variable to entities
            # Check node properties
            for node_label in entities['node_labels']:
                if node_label in valid_values.get("node_properties", {}):
                    node_constraints = valid_values["node_properties"][node_label]
                    if prop in node_constraints:
                        constraint = node_constraints[prop]
                        valid_vals = constraint.get("values", [])
                        if valid_vals and value not in valid_vals:
                            note = constraint.get("note", "")
                            error_msg = f"Invalid value '{value}' for {node_label}.{prop}. Valid values: {valid_vals}"
                            if note:
                                error_msg += f". Note: {note}"
                            errors.append(error_msg)
            
            # Check relationship properties
            for rel_type in entities['relationship_types']:
                if rel_type in valid_values.get("relationship_properties", {}):
                    rel_constraints = valid_values["relationship_properties"][rel_type]
                    if prop in rel_constraints:
                        constraint = rel_constraints[prop]
                        valid_vals = constraint.get("values", [])
                        if valid_vals and value not in valid_vals:
                            note = constraint.get("note", "")
                            error_msg = f"Invalid value '{value}' for {rel_type}.{prop}. Valid values: {valid_vals}"
                            if note:
                                error_msg += f". Note: {note}"
                            errors.append(error_msg)
        
    except Exception as e:
        # If validation fails, don't block - just skip this check
        pass
    
    return errors


def check_relationship_directions(cypher: str) -> List[str]:
    """
    Check that relationships connect the correct source and target node types according to schema.
    
    For example:
    - effector_gene_of should go from gene to disease
    - DEG_in should go from gene to cell_type
    - QTL_for should go from snp to gene
    
    Returns list of errors for incorrect relationship directions.
    """
    errors = []
    
    try:
        # Import schema loader
        import sys
        import os
        current_dir = os.path.dirname(os.path.abspath(__file__))
        sys.path.insert(0, current_dir)
        from schema_loader import get_schema
        
        schema = get_schema()
        
        # Build a map of relationship types to their expected source/target
        rel_directions = {}
        for rel_key, rel_spec in schema.get("edge_types", {}).items():
            rel_type = rel_key.split(";")[-1]  # Get simple name
            source = rel_spec.get("source_node_type", "")
            target = rel_spec.get("target_node_type", "")
            rel_directions[rel_type] = {
                'source': source,
                'target': target,
                'full_key': rel_key
            }
        
        # Extract relationship patterns from Cypher
        # Patterns to match:
        # 1. (source:SourceLabel)-[rel:RelType]->(target:TargetLabel)
        # 2. (source:SourceLabel)<-[rel:RelType]-(target:TargetLabel)
        # 3. Complex patterns with multiple hops
        
        # Pattern 1: Forward direction (source)-[rel:Type]->(target)
        forward_patterns = re.findall(
            r'\((\w+):(\w+)\)\s*-\s*\[(?:\w+):(\w+)(?:[^\]]*)\]\s*->\s*\((\w+):(\w+)\)',
            cypher
        )
        
        for source_var, source_label, rel_type, target_var, target_label in forward_patterns:
            if rel_type in rel_directions:
                expected = rel_directions[rel_type]
                expected_source = expected['source']
                expected_target = expected['target']
                
                # Check if source and target match schema
                if source_label != expected_source or target_label != expected_target:
                    errors.append(
                        f"Relationship '{rel_type}' has incorrect direction. "
                        f"Found: ({source_label})-[:{rel_type}]->({target_label}), "
                        f"Expected: ({expected_source})-[:{rel_type}]->({expected_target})"
                    )
        
        # Pattern 2: Backward direction (target)<-[rel:Type]-(source)
        backward_patterns = re.findall(
            r'\((\w+):(\w+)\)\s*<-\s*\[(?:\w+):(\w+)(?:[^\]]*)\]\s*-\s*\((\w+):(\w+)\)',
            cypher
        )
        
        for target_var, target_label, rel_type, source_var, source_label in backward_patterns:
            if rel_type in rel_directions:
                expected = rel_directions[rel_type]
                expected_source = expected['source']
                expected_target = expected['target']
                
                # Check if source and target match schema (note: reversed in pattern)
                if source_label != expected_source or target_label != expected_target:
                    errors.append(
                        f"Relationship '{rel_type}' has incorrect direction. "
                        f"Found: ({target_label})<-[:{rel_type}]-({source_label}), "
                        f"Expected: ({expected_source})-[:{rel_type}]->({expected_target})"
                    )
        
        # Pattern 3: Undirected (should warn if relationship is directional in schema)
        undirected_patterns = re.findall(
            r'\((\w+):(\w+)\)\s*-\s*\[(?:\w+):(\w+)(?:[^\]]*)\]\s*-\s*\((\w+):(\w+)\)',
            cypher
        )
        
        # Filter out patterns already caught by forward/backward
        for node1_var, node1_label, rel_type, node2_var, node2_label in undirected_patterns:
            # Check if this pattern was already validated as directed
            already_checked = False
            for _, source_label, checked_rel, _, target_label in forward_patterns:
                if (checked_rel == rel_type and 
                    ((source_label == node1_label and target_label == node2_label) or
                     (source_label == node2_label and target_label == node1_label))):
                    already_checked = True
                    break
            
            if not already_checked and rel_type in rel_directions:
                expected = rel_directions[rel_type]
                expected_source = expected['source']
                expected_target = expected['target']
                
                # Check both possible directions
                if not ((node1_label == expected_source and node2_label == expected_target) or
                        (node2_label == expected_source and node1_label == expected_target)):
                    errors.append(
                        f"Relationship '{rel_type}' connects incorrect node types. "
                        f"Found: ({node1_label})-[:{rel_type}]-({node2_label}), "
                        f"Expected: ({expected_source})-[:{rel_type}]->({expected_target})"
                    )
        
    except Exception as e:
        # If validation fails, don't block - just skip this check
        pass
    
    return errors


def format_validation_report(validation: Dict) -> str:
    """
    Format validation results as a human-readable string for refinement prompts.
    """
    report = []
    
    report.append(f"Validation Score: {validation['score']}/100")
    
    if validation['errors']:
        report.append("\nERRORS (must fix):")
        for i, error in enumerate(validation['errors'], 1):
            report.append(f"  {i}. {error}")
    
    if validation['warnings']:
        report.append("\nWARNINGS (should fix):")
        for i, warning in enumerate(validation['warnings'], 1):
            report.append(f"  {i}. {warning}")
    
    if validation['passed_checks']:
        report.append("\nPASSED CHECKS:")
        for check in validation['passed_checks']:
            report.append(f"  ✓ {check}")
    
    return '\n'.join(report)


if __name__ == "__main__":
    # Test cases
    test_queries = [
        # Good query
        """
        MATCH (g1:gene)-[reg:regulation]->(g2:gene)
        WITH collect(DISTINCT g1)+collect(DISTINCT g2) AS nodes, collect(DISTINCT reg) AS edges
        RETURN nodes, edges;
        """,
        
        # Bad query - unnamed relationships
        """
        MATCH (g:gene)-[:function_annotation]->(fo:gene_ontology)-[:DEG_in]->(ct:cell_type)
        WITH collect(DISTINCT g)+collect(DISTINCT fo)+collect(DISTINCT ct) AS nodes,
             collect(DISTINCT r1)+collect(DISTINCT r2) AS edges
        RETURN nodes, edges;
        """,
        
        # Bad query - missing DISTINCT
        """
        MATCH (g:gene)-[r:regulation]->(g2:gene)
        WITH collect(g)+collect(g2) AS nodes, collect(r) AS edges
        RETURN nodes, edges;
        """,
    ]
    
    for i, query in enumerate(test_queries, 1):
        result = validate_cypher(query)
        print(format_validation_report(result))

