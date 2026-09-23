# Analytics Worker — Architecture

## Clean Architecture

Same dependency rule as the Go Gateway: outer layers depend on inner, never the reverse.

```
Domain (Pydantic models — no external I/O)
  ↑
Ports (Abstract base classes — interfaces only)
  ↑
Use Cases (processing logic — depends on ports only)
  ↑
Adapters (Redis consumer, ClickHouse repository)
  ↑
Workers (consume loop — the transport layer equivalent)
  ↑
main.py (composition root — wires everything together)
```

---

## Layer Breakdown

### 1. Domain (`src/domain/`)

Pydantic models and enums. No Redis, no ClickHouse, no HTTP imports.

| File | Purpose |
|------|---------|
| `event.py` | `Event` Pydantic model — canonical telemetry event |

---

### 2. Ports (`src/ports/`)

Abstract base classes defining the contracts use cases depend on.

| File | Abstract Class | Purpose |
|------|---------------|---------|
| `consumer.py` | `StreamConsumer` | Read + acknowledge batches from a queue |
| `repository.py` | `EventRepository` | Persist a batch of events to storage |
| `retention.py` | `RetentionRepository` | Delete events older than a cutoff timestamp |

---

### 3. Use Cases (`src/usecases/`)

Business logic for processing a batch of raw stream messages into stored events.

| File | Class | What It Does |
|------|-------|-------------|
| `process_batch.py` | `ProcessBatchUseCase` | Deserialize → validate → normalize → store |
| `purge_expired_events.py` | `PurgeExpiredEventsUseCase` | Fetch org retention windows from IAM → delete expired events per org |

---

### 4. Adapters (`src/adapters/`)

Concrete implementations of the port interfaces.

| Package | Implements | Technology |
|---------|-----------|-----------|
| `adapters/redis_adapter` | `StreamConsumer` | Redis Streams via `redis-py` |
| `adapters/clickhouse_adapter/repository.py` | `EventRepository` | Bulk INSERT via `clickhouse-connect` |
| `adapters/clickhouse_adapter/retention.py` | `RetentionRepository` | `ALTER TABLE DELETE` via `clickhouse-connect` |

---

### 5. Workers (`src/workers/`)

The consume loop — equivalent to the transport layer in the gateway.
Each worker knows its stream topic and runs the process-batch use case on repeat.

| File | Worker | Type | Stream / Schedule |
|------|--------|------|-------------------|
| `base.py` | `BaseWorker` | Abstract | Shared consume loop logic |
| `audit_worker.py` | `AuditWorker` | Stream consumer | `stream:audit` |
| `log_worker.py` | `LogWorker` | Stream consumer | `stream:log` |
| `trace_worker.py` | `TraceWorker` | Stream consumer | `stream:trace` |
| `metric_worker.py` | `MetricWorker` | Stream consumer | `stream:metric` |
| `retention_scheduler.py` | `RetentionScheduler` | Periodic job | Every 24h (configurable) |

`RetentionScheduler` is not a stream consumer — it owns a timer loop rather than an XREADGROUP loop. It runs immediately on startup then sleeps between passes. Its sole dependency is `PurgeExpiredEventsUseCase`.

---

### 6. `main.py` (Composition Root)

Wires all layers together and starts workers.

```
Load config
  ↓
Connect Redis + ClickHouse (verify both reachable at startup)
  ↓
Create adapters (one ClickHouse client per thread — not thread-safe)
  ↓
Create use cases (inject adapters via port interfaces)
  ↓
Create stream workers (inject Redis consumer + ProcessBatchUseCase)
  ↓
Create retention scheduler (inject PurgeExpiredEventsUseCase)
  ↓
Start all threads as daemons — block main thread on join()
```
