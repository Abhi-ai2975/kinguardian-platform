# Watcher24

> **Active development is on the [`mvp`](https://github.com/naveenraj-g/watcher24/tree/mvp) branch.**

An open-source, self-hosted observability platform for modern applications. Ingest logs, metrics, traces, and audit events from any SDK, process them through a real-time pipeline, and inspect everything on a live dashboard.

---

## What it does

- **Ingest** — SDKs for JavaScript, TypeScript, Python (Go and Rust coming). Events flow through the gateway into ClickHouse via Redis Streams.
- **Explore** — Real-time log tail, trace viewer, metrics, and audit trail in a Next.js console.
- **Multi-tenant** — Organisations, roles, teams, and API keys out of the box via better-auth.
- **Multi-app** — Register multiple apps per org, link API keys per app, and filter all explorer views by app.
- **Self-hosted** — One `docker-compose up` spins the full stack locally.

---

## Architecture

```
SDK (JS / Python / Go / Rust)
    │
    ▼
apps/gateway-go          — Telemetry ingestion API (Go, :8080)
    │  XADD → Redis Stream
    │  PUBLISH → Redis Pub/Sub
    ▼
apps/analytics-python    — Event processing worker (Python)
    │
    ▼
ClickHouse               — Telemetry data store (:8123)

Redis Pub/Sub
    │
    ▼
apps/realtime-go         — WebSocket fan-out service (Go, :8081)
    │
    ▼
apps/console             — Console UI: observability, onboarding, billing, docs (Next.js, :3001)
apps/iam                 — Identity & Access Management (Next.js + better-auth, :5000)
PostgreSQL               — Auth + IAM data (:5433)
```

---

## Monorepo Structure

```
watcher24/
├── apps/
│   ├── gateway-go/        — Ingestion gateway (Go)
│   ├── analytics-python/  — Event processing worker (Python)
│   ├── realtime-go/       — WebSocket real-time service (Go)
│   ├── console/           — Console UI (Next.js)
│   └── iam/               — Auth & API key management (Next.js + better-auth)
├── sdk/
│   ├── js/                — JavaScript/TypeScript SDK (pnpm workspace)
│   └── python/            — Python SDK (uv)
├── infrastructure/
│   ├── clickhouse/        — ClickHouse migrations
│   ├── postgres/          — PostgreSQL migrations
│   └── redis/             — Redis config
├── docker-compose.yml     — All infrastructure services
└── justfile               — Root task runner
```

---

## Stack

| Layer | Technology |
|-------|-----------|
| Ingestion gateway | Go (Fiber) |
| Event pipeline | Python (uv) |
| Real-time fan-out | Go (gorilla/websocket) |
| Console UI | Next.js 16, Tailwind CSS v4, shadcn/ui |
| Auth & IAM | better-auth + PostgreSQL |
| Telemetry store | ClickHouse |
| Message bus | Redis Streams + Pub/Sub |
| SDKs | JavaScript / TypeScript, Python |

---

## Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) + Docker Compose
- [Go](https://go.dev/dl/) 1.22+
- [Python](https://www.python.org/) 3.11+ with [uv](https://github.com/astral-sh/uv)
- [Node.js](https://nodejs.org/) 20+ with [pnpm](https://pnpm.io/)
- [just](https://github.com/casey/just)

### 1. Start infrastructure

```bash
just up
# Starts: PostgreSQL, ClickHouse, Redis
```

### 2. Configure environment files

```bash
cp apps/gateway-go/.env.example       apps/gateway-go/.env
cp apps/analytics-python/.env.example apps/analytics-python/.env
cp apps/realtime-go/.env.example      apps/realtime-go/.env
cp apps/console/.env.example          apps/console/.env
cp apps/iam/.env.example              apps/iam/.env
```

> `BETTER_AUTH_SECRET` must be the **same value** in both `apps/iam/.env` and `apps/console/.env`.

### 3. Run each service

```bash
just gateway-dev    # Go gateway       → http://localhost:8080
just worker-dev     # Python worker
just realtime-dev   # Go WebSocket     → ws://localhost:8081
just console-dev    # Console UI       → http://localhost:3001
just iam-dev        # IAM              → http://localhost:5000
```

---

## Services

| Service | Port | Tech | Purpose |
|---------|------|------|---------|
| Gateway | 8080 | Go | SDK telemetry ingestion, API key validation |
| Analytics Worker | — | Python | Consume Redis stream, write to ClickHouse |
| Realtime | 8081 | Go | WebSocket fan-out from Redis pub/sub |
| Console | 3001 | Next.js | Observability UI, onboarding, billing, docs |
| IAM | 5000 | Next.js + better-auth | Auth, users, orgs, API keys |
| PostgreSQL | 5433 | — | Auth data (shared by IAM + Console) |
| ClickHouse | 8123 | — | Telemetry event storage |
| Redis | 6379 | — | Streams (event queue) + pub/sub (realtime) |

---

## SDK Usage

### JavaScript / TypeScript

```bash
pnpm add @watcher/node        # Node.js backend
pnpm add @watcher/browser     # Browser
pnpm add @watcher/react       # React hooks
pnpm add @watcher/nextjs      # Next.js (server + client)
```

```ts
import { createNodeClient } from "@watcher/node";

const watcher = createNodeClient({
  apiKey: "your_api_key",
  baseUrl: "http://localhost:8080",
});

watcher.audit("user.login", { userId: "u_123" });
watcher.log("warn", "Disk usage above 90%");
```

### Python

```bash
uv add watcher-sdk
```

```python
from watcher_sdk import Client

client = Client(api_key="your_api_key", base_url="http://localhost:8080")
client.audit("user.login", payload={"user_id": "u_123"})
client.log("warn", "Disk usage above 90%")
```

---

## Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Stable snapshots |
| `mvp` | Active development — all current work lives here |

Commit format: `feat:` · `fix:` · `refactor:` · `test:` · `docs:`

---

## License

MIT
