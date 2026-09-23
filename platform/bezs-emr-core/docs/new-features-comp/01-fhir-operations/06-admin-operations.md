# Admin Operations — $expunge, $reindex, $db-stats, $async-job-cancel

**Medplum reference:** `packages/server/src/fhir/operations/expunge.ts`, `reindex.ts`, `dbstats.ts`

---

## `$expunge` — Permanent Deletion

FHIR's standard `DELETE` is a **soft delete** — the resource is marked as `inactive` but kept  
in the database and in version history. `$expunge` permanently removes a resource and all its  
history versions from storage. This is needed for:

- GDPR "right to erasure" requests
- Test data cleanup
- Correcting mistakenly created records

```
POST /Patient/10001/$expunge
POST /Patient/$expunge          (expunge all patients for current org — danger!)
POST /$expunge                  (system-level expunge — superadmin only)
```

**Request body:**
```json
{
  "resourceType": "Parameters",
  "parameter": [
    { "name": "expungeDeletedResources", "valueBoolean": true },
    { "name": "expungeOldVersions", "valueBoolean": true }
  ]
}
```

### Implementation

```python
# app/services/expunge_service.py

class ExpungeService:
    async def expunge_resource(self, resource_type: str, resource_id: int, user_id: str, org_id: str):
        """Hard-delete a resource and all its history from the database."""
        async with self.session_factory() as session:
            async with session.begin():
                # Delete history versions first
                await session.execute(
                    delete(ResourceHistory).where(
                        ResourceHistory.resource_type == resource_type,
                        ResourceHistory.resource_public_id == resource_id,
                        ResourceHistory.org_id == org_id,
                    )
                )
                # Delete the resource itself
                resource = await self._resolve(session, resource_type, resource_id, org_id)
                await session.delete(resource)
                # Write AuditEvent for the expunge
                await self._audit_expunge(session, resource_type, resource_id, user_id, org_id)
```

**Router:**
```python
@router.post("/{resource_type}/{resource_id}/$expunge", operation_id="expunge_resource")
async def expunge(
    resource_type: str,
    resource_id: int,
    request: Request,
    body: dict,
    svc=Depends(get_expunge_service),
):
    # Require superadmin permission
    require_permission("Admin", "delete")(request)
    await svc.expunge_resource(resource_type, resource_id, request.state.user.get("sub"), ...)
    return JSONResponse({"resourceType": "OperationOutcome", "issue": [{"severity": "information", "code": "informational", "diagnostics": "Expunge complete"}]})
```

---

## `$reindex` — Re-index Search Parameters

When search parameter definitions are updated, existing resources need their search indexes  
rebuilt. Also needed after importing bulk data.

```
POST /Patient/$reindex
POST /$reindex                  (reindex all resources)
```

**Request body:**
```json
{
  "resourceType": "Parameters",
  "parameter": [
    { "name": "resourceType", "valueCode": "Patient" },
    { "name": "startId", "valueString": "0" }
  ]
}
```

### Implementation

This is an async operation — triggers a background job:

```python
@router.post("/{resource_type}/$reindex", operation_id="reindex_resource_type", status_code=202)
async def reindex(
    resource_type: str,
    background_tasks: BackgroundTasks,
    svc=Depends(get_async_job_service),
):
    job_id = await svc.create_job("reindex", {"resource_type": resource_type}, ...)
    background_tasks.add_task(run_reindex, job_id, resource_type)
    return Response(status_code=202, headers={"Content-Location": f"/bulk-status/{job_id}"})
```

---

## `$db-stats` — Database Statistics

Returns PostgreSQL statistics useful for monitoring and capacity planning.

```
GET /$db-stats
```

**Response:**
```json
{
  "resourceType": "Parameters",
  "parameter": [
    { "name": "resourceCounts", "part": [
      { "name": "Patient", "valueInteger": 15420 },
      { "name": "Encounter", "valueInteger": 89234 },
      { "name": "Observation", "valueInteger": 521043 }
    ]},
    { "name": "dbSize", "valueString": "12.4 GB" },
    { "name": "cacheHitRatio", "valueDecimal": 0.97 }
  ]
}
```

### Implementation

```python
# app/services/db_stats_service.py

DB_STATS_QUERY = """
SELECT
  schemaname,
  relname as table_name,
  n_live_tup as row_count,
  pg_size_pretty(pg_total_relation_size(relid)) as total_size
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;
"""

class DbStatsService:
    async def get_stats(self) -> dict:
        async with self.session_factory() as session:
            result = await session.execute(text(DB_STATS_QUERY))
            rows = result.fetchall()
            params = []
            for row in rows:
                params.append({"name": row.table_name, "valueInteger": row.row_count})
            return {"resourceType": "Parameters", "parameter": [{"name": "tables", "part": params}]}
```

---

## `$db-schema-diff` — Schema Drift Detection

Compares the current database schema to the expected schema, returning any differences.  
Useful for detecting drift after manual database changes or failed migrations.

```
GET /$db-schema-diff
```

---

## `$explain` — SQL Query Explanation

For performance debugging — returns the PostgreSQL `EXPLAIN ANALYZE` output for a FHIR search query.

```
POST /$explain
{
  "parameter": [
    { "name": "query", "valueString": "Patient?family=Smith&_count=50" }
  ]
}
```

**Response:**
```json
{
  "parameter": [
    { "name": "plan", "valueString": "Seq Scan on patients (cost=0.00..150.00 rows=5000...)..." }
  ]
}
```

---

## `$project-init` — Initialize a New Project (Tenant)

Creates a new tenant space with default resources:

```
POST /$project-init
{
  "parameter": [
    { "name": "projectName", "valueString": "Acme Health Clinic" },
    { "name": "ownerEmail", "valueString": "admin@acme.com" }
  ]
}
```

Creates:
- Organization resource
- Default AccessPolicies (admin, practitioner, patient roles)
- Default ValueSets for this project
- Sends welcome email to owner

---

## `$project-clone` — Clone a Project

Copies all resources from one tenant to a new tenant (useful for onboarding new customers  
from a template organization).

```
POST /$project-clone
{
  "parameter": [
    { "name": "sourceProjectId", "valueString": "org-template" },
    { "name": "targetProjectName", "valueString": "New Customer Clinic" }
  ]
}
```

---

## Access Control for Admin Operations

All admin operations must require a special `Admin` permission:

```python
# In router
@router.post("/$expunge")
async def system_expunge(request: Request, ...):
    if not has_role(request, "superadmin"):
        raise ForbiddenError("$expunge requires superadmin role")
```

Or use a separate admin router with middleware:

```python
admin_router = APIRouter(prefix="/admin", dependencies=[Depends(require_superadmin)])
```
