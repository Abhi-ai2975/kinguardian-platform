# Alerting System — Implementation Plan

> Grounded in the actual codebase as of 2026-05-31.
> Implement steps in order. Each references exact file paths and patterns.

---

## Codebase Baseline

| What | Where | Status |
|------|-------|--------|
| `RetentionScheduler` timer-based worker pattern | `apps/analytics-python/src/workers/retention_scheduler.py` | ✅ exists — AlertEvaluatorWorker follows same pattern |
| `BaseWorker` stream consumer pattern | `apps/analytics-python/src/workers/base.py` | ✅ exists |
| `notification_channels` table | `infrastructure/postgres/migrations/006_notifications.sql` | Pending (notifications-service.md) |
| `stream:notify` consumer in notifier-go | `apps/notifier-go/` | Pending (notifications-service.md) |
| Plan limits source of truth | `apps/iam/src/modules/server/auth-provider/plan-limits.ts` | ✅ exists |

---

## Step 1 — Database Migration

**File:** `infrastructure/postgres/migrations/007_alert_rules.sql` — targets the `watcher24` database. Apply with `just migrate-pg`.

Create `alert_rules` and `alert_history` tables exactly as specified in `docs/alerting/overview.md` (Data Storage section).

Run order: this migration runs after `006_notifications.sql` (from the notifications service). Add it to `docker-entrypoint-initdb.d` by filename sort order — `007_` prefix guarantees correct order.

---

## Step 2 — Console API Routes

### 2.1 — CRUD for alert rules

**Create** `apps/console/src/app/api/alerts/rules/route.ts`:
- `GET` — list all rules for the active org, ordered by `created_at DESC`
- `POST` — validate rule config shape, insert into `alert_rules`

**Create** `apps/console/src/app/api/alerts/rules/[id]/route.ts`:
- `GET` — single rule with last 5 history entries
- `PATCH` — update name, config, channels, cooldown, enabled
- `DELETE` — hard delete rule + cascade deletes history

**Validation on POST/PATCH:** the `config` JSONB must match the shape for the given `rule_type`. Use Zod schemas per rule type — one schema per type defined in `apps/console/src/lib/alert-schemas.ts`.

### 2.2 — Alert history

**Create** `apps/console/src/app/api/alerts/history/route.ts`:
- `GET` — list `alert_history` for the org, paginated (default 10), filterable by `rule_id` and date range

### 2.3 — Test rule (dry run)

**Create** `apps/console/src/app/api/alerts/rules/[id]/test/route.ts`:
- `POST` — runs the rule's ClickHouse query against real data and returns the result without firing the alert or publishing to `stream:notify`
- Returns `{ fired: boolean, condition: string, queryResult: any }`

This lets users verify their rule config returns sensible data before enabling it.

---

## Step 3 — Alert Evaluator Worker (analytics-python)

### 3.1 — PostgreSQL adapter

**Create** `apps/analytics-python/src/adapters/postgres/alert_rules_adapter.py`:

```python
"""
Adapter — AlertRulesAdapter.
Reads alert rules from PostgreSQL and writes alert history rows.
Implements the AlertRulesRepository port.
"""
```

Methods:
- `list_enabled_rules() -> list[AlertRule]` — fetches all rows where `enabled = true`
- `record_history(rule_id, severity, condition, details) -> None` — inserts into `alert_history`
- `mark_notified(history_id, channels) -> None` — updates `notified = true`, `channels_notified`

### 3.2 — Port interface

**Create** `apps/analytics-python/src/ports/alert_rules.py`:

```python
"""
Port — AlertRulesRepository.
Defines the interface for reading alert rules and writing history.
The AlertEvaluatorWorker depends on this interface, never on the Postgres adapter directly.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass

@dataclass
class AlertRule:
    id: str
    org_id: str
    name: str
    rule_type: str       # 'threshold' | 'trend' | 'ai_cost' | 'event_absence' | 'error_rate'
    config: dict
    channels: list[str]
    severity: str
    cooldown_minutes: int
```

