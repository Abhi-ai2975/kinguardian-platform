# Alerting System — Watcher24

## Why a Dedicated Alerting System

The billing plans page promises "Alerts & webhooks" for Pro tier. Currently nothing evaluates alert conditions or delivers them. The alerting system is the bridge between the observability data (events in ClickHouse) and the people who need to act on anomalies.

Without it, users must watch the dashboard manually. With it, Watcher24 becomes proactive — it tells you when something is wrong rather than waiting for you to notice.

---

## What the Alerting System Does

Users define **alert rules** in the console. Each rule specifies:
- **What to watch** — which metric or condition to evaluate
- **When to fire** — the threshold or comparison operator
- **How often to check** — evaluation window
- **Who to notify** — which channels (email, Slack, webhook, PagerDuty, in-app)
- **Cooldown** — minimum time between repeated alerts for the same rule

The analytics-python `AlertEvaluatorWorker` runs every minute, evaluates all enabled rules, and publishes to `stream:notify` when a rule fires. The `notifier-go` service consumes `stream:notify` and delivers to the configured channels.

---

## Alert Rule Types

### `threshold`
Fires when a metric crosses a static value.

```json
{
  "rule_type": "threshold",
  "config": {
    "metric":       "error_count",
    "event_type":   "log",
    "operator":     "gt",
    "value":        100,
    "window_minutes": 5
  }
}
```

Supported `metric` values:
| Metric | Description |
|--------|-------------|
| `event_count` | Total events in window |
| `error_count` | Events where `severity IN ('error', 'critical')` |
| `error_rate` | `error_count / total_count * 100` (percentage) |
| `unique_users` | Distinct `user_id` values |
| `p95_latency_ms` | 95th percentile of `payload.latency_ms` for trace events |

Supported `operator` values: `gt` (>), `gte` (>=), `lt` (<), `lte` (<=), `eq` (=)

---

### `trend`
Fires when a metric changes by more than X% compared to the previous equivalent window.

```json
{
  "rule_type": "trend",
  "config": {
    "metric":          "error_count",
    "event_type":      "log",
    "change_pct":      200,
    "direction":       "up",
    "window_minutes":  60,
    "comparison":      "previous_window"
  }
}
```

`comparison` options:
- `previous_window` — compare current window against the immediately preceding window
- `same_time_yesterday` — compare against the same 60-minute window 24 hours ago
- `same_time_last_week` — compare against the same window 7 days ago

---

### `ai_cost`
Fires when AI spend (sum of `payload.cost_usd` across `llm_call` events) exceeds a dollar threshold in a rolling window.

```json
{
  "rule_type": "ai_cost",
  "config": {
    "threshold_usd":    50.00,
    "window_minutes":   60,
    "model":            null,
    "workflow_name":    null
  }
}
```

`model` and `workflow_name` are optional filters — leave `null` to alert on total spend across all models.

---

### `event_absence`
Fires when **no events** arrive within a window — a dead man's switch. Useful for detecting silently broken instrumentation.

```json
{
  "rule_type": "event_absence",
  "config": {
    "event_type":      "audit",
    "window_minutes":  30,
    "application_id":  "app_prod_api"
  }
}
```

---

### `error_rate`
Dedicated rule for error rate percentage — common enough to be first-class rather than configured via `threshold`.

```json
{
  "rule_type": "error_rate",
  "config": {
    "event_type":       "log",
    "threshold_pct":    5.0,
    "min_events":       20,
    "window_minutes":   5
  }
}
```

`min_events` prevents false fires when total volume is tiny (e.g., 1 error out of 2 events = 50% rate but not meaningful).

---

## Alert Lifecycle

```
User creates rule in console
  → saved to PostgreSQL alert_rules
  → AlertEvaluatorWorker picks it up next minute tick

Every minute tick:
  → fetch all enabled rules for all orgs
  → for each rule: run ClickHouse query
  → condition met?
      → check cooldown (Redis key: alert:{rule_id}:{window})
      → if not in cooldown:
          → insert into alert_history
          → publish to stream:notify
          → set Redis cooldown key with TTL = cooldown_minutes

stream:notify consumed by notifier-go:
  → route to channels (email, Slack, webhook, PagerDuty, in-app)
  → update alert_history.notified = true
```

---

## Delivery Channels

Channels are configured per org in the notification channel settings (built with `notifier-go`). Alert rules reference channel types — the actual credentials (Slack URL, webhook URL, etc.) are stored in `notification_channels`.

| Channel | When it makes sense |
|---------|-------------------|
| `in_app` | Always on — notification bell in console header |
| `email` | For non-urgent alerts or digest-style notifications |
| `slack` | Best for team-visible real-time alerts |
| `webhook` | Integrating with PagerDuty, OpsGenie, or custom tooling |
| `pagerduty` | On-call escalation for critical production alerts |

