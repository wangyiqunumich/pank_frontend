#!/usr/bin/env python3
"""
Test script for PlannerAgent API Server
"""

import requests
import json
import time
import sys
import os

# Get server URL from command line, environment, or use default
port = 8080  # Default port

# Check for command line argument: python test_server.py 9000
if len(sys.argv) > 1:
    try:
        port = int(sys.argv[1])
    except ValueError:
        print(f"Error: Invalid port '{sys.argv[1]}'. Using default port {port}")
# Check for environment variable: PORT=9000 python test_server.py
elif "PORT" in os.environ:
    try:
        port = int(os.getenv("PORT"))
    except ValueError:
        print(f"Error: Invalid PORT environment variable. Using default port {port}")

BASE_URL = f"http://localhost:{port}"

def test_health():
    """Test health endpoint"""
    print("\n" + "="*60)
    print("Testing Health Endpoint")
    print("="*60)
    
    response = requests.get(f"{BASE_URL}/health")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
    print("✓ Health check passed")


def test_root():
    """Test root endpoint"""
    print("\n" + "="*60)
    print("Testing Root Endpoint")
    print("="*60)
    
    response = requests.get(f"{BASE_URL}/")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    assert response.status_code == 200
    print("✓ Root endpoint passed")


def test_query(question: str):
    """Test query endpoint"""
    print("\n" + "="*60)
    print(f"Testing Query: {question}")
    print("="*60)
    
    start_time = time.time()
    
    response = requests.post(
        f"{BASE_URL}/query",
        json={"question": question},
        headers={"Content-Type": "application/json"}
    )
    
    elapsed = (time.time() - start_time) * 1000
    
    print(f"Status Code: {response.status_code}")
    print(f"Client-side elapsed time: {elapsed:.2f}ms")
    
    if response.status_code == 200:
        data = response.json()
        print(f"Server processing time: {data['processing_time_ms']:.2f}ms")
        print(f"\nAnswer:\n{data['answer'][:500]}...")
        print("✓ Query successful")
    else:
        print(f"Error: {response.text}")
        print("✗ Query failed")
    
    return response.status_code == 200


def test_invalid_query():
    """Test with invalid input"""
    print("\n" + "="*60)
    print("Testing Invalid Query (empty question)")
    print("="*60)
    
    response = requests.post(
        f"{BASE_URL}/query",
        json={"question": ""},
        headers={"Content-Type": "application/json"}
    )
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    
    assert response.status_code == 400
    print("✓ Invalid query handled correctly")


def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("PlannerAgent API Server Test Suite")
    print("="*60)
    print(f"Testing server at: {BASE_URL}")
    
    try:
        # Test basic endpoints
        test_health()
        test_root()
        
        # Test valid queries
        test_queries = [
            "What is gene TP53?",
            "Find genes associated with type 1 diabetes",
            "What are the functions of gene INS?"
        ]
        
        for query in test_queries:
            test_query(query)
            time.sleep(1)  # Brief pause between queries
        
        # Test error handling
        test_invalid_query()
        
        print("\n" + "="*60)
        print("✓ All tests passed!")
        print("="*60)
        
    except requests.exceptions.ConnectionError:
        print("\n✗ Error: Could not connect to server")
        print(f"Make sure the server is running at {BASE_URL}")
        print("Start it with: python server.py")
    except Exception as e:
        print(f"\n✗ Test failed: {e}")


if __name__ == "__main__":
    main()

