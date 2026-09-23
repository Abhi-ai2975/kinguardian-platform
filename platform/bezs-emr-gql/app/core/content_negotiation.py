"""
HTTP content negotiation utilities for dual-format API responses.

The middleware layer supports two response formats, selected at runtime by the client
via the standard HTTP `Accept` header:

  Accept: application/fhir+json  →  FHIR R4 resource / Bundle format
  Accept: application/json       →  Plain JSON (default when header is absent)

How it works:
  - The router reads the Accept header from the incoming client request.
  - That header value is forwarded to the FHIR Server via FhirClient.
  - The FHIR Server performs the actual format transformation and returns the
    response in the requested format.
  - This module's helpers wrap the returned dict in a JSONResponse with the
    correct media_type so the client receives the matching Content-Type header.

There is no local transformation step — the FHIR Server owns all format logic.
"""

from fastapi import Request
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse

# The IANA-registered media type for FHIR JSON resources.
# Clients send this in the Accept header to request FHIR R4 format.
FHIR_MEDIA_TYPE = "application/fhir+json"


def wants_fhir(request: Request) -> bool:
    """
    Return True when the client signals it wants a FHIR-formatted response.

    Checks for the presence of `application/fhir+json` anywhere in the Accept header
    so both exact matches (`Accept: application/fhir+json`) and quality-weighted lists
    (`Accept: application/fhir+json;q=0.9, application/json`) are handled correctly.

    Args:
        request: The current FastAPI/Starlette request.

    Returns:
        True if the client prefers FHIR format, False for plain JSON (default).
    """
    return FHIR_MEDIA_TYPE in request.headers.get("accept", "")


def get_accept_header(request: Request) -> str | None:
    """
    Extract the raw Accept header value from the request to forward to the FHIR Server.

    Returns None when the header is absent so callers can distinguish between
    "client explicitly asked for plain JSON" and "client sent no preference".
    The FHIR Server defaults to plain JSON when no Accept header is received.

    Args:
        request: The current FastAPI/Starlette request.

    Returns:
        The Accept header string, or None if not present.
    """
    return request.headers.get("accept") or None


def format_response(data: dict, request: Request) -> JSONResponse:
    """
    Wrap a response dict in a JSONResponse with the correct media_type.

    The `data` dict is already in the format the client requested — either FHIR R4
    or plain JSON — because the Accept header was forwarded to the FHIR Server which
    performed the transformation. This function only sets the matching Content-Type
    header on the outgoing response so clients can confirm which format they received.

    jsonable_encoder handles Python types that are not JSON-serialisable by default
    (datetime, Decimal, Enum subclasses, Pydantic models, etc.).

    Args:
        data:    The response dict returned by the FHIR Server (already correctly formatted).
        request: The current request — used to check the Accept header for media_type selection.

    Returns:
        JSONResponse with Content-Type set to application/fhir+json or application/json.
    """
    media_type = FHIR_MEDIA_TYPE if wants_fhir(request) else "application/json"
    return JSONResponse(content=jsonable_encoder(data), media_type=media_type)


def format_paginated_response(data: dict, request: Request) -> JSONResponse:
    """
    Wrap a paginated response dict in a JSONResponse with the correct media_type.

    For plain JSON the FHIR Server returns:
        { "total": N, "limit": N, "offset": N, "data": [...] }

    For FHIR format the FHIR Server returns a FHIR Bundle:
        { "resourceType": "Bundle", "type": "searchset", "total": N, "entry": [...] }

    As with format_response, the transformation is done by the FHIR Server; this
    function only applies the correct Content-Type to the outgoing JSONResponse.

    Args:
        data:    The paginated response dict from the FHIR Server.
        request: The current request — used to determine the media_type.

    Returns:
        JSONResponse with the appropriate Content-Type for the requested format.
    """
    media_type = FHIR_MEDIA_TYPE if wants_fhir(request) else "application/json"
    return JSONResponse(content=jsonable_encoder(data), media_type=media_type)
