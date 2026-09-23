# realtime-go — Configuration

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8081` | HTTP/WebSocket listen port |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `IAM_DATABASE_URL` | — | **Required.** PostgreSQL URL for API key validation (read-only) |
| `REGION` | `""` | Optional deployment region label |

---

## `.env.example`

```dotenv
PORT=8081
REDIS_URL=redis://localhost:6379
IAM_DATABASE_URL=postgresql://watcher:watcher_secret@localhost:5433/iam
REGION=
```

---

## Notes

- `IAM_DATABASE_URL` points to the IAM PostgreSQL database (not the watcher database).
  The realtime service only reads from the `apikey` table to validate connections.
- The service has no persistent state of its own — all state lives in Redis and IAM.
- For production, run behind a TLS-terminating proxy. The service itself speaks plain HTTP/WS.
