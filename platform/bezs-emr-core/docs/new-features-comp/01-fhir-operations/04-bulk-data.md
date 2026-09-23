# Bulk Data Export — $export, $import, Async Job Management

**FHIR Spec:** https://hl7.org/fhir/uv/bulkdata/  
**Medplum reference:** `packages/server/src/fhir/operations/export.ts`, `asyncjob.ts`

---

## Why Bulk Data

Standard FHIR CRUD is designed for individual resource access. Bulk data is designed for:
- Population health analytics (export all diabetic patients)
- Data warehouse loading (nightly ETL to BigQuery/Snowflake)
- Payer-provider data sharing (CMS interoperability rule)
- Patient access APIs (CMS Blue Button 2.0 compliance)
- Research datasets
- Backup and migration

The ONC 21st Century Cures Act and CMS rules **require** bulk data export for EHR certification.

---

## How Bulk Export Works (Async Pattern)

Bulk export is always asynchronous — data volumes are too large for a synchronous HTTP response.

```
Step 1: Client starts the export
    POST /Patient/$export
    → 202 Accepted
    → Content-Location: /bulk-status/job-abc123

Step 2: Client polls for status
    GET /bulk-status/job-abc123
    → 202 (still running): X-Progress: "50% complete"
    → 200 (done): body contains file URLs

Step 3: Client downloads the NDJSON files
    GET /bulk-download/job-abc123/Patient.ndjson
    GET /bulk-download/job-abc123/Encounter.ndjson
    ...

Step 4: Client signals done
    DELETE /bulk-status/job-abc123
```

### Export Kickoff Response Headers

```
HTTP/1.1 202 Accepted
Content-Location: https://fhir.example.com/bulk-status/job-abc123
```

### Status Response (Complete)

```json
{
  "transactionTime": "2024-01-15T10:00:00Z",
  "request": "https://fhir.example.com/Patient/$export",
  "requiresAccessToken": true,
  "output": [
    { "type": "Patient", "url": "https://fhir.example.com/bulk-download/abc123/Patient.ndjson", "count": 5000 },
    { "type": "Encounter", "url": "https://fhir.example.com/bulk-download/abc123/Encounter.ndjson", "count": 25000 }
  ],
  "error": []
}
```

### NDJSON Output Format

Each file is Newline-Delimited JSON — one full FHIR resource per line:

```ndjson
{"resourceType":"Patient","id":"10001","name":[{"family":"Smith"}],...}
{"resourceType":"Patient","id":"10002","name":[{"family":"Jones"}],...}
{"resourceType":"Patient","id":"10003","name":[{"family":"Davis"}],...}
```

---

## Export Endpoints

| Endpoint | Scope |
|---|---|
| `GET /Patient/$export` | All patients + their linked resources |
| `GET /Group/{id}/$export` | A specific cohort/group of patients |
| `GET /$export` | All resources on the server (system-level) |

### Export Parameters

| Parameter | Description |
|---|---|
| `_since` | Only resources modified since this instant |
| `_type` | Comma-separated list of resource types to export |
| `_typeFilter` | FHIR search expressions to filter resources |
| `_outputFormat` | Default: `application/fhir+ndjson` |
| `_elements` | Only export specific fields (not in all servers) |

---

## Database Schema — Async Jobs

```sql
CREATE TABLE async_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type TEXT NOT NULL,          -- 'export', 'import', 'reindex'
    status TEXT NOT NULL DEFAULT 'accepted',  -- accepted, active, completed, failed, cancelled
    progress INTEGER DEFAULT 0,      -- 0-100
    request_url TEXT NOT NULL,
    parameters JSONB,
    output_files JSONB,              -- list of {type, url, count}
    error_files JSONB,
    transaction_time TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    user_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_async_jobs_user ON async_jobs(user_id, org_id, status);
```

---

## File Storage

Bulk export files are large — they must be stored in object storage, not the database.

**Storage options:**
1. **AWS S3** — presigned URLs with TTL
2. **MinIO** (S3-compatible, self-hosted) — for on-premise
3. **Local filesystem** (dev only)

```python
# app/core/storage.py

class StorageBackend(Protocol):
    async def write_ndjson(self, key: str, lines: AsyncIterator[str]) -> str:
        """Write NDJSON lines and return the public URL."""
        ...

    async def presigned_url(self, key: str, ttl: int = 3600) -> str:
        """Generate a time-limited download URL."""
        ...
```

---

## Implementation Plan

### Step 1 — Async Job Infrastructure

```python
# app/services/async_job_service.py

class AsyncJobService:
    async def create_job(self, job_type: str, parameters: dict, user_id: str, org_id: str) -> str:
        """Create job record, return job ID."""
        ...

    async def get_status(self, job_id: str, user_id: str) -> dict:
        """Return status response as per FHIR Bulk Data spec."""
        ...

    async def cancel_job(self, job_id: str, user_id: str) -> None:
        """Cancel a running job."""
        ...
```

### Step 2 — Background Export Worker

Use FastAPI `BackgroundTasks` for small exports, Celery/ARQ for large ones:

```python
async def run_export_job(job_id: str, resource_types: list[str], since: datetime | None):
    """Background task that streams resources to NDJSON files."""
    for resource_type in resource_types:
        repo = get_repository(resource_type)
        async with storage.write_ndjson(f"{job_id}/{resource_type}.ndjson") as writer:
            async for resource in repo.stream_all():
                fhir = to_fhir(resource)
                await writer.write(json.dumps(fhir) + "\n")
    await job_service.mark_complete(job_id, output_files)
```

### Step 3 — Export Router

```python
@router.get("/Patient/$export", operation_id="patient_export_kickoff", status_code=202)
async def export_kickoff(
    request: Request,
    _since: str | None = Query(None, alias="_since"),
    _type: str | None = Query(None, alias="_type"),
    background_tasks: BackgroundTasks = ...,
    svc=Depends(get_async_job_service),
):
    job_id = await svc.create_job("export", {"_since": _since, "_type": _type}, ...)
    background_tasks.add_task(run_export_job, job_id, resource_types, since)
    return Response(
        status_code=202,
        headers={"Content-Location": f"/bulk-status/{job_id}"},
    )

@router.get("/bulk-status/{job_id}", operation_id="export_status")
async def export_status(job_id: str, svc=Depends(get_async_job_service)):
    status = await svc.get_status(job_id)
    if status["status"] == "completed":
        return JSONResponse(status)
    return Response(status_code=202, headers={"X-Progress": f"{status['progress']}% complete"})
```

---

## `$import` — Bulk Data Import

The reverse operation: import a set of NDJSON files into the server.

```
POST /$import
{
  "resourceType": "Parameters",
  "parameter": [
    { "name": "inputFormat", "valueString": "application/fhir+ndjson" },
    { "name": "input", "part": [
      { "name": "type", "valueCode": "Patient" },
      { "name": "url", "valueUri": "https://export.example.com/patients.ndjson" }
    ]}
  ]
}
```

Import is also async — same job polling pattern as export.

---

## `$async-job-cancel`

```
DELETE /bulk-status/{job_id}
→ 202 Accepted
```

---

## Compliance Notes

- CMS Patient Access API requires `Patient/$export` with `_type=ExplanationOfBenefit`
- USCDI v3 requires exporting all data classes
- Files must be available for at least 24 hours after export completes
- Access tokens must be required to download files (`requiresAccessToken: true`)
