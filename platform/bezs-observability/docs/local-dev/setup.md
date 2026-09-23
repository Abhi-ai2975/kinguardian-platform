# Local Development Setup — Watcher24

## Overview

Watcher24 is a monorepo with seven services that must all run to have a working local environment. This guide walks through getting everything running from a clean checkout.

```
Infrastructure (Docker):  PostgreSQL · ClickHouse · Redis · MinIO
Services:
  apps/iam/              → http://localhost:5000   (Next.js — identity & auth)
  apps/gateway-go/       → http://localhost:8080   (Go — telemetry ingestion)
  apps/realtime-go/      → http://localhost:8081   (Go — WebSocket fan-out)
  apps/analytics-python/ → no HTTP port            (Python — stream workers)
  apps/notifier-go/      → http://localhost:4004   (Go — email/in-app notification delivery)
  apps/console/          → http://localhost:3001   (Next.js — dashboard UI)
```

---

## Prerequisites

Install these before starting:

| Tool | Version | Install |
|------|---------|---------|
| Docker Desktop | Latest | https://www.docker.com/products/docker-desktop |
| Node.js | 20+ | https://nodejs.org |
| pnpm | 9+ | `npm install -g pnpm` |
| Go | 1.22+ | https://go.dev/dl |
| Python | 3.12+ | https://www.python.org/downloads |
| uv | Latest | `pip install uv` or `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| just | Latest | `cargo install just` or `brew install just` |

Verify:
```bash
docker --version
node --version
pnpm --version
go version
python --version
uv --version
just --version
```

---

## 1 — Clone and Install

```bash
git clone <repo-url> watcher24
cd watcher24

# Install all JS/TS dependencies (console, IAM, SDKs, examples)
pnpm install
```

---

## 2 — Start Infrastructure

```bash
docker compose up -d
```

This starts four containers:

| Container | Port | Credentials |
|-----------|------|-------------|
| `watcher_postgres` | `5433` (host) → `5432` (container) | user: `watcher`, password: `watcher_secret`, db: `watcher` |
| `watcher_clickhouse` | `8123` (HTTP), `9000` (TCP) | user: `watcher`, password: `watcher_secret`, db: `watcher` |
| `watcher_redis` | `6379` | no auth |
| `watcher_minio` | `9002` (S3 API), `9001` (console UI) | user: `watcher`, password: `watcher_secret` |

**Verify all containers are healthy:**
```bash
docker compose ps
```

All four should show `healthy` in the STATUS column. If any show `starting`, wait 10–15 seconds and check again.

**Postgres note:** the port is `5433` on the host (not the standard 5432) to avoid conflicts with a locally installed PostgreSQL.

---

## 3 — Environment Files

Each service needs a `.env` file copied from its `.env.example`. Do this for all five services:

```bash
cp apps/iam/.env.example              apps/iam/.env
cp apps/gateway-go/.env.example       apps/gateway-go/.env
cp apps/realtime-go/.env.example      apps/realtime-go/.env
cp apps/analytics-python/.env.example apps/analytics-python/.env
cp apps/console/.env.example          apps/console/.env
```

`apps/notifier-go` has no `.env` of its own — it reads `NOTIFIER_*`, `SMTP_*`, `CHANNELS_ENABLED`,
and `WATCHER24_DATABASE_URL` from the **repo root** `.env`, loaded by the root `justfile`
(`set dotenv-load := true`). Copy the root example too if you haven't already:

```bash
cp .env.example .env
```

The defaults in `.env.example` are pre-configured to match the Docker Compose credentials — no editing required for a basic local setup.

**Optional customisation:**

| Service | Variable | When to change |
|---------|----------|----------------|
| `gateway-go` | `GATEWAY_DEFAULT_COUNTRY` | Set to your ISO country code (e.g. `IN`) so the geo map widget shows data for `127.0.0.1` traffic in dev |
| `iam` | `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | Only if you want GitHub OAuth login locally |
| `iam` | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Only if you want Google OAuth login locally |
| `console` | `NEXT_PUBLIC_CONSOLE_CLIENT_ID` / `CONSOLE_CLIENT_SECRET` | Filled in after running IAM (Step 4) |

