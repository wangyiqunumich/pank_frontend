import json
import traceback
from _thread import start_new_thread
from queue import Queue
import time
import sys
import requests
import os 
from utils import add_cypher_query

from performance_monitor import instrument_module_functions
from profiling_tools import profile_to_file

_TEXT2CYPHER_AGENT = None
_PANKBASE_SESSION: requests.Session | None = None


def _get_text2cypher_agent():
    global _TEXT2CYPHER_AGENT
    if _TEXT2CYPHER_AGENT is None:
        os.environ['NEO4J_SCHEMA_PATH'] = 'text_to_cypher/data/input/neo4j_schema.json'
        sys.path.append('text_to_cypher/src')
        from .text_to_cypher.src.text2cypher_agent import Text2CypherAgent
        _TEXT2CYPHER_AGENT = Text2CypherAgent()
    return _TEXT2CYPHER_AGENT


def _get_pankbase_session() -> requests.Session:
    global _PANKBASE_SESSION
    if _PANKBASE_SESSION is None:
        session = requests.Session()
        session.headers.update({'Content-Type': 'application/json'})
        _PANKBASE_SESSION = session
    return _PANKBASE_SESSION


def process_document(content: str, metadata: dict = None) -> dict:
    result = {
        'abstract': None,
        'title': None,
        'pubmedid': None,
        'score': metadata.get('score', 0) if metadata else 0
    }
    lines = content.split('\n')
    for line in lines:
        if line.startswith('abstract: '):
            result['abstract'] = line.replace('abstract: ', '', 1)
        elif line.startswith('title: '):
            result['title'] = line.replace('title: ', '', 1)
        elif line.startswith('pubmedid: '):
            result['pubmedid'] = line.replace('pubmedid: ', '', 1)
            
    return result


def semantic_search(query: str, limit: int = 10) -> list:
    results = abstract_store.similarity_search(query, k=limit)
    results = [process_document(result.page_content, result.metadata) for result in results]
    return results


def run_cypher_2(command: str, parameters = None, timeout: int = 60):
    config = {"timeout": timeout}
    return driver_2.execute_query(command, parameters, **config)



__all__ = ['run_functions']


def run_functions(functions: list[dict]) -> str:
    q = Queue()
    results = []
    num = len(functions)
    for i in range(0, len(functions)):
        name = functions[i]['name']
        input = functions[i]['input']
        func = eval(name)
        start_new_thread(lambda _func, _input, _index: q.put(_func(_input, _index + 1)), (func, input, i))
    while (q.qsize() < num):
        time.sleep(0.2)
    while (q.qsize() > 0):
        results.append(q.get())
    results.sort(key=lambda x: int(x.split('.')[0]))
    result = ''.join(results)
    return result    

def pankbase_api_query(input: str, index: int) -> str:
    '''
    Output the messages needed to return to claude, including function name and
    input, and status, and error (if any). Will handle error and timeout, promise
    to return in 60 seconds.
    '''
    q = Queue()
    start_new_thread(_pankbase_api_query, (input, q))
    start = time.time()
    while (time.time() - start < 60):
        time.sleep(0.2)
        if (q.qsize() == 1):
            break
    size = q.qsize()
    result = f'{index}. PankbaseAPI query: {str([input])[1:-1]}\n'
    if (size == 0):
        result += f'Status: timeout\n'
        result += f'Error: Cannot get the result from PankbaseAPI in 60 seconds\n\n'
        return result
    success, res = q.get(block=False)
    if (success == False):
        result += f'Status: error\n'
        result += f'Error: {str([res])[1:-1]}\n\n'
        return result
    result += f'Status: success\n'
    res = res[:15000]  # Limit response size
    result += f'Result: {res}\n\n'
    return result

def clean_cypher_for_json(cypher: str) -> str:
    """
    Clean Cypher query for JSON submission to Pankbase API.
    """
    
    cleaned = ' '.join(cypher.split())
    cleaned = cleaned.replace('"', '\"').replace("'", '\"')
    return cleaned

