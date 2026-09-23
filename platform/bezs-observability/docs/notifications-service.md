# Notifications Service — Watcher24

## Purpose

Watcher24 needs to deliver two fundamentally different kinds of notifications:

1. **Transactional emails** — triggered by user actions: welcome email, email verification, password reset, API key created, team invitation, billing receipt.
2. **Alert notifications** — triggered by the analytics pipeline: token cost threshold exceeded, error rate spike, AI anomaly detected. Delivered to wherever the user configured: email, Slack webhook, HTTP webhook, PagerDuty.

Neither belongs in the existing services:
- `gateway-go` is a hot path — synchronous I/O to a mail provider would add latency to every ingest call.
- `analytics-python` workers are stream processors — bolting delivery logic (retries, templates, channel routing) onto them mixes concerns and makes the workers fragile.
- `console` (Next.js) could call an email provider directly from API routes, but that ties delivery to a web process, loses retry guarantees, and has no deduplication.

A dedicated `notifier-go` service owns all outbound notification delivery. It is the single place where retry logic, rate limiting, deduplication, template rendering, and channel routing live.

---

## Language and Framework

**Go — same as `gateway-go`. Framework: Fiber (already in the stack).**

### Why Go over Python

| Concern | Go | Python |
|---------|-----|--------|
| Concurrent webhook delivery | Goroutines — thousands of in-flight HTTP requests with near-zero overhead | `asyncio` works but adds complexity; `requests` is blocking |
| Retry loops with backoff | `time.Sleep` + goroutines are trivial | Need Celery or a task queue to get reliable retries |
| Memory footprint | ~10–20 MB idle | ~50–80 MB idle for a Python process |
| Redis Streams consumer | `go-redis` — same library used by gateway-go | `redis-py` — same library used by analytics-python |
| Consistency with existing Go services | gateway-go and realtime-go are both Go | analytics-python is Python, but it is a batch processor, not a delivery service |

Python is fine for analytics workers that process events in batches. For a delivery service that needs to fan out to many channels concurrently, manage per-channel retry state, and enforce rate limits per org — Go is the better fit.

### Why Fiber over stdlib `net/http`

Fiber is already a dependency in `gateway-go`. Using it here keeps the Go dependency surface consistent. For the notifier's internal HTTP API (triggered by the console for transactional emails), Fiber's routing and middleware is the right level of abstraction.

### Why not a fully managed service (SendGrid, Knock, Courier)?

Managed notification platforms solve delivery but not routing, deduplication, or alert-channel logic. They also add a per-notification billing dimension that is hard to predict at scale. Using a managed SMTP/email provider (Resend) for *transport* while keeping routing, retry, and deduplication in `notifier-go` gives the best of both: reliable delivery infrastructure without ceding control of the logic.

---

## Service Name and Location

```
apps/notifier-go/
```

Follows the existing `*-go` naming convention (`gateway-go`, `realtime-go`).

---

## What the Service Does

### Channel types

| Channel | Description | Config per org |
|---------|-------------|----------------|
| `email` | Transactional and alert emails via Resend (or any SMTP provider) | Org notification email address |
| `slack` | Slack incoming webhook | Webhook URL stored in org settings |
| `webhook` | Generic HTTP POST to a user-supplied URL | URL + optional HMAC secret |
| `pagerduty` | PagerDuty Events API v2 | Integration key |
| `in_app` | Write a notification row to PostgreSQL; console reads it | Always on, no config needed |

### Trigger types

| Trigger | Source | Example |
|---------|--------|---------|
| Transactional | Console calls notifier HTTP API | User signs up → welcome email |
| Alert | `stream:notify` Redis Stream published by analytics-python | Error rate spike → Slack + email |
| Scheduled digest | Cron tick from notifier's internal scheduler | Daily token cost summary email |

---

## Architecture

```
                    ┌─────────────────────────────────┐
                    │           notifier-go            │
                    │                                  │
  console ──HTTP──► │  /api/internal/notify  (HTTP)    │
                    │         ↓                        │
analytics-python ──►│  stream:notify  (Redis Stream)   │
                    │         ↓                        │
                    │   Router + Deduplicator          │
                    │         ↓                        │
                    │  ┌──────────────────────────┐    │
                    │  │  Channel dispatchers      │    │
                    │  │  - EmailSender            │────┼──► Resend API
                    │  │  - SlackSender            │────┼──► Slack webhook
                    │  │  - WebhookSender          │────┼──► user URL
                    │  │  - PagerDutySender        │────┼──► PagerDuty API
                    │  │  - InAppWriter            │────┼──► PostgreSQL
                    │  └──────────────────────────┘    │
                    └─────────────────────────────────┘
```

### Redis Stream — `stream:notify`

`analytics-python` workers publish to `stream:notify` when a threshold is breached or a condition is met. The notifier consumes this stream with consumer group `cg:notify`.

