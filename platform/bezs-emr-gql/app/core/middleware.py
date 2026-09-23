"""
Starlette middleware for request correlation IDs.

Every HTTP request processed by this service is tagged with a unique request ID so
that log lines across multiple services can be correlated back to a single client
request. The ID is taken from the incoming X-Request-ID header when the client
provides one (useful for distributed tracing where the caller already has an ID),
or generated fresh as a UUID4 otherwise.

The ID is also attached to `request.state.request_id` so route handlers can
include it in response bodies (e.g. the /health endpoint).
"""

import uuid
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware


class RequestIdMiddleware(BaseHTTPMiddleware):
    """
    Middleware that ensures every request and response carries an X-Request-ID header.

    Execution order note: Starlette middleware is applied in reverse registration order.
    This middleware is registered last in app.main, so it runs first — meaning the
    request ID is available on request.state before any other middleware or handler
    executes, which is important for logging middleware that reads request.state.request_id.
    """

    async def dispatch(self, request: Request, call_next):
        """
        Intercept the request, attach a request ID, forward it, then echo the ID
        back in the response header.

        Args:
            request:   The incoming Starlette request object.
            call_next: Callable that passes control to the next middleware or route handler.

        Returns:
            The response with X-Request-ID set to the same value stored on request.state.
        """
        # Honour the caller's ID if provided (e.g. from an upstream API gateway or
        # frontend that already generated a trace ID for this user interaction).
        # Fall back to a fresh UUID4 if no header is present.
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))

        # Store on request.state so route handlers and other middleware can read it
        # without re-parsing the header.
        request.state.request_id = request_id

        response = await call_next(request)

        # Echo the ID in the response so clients can correlate their request logs
        # with server-side logs using the same ID.
        response.headers["X-Request-ID"] = request_id
        return response