---

## 4 — Start IAM (Identity Service)

IAM must start first — all other services depend on it for authentication.

```bash
cd apps/iam
pnpm install    # if not done already
pnpm dev
```

IAM runs on **http://localhost:5000**.

On first start, Prisma runs migrations automatically against PostgreSQL (port 5433). You should see:
```
✔  Generated Prisma Client
✔  Database migrations applied
IAM running on http://localhost:5000
```

**Create the first superadmin user:**

1. Open http://localhost:5000/auth/sign-up
2. Register with any email/password
3. Open a Postgres client (e.g. TablePlus, psql, or DBeaver) connected to `localhost:5433`
4. Run:
   ```sql
   UPDATE "user" SET role = 'superadmin' WHERE email = 'your@email.com';
   ```
5. Sign out and back in — you now have superadmin access to the console admin panel

**Create an organisation and get an API key:**

1. Sign in at http://localhost:5000
2. Create an organisation (e.g. "Local Dev Org")
3. Navigate to Settings → API Keys → Create secret key
4. Copy the `wtch_...` key — you'll need it to send test events

---

## 5 — Start the Gateway (Go)

```bash
cd apps/gateway-go
just dev
```

Gateway runs on **http://localhost:8080**.

Verify it's running:
```bash
curl http://localhost:8080/health
# → {"status":"ok"}
```

---

## 6 — Start Realtime (Go)

```bash
cd apps/realtime-go
just dev
```

Realtime runs on **http://localhost:8081**. It connects to Redis and PostgreSQL on startup.

---

## 7 — Start Analytics Workers (Python)

```bash
cd apps/analytics-python
uv sync
just dev
```

The workers don't serve HTTP. They connect to Redis and ClickHouse and log to stdout:

```
analytics-python: starting workers: audit, log, trace, metric, ai
analytics-python: retention-scheduler starting (interval=86400s)
audit-worker: consumer group created, listening on stream:audit
log-worker: consumer group created, listening on stream:log
...
```

---

## 8 — Start the Notifier (Go)

```bash
cd apps/notifier-go
just dev
```

Notifier runs on **http://localhost:4004**. It connects to Redis and the `watcher24` Postgres
database, and delivers email + in-app notifications for alert rules and events.

---

## 9 — Start the Console (Next.js)

```bash
cd apps/console
pnpm dev
```

Console runs on **http://localhost:3001**.

On first visit, you'll be redirected to http://localhost:5000 to sign in. Use the superadmin account you created in Step 4.

---

## Sending Test Events

Once all services are running, send a test event:

```bash
curl -X POST http://localhost:8080/v1/events \
  -H "Authorization: Bearer wtch_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "log",
    "severity":   "info",
    "message":    "hello from curl",
    "payload":    { "test": true }
  }'
```

Expected response: `{"status":"accepted"}` (HTTP 202)

The event should appear in the console overview within 1–2 seconds (live feed via Redis pub/sub) and in the Logs explorer within 5–10 seconds (after the analytics worker writes it to ClickHouse).

---

## Running All Services at Once (Optional)

Instead of seven terminal tabs, use `just` from the root (run `just --list` to see every recipe):

```bash
# From the monorepo root
just up             # docker compose up -d
just iam-dev         # starts IAM
just gateway-dev     # starts gateway-go
just realtime-dev    # starts realtime-go
just worker-dev      # starts analytics-python
just notifier-dev    # starts notifier-go
just console-dev     # starts console
```