**Message shape on `stream:notify`:**

```json
{
  "org_id":       "org_abc123",
  "notification_type": "alert",
  "template":     "ai_cost_threshold_exceeded",
  "severity":     "warn",
  "dedup_key":    "org_abc123:ai_cost_threshold:2026-05-31T14:00",
  "channels":     ["email", "slack"],
  "data": {
    "threshold_usd":  50.00,
    "window_cost_usd": 54.32,
    "window_minutes":  60,
    "model":          "gpt-4o"
  }
}
```

The `dedup_key` is set by the analytics worker. The notifier stores it in Redis with a TTL equal to the alert's cooldown window — if a message with the same key arrives before the TTL expires, it is silently dropped.

### HTTP API — transactional triggers

The console (and IAM) call this internal API to trigger transactional emails. Protected with `X-Internal-Secret` header, same as IAM internal endpoints.

```
POST /api/internal/notify
Content-Type: application/json
X-Internal-Secret: <NOTIFIER_INTERNAL_SECRET>

{
  "org_id":       "org_abc123",
  "user_id":      "user_xyz",
  "template":     "welcome_email",
  "channels":     ["email"],
  "data": {
    "name":       "Naveen",
    "email":      "naveen@example.com",
    "verify_url": "https://app.watcher24.com/verify?token=..."
  }
}
```

The notifier processes this synchronously for in-app writes (PostgreSQL) and asynchronously (goroutine) for external channels (email, Slack, webhook) so that the caller does not wait for delivery.

---

## Retry and Deduplication

### Retry strategy

Every external channel sender uses exponential backoff with jitter:

| Attempt | Delay |
|---------|-------|
| 1 | immediate |
| 2 | 5s |
| 3 | 30s |
| 4 | 5m |
| 5 | 30m (final) |

After 5 failures the delivery is marked `failed` in the `notification_deliveries` table and no further retry is attempted. The org's notification history shows the failure so they can investigate.

### Deduplication

Two layers:

1. **`dedup_key` in Redis** — set by the producer (analytics-python). TTL = alert cooldown window (e.g., 1 hour). If the notifier receives a message whose `dedup_key` is already in Redis, it drops the message without delivering. This prevents alert storms when a threshold fires repeatedly.

2. **Idempotency on the HTTP trigger API** — callers can send an optional `idempotency_key` header. The notifier stores it in Redis with a 24-hour TTL. Duplicate HTTP calls with the same key return 200 without re-sending.

---

## Data Storage

| Data | Store | Notes |
|------|-------|-------|
| Notification delivery log (`sent`, `failed`, `pending`) | PostgreSQL `notification_deliveries` | Queryable by org; shown in console settings |
| In-app notifications (bell icon) | PostgreSQL `in_app_notifications` | Polled or streamed via realtime-go pub/sub |
| Org notification channel config (Slack URL, webhook URL, PagerDuty key) | PostgreSQL `notification_channels` | Encrypted at rest for webhook secrets/keys |
| Dedup keys and idempotency keys | Redis (TTL-based, no persistence needed) | Fast lookup; loss on restart is acceptable |
| Email templates | Embedded in the binary as Go template strings | Keeps the service self-contained; no external CMS needed for MVP |

### PostgreSQL migrations

These tables are **not IAM-owned** — they go in the `watcher24` database via `infrastructure/postgres/migrations/` as raw SQL. Apply with `just migrate-pg`.

```sql
-- infrastructure/postgres/migrations/006_notifications.sql

CREATE TABLE notification_channels (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      TEXT NOT NULL,
    channel     TEXT NOT NULL,          -- 'email' | 'slack' | 'webhook' | 'pagerduty'
    config      JSONB NOT NULL,         -- encrypted: {url, key, email, etc.}
    enabled     BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE (org_id, channel)
);

CREATE TABLE notification_deliveries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          TEXT NOT NULL,
    template        TEXT NOT NULL,
    channel         TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'sent' | 'failed'
    attempts        INT DEFAULT 0,
    last_error      TEXT,
    delivered_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE in_app_notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      TEXT NOT NULL,
    user_id     TEXT,                   -- NULL = org-wide
    title       TEXT NOT NULL,
    body        TEXT NOT NULL,
    severity    TEXT DEFAULT 'info',    -- 'info' | 'warn' | 'error'
    read        BOOLEAN DEFAULT false,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notification_channels_org   ON notification_channels (org_id);
CREATE INDEX idx_notification_deliveries_org ON notification_deliveries (org_id, created_at DESC);
CREATE INDEX idx_in_app_notifications_org    ON in_app_notifications (org_id, read, created_at DESC);
```

---

## Email Provider — Resend

**Resend** is recommended over SendGrid or Mailgun for the following reasons:

