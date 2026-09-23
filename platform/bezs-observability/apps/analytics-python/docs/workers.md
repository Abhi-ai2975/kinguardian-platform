# Analytics Worker — Worker Details

## Consume Loop

Every worker runs this loop forever:

```
while True:
    messages = XREADGROUP stream:<type> consumer_group batch_size=100 block=2000ms
    if no messages:
        continue
    
    process_batch(messages)   # validate + normalize + bulk insert to ClickHouse
    XACK stream:<type> all message IDs  # only after successful insert
    
    on exception:
        log error, sleep 1s, retry (message stays pending in Redis)
```

---

## Consumer Groups

Each worker type has its own consumer group name:

| Worker | Consumer Group |
|--------|---------------|
| AuditWorker | `cg:audit` |
| LogWorker | `cg:log` |
| TraceWorker | `cg:trace` |
| MetricWorker | `cg:metric` |

Multiple instances of the same worker can share a consumer group —
Redis will distribute messages across them automatically.

---

## Batch Size

Default batch size: **100 events per read**.

This means:
- One XREADGROUP call reads up to 100 messages
- One ClickHouse bulk INSERT per batch
- One XACK per batch (only on success)

---

## Pending Message Recovery

If a worker crashes mid-batch, the messages stay in the **PEL** (Pending Entry List).
On restart, the worker claims them via `XAUTOCLAIM` before reading new messages.

This ensures **at-least-once delivery** — no events are lost on crash.

---

## ClickHouse Bulk Insert

Events are inserted using `clickhouse-connect`'s `insert` method which sends
a single HTTP request with all rows — much faster than one INSERT per event.

The payload (arbitrary JSON) is serialized to a string before insert,
matching the `String` column type in the `watcher.events` table.

---

## RetentionScheduler

`RetentionScheduler` is a **periodic job**, not a stream consumer. It has no Redis dependency and does not extend `BaseWorker`.

### How it works

```
On startup: run one pass immediately
  ↓
Sleep RETENTION_INTERVAL_SECONDS (default 86400 = 24h)
  ↓
Run pass → sleep → repeat forever
```

### One pass

```
1. GET /api/internal/orgs/retention (IAM)
      → [{ orgId, plan, retentionDays }, ...]
2. For each org:
      cutoff = now() - retentionDays
      ALTER TABLE watcher.events DELETE
        WHERE organization_id = orgId
          AND timestamp < cutoff
3. Log: purged=N errors=M
```

### Error handling

Errors on individual orgs are logged and skipped — one bad org does not abort the entire pass. If the IAM call fails, the whole pass is skipped and retried on the next interval.

`ALTER TABLE DELETE` in ClickHouse is asynchronous — rows are removed during the next MergeTree merge cycle, not instantly. This is expected behaviour.

### Configuration

| Env var | Default | Description |
|---------|---------|-------------|
| `IAM_BASE_URL` | `http://localhost:3001` | IAM service base URL |
| `IAM_INTERNAL_SECRET` | `""` | Must match IAM's `INTERNAL_API_SECRET` |
| `RETENTION_INTERVAL_SECONDS` | `86400` | Seconds between retention passes |