### 3.3 — ClickHouse evaluator queries

**Create** `apps/analytics-python/src/usecases/evaluate_alert_rule.py`:

One function per `rule_type`. Each function:
1. Takes an `AlertRule` and a ClickHouse client
2. Runs the appropriate query
3. Returns `EvaluationResult(fired: bool, condition: str, details: dict)`

Query patterns:

```python
# threshold / error_rate
SELECT COUNT() AS value
FROM watcher.events
WHERE organization_id = {org_id}
  AND event_type = {event_type}
  AND severity IN ('error', 'critical')   -- for error_count/error_rate
  AND timestamp > now() - INTERVAL {window_minutes} MINUTE

# ai_cost
SELECT SUM(JSONExtractFloat(payload, 'cost_usd')) AS value
FROM watcher.events
WHERE organization_id = {org_id}
  AND event_type = 'ai'
  AND JSONExtractString(payload, 'kind') = 'llm_call'
  AND timestamp > now() - INTERVAL {window_minutes} MINUTE

# event_absence
SELECT COUNT() AS value
FROM watcher.events
WHERE organization_id = {org_id}
  AND event_type = {event_type}
  AND timestamp > now() - INTERVAL {window_minutes} MINUTE
-- fired when value = 0

# trend
-- run two queries: current window and previous window, compare
```

### 3.4 — Alert evaluator worker

**Create** `apps/analytics-python/src/workers/alert_evaluator_worker.py`:

Pattern: same as `RetentionScheduler` — timer-based, not a Redis stream consumer.

```python
"""
Workers layer — AlertEvaluatorWorker.
Runs every 60 seconds. Fetches all enabled alert rules from PostgreSQL,
evaluates each against ClickHouse, and publishes to stream:notify when
a condition is met and the cooldown has expired.
"""
class AlertEvaluatorWorker:
    def __init__(self, alert_repo, clickhouse, redis, notifier_stream, interval_seconds=60):
        ...

    def run(self) -> None:
        """Starts the evaluation loop. Blocks forever in a daemon thread."""
        while True:
            try:
                self._tick()
            except Exception as exc:
                logger.exception("alert-evaluator: unexpected error: %s", exc)
            time.sleep(self._interval)

    def _tick(self) -> None:
        rules = self._alert_repo.list_enabled_rules()
        for rule in rules:
            result = evaluate_alert_rule(rule, self._clickhouse)
            if not result.fired:
                continue
            if self._is_in_cooldown(rule.id):
                continue
            self._set_cooldown(rule.id, rule.cooldown_minutes)
            history_id = self._alert_repo.record_history(
                rule.id, rule.severity, result.condition, result.details
            )
            self._publish_to_notify_stream(rule, result, history_id)
```

Cooldown via Redis: key `alert:cooldown:{rule_id}`, TTL = `cooldown_minutes * 60` seconds.

### 3.5 — Register in main.py

**File:** `apps/analytics-python/main.py`

Add `AlertEvaluatorWorker` alongside `RetentionScheduler` — both run in daemon threads, not as stream consumers:

```python
alert_evaluator = AlertEvaluatorWorker(
    alert_repo=pg_alert_adapter,
    clickhouse=ch_adapter,
    redis=redis_client,
    notifier_stream="stream:notify",
    interval_seconds=int(os.getenv("ALERT_EVAL_INTERVAL_SECONDS", "60")),
)
threading.Thread(target=alert_evaluator.run, daemon=True, name="alert-evaluator").start()
```

---

## Step 4 — Console UI

### 4.1 — Alert rules list page

**Create** `apps/console/src/app/(dashboard)/settings/alerts/page.tsx`:
- Table of alert rules: name, type, enabled toggle, channels, last fired, cooldown
- "New Rule" button
- Click row → navigate to detail/edit

### 4.2 — Rule creation/edit form

**Create** `apps/console/src/app/(dashboard)/settings/alerts/new/page.tsx`
**Create** `apps/console/src/app/(dashboard)/settings/alerts/[id]/page.tsx`

