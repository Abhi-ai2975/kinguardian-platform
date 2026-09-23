# notifier-go — Configuration

All settings are read from environment variables. Copy `.env.example` to the root `.env`.

| Variable | Default | Description |
|----------|---------|-------------|
| `NOTIFIER_PORT` | `4004` | HTTP port |
| `NOTIFIER_ENV` | `development` | Deployment environment |
| `NOTIFIER_INTERNAL_SECRET` | `change-me` | Shared secret for `X-Internal-Secret` header |
| `WATCHER24_DATABASE_URL` | `postgresql://watcher:watcher_secret@localhost:5433/watcher24` | PostgreSQL connection string (watcher24 DB) |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |
| `SMTP_HOST` | `smtp.gmail.com` | SMTP server hostname |
| `SMTP_PORT` | `587` | SMTP port (587 = STARTTLS) |
| `SMTP_EMAIL` | — | Authenticated sender address |
| `SMTP_PASS` | — | SMTP password or app password |
| `SMTP_FROM_NAME` | `Watcher24` | Display name in the From header |
| `CHANNELS_ENABLED` | `email,in_app` | Comma-separated list of active channels |
