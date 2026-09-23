# Watcher SDK (Python) — Configuration

## Client Options

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `api_key` | `str` | **required** | API key from IAM (`wtch_...` prefix) |
| `app_id` | `str` | **required** | Your application name (e.g. `billing-api`) |
| `environment` | `str` | `"production"` | Deployment environment label |
| `gateway_url` | `str` | `"http://localhost:8080"` | URL of the Watcher24 gateway |
| `flush_interval` | `float` | `0.5` | Seconds between automatic flushes |
| `flush_at` | `int` | `100` | Flush immediately when buffer reaches this many events |
| `max_buffer` | `int` | `10000` | Drop oldest events when buffer exceeds this limit |

---

## Environment Variables

The SDK does not read environment variables automatically — pass values explicitly to `Client(...)`.
Use your application's own config loader (e.g. `python-dotenv`) to feed them in:

```python
import os
from dotenv import load_dotenv
from watcher_sdk import Client

load_dotenv()

client = Client(
    api_key=os.environ["WATCHER_API_KEY"],
    app_id=os.environ["WATCHER_APP_ID"],
    environment=os.environ.get("WATCHER_ENVIRONMENT", "production"),
    gateway_url=os.environ.get("WATCHER_GATEWAY_URL", "http://localhost:8080"),
)
```

---

## Recommended `.env.example`

```dotenv
WATCHER_API_KEY=wtch_your_key_here
WATCHER_APP_ID=my-service
WATCHER_ENVIRONMENT=production
WATCHER_GATEWAY_URL=http://localhost:8080
```

---

## Tuning the Buffer

### `flush_interval` (time-based trigger)

How often the background thread wakes up and flushes. Lower = more frequent network calls,
lower latency. Higher = fewer calls, higher latency. Default (0.5s) suits most applications.

```python
# Higher-volume service: flush every 250ms
client = Client(..., flush_interval=0.25)

# Batch/offline workload: flush every 2s
client = Client(..., flush_interval=2.0)
```

### `flush_at` (size-based trigger)

Flush immediately when the buffer reaches this count, regardless of interval.
Prevents memory spikes during traffic bursts.

```python
# Smaller batches to gateway (lower per-batch latency)
client = Client(..., flush_at=50)

# Larger batches (fewer requests, higher throughput)
client = Client(..., flush_at=500)
```

### `max_buffer` (overflow protection)

When the buffer reaches this limit, the oldest events are dropped to make room for new ones.
This is a safety valve — if you're regularly hitting this limit, increase `flush_at` or
decrease `flush_interval`.

```python
# Conservative memory limit for constrained environments
client = Client(..., max_buffer=1_000)
```

---

## Graceful Shutdown

Always call `shutdown()` before your process exits to flush remaining events:

```python
import atexit

client = Client(...)
atexit.register(client.shutdown)
```

Or with explicit lifecycle management:

```python
try:
    run_application(client)
finally:
    client.shutdown()
```

**FastAPI / lifespan:**

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from watcher_sdk import Client
from watcher_sdk.integrations.fastapi import instrument

client = Client(api_key="wtch_...", app_id="my-api")

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    client.shutdown()

app = FastAPI(lifespan=lifespan)
instrument(app, client)
```

---

## Gateway Retry Behaviour

The HTTP transport retries failed requests with exponential backoff:

| Attempt | Delay |
|---------|-------|
| 1st retry | 100ms |
| 2nd retry | 200ms |
| 3rd retry | 400ms |

If all retries fail, the batch is discarded and a warning is logged to stderr.
Events are not re-queued to avoid unbounded memory growth.