Multi-step form:
1. **Type** — pick rule type (threshold, trend, ai_cost, event_absence, error_rate)
2. **Config** — dynamic form based on type (metric selector, operator, value, window)
3. **Channels** — checkbox list of configured notification channels
4. **Settings** — cooldown, severity, name, description
5. **Test** — runs the dry-run API and shows current value vs threshold before saving

### 4.3 — Alert history page

**Create** `apps/console/src/app/(dashboard)/settings/alerts/history/page.tsx`:
- Paginated table: rule name, triggered at, condition, channels notified, resolved
- Filter by rule, severity, date range

### 4.4 — Overview page badge

**File:** `apps/console/src/app/(dashboard)/overview/page.tsx` (or its server component)

Add a "Recent Alerts" card: last 5 `alert_history` entries for the org. Shows rule name, condition, time. Link to `/settings/alerts/history`.

### 4.5 — Add settings nav item

**File:** `apps/console/src/components/layout/AppSidebar.tsx` (or the settings layout sidebar)

Add "Alerts" link to the settings navigation section.

---

## Step 5 — Environment Variables

**File:** `apps/analytics-python/.env.example`

Add:
```env
# How often the alert evaluator runs (seconds). Default: 60
ALERT_EVAL_INTERVAL_SECONDS=60

# PostgreSQL — for reading alert rules and writing history
DATABASE_URL=postgresql://watcher:watcher_secret@localhost:5433/watcher
```

**File:** `apps/analytics-python/docs/configuration.md` — document the new vars.

---

## Step 6 — Docs Sync (Rule 10)

| Step | Docs to update |
|------|---------------|
| DB migration | `infrastructure/postgres/migrations/007_alert_rules.sql` (new file, self-documenting) |
| Console API routes | `apps/console/docs/api.md` — add alert rule CRUD and history endpoints |
| Analytics-python worker | `apps/analytics-python/docs/overview.md` — add AlertEvaluatorWorker description |
| Analytics-python config | `apps/analytics-python/docs/configuration.md` — add `ALERT_EVAL_INTERVAL_SECONDS`, `DATABASE_URL` |
| Console UI | `apps/console/src/content/docs/concepts/events.mdx` — mention alert rules as a Pro feature |

---

## Implementation Order Summary

```
1. infrastructure/postgres/migrations/007_alert_rules.sql
2. apps/analytics-python/src/ports/alert_rules.py
3. apps/analytics-python/src/adapters/postgres/alert_rules_adapter.py
4. apps/analytics-python/src/usecases/evaluate_alert_rule.py
5. apps/analytics-python/src/workers/alert_evaluator_worker.py
6. apps/analytics-python/main.py  (register worker)
7. apps/console/src/lib/alert-schemas.ts  (Zod schemas per rule type)
8. apps/console/src/app/api/alerts/rules/route.ts
9. apps/console/src/app/api/alerts/rules/[id]/route.ts
10. apps/console/src/app/api/alerts/rules/[id]/test/route.ts
11. apps/console/src/app/api/alerts/history/route.ts
12. apps/console/src/app/(dashboard)/settings/alerts/  (all UI pages)
13. Docs sync
```

---

## Key Constraints

- **AlertEvaluatorWorker is timer-based**, not a Redis stream consumer. It runs every 60 seconds on a fixed interval. It does not consume `stream:*` — it produces to `stream:notify`.
- **ClickHouse mutations are never called from the evaluator.** It only runs `SELECT` queries.
- **`notifier-go` must be running** for alert deliveries to reach users. The evaluator publishes to `stream:notify` regardless — messages queue in Redis until consumed.
- **One evaluator instance at a time.** Use the Redis distributed lock (`alert:eval:lock`) before each tick to prevent duplicate evaluations when multiple analytics-python instances run.
- **The `DATABASE_URL` env var** must be added to analytics-python — the current `.env.example` only has ClickHouse and Redis. PostgreSQL access is new for this service.
- **Alert rules are Pro+ only.** Gate rule creation in the console API routes behind plan check (`getOrgPlan(orgId)` from IAM).
