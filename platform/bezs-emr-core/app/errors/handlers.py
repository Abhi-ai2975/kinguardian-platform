from fastapi import HTTPException, Request
from fastapi.exceptions import RequestValidationError, ResponseValidationError
from fastapi.responses import JSONResponse

from app.core.logging import get_logger
from app.errors.base import ApplicationError
from app.errors.validation import InputValidationError

logger = get_logger(__name__)


def _map_to_fhir_issue_code(status_code: int) -> str:
    mapping = {
        400: "invalid",
        401: "security",
        403: "forbidden",
        404: "not-found",
        409: "conflict",
        422: "processing",
        500: "exception",
    }
    return mapping.get(status_code, "processing")


def _base_log_payload(request: Request):
    return {
        "method": request.method,
        "path": request.url.path,
        "query_params": dict(request.query_params),
        "client_ip": request.client.host if request.client else None,
    }


def get_request_id(request: Request) -> str | None:
    return request.state.request_id if request.state.request_id else None


# -------------------------------------------------------
# ApplicationError (Your Domain Errors)
# -------------------------------------------------------
async def application_error_handler(request: Request, exc: ApplicationError):
    payload = _base_log_payload(request)
    is_server_error = exc.status_code >= 500
    request_id = get_request_id(request)

    payload.update(
        {
            "error_name": exc.name,
            "error_code": exc.code,
            "status_code": exc.status_code,
            "metadata": exc.metadata,
        }
    )

    # -----------------------
    # Input Validation Error
    # -----------------------
    if isinstance(exc, InputValidationError):
        logger.info("Input validation failed", extra=payload)

        return JSONResponse(
            status_code=400,
            content={
                "resourceType": "OperationOutcome",
                "issue": [
                    {
                        "severity": "error",
                        "code": "invalid",
                        "diagnostics": error["message"],
                        "expression": [error["field"]],
                    }
                    for error in exc.errors
                ],
            },
            headers=({"X-Request-ID": request_id} if request_id else None),
        )

    # -----------------------
    # Operational Errors
    # -----------------------
    if exc.is_operational:
        logger.warning("Operational application error", extra=payload)
    else:
        logger.error("Non-operational application error", extra=payload, exc_info=True)

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "resourceType": "OperationOutcome",
            "issue": [
                {
                    "severity": "error",
                    "code": _map_to_fhir_issue_code(exc.status_code),
                    "diagnostics": (
                        "Internal server error" if is_server_error else exc.message
                    ),
                }
            ],
        },
        headers=({"X-Request-ID": request_id} if request_id else None),
    )


# -------------------------------------------------------
# Request Validation (Pydantic Input Schema Errors)
# -------------------------------------------------------
async def request_validation_exception_handler(
    request: Request, exc: RequestValidationError
):
    payload = _base_log_payload(request)
    request_id = get_request_id(request)

    logger.info(
        "Request schema validation failed",
        extra={**payload, "errors": exc.errors()},
    )

    issues = []

    for err in exc.errors():
        field_path = ".".join(str(loc) for loc in err["loc"] if loc != "body")

        issues.append(
            {
                "severity": "error",
                "code": "invalid",
                "diagnostics": err["msg"],
                "expression": [field_path],
            }
        )

    return JSONResponse(
        status_code=400,
        content={
            "resourceType": "OperationOutcome",
            "issue": issues,
        },
        headers=({"X-Request-ID": request_id} if request_id else None),
    )


# -------------------------------------------------------
# Response Validation (Server Bug)
# -------------------------------------------------------
async def response_validation_exception_handler(
    request: Request, exc: ResponseValidationError
):
    payload = _base_log_payload(request)
    request_id = get_request_id(request)

    logger.critical(
        "Response validation failed",
        extra=payload,
        exc_info=True,
    )

    return JSONResponse(
        status_code=500,
        content={
            "resourceType": "OperationOutcome",
            "issue": [
                {
                    "severity": "error",
                    "code": "exception",
                    "diagnostics": "Internal server error",
                }
            ],
        },
        headers=({"X-Request-ID": request_id} if request_id else None),
    )


# -------------------------------------------------------
# Unhandled Exceptions (Crash)
# -------------------------------------------------------
async def unhandled_exception_handler(request: Request, exc: Exception):
    payload = _base_log_payload(request)
    request_id = get_request_id(request)

    payload.update(
        {
            "error_type": type(exc).__name__,
        }
    )

    logger.critical(
        "Unhandled exception occurred",
        extra=payload,
        exc_info=True,
    )

    return JSONResponse(
        status_code=500,
        content={
            "resourceType": "OperationOutcome",
            "issue": [
                {
                    "severity": "error",
                    "code": "exception",
                    "diagnostics": "Internal server error",
                }
            ],
        },
        headers=({"X-Request-ID": request_id} if request_id else None),
    )


async def http_exception_handler(request: Request, exc: HTTPException):
    payload = _base_log_payload(request)
    request_id = get_request_id(request)

    logger.warning(
        "HTTP exception raised",
        extra={**payload, "status_code": exc.status_code, "detail": exc.detail},
    )

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "resourceType": "OperationOutcome",
            "issue": [
                {
                    "severity": "error",
                    "code": _map_to_fhir_issue_code(exc.status_code),
                    "diagnostics": exc.detail,
                }
            ],
        },
        headers=({"X-Request-ID": request_id} if request_id else None),
    )
