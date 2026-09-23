import uuid
from fastapi import Request
from app.core.request_context import request_id_ctx_var


async def request_context_middleware(request: Request, call_next):
    request_id = str(uuid.uuid4())

    # Store in contextvar
    request_id_ctx_var.set(request_id)

    # Also attach to request.state (optional)
    request.state.request_id = request_id

    response = await call_next(request)

    response.headers["X-Request-ID"] = request_id

    return response
