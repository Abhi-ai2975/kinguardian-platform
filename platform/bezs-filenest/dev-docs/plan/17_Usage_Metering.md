# FileNest v1.0 — Usage Metering

**Version:** 1.0.0
**Status:** Approved for Engineering
**Last Updated:** 2026-06-15

---

## Table of Contents

1. [What Gets Metered](#1-what-gets-metered)
2. [Metering Architecture](#2-metering-architecture)
3. [Real-Time Counters (Redis)](#3-real-time-counters-redis)
4. [Periodic Aggregation Jobs](#4-periodic-aggregation-jobs)
5. [Storage Usage Calculation](#5-storage-usage-calculation)
6. [Plan Limit Enforcement](#6-plan-limit-enforcement)
7. [Usage API](#7-usage-api)
8. [Database Schema](#8-database-schema)

---

## 1. What Gets Metered

| Metric | Granularity | Reset Cadence | Billing Relevance |
|--------|-------------|--------------|-------------------|
| API Requests | Per org, per project | Monthly | Yes — plan includes X req/month |
| Storage (GB) | Per org, per project | Cumulative (point-in-time) | Yes — billed per GB/month |
| Bandwidth (GB downloaded) | Per org, per project | Monthly | Yes — plan includes X GB |
| Files Processed | Per org, per project | Monthly | Yes — $0.001/file above plan |
| Search Queries | Per org, per project | Monthly | Yes — plan includes X queries/month |
| Active Files | Per org, per project | Cumulative | For internal capacity planning |
| OCR Pages | Per org, per project | Monthly | For future per-page OCR billing |

---

## 2. Metering Architecture

```
Request arrives
  ↓
Auth Middleware (extracts org_id, project_id)
  ↓
Rate Limit Check (Redis)
  ↓
Business Logic executes
  ↓
Metering Middleware (post-response hook)
  → Increments Redis counter: rl:usage:{org_id}:{metric}:{YYYY-MM}
  ↓
Every 5 minutes: UsageFlushJob
  → Reads Redis counters
  → Upserts into usage_snapshots table (PostgreSQL)
  → Clears flushed counters
  ↓
Every 1 hour: StorageCalculationJob
  → Queries files table for total bytes per org/project
  → Upserts into usage_snapshots
  ↓
Every 1 day: UsageSummaryJob
  → Rolls up hourly snapshots into daily summary
  → Checks for plan limit breaches
  → Sends usage alerts (80%, 95%, 100%)
```

---

## 3. Real-Time Counters (Redis)

```python
# backend/app/core/metering.py
class UsageMeter:

    METRIC_KEYS = {
        "api_requests": "req",
        "upload_bytes": "upload_bytes",
        "download_bytes": "dl_bytes",
        "files_processed": "proc",
        "search_queries": "search",
        "ocr_pages": "ocr_pages",
    }

    def __init__(self, redis: Redis):
        self.redis = redis

    def _key(self, org_id: str, metric: str) -> str:
        month = datetime.utcnow().strftime("%Y-%m")
        return f"usage:{org_id}:{self.METRIC_KEYS[metric]}:{month}"

    async def increment(
        self,
        org_id: str,
        project_id: str,
        metric: str,
        value: int = 1,
    ) -> None:
        org_key = self._key(org_id, metric)
        proj_key = f"usage:{org_id}:{project_id}:{self.METRIC_KEYS[metric]}:{datetime.utcnow().strftime('%Y-%m')}"

        pipeline = self.redis.pipeline()
        pipeline.incrby(org_key, value)
        pipeline.incrby(proj_key, value)
        # TTL: 35 days (covers full month + buffer for flush job)
        pipeline.expire(org_key, 35 * 86400)
        pipeline.expire(proj_key, 35 * 86400)
        await pipeline.execute()

    async def get_current(self, org_id: str) -> dict[str, int]:
        month = datetime.utcnow().strftime("%Y-%m")
        keys = {
            metric: f"usage:{org_id}:{short}:{month}"
            for metric, short in self.METRIC_KEYS.items()
        }

        values = await self.redis.mget(*keys.values())
        return {
            metric: int(v or 0)
            for metric, v in zip(keys.keys(), values)
        }
```

### 3.1 Metering Middleware (Post-Response)

```python
class MeteringMiddleware(BaseHTTPMiddleware):

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        auth: AuthContext = getattr(request.state, "auth", None)
        if auth is None:
            return response

        meter: UsageMeter = request.app.state.meter
        endpoint_type = classify_endpoint(request.url.path, request.method)

        # Always count API requests
        await meter.increment(auth.org_id, auth.project_id, "api_requests")

        # Count download bytes from response content-length header
        if endpoint_type == "downloads" and response.status_code == 200:
            content_length = response.headers.get("content-length")
            if content_length:
                await meter.increment(
                    auth.org_id, auth.project_id,
                    "download_bytes", int(content_length)
                )

        return response
```

---

## 4. Periodic Aggregation Jobs

### 4.1 Usage Flush Job (Every 5 Minutes)

```python
class UsageFlushJob:
    """Flushes Redis usage counters to PostgreSQL."""

    async def run(self, db: AsyncSession, redis: Redis) -> None:
        # Scan all usage keys
        keys = []
        async for key in redis.scan_iter("usage:*"):
            keys.append(key)

        if not keys:
            return

        values = await redis.mget(*keys)
        pipeline = redis.pipeline()

        for key, value in zip(keys, values):
            if value is None:
                continue

            # key format: usage:{org_id}:{metric_short}:{YYYY-MM}
            # or:         usage:{org_id}:{project_id}:{metric_short}:{YYYY-MM}
            parts = key.split(":")
            count = int(value)

            if len(parts) == 4:
                _, org_id, metric_short, period = parts
                project_id = None
            elif len(parts) == 5:
                _, org_id, project_id, metric_short, period = parts
            else:
                continue

            metric = SHORT_TO_METRIC.get(metric_short)
            if not metric:
                continue

            await db.execute(
                insert(UsageSnapshot)
                .values(
                    org_id=org_id,
                    project_id=project_id,
                    metric=metric,
                    period=period,
                    value=count,
                    updated_at=datetime.utcnow(),
                )
                .on_conflict_do_update(
                    index_elements=["org_id", "project_id", "metric", "period"],
                    set_={"value": count, "updated_at": datetime.utcnow()},
                )
            )

        await db.commit()
        logger.info("usage_flush_completed", keys_flushed=len(keys))
```

---

## 5. Storage Usage Calculation

Storage is not tracked via request counters — it's computed from the `files` table directly.

```python
class StorageCalculationJob:
    """Calculates actual storage bytes from the files table."""

    async def run(self, db: AsyncSession) -> None:
        period = datetime.utcnow().strftime("%Y-%m")

        # Aggregate by org
        rows = await db.execute(
            select(
                File.org_id,
                File.project_id,
                func.sum(File.size).label("total_bytes"),
                func.count(File.id).label("file_count"),
            )
            .where(
                File.deleted_at.is_(None),
                File.status == FileStatus.READY,
            )
            .group_by(File.org_id, File.project_id)
        )

        for row in rows:
            await db.execute(
                insert(UsageSnapshot)
                .values(
                    org_id=row.org_id,
                    project_id=row.project_id,
                    metric="storage_bytes",
                    period=period,
                    value=row.total_bytes or 0,
                    updated_at=datetime.utcnow(),
                )
                .on_conflict_do_update(
                    index_elements=["org_id", "project_id", "metric", "period"],
                    set_={"value": row.total_bytes or 0, "updated_at": datetime.utcnow()},
                )
            )

        await db.commit()
```

---

## 6. Plan Limit Enforcement

### 6.1 Limits Table

```python
PLAN_LIMITS = {
    "starter": {
        "storage_bytes": 50 * 1024**3,          # 50 GB
        "download_bytes": 10 * 1024**3,          # 10 GB
        "api_requests": 100_000,
        "files_processed": 10_000,
        "search_queries": 10_000,
    },
    "professional": {
        "storage_bytes": 500 * 1024**3,
        "download_bytes": 100 * 1024**3,
        "api_requests": 1_000_000,
        "files_processed": 100_000,
        "search_queries": 100_000,
    },
    "enterprise": {
        "storage_bytes": None,    # Unlimited (governed by contract)
        "download_bytes": None,
        "api_requests": None,
        "files_processed": None,
        "search_queries": None,
    },
}
```

### 6.2 Limit Check (Hard Enforcement)

Hard limits block the operation. Called inline in the file upload flow:

```python
async def check_upload_allowed(
    org_id: str,
    file_size: int,
    meter: UsageMeter,
    db: AsyncSession,
) -> None:
    org = await get_org(org_id, db)
    limits = PLAN_LIMITS[org.plan]

    current = await meter.get_current(org_id)

    # Check storage
    if limits["storage_bytes"] is not None:
        current_storage = await get_storage_bytes(org_id, db)
        if current_storage + file_size > limits["storage_bytes"]:
            raise PlanLimitExceeded(
                code="storage_limit_exceeded",
                message=f"Storage limit of {limits['storage_bytes'] // 1024**3} GB reached.",
                current=current_storage,
                limit=limits["storage_bytes"],
                metric="storage_bytes",
            )

    # Check monthly processing
    if limits["files_processed"] is not None:
        if current["files_processed"] >= limits["files_processed"]:
            raise PlanLimitExceeded(
                code="processing_limit_exceeded",
                message="Monthly file processing limit reached.",
                current=current["files_processed"],
                limit=limits["files_processed"],
                metric="files_processed",
            )
```

### 6.3 Soft Warnings (80% and 95%)

```python
class UsageAlertJob:
    THRESHOLDS = [0.80, 0.95, 1.00]

    async def run(self, db: AsyncSession) -> None:
        orgs = await db.execute(select(Organization))

        for org in orgs.scalars():
            limits = PLAN_LIMITS[org.plan]
            meter = UsageMeter(redis)
            current = await meter.get_current(org.id)

            for metric, limit in limits.items():
                if limit is None:
                    continue

                ratio = current.get(metric, 0) / limit

                for threshold in self.THRESHOLDS:
                    alert_key = f"usage_alert:{org.id}:{metric}:{threshold}"
                    already_sent = await redis.exists(alert_key)

                    if ratio >= threshold and not already_sent:
                        await send_usage_alert(org, metric, ratio, limit)
                        await redis.setex(alert_key, 35 * 86400, "1")
```

`PlanLimitExceeded` returns `HTTP 402 Payment Required` with the same error envelope as other errors.

---

## 7. Usage API

```
GET /v1/organizations/{org_id}/usage

Response:
{
  "period": "2026-06",
  "plan": "professional",
  "metrics": {
    "api_requests":     { "used": 234891, "limit": 1000000, "pct": 23.5 },
    "storage_bytes":    { "used": 85899345920, "limit": 536870912000, "pct": 16.0 },
    "download_bytes":   { "used": 10737418240, "limit": 107374182400, "pct": 10.0 },
    "files_processed":  { "used": 12045, "limit": 100000, "pct": 12.0 },
    "search_queries":   { "used": 4521, "limit": 100000, "pct": 4.5 }
  },
  "projects": [
    {
      "project_id": "proj_abc",
      "name": "patient-records",
      "metrics": { "...": "..." }
    }
  ]
}

GET /v1/organizations/{org_id}/usage/history?months=6
→ Returns monthly snapshots for billing reconciliation
```

---

## 8. Database Schema

```sql
CREATE TABLE usage_snapshots (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id),
    project_id      UUID REFERENCES projects(id),  -- NULL = org-level aggregate
    metric          TEXT NOT NULL,
    period          CHAR(7) NOT NULL,               -- YYYY-MM
    value           BIGINT NOT NULL DEFAULT 0,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (org_id, project_id, metric, period)
);

CREATE INDEX idx_usage_org_period ON usage_snapshots (org_id, period);

-- Historical daily rollups for billing
CREATE TABLE usage_daily (
    org_id       UUID NOT NULL,
    project_id   UUID,
    metric       TEXT NOT NULL,
    date         DATE NOT NULL,
    value        BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (org_id, metric, date)
);
```
