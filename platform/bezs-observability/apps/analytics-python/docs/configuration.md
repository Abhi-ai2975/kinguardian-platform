# Analytics Worker — Configuration

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |
| `CLICKHOUSE_HOST` | `localhost` | ClickHouse hostname |
| `CLICKHOUSE_HTTP_PORT` | `8123` | ClickHouse HTTP interface port |
| `CLICKHOUSE_DB` | `watcher` | ClickHouse database name |
| `CLICKHOUSE_USER` | `watcher` | ClickHouse username |
| `CLICKHOUSE_PASSWORD` | `watcher_secret` | ClickHouse password |
| `WORKER_BATCH_SIZE` | `100` | Events read per XREADGROUP call |
| `WORKER_BLOCK_MS` | `2000` | Milliseconds to block waiting for new messages |
| `WORKERS` | `audit,log,trace,metric,ai` | Comma-separated list of workers to run |
| `IAM_BASE_URL` | `http://localhost:3001` | Base URL of the IAM service — used by the retention scheduler |
| `IAM_INTERNAL_SECRET` | _(empty)_ | Shared secret sent as `x-internal-secret` to IAM internal endpoints |
| `RETENTION_INTERVAL_SECONDS` | `86400` | How often the retention scheduler runs a purge pass (seconds) |

---

## Running Locally

```bash
# From project root — make sure infrastructure is up
docker compose up -d

# From apps/analytics-python
uv sync
uv run python main.py
```

---

## Running Tests

```bash
# Unit tests (no infrastructure needed)
uv run pytest tests/unit/ -v

# All tests (requires docker compose up -d)
uv run pytest -v
```
