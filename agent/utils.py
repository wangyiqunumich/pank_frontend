
import traceback
from typing import Tuple, List
from _thread import start_new_thread
from queue import Queue
import time
import sys
import re

from performance_monitor import instrument_module_functions

# Global variable to store all cypher queries for the current human query
current_cypher_queries: List[dict] = []

def reset_cypher_queries():
    """Reset the cypher queries list for a new human query"""
    global current_cypher_queries
    current_cypher_queries = []

def add_cypher_query(cypher_query: str, returned_data: bool = True):
    """
    Add a cypher query to the current list.
    
    Args:
        cypher_query: The Cypher query string
        returned_data: True if the query returned non-empty results
    """
    global current_cypher_queries
    if cypher_query and cypher_query.strip():
        current_cypher_queries.append({
            'query': cypher_query.strip(),
            'returned_data': returned_data
        })

def get_all_cypher_queries() -> List[str]:
    """Get all cypher queries for the current human query"""
    return [q['query'] for q in current_cypher_queries]

def get_queries_with_data() -> List[str]:
    """Get only cypher queries that returned data"""
    return [q['query'] for q in current_cypher_queries if q['returned_data']]

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



__all__ = ['run_functions', 'reset_cypher_queries', 'add_cypher_query', 'get_all_cypher_queries', 'get_queries_with_data']


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


if __name__ == "__main__":
    # Test Pankbase API functionality
    pass

def template_chat_one_round(input: str, index: int) -> str:
	q = Queue()
	start_new_thread(_Template_Tool_Call_one_round, (input, q))
	start = time.time()
	while (time.time() - start < 100):
		time.sleep(0.2)
		if (q.qsize() == 1):
			break
	size = q.qsize()
	result = f'{index}. TemplateToolAgent chat_one_round: {str([input])[1:-1]}\n'
	if (size == 0):
		result += 'Status: timeout\n'
		result += 'Error: Cannot get response from TemplateToolAgent in 100 seconds\n\n'
		return result
	success, res = q.get(block=False)
	if (success == False):
		result += 'Status: error\n'
		result += f'Error: {str([res])[1:-1]}\n\n'
		return result
	result += 'Status: success\n'
	res = res[:15000]
	result += f'Result: {res}\n\n'
	return result

def _Template_Tool_Call_one_round(input: str, q: Queue) -> str:
	try:
		sys.path.append('TemplateToolAgent')
		from TemplateToolAgent.ai_assistant import chat_one_round_ToolCall as tool_chat
		_, text = tool_chat([], input)
		q.put((True, text))
	except Exception:
		err_msg = traceback.format_exc()
		if (len(err_msg) > 2000):
			first = err_msg[:1000]
			second = err_msg[-1000:]
			err_msg = first + '  ... Middle part hidden due to length limit ...  ' + second
		q.put((False, err_msg))

def pankbase_chat_one_round(input: str, index: int) -> str:
	q = Queue()
	start_new_thread(_pankbase_chat_one_round, (input, q))
	start = time.time()
	while (time.time() - start < 100):
		time.sleep(0.2)
		if (q.qsize() == 1):
			break
	size = q.qsize()
	result = f'{index}. PankBaseAgent chat_one_round: {str([input])[1:-1]}\n'
	if (size == 0):
		result += 'Status: timeout\n'
		result += 'Error: Cannot get response from PankBaseAgent in 100 seconds\n\n'
		return result
	success, res, cypher_query = q.get(block=False)
	if (success == False):
		result += 'Status: error\n'
		result += f'Error: {str([res])[1:-1]}\n\n'
		return result
	result += 'Status: success\n'
	res = res[:15000]
	result += f'''
	{{
		"template_matching": "agent_answer",
		"cypher": "{cypher_query}",
		"summary": "{res}"
	}}
	'''
	return result

def _pankbase_chat_one_round(input: str, q: Queue) -> None:
	try:
		sys.path.append('PankBaseAgent')
		from PankBaseAgent.ai_assistant import chat_one_round_pankbase as pankbase_chat
		full , text = pankbase_chat([], input)
		
		match = re.search(
			r'"cypher_query".*?(?="api_result")',
			full[2]['content'],
			re.DOTALL
		)

		if match:
			cypher_query = match.group(0).strip()
			# Add cypher query to global list
			
		else:
			cypher_query = ''

		text = f"\n\n{text}"
		q.put((True, text, cypher_query))
	except Exception:
		err_msg = traceback.format_exc()
		if (len(err_msg) > 2000):
			first = err_msg[:1000]
			second = err_msg[-1000:]
			err_msg = first + '  ... Middle part hidden due to length limit ...  ' + second
		q.put((False, err_msg, ''))

def glkb_chat_one_round(input: str, index: int) -> str:
	q = Queue()
	start_new_thread(_glkb_chat_one_round, (input, q))
	start = time.time()
	while (time.time() - start < 100):
		time.sleep(0.2)
		if (q.qsize() == 1):
			break
	size = q.qsize()
	result = f'{index}. GLKB_agent chat_one_round: {str([input])[1:-1]}\n'
	if (size == 0):
		result += 'Status: timeout\n'
		result += 'Error: Cannot get response from GLKB_agent in 100 seconds\n\n'
		return result
	success, res = q.get(block=False)
	if (success == False):
		result += 'Status: error\n'
		result += f'Error: {str([res])[1:-1]}\n\n'
		return result
	result += 'Status: success\n'
	res = res[:15000]
	result += f'Result: {res}\n\n'
	return result

def _glkb_chat_one_round(input: str, q: Queue) -> None:
	try:
		sys.path.append('GLKBAgent')
		from GLKBAgent.ai_assistant import chat_one_round_glkb as glkb_chat
		_, text = glkb_chat([], input)
		q.put((True, text))
	except Exception:
		err_msg = traceback.format_exc()
		if (len(err_msg) > 2000):
			first = err_msg[:1000]
			second = err_msg[-1000:]
			err_msg = first + '  ... Middle part hidden due to length limit ...  ' + second
		q.put((False, err_msg))


instrument_module_functions(globals(), include_private=True)
