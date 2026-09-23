# FHIR Observations at Scale — Time-Series Storage

**Problem:** A CGM generates 288 readings/day per patient. At 1,000 diabetic patients, that's 288,000 Observation rows/day — 105M/year. Standard FHIR Observation storage collapses under this load.

---

## The Scale Problem

| Device | Frequency | Readings/Day | At 1,000 Patients |
|---|---|---|---|
| CGM (Dexcom) | Every 5 min | 288 | 288,000/day |
| HR (Apple Watch) | Every minute | 1,440 | 1,440,000/day |
| SpO2 | Every 1 min | 1,440 | 1,440,000/day |
| Steps | Hourly aggregate | 24 | 24,000/day |
| BP (home cuff) | 2-3x/day | 3 | 3,000/day |
| Weight | 1x/day | 1 | 1,000/day |

Total: **~3.2M Observation inserts/day at 1,000 RPM patients**. The main `observation` table cannot support this without architectural changes.

---

## Solution: Separate Time-Series Table

Do NOT store high-frequency device data in the main `observation` table. Use a dedicated time-series table with PostgreSQL table partitioning by date:

```sql
-- Partitioned by month for efficient pruning and query performance
CREATE TABLE device_observation (
    id              BIGSERIAL,
    patient_id      BIGINT NOT NULL,
    org_id          UUID NOT NULL,
    device_id       BIGINT,                     -- references device(id)
    loinc_code      VARCHAR(20) NOT NULL,
    value_quantity  NUMERIC(12, 4),
    value_unit      VARCHAR(20),
    value_string    TEXT,
    value_boolean   BOOLEAN,
    effective_at    TIMESTAMPTZ NOT NULL,        -- partition key
    source_type     VARCHAR(30),                -- 'dexcom', 'apple_health', 'withings'
    raw_value       JSONB,                      -- original device payload
    created_at      TIMESTAMPTZ DEFAULT NOW(),

    PRIMARY KEY (id, effective_at)              -- partition key must be in PK
) PARTITION BY RANGE (effective_at);

-- Create monthly partitions:
CREATE TABLE device_observation_2024_01 PARTITION OF device_observation
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE device_observation_2024_02 PARTITION OF device_observation
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
-- ... auto-create future partitions via pg_partman

-- Indexes (per partition, automatically):
CREATE INDEX ON device_observation (patient_id, loinc_code, effective_at DESC);
CREATE INDEX ON device_observation (org_id, loinc_code, effective_at DESC);

-- TimescaleDB alternative (if installed):
-- SELECT create_hypertable('device_observation', 'effective_at', chunk_time_interval => INTERVAL '1 month');
```

---

## Bulk Insert Optimization

Single-row inserts cannot handle RPM volume. Use bulk COPY / batch inserts:

```python
# app/repository/device_observation_repository.py

class DeviceObservationRepository:
    BATCH_SIZE = 1000

    async def bulk_create(self, observations: list[dict]) -> int:
        """
        High-performance bulk insert using PostgreSQL COPY protocol via asyncpg.
        50x faster than individual INSERTs for RPM data streams.
        """
        if not observations:
            return 0

        async with self.session_factory() as session:
            conn = await session.connection()
            raw_conn = await conn.get_raw_connection()

            rows = [
                (
                    obs["patient_id"],
                    obs["org_id"],
                    obs.get("device_id"),
                    obs["loinc_code"],
                    obs.get("value_quantity"),
                    obs.get("value_unit"),
                    obs.get("value_string"),
                    obs.get("effective_at"),
                    obs.get("source_type"),
                    json.dumps(obs.get("raw_value")) if obs.get("raw_value") else None,
                )
                for obs in observations
            ]

            await raw_conn.copy_records_to_table(
                "device_observation",
                records=rows,
                columns=["patient_id", "org_id", "device_id", "loinc_code",
                         "value_quantity", "value_unit", "value_string",
                         "effective_at", "source_type", "raw_value"],
            )
            return len(rows)

    async def get_time_series(
        self,
        patient_id: int,
        org_id: str,
        loinc_code: str,
        start: datetime,
        end: datetime,
        downsample_minutes: int | None = None,
    ) -> list[dict]:
        """
        Fetch time-series data with optional downsampling for charting.
        downsample_minutes=60 returns 1 point per hour (avg), reducing data for UI.
        """
        if downsample_minutes:
            # Time-bucket aggregation for chart rendering
            sql = text("""
                SELECT
                    date_trunc('minute', effective_at) -
                        (EXTRACT(MINUTE FROM effective_at)::integer % :bucket * interval '1 minute')
                        AS bucket,
                    AVG(value_quantity) AS avg_value,
                    MIN(value_quantity) AS min_value,
                    MAX(value_quantity) AS max_value,
                    COUNT(*) AS reading_count
                FROM device_observation
                WHERE patient_id = :patient_id
                  AND org_id = :org_id
                  AND loinc_code = :loinc_code
                  AND effective_at BETWEEN :start AND :end
                GROUP BY bucket
                ORDER BY bucket
            """)
            params = {"patient_id": patient_id, "org_id": org_id, "loinc_code": loinc_code,
                      "start": start, "end": end, "bucket": downsample_minutes}
        else:
            sql = text("""
                SELECT effective_at, value_quantity, value_unit, source_type
                FROM device_observation
                WHERE patient_id = :patient_id
                  AND org_id = :org_id
                  AND loinc_code = :loinc_code
                  AND effective_at BETWEEN :start AND :end
                ORDER BY effective_at
            """)
            params = {"patient_id": patient_id, "org_id": org_id, "loinc_code": loinc_code, "start": start, "end": end}

        async with self.session_factory() as session:
            result = await session.execute(sql, params)
            return [dict(row) for row in result]
```

