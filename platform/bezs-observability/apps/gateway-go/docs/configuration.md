# Gateway — Configuration

All configuration is loaded from environment variables.
Copy `../../.env.example` to `../../.env` and fill in the values.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GATEWAY_PORT` | `8080` | HTTP port the gateway listens on |
| `GATEWAY_ENV` | `development` | Environment name (`development`, `staging`, `production`) |
| `GATEWAY_DEFAULT_COUNTRY` | `""` | ISO alpha-2 fallback when GeoIP can't resolve the client IP (e.g. `127.0.0.1` in local dev). Leave empty in production. |
| `IAM_DATABASE_URL` | `postgresql://watcher:watcher_secret@localhost:5433/iam` | PostgreSQL connection string for the IAM database (read-only) |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string for publishing to streams |
| `CLICKHOUSE_URL` | `http://localhost:8123` | ClickHouse HTTP endpoint used to count monthly events for plan limit enforcement |
| `CLICKHOUSE_USER` | `watcher` | ClickHouse username |
| `CLICKHOUSE_PASSWORD` | `watcher_secret` | ClickHouse password |
| `CLICKHOUSE_DB` | `watcher` | ClickHouse database name |

---

## Running Locally

```bash
# From the project root, make sure infrastructure is up
docker compose up -d

# From apps/gateway-go
go run main.go
```

The gateway will start on `http://localhost:8080`.

---

## Running with Air (hot reload)

```bash
# Install air
go install github.com/air-verse/air@latest

# From apps/gateway-go
air
```

---

## Health Check

```bash
curl http://localhost:8080/health
```

Expected response:
```json
{ "status": "ok", "redis": "ok", "iam_db": "ok" }
```
