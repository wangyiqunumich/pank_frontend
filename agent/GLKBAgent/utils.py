import json
import os
import sys
import time
import traceback
from _thread import start_new_thread
from queue import Queue

import requests

from performance_monitor import instrument_module_functions

HIRN_ABSTRACT_SEARCH_URL = os.getenv(
    "HIRN_ABSTRACT_SEARCH_URL",
    "https://nzi5e9mb0f.execute-api.us-east-1.amazonaws.com/production/pank3-ai-summary/search_hirn_abstracts",
)
HIRN_REQUEST_TIMEOUT_SECONDS = int(os.getenv("HIRN_REQUEST_TIMEOUT_SECONDS", "30"))

def semantic_search(query: str, limit: int = 10) -> list:
    params = {"query": query, "k": limit}
    try:
        response = requests.get(
            HIRN_ABSTRACT_SEARCH_URL, params=params, timeout=HIRN_REQUEST_TIMEOUT_SECONDS
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        raise RuntimeError(f"Failed to query HIRN abstracts API: {exc}") from exc

    try:
        payload = response.json()
    except ValueError as exc:
        raise RuntimeError("Failed to decode HIRN abstracts API response as JSON") from exc

    if not isinstance(payload, list):
        raise RuntimeError("Unexpected payload type returned by HIRN abstracts API")

    results = []
    for item in payload:
        if not isinstance(item, dict):
            continue
        results.append(
            {
                "abstract": item.get("abstract"),
                "title": item.get("title"),
                "pubmedid": item.get("pmid"),
                "score": item.get("score", 0),
            }
        )
    return results


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


def text_embedding(input: str, index: int) -> str:
    '''
    Output the messages needed to return to claude, including function name and
    input, and status, and error (if any). Will handle error and timeout, promise
    to return in 90 seconds.
    '''
    q = Queue()
    start_new_thread(_text_embedding, (input, q))
    start = time.time()
    while (time.time() - start < 60):
        time.sleep(0.2)
        if (q.qsize() == 1):
            break
    size = q.qsize()
    result = f'{index}. Text embedding: {str([input])[1:-1]}\n'
    if (size == 0):
        result += f'Status: timeout\n'
        result += f'Error: Cannot get the result of text embedding in 60 seconds\n\n'
        return result
    success, res = q.get(block=False)
    if (success == False):
        result += f'Status: error\n'
        result += f'Error: {str([res])[1:-1]}\n\n'
        return result
    result += f'Status: success\n'
    res = res[:15000]
    result += f'Result: {res}\n\n'
    return result


def _text_embedding(input: str, q: Queue) -> None:
    try:
        res = semantic_search(input, 10)
    except:
        err_msg = traceback.format_exc()
        if (len(err_msg) > 2000):
            first = err_msg[:1000]
            second = err_msg[-1000:]
            err_msg = first + '  ... Middle part hidden due to length limit ...  ' + second
        q.put((False, err_msg))
        return
    q.put((True, json.dumps(res, ensure_ascii=False)))


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


instrument_module_functions(globals(), include_private=True)


if __name__ == "__main__":
    # x = hypothesis_generation("Hello, who are you", 1)
    # print(x)
    # a = cypher_query('find gene TOP2A', 1)
    # print(a)
    b = text_embedding('gene TOP2A functions and mechanisms', 1)
    print(b)
    function_list = [
        {'name': 'hypothesis_generation', 'input': 'Test 1'},
        {'name': 'hypothesis_generation', 'input': 'Test 2'},
        {'name': 'text_embedding', 'input': 'Test embed'},
        {'name': 'hypothesis_generation', 'input': 'Test 3'},
        {'name': 'hypothesis_generation', 'input': 'Test 4'},
        {'name': 'cypher_query', 'input': 'find gene TOP2A'},
        {'name': 'hypothesis_generation', 'input': 'Test 5'},
        {'name': 'hypothesis_generation', 'input': 'Test 6'},
    ]
    start = time.time()
    result = run_functions(function_list)
    print(result)
    print(f'Time: {time.time() - start}')
