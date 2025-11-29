import os
import json
import traceback
from threading import Lock
from copy import deepcopy
from typing import Tuple
from openai import OpenAI
import config

# -------------------------------------------------------------------------
# Setup
# -------------------------------------------------------------------------
file_path = os.path.abspath(__file__)
file_path = os.path.dirname(file_path) + '/'

prompt = open(file_path + 'prompts/general_prompt.txt').read()
error_prompt = open(file_path + 'prompts/error_prompt.txt').read()

client = OpenAI(api_key=config.OPENAI_API_KEY)

__all__ = ['chat_and_get_formatted', 'set_log_enable']

LOG_ENABLE = False
log_file = open(file_path + 'logs/claude_log.txt', 'a')
log_file_lock = Lock()

# -------------------------------------------------------------------------
# Logging control
# -------------------------------------------------------------------------
def set_log_enable(enable: bool):
    global LOG_ENABLE
    if not LOG_ENABLE and enable:
        log_file.write('\n\nLOG START\n\n')
    LOG_ENABLE = enable

# -------------------------------------------------------------------------
# Core chat function
# -------------------------------------------------------------------------
def chat(messages: list) -> Tuple[bool, str]:
    """Send messages to the model, return (success, text_response)."""
    max_trail = 3
    while max_trail > 0:
        try:
            response = client.chat.completions.create(
                model="gpt-4o-2024-11-20",
                temperature=0.6,
                max_tokens=4000,
                top_p=1.0,
                messages=messages,
            )

            content = response.choices[0].message.content

            if LOG_ENABLE:
                with log_file_lock:
                    log_file.write('\nRequest:\n')
                    log_file.write(json.dumps(messages, indent=2, ensure_ascii=False))
                    log_file.write('\n\nResponse:\n')
                    log_file.write(content)
                    log_file.write('\n\n')
                    log_file.flush()

            return True, content

        except Exception as e:
            traceback.print_exc()
            max_trail -= 1

    return False, ''

# -------------------------------------------------------------------------
# Simplified wrapper
# -------------------------------------------------------------------------
def chat_and_get_formatted(messages: list) -> Tuple[list, dict]:
    messages = deepcopy(messages)
    messages.insert(0, {"role": "system", "content": prompt})

    success, response_text = chat(messages)
    if not success:
        raise RuntimeError("Failed to get response from GPT after 3 retries")

    messages.append({"role": "assistant", "content": response_text})
    messages.pop(0)

    # Wrap the plain string in the expected dict format
    response = {
        "to": "user",
        "text": response_text
    }

    return messages, response


# -------------------------------------------------------------------------
# Manual test
# -------------------------------------------------------------------------
if __name__ == "__main__":
    messages, response = chat_and_get_formatted([
        {"role": "user", "content": "====== From User ======\nWhat is TP53?"}
    ])
