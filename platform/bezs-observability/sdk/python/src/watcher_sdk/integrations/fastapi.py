# FastAPI middleware that auto-traces every HTTP request.
# Adds a middleware to the app — no decorator needed on individual routes.
# Records: method, path, status code, duration_ms, trace_id, span_id.
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from watcher_sdk.client import Client


def instrument(app, client: Client) -> None:
    """
    Attach request tracing middleware to a FastAPI (Starlette) application.

    Every incoming request produces one trace event with method, path,
    status code, and wall-clock duration. trace_id comes from the
    incoming X-Trace-ID header or is generated fresh.
    """
    app.add_middleware(_WatcherMiddleware, client=client)


class _WatcherMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, client: Client) -> None:
        super().__init__(app)
        self._client = client

    async def dispatch(self, request: Request, call_next):
        trace_id = request.headers.get("x-trace-id") or str(uuid.uuid4())
        span_id = str(uuid.uuid4())
        start = time.perf_counter()

        response = await call_next(request)

        duration_ms = round((time.perf_counter() - start) * 1000, 2)
        self._client.trace(
            "http.request",
            trace_id=trace_id,
            span_id=span_id,
            payload={
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
            },
        )
        return response
