# Dashboard Overview

## What it does

The Watcher24 Dashboard is the frontend observability interface for the platform.
It lets users in an organisation inspect their telemetry data (logs, audit events,
traces, metrics) in real time and explore historical records stored in ClickHouse.

## Why it exists

The gateway ingests telemetry from SDKs, the analytics worker processes it, and the
realtime service fans events out over WebSocket.  The dashboard is the human-facing
layer that makes all this data actionable — without it, the data has no UI.

## Where it fits in the system

```
SDK → Gateway → (Redis XADD + PUBLISH) ─┬─► Analytics Worker → ClickHouse
                                         └─► Realtime Service → WebSocket → Dashboard
                                                                              ↑
                                                                       (this app)
```

The dashboard queries ClickHouse for historical data (read-only) and connects to the
realtime service for the live feed.  Authentication is handled by better-auth against
the shared IAM PostgreSQL database.

## Stack

| Layer         | Technology                          |
|---------------|-------------------------------------|
| Framework     | Next.js 16 (App Router)             |
| Auth          | better-auth (shared PostgreSQL)     |
| Data store    | ClickHouse (read-only queries)      |
| Real-time     | Native WebSocket → realtime-go      |
| UI            | shadcn/ui + Tailwind CSS v4         |
| Charts        | Recharts                            |
| Client state  | TanStack Query v5                   |
| Package mgr   | pnpm                                |

## Multi-App Support

Each organisation can register multiple **Apps** (a web frontend, a backend API, a mobile
app, etc.). The dashboard lets users:

- Create and manage apps at **Settings → Apps**
- Link API keys to a specific app so the gateway tags events automatically
- Switch between apps in the top nav — all explorer pages (Audit, Logs, Traces, Metrics)
  filter their ClickHouse queries to the selected app's `application_id`
- View all apps' events at once by selecting **All Apps**

The active app is stored in a `watcher_app` HTTP-only cookie so it persists across navigation.

## Running locally

```bash
cp .env.example .env
pnpm install
pnpm dev       # starts on http://localhost:3001
```

Requires docker-compose services running (`just up` from repo root).
