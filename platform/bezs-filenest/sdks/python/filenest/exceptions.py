"""
filenest.exceptions — typed exception hierarchy for the FileNest Python SDK.

Every non-2xx response from the API is mapped to one of these classes so
callers can write typed except blocks instead of checking status codes.

Usage:
    from filenest.exceptions import FileNestError, FileNotFoundError, RateLimitError
"""

from __future__ import annotations


class FileNestError(Exception):
    """Base class for all FileNest SDK errors."""

    def __init__(self, message: str, code: str = "server_error", status_code: int = 0) -> None:
        super().__init__(message)
        self.code = code
        self.status_code = status_code


class AuthenticationError(FileNestError):
    """401 — invalid or missing API key."""

    def __init__(self, message: str = "Invalid or missing API key") -> None:
        super().__init__(message, "authentication_required", 401)


class AuthorizationError(FileNestError):
    """403 — token lacks the required scope."""

    def __init__(self, message: str = "Insufficient scope", required_scope: str | None = None) -> None:
        super().__init__(message, "insufficient_scope", 403)
        self.required_scope = required_scope


class NotFoundError(FileNestError):
    """404 — resource not found."""

    def __init__(self, message: str = "Resource not found") -> None:
        super().__init__(message, "not_found", 404)


class FileNotFoundError(NotFoundError):
    """404 — file specifically not found."""

    def __init__(self, file_id: str | None = None) -> None:
        msg = f"File {file_id} not found" if file_id else "File not found"
        super().__init__(msg)
        self.file_id = file_id


class ConflictError(FileNestError):
    """409 — generic resource conflict."""

    def __init__(self, message: str = "Resource conflict") -> None:
        super().__init__(message, "conflict", 409)


class WORMViolationError(FileNestError):
    """409 — attempt to mutate a WORM-committed file."""

    def __init__(self, message: str = "File is WORM-committed and cannot be modified") -> None:
        super().__init__(message, "worm_violation", 409)


class LegalHoldError(FileNestError):
    """409 — attempt to delete/move a file under legal hold."""

    def __init__(self, message: str = "File is under legal hold", reason: str | None = None) -> None:
        super().__init__(message, "legal_hold_active", 409)
        self.reason = reason


class ValidationError(FileNestError):
    """422 — generic validation error."""

    def __init__(
        self,
        message: str = "Validation failed",
        validation_errors: list[dict] | None = None,
    ) -> None:
        super().__init__(message, "validation_error", 422)
        self.validation_errors: list[dict] = validation_errors or []


class MetadataValidationError(ValidationError):
    """422 — file metadata failed schema validation."""

    def __init__(self, validation_errors: list[dict] | None = None) -> None:
        super().__init__("Metadata validation failed", validation_errors)
        self.code = "metadata_validation_error"


class RateLimitError(FileNestError):
    """429 — rate limit exceeded."""

    def __init__(self, message: str = "Rate limit exceeded", retry_after: int | None = None) -> None:
        super().__init__(message, "rate_limited", 429)
        self.retry_after = retry_after


class NetworkError(FileNestError):
    """Network-level failure (connect error, timeout)."""

    def __init__(self, message: str = "Network error") -> None:
        super().__init__(message, "network_error", 0)
