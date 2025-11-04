#!/usr/bin/env python3
"""
refinement_logger.py
Logs refinement metrics for analysis and monitoring.
"""

import json
from datetime import datetime
from pathlib import Path
from typing import Dict


def log_refinement_metrics(query: str, refinement_result: Dict, log_path: str = None):
    """
    Log refinement session metrics to JSONL file.
    
    Args:
        query: The original user query
        refinement_result: Result dict from respond_with_refinement()
        log_path: Path to log file (defaults to logs/refinement_metrics.jsonl)
    """
    if log_path is None:
        log_dir = Path(__file__).parent.parent / "logs"
        log_dir.mkdir(exist_ok=True)
        log_path = log_dir / "refinement_metrics.jsonl"
    
    # Build metrics entry
    metrics = {
        "timestamp": datetime.now().isoformat(),
        "query": query,
        "best_iteration": refinement_result['iteration'],
        "final_score": refinement_result['score'],
        "total_iterations": len(refinement_result['all_attempts'])
    }
    
    # Add per-iteration details
    for attempt in refinement_result['all_attempts']:
        iteration_key = f"iteration_{attempt['iteration']}"
        metrics[iteration_key] = {
            "score": attempt['score'],
            "errors": attempt['validation']['errors'],
            "warnings": attempt['validation']['warnings']
        }
    
    # Calculate improvement
    if len(refinement_result['all_attempts']) > 1:
        first_score = refinement_result['all_attempts'][0]['score']
        metrics['improvement'] = refinement_result['score'] - first_score
    else:
        metrics['improvement'] = 0
    
    # Append to JSONL file
    with open(log_path, 'a') as f:
        f.write(json.dumps(metrics, ensure_ascii=False) + '\n')


def get_refinement_stats(log_path: str = None) -> Dict:
    """
    Analyze refinement metrics from log file.
    
    Returns summary statistics about refinement performance.
    """
    if log_path is None:
        log_path = Path(__file__).parent.parent / "logs" / "refinement_metrics.jsonl"
    
    if not Path(log_path).exists():
        return {
            "total_queries": 0,
            "message": "No refinement logs found"
        }
    
    stats = {
        "total_queries": 0,
        "avg_improvement": 0,
        "avg_final_score": 0,
        "avg_iterations": 0,
        "first_iteration_success": 0,
        "refinement_helped": 0
    }
    
    improvements = []
    final_scores = []
    iterations = []
    
    with open(log_path, 'r') as f:
        for line in f:
            if not line.strip():
                continue
            
            entry = json.loads(line)
            stats["total_queries"] += 1
            
            improvements.append(entry.get('improvement', 0))
            final_scores.append(entry['final_score'])
            iterations.append(entry['total_iterations'])
            
            if entry['best_iteration'] == 1:
                stats["first_iteration_success"] += 1
            
            if entry.get('improvement', 0) > 0:
                stats["refinement_helped"] += 1
    
    if stats["total_queries"] > 0:
        stats["avg_improvement"] = sum(improvements) / len(improvements)
        stats["avg_final_score"] = sum(final_scores) / len(final_scores)
        stats["avg_iterations"] = sum(iterations) / len(iterations)
        stats["first_iteration_success_rate"] = stats["first_iteration_success"] / stats["total_queries"]
        stats["refinement_helped_rate"] = stats["refinement_helped"] / stats["total_queries"]
    
    return stats


if __name__ == "__main__":
    # Test/demo
    stats = get_refinement_stats()
    print("Refinement Statistics:")
    print(json.dumps(stats, indent=2))