def _pankbase_api_query_core(input: str, q: Queue) -> None:
    try:
        agent = _get_text2cypher_agent()
        
        # Use refinement with test-time scaling (adaptive approach)
        # First try simple generation
        cypher_result = agent.respond(input)
        
        # Import validator to check quality
        from .text_to_cypher.src.cypher_validator import validate_cypher
        validation = validate_cypher(cypher_result)
        
        # If score is low, use iterative refinement
        if validation['score'] < 90:
            refinement_result = agent.respond_with_refinement(input, max_iterations=5)
            cypher_result = refinement_result['cypher']
            
            # Log refinement metrics to JSONL
            try:
                from .text_to_cypher.src.refinement_logger import log_refinement_metrics
                log_refinement_metrics(input, refinement_result)
            except Exception as e:
                pass
            
            # Log refinement details to text log
            with open('log.txt', 'a') as log_file:
                log_file.write(f"Query: {input}\n")
                log_file.write(f"Refinement used: Best from iteration {refinement_result['iteration']}\n")
                log_file.write(f"Score: {refinement_result['score']}/100\n")
                log_file.write(f"All attempts:\n")
                for attempt in refinement_result['all_attempts']:
                    log_file.write(f"  Iteration {attempt['iteration']}: score={attempt['score']}\n")
                log_file.write(f"Final Cypher: {cypher_result}\n")
                log_file.write("##########################\n")
        else:
            with open('log.txt', 'a') as log_file:
                log_file.write(f"Query: {input}\n")
                log_file.write(f"Score: {validation['score']}/100 (no refinement needed)\n")
                log_file.write(f"Cypher: {cypher_result}\n")
                log_file.write("##########################\n")
        
        cleaned_cypher = clean_cypher_for_json(cypher_result)

        session = _get_pankbase_session()
        response = session.post(
            #'HTTPS://vcr7lwcrnh.execute-api.us-east-1.amazonaws.com/development/api',
            'https://nzi5e9mb0f.execute-api.us-east-1.amazonaws.com/development/pank2-neo4j-api-development',
            json={'query': cleaned_cypher},
            timeout=60
        )

        response.raise_for_status()

        if not response.text.strip():
            add_cypher_query(cleaned_cypher, returned_data=False)  # Empty response
            q.put((False, "Empty response from Pankbase API"))
            return

        if response.text.strip().startswith("Error:"):
            add_cypher_query(cleaned_cypher, returned_data=False)  # Error response
            q.put((False, f"Pankbase API Error: {response.text}"))
            return

        try:
            result = response.json()
            
            # Check if result has actual data
            # The response structure is: {"results": "...", "query": "...", "error": null}
            # Empty results show as: {"results": "No results", ...}
            has_data = True
            if isinstance(result, dict):
                results_value = result.get('results', '')
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
            
            # Track query with data status
            add_cypher_query(cleaned_cypher, returned_data=has_data)
            
            combined = {
                "cypher_query": cleaned_cypher,
                "api_result": result
            }
            q.put((True, json.dumps(combined, ensure_ascii=False)))
        except json.JSONDecodeError:
            add_cypher_query(cleaned_cypher, returned_data=False)  # Invalid JSON
            q.put((False, f"Invalid JSON response from API: {response.text}"))
    except Exception:
        err_msg = traceback.format_exc()
        if (len(err_msg) > 2000):
            first = err_msg[:1000]
            second = err_msg[-1000:]
            err_msg = first + ' ...  ' + second
        q.put((False, err_msg))


def _pankbase_api_query(input: str, q: Queue) -> None:
    profile_to_file(
        _pankbase_api_query_core,
        args=(input, q),
        output_path="logs/pankbase_line_profile.txt",
    )

def test_a():
    a = 0
    b = 1
    c = b / a


def test_b():
    x = 4
    test_a()
    y = 5


def test_c():
    v = 8
    try:
        test_b()
    except:
        error_msg = traceback.format_exc()
    u = 10


instrument_module_functions(globals(), include_private=True, exclude={'_pankbase_api_query_core'})


if __name__ == "__main__":
    # Test Pankbase API functionality
    result = pankbase_api_query("Get detailed information for gene CFTR", 1)
    print(result)
