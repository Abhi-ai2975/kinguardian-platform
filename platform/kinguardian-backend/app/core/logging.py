import logging
import json
import re
import sys
import uuid
from contextvars import ContextVar
from typing import Any, Dict, Optional

# Context variables to store correlation and observability context per request
request_id_ctx_var: ContextVar[str] = ContextVar("request_id", default="")
trace_id_ctx_var: ContextVar[str] = ContextVar("trace_id", default="")
actor_id_ctx_var: ContextVar[str] = ContextVar("actor_id", default="")
family_id_ctx_var: ContextVar[str] = ContextVar("family_id", default="")
subject_id_ctx_var: ContextVar[str] = ContextVar("subject_id", default="")


# Regex patterns to automatically redact sensitive information
SENSITIVE_PATTERNS = [
    (re.compile(r"(Bearer\s+)[A-Za-z0-9\-\._~\+\/]+=*", re.IGNORECASE), r"\1[REDACTED_TOKEN]"),
    (re.compile(r"(password[\"']?\s*[:=]\s*[\"']?)[^\"'\s,]+", re.IGNORECASE), r"\1[REDACTED_PASSWORD]"),
    (re.compile(r"(api[_-]?key[\"']?\s*[:=]\s*[\"']?)[^\"'\s,]+", re.IGNORECASE), r"\1[REDACTED_API_KEY]"),
    (re.compile(r"(secret[\"']?\s*[:=]\s*[\"']?)[^\"'\s,]+", re.IGNORECASE), r"\1[REDACTED_SECRET]"),
    (re.compile(r"(ssn[\"']?\s*[:=]\s*[\"']?)\d{3}-\d{2}-\d{4}", re.IGNORECASE), r"\1[REDACTED_SSN]"),
]

# Sensitive field names prohibited from logs (Authentication secrets, Health payloads, Document contents, AI private context)
SENSITIVE_FIELD_NAMES = {
    # 1. Authentication Secrets
    "password", "secret", "token", "access_token", "refresh_token",
    "jwt", "api_key", "authorization", "ssn", "mrn", "private_key",
    "client_secret", "signature",

    # 2. Health Payloads (PHI / HIPAA)
    "blood_pressure", "glucose", "systolic", "diastolic", "vitals",
    "vital_signs", "symptoms", "prescription", "lab_result", "diagnosis",
    "clinical_note", "medical_history", "observations",

    # 3. Document Contents
    "raw_content", "extracted_text", "ocr_text", "ocr_payload",
    "file_bytes", "base64_data", "document_data", "pdf_content",

    # 4. AI Private Context
    "system_prompt", "raw_prompt", "conversation_history", "private_context",
    "agent_scratchpad", "intermediate_steps", "prompt_context"
}


def sanitize_value(val: Any) -> Any:
    """
    Recursively sanitizes data before writing to structured logs.
    Strictly redacts:
    - Authentication secrets
    - Health payloads
    - Document contents
    - AI private context
    """
    if isinstance(val, str):
        sanitized = val
        for pattern, replacement in SENSITIVE_PATTERNS:
            sanitized = pattern.sub(replacement, sanitized)
        return sanitized
    elif isinstance(val, dict):
        return {
            k: ("[REDACTED]" if k.lower() in SENSITIVE_FIELD_NAMES else sanitize_value(v))
            for k, v in val.items()
        }
    elif isinstance(val, list):
        return [sanitize_value(item) for item in val]
    return val


class JsonFormatter(logging.Formatter):
    RESERVED_ATTRS = {
        "name", "msg", "args", "levelname", "levelno", "pathname", "filename",
        "module", "exc_info", "exc_text", "stack_info", "lineno", "funcName",
        "created", "msecs", "relativeCreated", "thread", "threadName",
        "processName", "process",
    }

    def format(self, record):
        msg = record.getMessage()
        sanitized_msg = sanitize_value(msg)

        log_record = {
            "timestamp": self.formatTime(record),
            "level": record.levelname,
            "logger": record.name,
            "message": sanitized_msg,
        }

        # Observability context injection
        req_id = request_id_ctx_var.get()
        if req_id:
            log_record["request_id"] = req_id

        trace_id = trace_id_ctx_var.get()
        if trace_id:
            log_record["trace_id"] = trace_id

        actor_id = actor_id_ctx_var.get()
        if actor_id:
            log_record["actor_id"] = actor_id

        family_id = family_id_ctx_var.get()
        if family_id:
            log_record["family_id"] = family_id

        subject_id = subject_id_ctx_var.get()
        if subject_id:
            log_record["subject_id"] = subject_id

        # Custom extra attributes with redaction
        for key, value in record.__dict__.items():
            if key not in self.RESERVED_ATTRS and key not in log_record:
                log_record[key] = sanitize_value(value)

        # Redacted traceback if exception occurred
        if record.exc_info:
            log_record["traceback"] = self.formatException(record.exc_info)

        return json.dumps(log_record)


def setup_logging():
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())

    root = logging.getLogger()
    root.setLevel(logging.INFO)

    # Avoid duplicate handlers
    if not root.handlers:
        root.addHandler(handler)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
