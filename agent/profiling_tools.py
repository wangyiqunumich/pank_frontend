import collections
import inspect
import sys
import time
from pathlib import Path
from typing import Any, Callable, Dict, Iterable, Tuple


class LineTiming:
    """Collect wall-clock timings for each executed line of a function."""

    def __init__(self, func: Callable[..., Any]):
        if not inspect.isfunction(func):
            raise TypeError("LineTiming expects a function object.")
        self.func = func
        self.code = func.__code__
        self.timings: Dict[int, float] = collections.defaultdict(float)
        self._stack: list[Tuple[int, float]] = []

    def _trace(self, frame, event, arg):
        if frame.f_code is not self.code:
            return
        if event == "call":
            self._stack.append((frame.f_lineno, time.perf_counter()))
            return self._trace
        if event == "line":
            if self._stack:
                _, start = self._stack[-1]
                now = time.perf_counter()
                self.timings[frame.f_lineno] += now - start
                self._stack[-1] = (frame.f_lineno, now)
            return self._trace
        if event in ("return", "exception"):
            if self._stack:
                last_line, start = self._stack.pop()
                self.timings[last_line] += time.perf_counter() - start
        return self._trace

    def run(self, *args, **kwargs):
        sys.settrace(self._trace)
        try:
            return self.func(*args, **kwargs)
        finally:
            sys.settrace(None)

    def summary(self) -> Iterable[Tuple[int, float]]:
        for line_no, total in sorted(self.timings.items()):
            yield line_no, total

    def format_summary(self) -> str:
        source_lines = inspect.getsourcelines(self.func)[0]
        first_line = self.func.__code__.co_firstlineno
        rows = []
        for line_no, total in self.summary():
            index = line_no - first_line
            if 0 <= index < len(source_lines):
                code_line = source_lines[index].rstrip()
            else:
                code_line = ""
            rows.append(f"{line_no:>5}  {total*1000:>8.3f} ms  {code_line}")
        return "\n".join(rows)


def profile_to_file(
    func: Callable[..., Any],
    args: Tuple[Any, ...] = (),
    kwargs: Dict[str, Any] | None = None,
    *,
    output_path: str | Path = "line_profile.txt",
) -> Any:
    """Run line-level profiling and save the annotated timing table."""
    kwargs = kwargs or {}
    profiler = LineTiming(func)
    result = profiler.run(*args, **kwargs)
    output = profiler.format_summary()
    path = Path(output_path)
    path.write_text(output + "\n", encoding="utf-8")
    return result
