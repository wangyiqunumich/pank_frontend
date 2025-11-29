from _thread import start_new_thread
from queue import Queue
import traceback
from time import sleep


def map_once(func, inputs: list, max_workers: int = 0) -> list:
    '''
    For each item in the input list, apply the function to it and put the result in the corresponding index of the output list.

    Don't consider exceptions, no retry.
    '''
    assert (max_workers >= 0)
    if (max_workers == 0):
        max_workers = len(inputs)
    results = [None] * len(inputs)
    tasks = Queue()
    finished = Queue()
    for i in range(len(inputs)):
        tasks.put(i)

    def worker():
        while True:
            try:
                index = tasks.get(block=False)
            except:
                finished.put(None)
                return
            try:
                results[index] = func(inputs[index])
            except:
                traceback.print_exc()
    for i in range(max_workers):
        start_new_thread(worker, ())
    while True:
        sleep(0.01)
        if (finished.qsize() == max_workers):
            break
    return results


def map_infinite_retry(func, inputs: list, max_workers: int = 0, print_progress: bool = False) -> list:
    '''
    For each item in the input list, apply the function to it and put the result in the corresponding index of the output list.

    Will retry until success.
    '''
    assert (max_workers >= 0)
    if (max_workers == 0):
        max_workers = len(inputs)
    results = [None] * len(inputs)
    tasks = Queue()
    finished = Queue()
    for i in range(len(inputs)):
        tasks.put(i)
    def worker():
        while True:
            try:
                index = tasks.get(block=False)
            except:
                return
            try:
                results[index] = func(inputs[index])
                finished.put(None)
            except Exception as e:
                tasks.put(index)
    for i in range(max_workers):
        start_new_thread(worker, ())
    while True:
        sleep(0.01)
        if (finished.qsize() == len(inputs)):
            break
    return results