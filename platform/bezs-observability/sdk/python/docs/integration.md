# Watcher SDK (Python) — Integration Guide

## Installation

```bash
uv add watcher-sdk
# or pip install watcher-sdk
```

---

## 1. Basic Setup — Any Python App

Create **one client per process** and reuse it for the lifetime of the process.

```python
# watcher.py  ← create once, import everywhere
import os
from watcher_sdk import Client

client = Client(
    api_key=os.environ["WATCHER_API_KEY"],
    app_id=os.environ["WATCHER_APP_ID"],
    environment=os.environ.get("WATCHER_ENVIRONMENT", "production"),
    gateway_url=os.environ.get("WATCHER_GATEWAY_URL", "http://localhost:8080"),
)
```

Then import and use it:

```python
from watcher import client

client.audit("user.login", user_id="u_123", payload={"method": "email"})
client.log("warn", "Slow query", payload={"table": "users", "duration_ms": 1200})
```

---

## 2. Graceful Shutdown

Always call `shutdown()` before the process exits so buffered events are flushed.

```python
import atexit
from watcher import client

atexit.register(client.shutdown)
```

---

## 3. FastAPI

### Auto-trace every request

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from watcher_sdk import Client
from watcher_sdk.integrations.fastapi import instrument

client = Client(
    api_key=os.environ["WATCHER_API_KEY"],
    app_id="my-api",
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield                  # app runs
    client.shutdown()      # flush on shutdown

app = FastAPI(lifespan=lifespan)
instrument(app, client)   # auto-traces every request
```

### Audit events inside route handlers

```python
from fastapi import FastAPI, Depends, Request
from watcher import client

@app.post("/orders")
async def create_order(request: Request, body: OrderRequest):
    order = await order_service.create(body)

    client.audit(
        "order.created",
        user_id=request.state.user_id,
        payload={"order_id": order.id, "amount": order.total},
    )
    return order
```

### Distributed tracing across services

```python
from fastapi import FastAPI, Request
import httpx
from watcher import client

@app.get("/checkout/{cart_id}")
async def checkout(cart_id: str, request: Request):
    trace_id = request.headers.get("x-trace-id", str(uuid.uuid4()))

    client.trace(
        "checkout.start",
        trace_id=trace_id,
        span_id=str(uuid.uuid4()),
        payload={"cart_id": cart_id},
    )

    # Propagate trace ID to downstream services
    async with httpx.AsyncClient() as http:
        await http.post(
            "http://payments-service/charge",
            headers={"x-trace-id": trace_id},
            json={"cart_id": cart_id},
        )
```

---

## 4. Django

```python
# apps/telemetry/apps.py
import os
import atexit
from django.apps import AppConfig
from watcher_sdk import Client

class TelemetryConfig(AppConfig):
    name = "apps.telemetry"

    def ready(self):
        from apps.telemetry import watcher
        watcher.client = Client(
            api_key=os.environ["WATCHER_API_KEY"],
            app_id="django-app",
        )
        atexit.register(watcher.client.shutdown)
```

```python
# apps/telemetry/__init__.py
from watcher_sdk import Client
client: Client  # set in TelemetryConfig.ready()
```

```python
# In any view
from apps.telemetry import watcher

def my_view(request):
    watcher.client.audit("page.viewed", user_id=str(request.user.id))
```

---

## 5. Background Workers / Celery

```python
# tasks.py
from celery import Celery
from watcher import client

app = Celery("tasks")

@app.task
def process_payment(order_id: str):
    try:
        result = charge(order_id)
        client.audit("payment.succeeded", payload={"order_id": order_id})
        return result
    except Exception as exc:
        client.log("error", "Payment failed", payload={"order_id": order_id, "error": str(exc)})
        raise
```

---

## 6. Metrics

```python
import time
from watcher import client

def timed_query(sql: str):
    start = time.perf_counter()
    result = db.execute(sql)
    duration_ms = (time.perf_counter() - start) * 1000

    client.metric("db.query.duration", payload={
        "value": round(duration_ms, 2),
        "unit": "ms",
        "query": sql[:100],
    })
    return result
```

---

## 7. Security Events

```python
from watcher import client

def login(username: str, password: str, ip: str):
    user = authenticate(username, password)
    if user is None:
        client.event("security", "warn", "login.failed", payload={
            "username": username,
            "ip": ip,
        })
        raise AuthError("Invalid credentials")

    client.audit("user.login", user_id=user.id, payload={"ip": ip})
    return user
```

---

## 8. AI / LLM Observability

```python
from watcher import client

def call_llm(prompt: str, model: str) -> str:
    start = time.perf_counter()
    response = llm.generate(prompt, model=model)
    duration_ms = (time.perf_counter() - start) * 1000

    client.event("ai", "info", "llm.completion", payload={
        "model": model,
        "prompt_tokens": response.usage.prompt_tokens,
        "completion_tokens": response.usage.completion_tokens,
        "duration_ms": round(duration_ms, 2),
    })
    return response.text
```
