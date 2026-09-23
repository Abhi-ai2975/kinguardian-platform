# Watcher SDK (Python) — API Reference

## Key types

| Key prefix | Used with | `app_id` needed? |
|------------|-----------|-----------------|
| `wt_...`   | Server SDKs (Python, Go, Node.js) | Only for legacy org-level keys. App-scoped keys resolve automatically. |
| `wpub_...` | Browser SDK only — not for server-side use | Never — gateway resolves app from the token. |

Create keys in **Settings → API Keys** in the console.

---

## Client

```python
from watcher_sdk import Client

client = Client(
    api_key="wt_...",             # required — server-side secret key
    # app_id is optional: only set if using a legacy org-level key with no app linked.
    # App-scoped keys (the default) resolve the app automatically at the gateway.
    # app_id="billing-api",
    service_name="payment-api",   # optional — component label shown in the dashboard
    environment="production",     # optional — default: "production"
    gateway_url="http://...",     # optional — default: "http://localhost:8080"
    flush_interval=0.5,           # optional — seconds between auto-flushes (default: 0.5)
    flush_at=100,                 # optional — flush when buffer reaches N events (default: 100)
    max_buffer=10_000,            # optional — drop oldest if buffer exceeds this (default: 10000)
)
```

Events sent with a server-side key are tagged `source: "server"` by the gateway.
If the same application also has a browser SDK with a `wpub_` public token,
browser/mobile/desktop events appear tagged `source: "client"` — both land in the same app dashboard.
Use `service_name` to distinguish sub-components (e.g. `"payment-api"`, `"auth-worker"`).

---

## Methods

### `client.audit(message, *, user_id="", session_id="", trace_id="", span_id="", payload=None)`

Captures an audit event — user actions, compliance trail, security events.

```python
client.audit("user.login", user_id="u_123", payload={"method": "email", "ip": "1.2.3.4"})
client.audit("patient.record.updated", user_id="doc_456", payload={"record_id": "r_001"})
client.audit("api_key.created", user_id="u_789")
```

---

### `client.log(severity, message, *, trace_id="", span_id="", payload=None)`

Captures an application log event.

**severity:** `"debug"` `"info"` `"warn"` `"error"` `"critical"`

```python
client.log("info", "Request completed", payload={"duration_ms": 45})
client.log("error", "Payment failed", payload={"order_id": "o_001", "reason": "timeout"})
client.log("warn", "Slow query detected", payload={"table": "users", "duration_ms": 1200})
```

---

### `client.trace(message, *, trace_id="", span_id="", parent_span_id="", payload=None)`

Captures a distributed trace span.

```python
client.trace("db.query", trace_id="abc123", span_id="s001", payload={"table": "orders", "duration_ms": 12})
client.trace("http.request", trace_id="abc123", span_id="s002", parent_span_id="s001")
```

---

### `client.metric(message, *, payload=None)`

Captures a metric data point. Put the numeric value in payload.

```python
client.metric("api.latency", payload={"value": 123, "unit": "ms", "endpoint": "/v1/orders"})
client.metric("queue.depth", payload={"value": 42, "queue": "emails"})
```

---

### `client.ai(severity, message, *, trace_id="", span_id="", parent_span_id="", payload=None)`

Records an AI agent event. Always include a `payload` with a `kind` field.

**severity:** `"debug"` `"info"` `"warn"` `"error"` `"critical"`

```python
client.ai("info", "llm.call.completed",
    trace_id=trace_id,
    span_id=f"llm-{int(time.time() * 1000)}",
    payload={
        "kind": "llm_call", "provider": "openai", "model": "gpt-4o",
        "total_tokens": 1240, "cost_usd": 0.0037, "latency_ms": 820,
    }
)

client.ai("info", "tool.call.completed",
    trace_id=trace_id,
    payload={"kind": "tool_call", "tool_name": "web_search", "latency_ms": 340, "success": True}
)
```

`EVENT_TYPE_AI` (`"ai"`) is exported from `watcher_sdk` for use with the generic `event()` method.

---

### `client.event(event_type, severity, message, *, ...)`

Generic method — use when the typed helpers don't fit.

```python
client.event("security", "critical", "Brute force detected", payload={"ip": "1.2.3.4"})
client.event("ai", "info", "Agent completed", payload={"tokens": 1240, "model": "claude-sonnet-4-6"})
```

---

### `client.flush()`

Immediately sends all buffered events to the gateway. Blocks until complete.
Call before application shutdown to ensure no events are lost.

```python
client.flush()
```

---

### `client.shutdown()`

Flushes remaining events and stops the background flusher thread.
Call once when the application is shutting down.

```python
client.shutdown()
```