| Concern | Resend | SendGrid |
|---------|--------|---------|
| Developer experience | Clean REST API, Go SDK available | Complex legacy API surface |
| Domain authentication | Guided setup, fast DNS verification | Manual SPF/DKIM setup is verbose |
| Pricing (MVP) | Free up to 3,000 emails/month | Free up to 100/day |
| React/HTML templates | First-class support | Template editor is separate from the API |
| Deliverability | Modern infrastructure, high inbox rates | Good but established players have more rep debt |

Resend is called via its REST API — no dependency lock-in. Swapping to SendGrid or a self-hosted Postfix relay later only requires changing `EmailSender`.

---

## Folder Structure

```
apps/notifier-go/
├── docs/
│   ├── overview.md
│   ├── architecture.md
│   ├── api.md
│   └── configuration.md
├── internal/
│   ├── domain/
│   │   ├── notification.go     — Notification, Delivery, Channel value objects
│   │   └── template.go         — template registry and rendering
│   ├── ports/
│   │   ├── sender.go           — Sender interface (one per channel type)
│   │   ├── store.go            — DeliveryStore, InAppStore, ChannelConfigStore
│   │   └── consumer.go         — StreamConsumer port
│   ├── usecases/
│   │   ├── deliver_notification.go   — route + dispatch + record delivery
│   │   └── mark_read.go             — mark in-app notification as read
│   ├── adapters/
│   │   ├── resend/             — EmailSender via Resend REST API
│   │   ├── slack/              — SlackSender via incoming webhook
│   │   ├── webhook/            — WebhookSender with HMAC signing
│   │   ├── pagerduty/          — PagerDutySender via Events API v2
│   │   ├── postgres/           — DeliveryStore, InAppStore, ChannelConfigStore
│   │   └── redis/              — StreamConsumer, DedupStore
│   └── transport/
│       ├── server.go           — Fiber HTTP server
│       └── handlers/
│           ├── notify.go       — POST /api/internal/notify
│           └── in_app.go       — GET/PATCH /api/internal/notifications
├── config/
│   └── config.go
├── main.go
├── justfile
├── go.mod
├── .env.example
└── README.md
```

---

## Environment Variables

```env
# Server
PORT=4004
ENV=development

# Internal secret — must match NOTIFIER_INTERNAL_SECRET in console and IAM
NOTIFIER_INTERNAL_SECRET=change-me

# PostgreSQL — same DB as the rest of the platform
DATABASE_URL=postgres://watcher:watcher@localhost:5432/watcher

# Redis — same instance as gateway and analytics-python
REDIS_URL=redis://localhost:6379

# Email — Resend
RESEND_API_KEY=re_...
EMAIL_FROM=notifications@mail.watcher24.com
EMAIL_FROM_NAME=Watcher24

# Feature flags — disable channels not yet configured
CHANNELS_ENABLED=email,in_app
# CHANNELS_ENABLED=email,slack,webhook,pagerduty,in_app
```

---

## Console Integration

### Notification channel settings UI

Add to `apps/console/src/app/(dashboard)/settings/notifications/page.tsx`:
- Channel list (email, Slack, webhook, PagerDuty) with enabled toggle
- Per-channel config form (Slack URL, webhook URL + secret, PagerDuty key)
- "Send test notification" button
- Delivery history table (last 50 deliveries with status)

### In-app notification bell

Add to the console layout header:
- Bell icon with unread count badge
- Dropdown showing last 10 in-app notifications
- "Mark all read" action
- Polls `GET /api/notifications` (console API route that proxies to notifier)

### Console API routes (proxy to notifier)

- `GET /api/notifications` — list in-app notifications for the authed user's org
- `PATCH /api/notifications/:id/read` — mark as read
- `GET /api/settings/notifications/channels` — list configured channels
- `POST /api/settings/notifications/channels` — save channel config
- `POST /api/settings/notifications/test` — trigger test notification

These routes authenticate the user via the existing console session middleware, then call the notifier's internal API with `X-Internal-Secret`.

---

## Implementation Roadmap

| Phase | What | Notes |
|-------|------|-------|
| **1** | Core service: stream consumer, `deliver_notification` use case, email + in-app channels | Enough to deliver alert emails and welcome emails |
| **1** | DB migration `006_notifications.sql` | Three tables: channels, deliveries, in_app |
| **1** | Resend adapter with retry + backoff | |
| **1** | Console settings UI: email channel config + delivery history | |
| **1** | Console header: in-app notification bell | |
| **2** | Slack and webhook channel adapters | |
| **2** | HMAC signing on outbound webhooks | Security requirement before exposing webhooks to users |
| **2** | PagerDuty adapter | Enterprise tier feature |
| **2** | Dedup key handling on `stream:notify` | Prevents alert storms |
| **3** | Scheduled digest emails (daily/weekly summary) | Requires internal cron scheduler in notifier |
| **3** | Per-user notification preferences (opt-out per template) | |
| **3** | Notification template management UI (edit subject/body) | Nice to have; MVP uses hardcoded templates |
