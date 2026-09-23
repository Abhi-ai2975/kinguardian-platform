"""
Core HTTP Middleware:
Correlation ID propagation, Security headers, and structured telemetry context.
"""

import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.logging import (
    request_id_ctx_var,
    trace_id_ctx_var,
    actor_id_ctx_var,
    family_id_ctx_var,
    subject_id_ctx_var
)


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        trace_id = request.headers.get("X-Trace-ID", request.headers.get("traceparent", str(uuid.uuid4())))
        actor_id = request.headers.get("X-Actor-ID", request.headers.get("X-User-ID", ""))
        family_id = request.headers.get("X-Family-ID", "")
        subject_id = request.headers.get("X-Subject-ID", "")

        t_req = request_id_ctx_var.set(request_id)
        t_trace = trace_id_ctx_var.set(trace_id)
        t_actor = actor_id_ctx_var.set(actor_id)
        t_fam = family_id_ctx_var.set(family_id)
        t_sub = subject_id_ctx_var.set(subject_id)

        try:
            response = await call_next(request)
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Trace-ID"] = trace_id
            return response
        finally:
            request_id_ctx_var.reset(t_req)
            trace_id_ctx_var.reset(t_trace)
            actor_id_ctx_var.reset(t_actor)
            family_id_ctx_var.reset(t_fam)
            subject_id_ctx_var.reset(t_sub)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response
