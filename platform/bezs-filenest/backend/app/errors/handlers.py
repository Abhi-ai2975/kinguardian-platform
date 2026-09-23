"""
app.errors.handlers — FastAPI exception handlers.

Register all handlers in main.py via app.add_exception_handler(). They convert
FileNestError subclasses and FastAPI's own exceptions into the standard JSON
error envelope: {"error": "<CODE>", "message": "<text>", "detail": {...}}

Usage:
    from app.errors.handlers import filenest_error_handler, http_exception_handler
    app.add_exception_handler(FileNestError, filenest_error_handler)
"""
from fastapi import HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

from app.errors.base import FileNestError


async def filenest_error_handler(request: Request, exc: FileNestError) -> JSONResponse:
    """Convert a FileNestError to the standard JSON error envelope."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.code, "message": exc.message, "detail": exc.detail},
    )


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Pass through FastAPI HTTPException with a consistent envelope shape."""
    detail = exc.detail
    if isinstance(detail, dict):
        code = detail.get("code", "HTTP_ERROR")
        message = detail.get("message", str(exc.detail))
        extra = {k: v for k, v in detail.items() if k not in ("code", "message")}
    else:
        code = "HTTP_ERROR"
        message = str(detail)
        extra = {}
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": code, "message": message, "detail": extra},
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Convert Pydantic validation errors to the standard envelope."""
    errors = [
        {"field": ".".join(str(loc) for loc in e["loc"]), "message": e["msg"]}
        for e in exc.errors()
    ]
    return JSONResponse(
        status_code=422,
        content={
            "error": "VALIDATION_ERROR",
            "message": "Request body validation failed",
            "detail": {"errors": errors},
        },
    )


async def integrity_error_handler(request: Request, exc: IntegrityError) -> JSONResponse:
    """
    Last-resort handler for IntegrityErrors not caught by the repository layer.

    Service pre-checks and repository-level catches handle all known conflicts.
    This handler covers only unexpected race conditions or schema violations that
    slip through — so a generic, non-leaking message is correct here.
    """
    return JSONResponse(
        status_code=409,
        content={"error": "CONFLICT", "message": "A conflict occurred. Please try again.", "detail": {}},
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all for unexpected errors — always 500, never leaks tracebacks."""
    return JSONResponse(
        status_code=500,
        content={"error": "INTERNAL_ERROR", "message": "An unexpected error occurred.", "detail": {}},
    )