---

## Deduplication and Cooldown

Two layers prevent alert storms:

**Cooldown window (rule-level):** After a rule fires, a Redis key `alert:cooldown:{rule_id}` is set with TTL equal to `cooldown_minutes` (default 60 min). The evaluator skips delivery for that rule until the key expires.

**Dedup key (notifier-level):** The evaluator includes a `dedup_key` in the `stream:notify` message. The notifier checks this against its own Redis dedup store before delivering (see `notifications-service.md`).

Users can configure cooldown per rule — a cost threshold might warrant a 4-hour cooldown; a critical error rate alert might warrant 5 minutes.

---

## Alert History

Every fired alert is recorded in `alert_history` regardless of whether delivery succeeded. The console shows alert history so users can:
- See what fired and when
- See whether notifications were delivered
- Manually acknowledge/resolve alerts
- Identify noisy rules (fire every minute → increase cooldown or adjust threshold)

---

## What Does Not Belong in the Alerting System

- **Rate limiting on ingest** — handled by the gateway's `MinuteRateLimiter` (Redis INCR per public token)
- **Monthly quota enforcement** — handled by the gateway's `LimitChecker` (ClickHouse monthly count)
- **Data retention** — handled by `RetentionScheduler` in analytics-python
- **AI anomaly detection (Phase 3)** — the `AIAnomalyWorker` described in the AI observability plan is a separate, ML-oriented worker that feeds into this alerting system as a special rule type

---

## Data Storage

### PostgreSQL

```sql
-- infrastructure/postgres/migrations/007_alert_rules.sql

CREATE TABLE alert_rules (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id           TEXT NOT NULL,
    name             TEXT NOT NULL,
    description      TEXT,
    rule_type        TEXT NOT NULL,     -- 'threshold' | 'trend' | 'ai_cost' | 'event_absence' | 'error_rate'
    config           JSONB NOT NULL,    -- rule-type-specific config (see above)
    channels         TEXT[] NOT NULL,  -- ['email', 'slack', 'webhook', 'pagerduty', 'in_app']
    severity         TEXT DEFAULT 'warn',  -- 'info' | 'warn' | 'error' | 'critical'
    cooldown_minutes INT  DEFAULT 60,
    enabled          BOOLEAN DEFAULT true,
    created_by       TEXT,
    created_at       TIMESTAMPTZ DEFAULT now(),
    updated_at       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE alert_history (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id      UUID REFERENCES alert_rules(id) ON DELETE CASCADE,
    org_id       TEXT NOT NULL,
    triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at  TIMESTAMPTZ,
    severity     TEXT NOT NULL,
    condition    TEXT NOT NULL,       -- human-readable: "error_count (142) exceeded threshold (100)"
    details      JSONB NOT NULL,      -- raw query result that triggered the alert
    notified     BOOLEAN DEFAULT false,
    channels_notified TEXT[]          -- which channels actually received it
);

CREATE INDEX idx_alert_rules_org     ON alert_rules  (org_id, enabled);
CREATE INDEX idx_alert_history_rule  ON alert_history (rule_id, triggered_at DESC);
CREATE INDEX idx_alert_history_org   ON alert_history (org_id, triggered_at DESC);
```

### Redis (ephemeral, no persistence needed)

| Key pattern | TTL | Purpose |
|-------------|-----|---------|
| `alert:cooldown:{rule_id}` | `cooldown_minutes` | Prevents re-firing during cooldown |
| `alert:eval:lock` | 90 seconds | Distributed lock prevents two evaluator instances running simultaneously |

---

## `stream:notify` Message Shape

Published by the `AlertEvaluatorWorker` when a rule fires:

```json
{
  "org_id":             "org_abc123",
  "notification_type":  "alert",
  "template":           "alert_fired",
  "severity":           "warn",
  "dedup_key":          "org_abc123:rule_id:2026-05-31T14:00",
  "channels":           ["email", "slack"],
  "data": {
    "rule_id":      "uuid-of-rule",
    "rule_name":    "High error rate on prod API",
    "rule_type":    "error_rate",
    "condition":    "Error rate (8.2%) exceeded threshold (5.0%)",
    "event_type":   "log",
    "window_minutes": 5,
    "triggered_at": "2026-05-31T14:03:00Z"
  }
}
```

---

## Console UI Structure

```
/settings/alerts               — alert rules list + "New Rule" button
/settings/alerts/new           — rule creation form (type → config → channels → cooldown)
/settings/alerts/:id           — rule detail + edit + enable/disable
/settings/alerts/:id/history   — history of fires for this rule
/settings/alerts/history       — org-wide alert history feed
```

Alert history is also surfaced on the console overview page as a badge/feed so users see recent alerts without navigating to settings.
