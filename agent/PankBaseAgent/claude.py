
import os
from copy import deepcopy
from typing import Tuple
import json
import traceback
from threading import Lock
from openai import OpenAI
import sys
from .text_to_cypher.src.text2cypher_utils import get_env_variable

file_path = os.path.abspath(__file__)
file_path = os.path.dirname(file_path) + '/'

prompt = open(file_path + 'prompts/general_prompt.txt').read()
# json_prompt = open(file_path + 'prompts/json_prompt.txt').read()
error_prompt = open(file_path + 'prompts/error_prompt.txt').read()

client = OpenAI(api_key=get_env_variable("OPENAI_API_KEY"))

__all__ = ['chat_and_get_formatted', 'set_log_enable']


LOG_ENABLE = False
log_file = open(file_path + 'logs/claude_log.txt', 'a')
log_file_lock = Lock()


def set_log_enable(enable: bool):
    global LOG_ENABLE
    if (not LOG_ENABLE and enable):
        log_file.write('\n\nLOG START\n\n')
    LOG_ENABLE = enable


def chat(messages: list) -> Tuple[bool, str]:
    max_trail = 3
    while (max_trail > 0):
        try:
            message = client.chat.completions.create(
                model="gpt-4o-2024-11-20",
                temperature=0.6,
                max_tokens=4000,
                top_p=1.0,
                messages=messages,
                response_format={'type': 'json_object'}
            )
            if (LOG_ENABLE):
                with log_file_lock:
                    log_file.write('\nRequest:\n')
                    log_file.write(json.dumps(messages, indent=2, ensure_ascii=False))
                    log_file.write('\n\nResponse:\n')
                    log_file.write(str([message.choices[0].message.content])[1:-1])
                    log_file.write('\n\n')
                    log_file.flush()
            return (True, message.choices[0].message.content)
        except:
            traceback.print_exc()
            max_trail -= 1
    return (False, '')


def check_json(response: str) -> Tuple[bool, dict]:
    try:
        response = json.loads(response, strict=False)
        assert (type(response) == dict)
        assert ('draft' in response)
        assert (response['to'] in ('system', 'user'))
        if (response['to'] == 'user'):
            # assert (type(response['text']) == dict)
            pass
        else:
            assert (type(response['functions'] == list))
            assert (len(response['functions']) > 0)
            for function in response['functions']:
                assert (type(function) == dict)
                assert ('name' in function)
                assert (type(function['name']) == str)
                assert ('input' in function)
                assert (type(function['input']) == str)
                assert (function['name'] in ('pankbase_api_query'))
        return (True, response)
    except:
        err_msg = traceback.format_exc()
        return (False, err_msg)


def chat_and_get_formatted(messages: list) -> Tuple[list, dict]:
    '''
    Use messages to chat with GPT, and append the response to messages, but return
    json format with another chat

    messages don't include system message
    '''
    trials = 3
    messages = deepcopy(messages)
    messages.insert(0, {"role": "system", "content": prompt})
    valid = False
    response = ''
    json_response = {}
    for _ in range(0, trials):
        success, response = chat(messages)
        assert (success), 'Failed to get response from GPT'
        messages.append({"role": "assistant", "content": response})
        valid, json_response = check_json(response)
        if (valid):
            break
        messages.append({"role": "user", "content": error_prompt.replace('$err-msg$', json_response)})
    assert (valid), f"GPT continously return invalid format, for {trials} times"
    messages.pop(0)
    return (messages, json_response)


if __name__ == "__main__":
    a = chat_and_get_formatted([{"role": "user", "content": "====== From User ======\nWhat is TP 53"}])
    print(a)
