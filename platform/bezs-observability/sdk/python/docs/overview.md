# Watcher SDK (Python) — Overview

## What Is This?

The Python SDK is the developer-facing interface for sending telemetry
to the Watcher24 platform. Applications import this package and call
simple methods — the SDK handles all the complexity of batching, retrying,
and delivering events to the gateway.

---

## Why an SDK?

Without the SDK, every application would need to:
- Know the gateway URL and authentication format
- Implement batching to avoid per-event HTTP overhead
- Handle retries and backoff on network failure
- Serialize events to the correct schema
- Run a background flush thread

The SDK does all of this once so application developers do none of it.

---

## Public API

```python
from watcher_sdk import Client

client = Client(
    api_key="wtch_your_key_here",
    app_id="billing-api",
    environment="production",
    gateway_url="http://localhost:8080",
)

# Audit event — user actions, compliance trail
client.audit("user.login", user_id="u_123", payload={"method": "email"})

# Log — general application log
client.log("warn", "Slow database query", payload={"duration_ms": 450})

# Trace — distributed request tracing
client.trace("db.query", trace_id="abc", span_id="xyz", payload={"table": "users"})

# Metric — numeric measurements
client.metric("api.latency", payload={"value": 123, "unit": "ms"})

# Flush all buffered events immediately (e.g. before shutdown)
client.flush()

# Shutdown the background flusher cleanly
client.shutdown()
```

---

## How It Works Internally

```
client.audit(...)
  ↓
CaptureEvent use case — validates input, builds Event
  ↓
Buffer — thread-safe in-memory queue
  ↓
Background flusher (every 500ms OR when buffer hits 100 events)
  ↓
HttpTransport — POST /v1/events to gateway (batch)
  ↓
Retry with exponential backoff on failure
```

---

## Where It Fits

```
Application code
  ↓  client.audit() / client.log() / etc.
Watcher Python SDK     ← this package
  ↓  HTTP POST /v1/events (batched)
Go Gateway
  ↓  Redis Streams
Python Worker
  ↓  ClickHouse
```

---

## FastAPI Auto-Instrumentation

```python
from watcher_sdk.integrations.fastapi import instrument

app = FastAPI()
instrument(app, client)
# Now every request is automatically traced
```

---

## Further Reading

- [Architecture](./architecture.md) — clean architecture layers
- [API Reference](./api.md) — all Client methods
- [Configuration](./configuration.md) — Client options
