# Watcher24 Python SDK — AI Skill

Use this file as context when writing code that integrates Watcher24 into a
Python application (FastAPI, Django, Flask, scripts, etc.).

---

## Package

```
watcher-sdk
```

Install:
```bash
pip install watcher-sdk
# or
uv add watcher-sdk
# or
poetry add watcher-sdk

# FastAPI integration extra
pip install "watcher-sdk[fastapi]"
```

## Rules the AI must follow

1. **One client per process** — create a module-level singleton. Never instantiate inside a request handler or function called per-request.
2. **Always call `shutdown()` before process exit** — use `atexit.register` or the lifespan context in FastAPI.
3. **Never hardcode `api_key`** — always read from `os.environ["W24_API_KEY"]`.
4. **Use keyword arguments** — all options after `message` are keyword-only in the Python SDK.
5. **Use typed helpers** (`audit`, `log`, `trace`, `metric`) — never call the generic `event()` unless a typed helper doesn't fit.
6. **Include `user_id` on all `audit()` calls** — audit events without a user_id are useless for compliance.
7. **Thread safety is built-in** — the client uses a lock internally; you do not need external synchronisation.

## Singleton pattern

```python
# watcher.py
import os
from watcher_sdk import Client

client = Client(
    api_key=os.environ.get("W24_API_KEY", ""),
    app_id=os.environ.get("W24_APP_ID", "my-service"),
    gateway_url=os.environ.get("W24_GATEWAY_URL", "http://localhost:8080"),
    environment=os.environ.get("W24_ENVIRONMENT", "production"),
)
```

Register shutdown in your entry point:
```python
import atexit
from watcher import client
atexit.register(client.shutdown)
```

## FastAPI lifespan pattern (preferred)

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from watcher import client

@asynccontextmanager
async def lifespan(app: FastAPI):
    client.log("info", "server.started", payload={"app": "my-api"})
    yield
    client.shutdown()   # flush all buffered events before exit

app = FastAPI(lifespan=lifespan)
```

## All SDK methods with signatures

```python
# Audit — user actions, compliance trail
client.audit(
    message: str,
    *,
    user_id: str = "",
    session_id: str = "",
    trace_id: str = "",
    span_id: str = "",
    payload: dict | None = None,
) -> None

# Log — application events
client.log(
    severity: str,   # "debug" | "info" | "warn" | "error" | "critical"
    message: str,
    *,
    trace_id: str = "",
    span_id: str = "",
    payload: dict | None = None,
) -> None

# Trace — distributed spans
client.trace(
    message: str,
    *,
    trace_id: str = "",
    span_id: str = "",
    parent_span_id: str = "",
    payload: dict | None = None,
) -> None

# Metric — numeric measurements
client.metric(
    message: str,
    *,
    payload: dict | None = None,  # always include {"value": number}
) -> None

# Lifecycle
client.flush() -> None    # blocks until all buffered events are sent
client.shutdown() -> None # flush then stop background thread
```

## FastAPI auto-tracing middleware

```python
from watcher_sdk.integrations.fastapi import instrument
from watcher import client

instrument(app, client)
# Every request now produces a trace event with method, path, status_code, duration_ms
```

## Common patterns

### Auth audit
```python
@router.post("/auth/login")
async def login(body: LoginRequest, request: Request):
    user_id = authenticate(body.email, body.password)  # your auth logic
    client.audit(
        "user.login",
        user_id=user_id,
        payload={
            "email": body.email,
            "ip": request.client.host if request.client else "unknown",
        },
    )
    return {"token": create_token(user_id)}
```

### CRUD audit
```python
@router.delete("/items/{item_id}")
async def delete_item(item_id: str, user_id: str = Query(...)):
    item = await db.get(item_id)
    await db.delete(item_id)
    client.audit(
        "item.deleted",
        user_id=user_id,
        payload={"item_id": item_id, "name": item.name},
    )
```

### Explicit trace span
```python
import time, uuid

start = time.perf_counter()
result = await db.query(sql)
duration_ms = round((time.perf_counter() - start) * 1000, 2)

client.trace(
    "db.query",
    trace_id=request_trace_id,
    span_id=str(uuid.uuid4()),
    payload={"query": "get_user", "duration_ms": duration_ms},
)
```

### Error handler
```python
@app.exception_handler(Exception)
async def unhandled(request: Request, exc: Exception):
    client.log(
        "error",
        "unhandled.exception",
        payload={
            "type": type(exc).__name__,
            "message": str(exc),
            "path": request.url.path,
        },
    )
    return JSONResponse(status_code=500, content={"detail": "internal error"})
```

### Metric on background job
```python
async def process_queue():
    processed = 0
    async for item in queue:
        await handle(item)
        processed += 1
    client.metric("queue.processed", payload={"value": processed})
```

## Environment variables

```bash
W24_API_KEY=wtch_...            # required
W24_APP_ID=my-service           # required
W24_GATEWAY_URL=http://localhost:8080  # optional
W24_ENVIRONMENT=production      # optional
```

Load with python-dotenv:
```python
from dotenv import load_dotenv
load_dotenv()  # must be called before importing watcher.py
```

## Do NOT do these

```python
# ❌ Creating client inside a request handler
@app.post("/event")
async def handler():
    c = Client(api_key=...)  # new thread per request!
    c.audit(...)

# ❌ Hardcoded key
client = Client(api_key="wtch_abc123", ...)

# ❌ Missing shutdown
# FastAPI exits, background flush thread is killed, events lost.

# ❌ Audit without user_id
client.audit("document.deleted", payload={"id": doc_id})  # who deleted it?

# ❌ Positional args after message
client.log("info", "started", {"port": 3000})  # TypeError — use payload={"port": 3000}
```
