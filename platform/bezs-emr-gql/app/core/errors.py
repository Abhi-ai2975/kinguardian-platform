"""
Application-wide exception base class and FastAPI exception handler functions.

Design pattern:
  - AppError is the single base class for all domain/business errors in this service.
    Raising AppError (or any subclass) anywhere in the call stack will produce a
    structured JSON response with the correct HTTP status code, without requiring
    try/except blocks in route handlers.
  - The four handler functions are registered on the FastAPI app instance at startup
    (see app.main) so every request goes through the same error serialisation path.
  - Unhandled exceptions (bugs, unexpected states) are caught by
    `unhandled_exception_handler` and returned as a generic 500 with no internal
    details exposed to the client.
"""

from fastapi import HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class AppError(Exception):
    """
    Base exception for all domain-level errors raised in this service.

    Subclass this to create typed errors with pre-set status codes (e.g.
    AuthenticationError with 401). Route handlers never need to catch AppError —
    the registered handler (app_error_handler) converts it to JSON automatically.

    Args:
        message:     Human-readable error description returned in the `detail` field.
        status_code: HTTP status code for the response. Defaults to 500 so accidental
                     un-typed raises don't silently succeed as 200.
    """

    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        # Pass message to the base Exception so it appears in tracebacks and logs.
        super().__init__(message)


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    """
    Converts any AppError (or subclass) raised during a request into a structured
    JSON response. Registered via app.add_exception_handler(AppError, ...).

    The response body follows the FastAPI convention: {"detail": "<message>"}.
    """
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.message},
    )


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """
    Normalises FastAPI's built-in HTTPException into the same {"detail": ...} envelope
    used by app_error_handler. Without this override, FastAPI uses its own default
    format which differs slightly from our AppError responses.
    """
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """
    Handles Pydantic validation failures that occur when deserialising request bodies
    or query parameters. Returns 422 with the full list of field-level errors so
    clients can display precise form validation feedback without a round-trip guess.
    """
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        # exc.errors() returns a list of dicts with `loc`, `msg`, and `type` fields
        # describing exactly which field failed and why.
        content={"detail": exc.errors()},
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Last-resort catch-all for any exception not matched by the more specific handlers
    above. Returns a generic 500 with no internal details to avoid leaking stack
    traces or sensitive system information to API consumers.

    In production these errors will be captured by the global exception logging
    middleware (or APM agent) before this response is sent.
    """
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
    )
