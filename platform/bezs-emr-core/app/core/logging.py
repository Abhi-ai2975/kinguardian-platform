import logging
import json
import sys
from app.core.request_context import request_id_ctx_var


class JsonFormatter(logging.Formatter):
    RESERVED_ATTRS = {
        "name",
        "msg",
        "args",
        "levelname",
        "levelno",
        "pathname",
        "filename",
        "module",
        "exc_info",
        "exc_text",
        "stack_info",
        "lineno",
        "funcName",
        "created",
        "msecs",
        "relativeCreated",
        "thread",
        "threadName",
        "processName",
        "process",
    }

    def format(self, record):
        log_record = {
            "timestamp": self.formatTime(record),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Inject request_id automatically
        request_id = request_id_ctx_var.get()
        if request_id:
            log_record["request_id"] = request_id

        # Automatically include all custom extra fields
        for key, value in record.__dict__.items():
            if key not in self.RESERVED_ATTRS and key not in log_record:
                log_record[key] = value

        # Include traceback if exists
        if record.exc_info:
            log_record["traceback"] = self.formatException(record.exc_info)

        return json.dumps(log_record)


def setup_logging():
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())

    root = logging.getLogger()
    root.setLevel(logging.INFO)
    root.handlers.clear()
    root.addHandler(handler)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
