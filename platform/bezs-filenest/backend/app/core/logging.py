"""
app.core.logging — Structured logging via structlog.

Call `configure_logging()` once in the app lifespan. Then use `get_logger(__name__)`.
Dev: coloured console output. Production: newline-delimited JSON.

Usage:
    from app.core.logging import configure_logging, get_logger

    configure_logging()
    log = get_logger(__name__)
    log.info("file.uploaded", file_id=file_id, org_id=org_id)
"""
import logging

import structlog

from app.core.config import settings


def configure_logging() -> None:
    """Configure structlog. Call once at startup before any log statements."""
    log_level = logging.DEBUG if settings.is_dev else logging.INFO

    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.stdlib.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.dev.ConsoleRenderer()
            if settings.is_dev
            else structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(log_level),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
    )


def get_logger(name: str) -> structlog.BoundLogger:
    """Return a structlog BoundLogger for the given module name."""
    return structlog.get_logger(name)
