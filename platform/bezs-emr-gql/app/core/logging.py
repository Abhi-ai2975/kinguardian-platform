"""
Structured JSON logging setup for the application.

All log output is emitted as newline-delimited JSON so it can be ingested directly
by log aggregation systems (Datadog, Loki, CloudWatch Logs Insights, etc.) without
a parsing step. Each line contains at minimum: timestamp, level, logger name,
message, and any extra fields passed via the `extra={}` kwarg on logger calls.

Usage:
    from app.core.logging import get_logger
    logger = get_logger(__name__)
    logger.info("Organisation created", extra={"org_id": 42})
"""

import json
import logging
import sys


class _JsonFormatter(logging.Formatter):
    """
    Custom logging.Formatter that serialises each LogRecord as a JSON object.

    Standard logging internals (pathname, thread, process, etc.) are excluded from
    the output to keep log lines compact. Any key in `extra={}` that is not in the
    skip list is promoted to a top-level JSON field, making structured querying easy.
    """

    # Internal LogRecord attributes that carry no value in structured logs.
    # Including them would double the size of every log line with fields like
    # `pathname`, `threadName`, and `processName` that are noise in a container env.
    _SKIP = {
        "name", "msg", "args", "levelname", "levelno", "pathname", "filename",
        "module", "exc_info", "exc_text", "stack_info", "lineno", "funcName",
        "created", "msecs", "relativeCreated", "thread", "threadName",
        "processName", "process",
    }

    def format(self, record: logging.LogRecord) -> str:
        """
        Serialise a LogRecord into a JSON string.

        Builds a base dict with the four mandatory fields (timestamp, level, logger,
        message), then iterates the record's __dict__ to append any extra fields the
        caller provided via `extra={}`. Exception tracebacks are included under the
        `traceback` key when present.

        Args:
            record: The LogRecord produced by a logger.info/error/... call.

        Returns:
            A single-line JSON string ready to be written to stdout.
        """
        # Mandatory fields present in every log line.
        out: dict = {
            "timestamp": self.formatTime(record),  # ISO-8601 formatted by default
            "level": record.levelname,              # DEBUG / INFO / WARNING / ERROR / CRITICAL
            "logger": record.name,                  # module path passed to get_logger()
            "message": record.getMessage(),         # formatted message string
        }

        # Promote caller-supplied `extra={}` keys to top-level JSON fields.
        # Skip keys already in `out` to avoid overwriting the mandatory fields,
        # and skip internal LogRecord bookkeeping attributes from `_SKIP`.
        for k, v in record.__dict__.items():
            if k not in self._SKIP and k not in out:
                out[k] = v

        # Append the formatted traceback when the log call included exc_info=True
        # or was triggered by logger.exception(). Stored as a string under `traceback`
        # so it doesn't break JSON parsing of downstream consumers.
        if record.exc_info:
            out["traceback"] = self.formatException(record.exc_info)

        return json.dumps(out)


def setup_logging() -> None:
    """
    Configure the root logger to emit JSON to stdout.

    Called once at application startup (app.main module level) before any other
    code runs so that even import-time log calls are captured.

    Implementation notes:
      - root.handlers.clear() removes any handlers added by third-party libraries
        (httpx, uvicorn, etc.) during their own imports, preventing duplicate log
        lines or conflicting plain-text output from mixing with JSON output.
      - All loggers in the process inherit the root logger's handler unless they
        define their own, so this single call covers the entire application.
    """
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(_JsonFormatter())

    root = logging.getLogger()
    root.setLevel(logging.INFO)

    # Clear existing handlers to avoid duplicate output when libraries (e.g. uvicorn)
    # have already attached their own StreamHandlers before setup_logging() is called.
    root.handlers.clear()
    root.addHandler(handler)


def get_logger(name: str) -> logging.Logger:
    """
    Retrieve a named logger for a module.

    Wraps logging.getLogger so all modules obtain loggers the same way without
    importing the stdlib logging module directly. Pass __name__ as the argument
    so log lines carry the full dotted module path (e.g. "app.services.organization_service").

    Args:
        name: Typically __name__ of the calling module.

    Returns:
        A standard logging.Logger instance that inherits the root JSON handler.
    """
    return logging.getLogger(name)
