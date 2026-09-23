# notifier-go — Overview

## What it does

`notifier-go` is Watcher24's dedicated notification delivery service. It owns all outbound notification logic — retry, deduplication, template rendering, and channel routing — for both transactional and alert-triggered notifications.

## Why it exists

- `gateway-go` is a hot-path ingest service — SMTP/HTTP delivery would add unacceptable latency to every event write
- `analytics-python` workers are stream processors — bolting delivery logic onto them mixes concerns and makes retry guarantees fragile
- `console` (Next.js) API routes lack retry and deduplication for external channels

## Two trigger paths

| Trigger | Source | Example |
|---------|--------|---------|
| Transactional | Console or IAM calls `POST /api/internal/notify` | Welcome email after signup |
| Alert | `stream:notify` Redis Stream published by `analytics-python` | Error rate spike → email |

## What it writes

| Data | Where |
|------|-------|
| Delivery log | `watcher24` DB → `notification_deliveries` |
| In-app notifications | `watcher24` DB → `in_app_notifications` |
| Channel config | `watcher24` DB → `notification_channels` |
| Dedup keys | Redis (TTL-based) |

## Phase 1 channels

- **Email** — via SMTP (Gmail app password in dev; Resend in production)
- **In-app** — synchronous PostgreSQL insert; read by the console notification bell

## Where it fits

```
console / IAM ──HTTP──► notifier-go /api/internal/notify
analytics-python ──────► stream:notify (Redis) ──► notifier-go consumer
                                                       ↓
                                              Email (SMTP)
                                              In-App (PostgreSQL)
```
