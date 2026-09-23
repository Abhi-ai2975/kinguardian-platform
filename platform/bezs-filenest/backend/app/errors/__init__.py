"""app.errors — Domain exceptions and FastAPI error handlers."""
from .base import (
    ConflictError,
    FileNestError,
    FileTooLargeError,
    NotFoundError,
    OutboxError,
    PermissionDeniedError,
    ProcessingError,
    QuotaExceededError,
    StorageError,
    ValidationError,
    VirusScanError,
)

__all__ = [
    "FileNestError",
    "NotFoundError",
    "PermissionDeniedError",
    "ValidationError",
    "ConflictError",
    "FileTooLargeError",
    "StorageError",
    "QuotaExceededError",
    "VirusScanError",
    "ProcessingError",
    "OutboxError",
]
