"""
app.errors.base — FileNest domain exception hierarchy.

All exceptions raised in service/repository code must subclass FileNestError.
The global exception handler converts them to the standard JSON error envelope:
    {"error": "<CODE>", "message": "<human text>", "detail": {...}}

Usage:
    from app.errors import NotFoundError, ConflictError

    raise NotFoundError("File not found")
    raise ConflictError("Slug already exists", detail={"slug": slug})
"""
from http import HTTPStatus


class FileNestError(Exception):
    """Base class for all FileNest domain errors."""

    status_code: int = HTTPStatus.INTERNAL_SERVER_ERROR
    code: str = "INTERNAL_ERROR"

    def __init__(self, message: str, *, detail: dict | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.detail = detail or {}


class NotFoundError(FileNestError):
    """Requested resource does not exist or is outside the caller's tenant scope."""
    status_code = HTTPStatus.NOT_FOUND
    code = "NOT_FOUND"


class PermissionDeniedError(FileNestError):
    """Caller's token lacks a required scope or crosses a tenant boundary."""
    status_code = HTTPStatus.FORBIDDEN
    code = "PERMISSION_DENIED"


class ValidationError(FileNestError):
    """Business-rule validation failed beyond what Pydantic catches."""
    status_code = HTTPStatus.UNPROCESSABLE_ENTITY
    code = "VALIDATION_ERROR"


class ConflictError(FileNestError):
    """Operation rejected due to current resource state (duplicate, WORM, legal hold)."""
    status_code = HTTPStatus.CONFLICT
    code = "CONFLICT"


class StorageError(FileNestError):
    """Storage provider returned an unexpected error."""
    status_code = HTTPStatus.BAD_GATEWAY
    code = "STORAGE_ERROR"


class FileTooLargeError(FileNestError):
    """Uploaded file exceeds the project's max_file_size_bytes limit."""
    status_code = HTTPStatus.REQUEST_ENTITY_TOO_LARGE
    code = "FILE_TOO_LARGE"


class QuotaExceededError(FileNestError):
    """Project's storage or API-call quota would be exceeded."""
    status_code = HTTPStatus.TOO_MANY_REQUESTS
    code = "QUOTA_EXCEEDED"


class VirusScanError(FileNestError):
    """ClamAV detected a threat in an uploaded file."""
    status_code = HTTPStatus.UNPROCESSABLE_ENTITY
    code = "VIRUS_DETECTED"


class ProcessingError(FileNestError):
    """Processing pipeline stage failed in a non-retryable way."""
    status_code = HTTPStatus.INTERNAL_SERVER_ERROR
    code = "PROCESSING_ERROR"


class OutboxError(FileNestError):
    """Writing to the transactional outbox table failed."""
    status_code = HTTPStatus.INTERNAL_SERVER_ERROR
    code = "OUTBOX_ERROR"
