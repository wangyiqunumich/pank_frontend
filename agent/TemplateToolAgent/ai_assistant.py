from .claude import *
from .utils import *
from typing import Tuple
from copy import deepcopy
import json
import requests

MAX_ITER = 1
PRINT_FUNC_CALL = True
PRINT_FUNC_RESULT = True
set_log_enable(True)


# pseudo code:

# MAX_ITER = 5
# messages = []
# model = <the_ai_assistant>  # This is you
#
# def user_input(question: str) -> str:
#     function_call_num = 0
#     messages.append({"role": "user", "content": question})
#     while True:
#         output = model.get_response(messages)
#         if (output.is_to_user):
#             messages.append({"role": "assistant", "content": output})
#             return output.text
#         else:
#             # to system
#             if (function_call_num == MAX_ITER):
#                 assert (False)  # This should not happen, because you should not do function callings when it reaches MAX_ITER
#             function_call_num += 1
#             messages.append({"role": "assistant", "content": output})
#             functions_list = output.functions
#             function_results = run_functions(functions_list)
#             messages.append({"role": "user", "content": function_results})


def chat_one_round_ToolCall(messages_history: list[dict], question: str) -> Tuple[list[dict], str]:
    '''
    return (messages_history, response)
    '''
    question = question.strip()
    if (question == ''):
        question = '<empty>'
    question = '====== From User ======\n' + question
    messages = deepcopy(messages_history)
    messages.append({"role": "user", "content": question})
    function_call_num = 0
    while True:
        messages, response = chat_and_get_formatted(messages)
        if response['to'] == 'user':
            text = response['text'].strip()
            parts = [p.strip() for p in text.split(' - ', 2)]
            if len(parts) == 3:
                third = parts[2]

                # Only transform when the third part is a concrete gene name (e.g., INS),
                # not already an Ensembl ID, and not the literal placeholder 'gene'.
                if third and (third != 'gene') and (not third.startswith('gene@')):
                    gene_name = third

                    # Minimal escaping for single quotes inside the gene name
                    safe_gene = gene_name.replace("'", "''")

                    sql_query = (
                        f"SELECT id, name FROM gene_name "
                        f"WHERE name % '{safe_gene}' "
                        f"ORDER BY similarity (name, '{safe_gene}') DESC LIMIT 1"
                    )

                    try:
                        resp = requests.post(
                            "https://nzi5e9mb0f.execute-api.us-east-1.amazonaws.com/production/RDSLambda",
                            headers={"Content-Type": "application/json"},
                            data=json.dumps({"query": sql_query}),
                            timeout=8,
                        )
                        if resp.status_code == 200:
                            data = resp.json()
                            # Expected shape:
                            # {"results": [{"id": "ENSG00000001626", "name": "CFTR", ...}, ...]}
                            results = data.get("results") or []
                            if results:
                                ensembl_id = results[0].get("id")
                                if ensembl_id:
                                    parts[2] = f"gene@{ensembl_id}"
                                    response['text'] = " - ".join(parts)
                        else:
                            # Non-200: leave text unchanged
                            pass
                    except Exception as e:
                        # Network/parse error: leave text unchanged
                        pass

            return (messages, response['text'])
        if (function_call_num == MAX_ITER):
            assert (False)  # Currently not handle this error
        function_call_num += 1
        functions_result = run_functions(response['functions'])
        new_message = '====== From System ======\nThe results of function callings:\n' + functions_result + '\n'
        if (function_call_num == MAX_ITER):
            new_message += 'You already called functions 5 continuous times. Next message you must return to user.'
        else:
            func_num = MAX_ITER - function_call_num
            new_message += f'You can call functions {func_num} more times, after this you need to return to user.'
        messages.append({"role": "user", "content": new_message})


def chat_forever():
    messages = []
    while True:
        question = input('Your question: ')
        messages, response = chat_one_round_ToolCall(messages, question + ' Ensure all output corresponds to the correct JSON formatting.')
        print(f'\nResponse:\n\n{response}\n')


if __name__ == "__main__":
    chat_forever()