---

## FHIR API for Device Observations

Expose device data through standard FHIR Observation endpoints with category filter:

```python
# app/routers/device_observations.py

@device_obs_router.get(
    "/Observation",
    operation_id="list_device_observations",
    summary="List device observations (time-series RPM data)",
)
async def list_device_observations(
    patient: str = Query(..., description="Patient FHIR ID, e.g. Patient/10001"),
    code: str | None = Query(None, description="LOINC code, e.g. 2339-0 for glucose"),
    date: str | None = Query(None, description="Date range: ge2024-01-01,le2024-01-31"),
    category: str | None = Query(None),
    _count: int = Query(100, le=10000),
    downsample: int | None = Query(None, description="Aggregate into N-minute buckets for charting"),
    request: Request = ...,
):
    """
    Handles high-volume device observations separately from clinical observations.
    Supports downsampling for efficient chart rendering.
    """
    patient_id = int(patient.replace("Patient/", ""))
    user = request.state.user

    start, end = parse_date_range(date)
    rows = await device_obs_repo.get_time_series(
        patient_id, user["activeOrganizationId"],
        loinc_code=code, start=start, end=end,
        downsample_minutes=downsample,
    )

    # Return as FHIR searchset Bundle or plain JSON
    return format_paginated_response(request, rows, to_fhir_device_obs, total=len(rows), limit=_count, offset=0)
```

---

## Standard LOINC Codes for RPM Data

| Metric | LOINC Code | Unit |
|---|---|---|
| Glucose (CGM, interstitial) | 99504-3 | mg/dL |
| Glucose (blood, fingerstick) | 2339-0 | mg/dL |
| Systolic BP | 8480-6 | mmHg |
| Diastolic BP | 8462-4 | mmHg |
| Heart rate | 8867-4 | /min |
| Oxygen saturation (SpO2) | 59408-5 | % |
| Body weight | 29463-7 | kg |
| Body temperature | 8310-5 | °C |
| Steps (daily) | 55423-8 | steps |
| Sleep duration | 93832-4 | h |
| Respiratory rate | 9279-1 | /min |
| Peak expiratory flow | 19935-6 | L/min |

---

## Data Retention Policy

```python
class RPMDataRetentionJob:
    """
    Run monthly: drop partitions older than retention window.
    Device data ≠ clinical records — different retention rules apply.
    """
    RETENTION_YEARS = {
        "dexcom": 7,          # CGM: 7 years (ties to diabetes management records)
        "apple_health": 3,    # Consumer wearable: 3 years
        "withings": 3,
        "fitbit": 1,          # Step counts: 1 year (low clinical value)
    }

    async def prune_expired_partitions(self, source_type: str):
        cutoff = datetime.utcnow() - timedelta(days=365 * self.RETENTION_YEARS.get(source_type, 3))
        # Drop partitions entirely (no row-by-row DELETE — much faster)
        partition_name = f"device_observation_{cutoff.strftime('%Y_%m')}"
        async with session_factory() as session:
            await session.execute(text(f"DROP TABLE IF EXISTS {partition_name}"))
```

---

## Estimated Effort

| Component | Days |
|---|---|
| Partitioned `device_observation` table + pg_partman setup | 2 |
| `DeviceObservationRepository` with bulk COPY | 2 |
| FHIR Observation API with downsampling | 2 |
| Retention policy job | 0.5 |
| Performance benchmarking (target: 10k inserts/sec) | 1 |
| **Total** | **7.5 days** |