Or use a process manager like [overmind](https://github.com/DarthSim/overmind) with a `Procfile`:

```
iam:      cd apps/iam && pnpm dev
gateway:  cd apps/gateway-go && just dev
realtime: cd apps/realtime-go && just dev
workers:  cd apps/analytics-python && just dev
notifier: cd apps/notifier-go && just dev
console:  cd apps/console && pnpm dev
```

---

## Service Startup Order

Services depend on each other. Start in this order:

```
1. docker compose up -d        (infra — all services need these)
2. apps/iam                    (auth — gateway + console need it)
3. apps/gateway-go             (ingest — console proxies to it)
4. apps/realtime-go            (WebSocket — console connects to it)
5. apps/analytics-python       (workers — independent of console)
6. apps/notifier-go            (notifications — independent of console)
7. apps/console                (UI — needs all of the above)
```

Stopping order doesn't matter.

---

## Running Tests

```bash
# Go services
cd apps/gateway-go && just test
cd apps/realtime-go && just test
cd apps/notifier-go && just test

# Python workers
cd apps/analytics-python && just test

# Console + IAM (TypeScript — lint/type-check only, no test suite yet)
cd apps/console && pnpm lint && pnpm type-check
cd apps/iam && pnpm lint

# All SDKs
cd sdk/js && pnpm test
cd sdk/python && uv run pytest
cd sdk/go && just test
cd sdk/rust && cargo test
```

Or run everything backend/SDK-side from the root in one shot:

```bash
just test-all
```

---

## Common Issues and Fixes

### Port 5433 already in use
Another Postgres is running locally. Either stop it (`brew services stop postgresql`) or change the docker-compose host port to `5434:5432` and update `IAM_DATABASE_URL` in the `.env` files.

### ClickHouse migrations not applied
The `docker-entrypoint-initdb.d` scripts only run when the volume is first created. If you pulled new SQL migrations after the volume already existed, force a re-init:
```bash
docker compose down -v    # destroys volumes — all data lost
docker compose up -d
```

### `prisma migrate dev` fails in IAM
Make sure Docker is running and the Postgres container is healthy before starting IAM. Also verify the `IAM_DATABASE_URL` in `apps/iam/.env` points to port `5433`.

### Gateway returns 401 on test events
The `wtch_...` key must be active and belong to an organisation in the IAM database. Keys created before the database was seeded may not resolve. Create a new key from the console settings page.

### Analytics workers show "stream does not exist"
The stream is created by the gateway when the first event arrives. Send one test event (Step above) and the workers will start consuming on the next poll.

### Console shows blank page / auth loop
Verify that `NEXT_PUBLIC_CONSOLE_CLIENT_ID` and `CONSOLE_CLIENT_SECRET` in `apps/console/.env` match an OAuth client registered in IAM. If you haven't set these up, the console falls back to direct IAM session auth — check `NEXT_PUBLIC_IAM_URL` is set correctly.

### MinIO — file upload features not working
Open the MinIO console at http://localhost:9001 (credentials: `watcher` / `watcher_secret`) and create a bucket named `watcher-uploads`. The S3 API is at port `9002`.

---

## Resetting Local State

**Reset ClickHouse only** (keeps auth data):
```bash
docker compose stop clickhouse
docker compose rm -f clickhouse
docker volume rm watcher24_clickhouse_data
docker compose up -d clickhouse
```

**Full reset** (wipes everything including users, orgs, API keys):
```bash
docker compose down -v
docker compose up -d
# Repeat Step 4 (create superadmin) from scratch
```

---

## Useful Local URLs

| URL | What |
|-----|------|
| http://localhost:5000 | IAM — sign in, sign up, manage OAuth |
| http://localhost:3001 | Console — main dashboard |
| http://localhost:3001/admin | Console superadmin panel |
| http://localhost:8080/health | Gateway health check |
| http://localhost:4004 | Notifier — internal API (requires `X-Internal-Secret`) |
| http://localhost:8123 | ClickHouse HTTP interface (query via browser or curl) |
| http://localhost:9001 | MinIO web console |

**ClickHouse quick query via curl:**
```bash
curl "http://localhost:8123/?query=SELECT+COUNT()+FROM+watcher.events" \
  -u watcher:watcher_secret
```
