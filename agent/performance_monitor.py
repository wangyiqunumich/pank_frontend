import inspect
import json
import threading
import time
from datetime import datetime, timezone
from functools import wraps
from pathlib import Path
from typing import Any, Callable, Iterable, Optional

_WRAPPED_ATTR = "__performance_monitor_wrapped__"
_DEFAULT_LOG_PATH = Path(__file__).resolve().parent / "logs" / "performance.log"
_LOG_PATH = _DEFAULT_LOG_PATH
_LOG_LOCK = threading.Lock()
_LOG_ENABLED = True


def set_performance_log_path(path: str | Path) -> None:
    """Override the location where performance entries are recorded."""
    global _LOG_PATH
    _LOG_PATH = Path(path)
    _reset_log_file()


def set_performance_logging(enabled: bool) -> None:
    """Enable or disable performance logging globally."""
    global _LOG_ENABLED
    _LOG_ENABLED = enabled


def _ensure_log_path() -> None:
    _LOG_PATH.parent.mkdir(parents=True, exist_ok=True)


def _reset_log_file() -> None:
    _ensure_log_path()
    with _LOG_LOCK:
        _LOG_PATH.open("w", encoding="utf-8").close()


def _write_log(entry: dict[str, Any]) -> None:
    if not _LOG_ENABLED:
        return
    _ensure_log_path()
    serialized = json.dumps(entry, ensure_ascii=False)
    with _LOG_LOCK:
        with _LOG_PATH.open("a", encoding="utf-8") as handle:
            handle.write(serialized)
            handle.write("\n")


def monitor_function(func: Callable[..., Any]) -> Callable[..., Any]:
    """Wrap a function to record its execution duration."""
    if getattr(func, _WRAPPED_ATTR, False):
        return func

    is_coroutine = inspect.iscoroutinefunction(func)

    def _build_log_entry(status: str, duration: float, error: Optional[str]) -> dict[str, Any]:
        return {
            "timestamp": datetime.now(tz=timezone.utc).isoformat(),
            "module": func.__module__,
            "function": func.__qualname__,
            "status": status,
            "elapsed_ms": round(duration * 1000, 3),
            **({"error": error} if error else {}),
        }

    if is_coroutine:

        @wraps(func)
        async def async_wrapper(*args: Any, **kwargs: Any) -> Any:
            start = time.perf_counter()
            try:
                result = await func(*args, **kwargs)
            except Exception as exc:
                duration = time.perf_counter() - start
                _write_log(_build_log_entry("error", duration, repr(exc)))
                raise
            duration = time.perf_counter() - start
            _write_log(_build_log_entry("success", duration, None))
            return result

        setattr(async_wrapper, _WRAPPED_ATTR, True)
        return async_wrapper

    @wraps(func)
    def sync_wrapper(*args: Any, **kwargs: Any) -> Any:
        start = time.perf_counter()
        try:
            result = func(*args, **kwargs)
        except Exception as exc:
            duration = time.perf_counter() - start
            _write_log(_build_log_entry("error", duration, repr(exc)))
            raise
        duration = time.perf_counter() - start
        _write_log(_build_log_entry("success", duration, None))
        return result

    setattr(sync_wrapper, _WRAPPED_ATTR, True)
    return sync_wrapper


def instrument_module_functions(
    namespace: dict[str, Any],
    *,
    include_private: bool = False,
    exclude: Optional[Iterable[str]] = None,
) -> list[str]:
    """Wrap module-level callables so their execution time is logged.

    Returns the list of function names that were instrumented.
    """
    module_name = namespace.get("__name__", "")
    excluded = set(exclude or [])
    instrumented: list[str] = []

    for name, value in list(namespace.items()):
        if name in excluded:
            continue
        if not include_private and name.startswith("_"):
            continue
        if not (inspect.isfunction(value) or inspect.iscoroutinefunction(value)):
            continue
        if getattr(value, "__module__", None) != module_name:
            continue
        namespace[name] = monitor_function(value)
        instrumented.append(name)

    return instrumented


# Ensure the default log directory exists on import.
_reset_log_file()
