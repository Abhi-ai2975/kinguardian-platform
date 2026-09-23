# Resource Version History

**FHIR Spec:** https://www.hl7.org/fhir/R4/http.html#history

---

## FHIR History Endpoints

```
GET /{resource}/{id}/_history           — All versions of a specific resource
GET /{resource}/{id}/_history/{vid}     — A specific version
GET /{resource}/_history                — All versions of all resources of this type
GET /_history                           — All resource changes on the server
```

### Response — Version History Bundle

```json
{
  "resourceType": "Bundle",
  "type": "history",
  "total": 3,
  "entry": [
    {
      "fullUrl": "https://fhir.example.com/Patient/10001",
      "resource": {
        "resourceType": "Patient",
        "id": "10001",
        "meta": {
          "versionId": "3",
          "lastUpdated": "2024-06-01T10:00:00Z"
        },
        "name": [{ "family": "Smith" }]
      },
      "request": { "method": "PUT", "url": "Patient/10001" },
      "response": { "status": "200", "etag": "W/\"3\"", "lastModified": "2024-06-01T10:00:00Z" }
    },
    {
      "resource": { "resourceType": "Patient", "id": "10001", "meta": { "versionId": "2", ... } },
      "request": { "method": "PUT", "url": "Patient/10001" }
    },
    {
      "resource": { "resourceType": "Patient", "id": "10001", "meta": { "versionId": "1", ... } },
      "request": { "method": "POST", "url": "Patient" }
    }
  ]
}
```

---

## `meta` Fields

Every FHIR resource response must include `meta`:

```json
{
  "resourceType": "Patient",
  "id": "10001",
  "meta": {
    "versionId": "3",
    "lastUpdated": "2024-06-01T10:00:00Z",
    "profile": ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"],
    "security": [{ "system": "http://terminology.hl7.org/CodeSystem/v3-Confidentiality", "code": "N" }],
    "tag": [{ "system": "http://example.org/tags", "code": "reviewed" }]
  }
}
```

---

## Database Schema

### Option 1 — History Table per Resource Type

```sql
-- For each resource type, create a history table
CREATE TABLE patient_history (
    history_id SERIAL PRIMARY KEY,
    resource_id INTEGER NOT NULL,     -- FK to patients.id (internal PK)
    public_id INTEGER NOT NULL,       -- patients.patient_id
    version_id INTEGER NOT NULL,
    operation TEXT NOT NULL,          -- 'create', 'update', 'delete'
    resource_snapshot JSONB NOT NULL, -- full FHIR JSON at this version
    changed_by TEXT NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (public_id, version_id)
);
CREATE INDEX idx_patient_history_public_id ON patient_history(public_id, version_id DESC);
```

### Option 2 — Universal History Table (recommended for simplicity)

```sql
CREATE TABLE resource_history (
    id SERIAL PRIMARY KEY,
    resource_type TEXT NOT NULL,
    public_id INTEGER NOT NULL,        -- the resource's sequence-based ID
    version_id INTEGER NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
    resource_snapshot JSONB NOT NULL,  -- full FHIR JSON at this point
    changed_by TEXT NOT NULL,
    org_id TEXT NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_resource_history_lookup ON resource_history(resource_type, public_id, version_id DESC);
CREATE INDEX idx_resource_history_org ON resource_history(org_id, changed_at DESC);
CREATE INDEX idx_resource_history_system ON resource_history(changed_at DESC);
```

---

## Version ID Tracking

Add `version_id` column to every resource table:

```python
# In base ORM model
version_id = Column(Integer, nullable=False, default=1, server_default="1")
```

Increment on every update:

```sql
-- In update trigger or application code
UPDATE patients SET version_id = version_id + 1, updated_at = NOW() WHERE id = :id;
```

---

## Implementation Plan

### Step 1 — Migration

```python
# alembic migration
def upgrade():
    # Add version_id to all resource tables
    for table in RESOURCE_TABLES:
        op.add_column(table, sa.Column("version_id", sa.Integer, nullable=False, server_default="1"))

    # Create universal history table
    op.create_table("resource_history",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("resource_type", sa.Text, nullable=False),
        sa.Column("public_id", sa.Integer, nullable=False),
        sa.Column("version_id", sa.Integer, nullable=False),
        sa.Column("operation", sa.Text, nullable=False),
        sa.Column("resource_snapshot", postgresql.JSONB, nullable=False),
        sa.Column("changed_by", sa.Text, nullable=False),
        sa.Column("org_id", sa.Text, nullable=False),
        sa.Column("changed_at", sa.TIMESTAMPTZ, nullable=False, server_default=sa.func.now()),
    )
```

### Step 2 — History Repository

```python
# app/repository/history_repository.py

class HistoryRepository:
    async def record(
        self,
        resource_type: str,
        public_id: int,
        version_id: int,
        operation: str,
        fhir_snapshot: dict,
        changed_by: str,
        org_id: str,
    ) -> None:
        async with self.session_factory() as session:
            session.add(ResourceHistory(
                resource_type=resource_type,
                public_id=public_id,
                version_id=version_id,
                operation=operation,
                resource_snapshot=fhir_snapshot,
                changed_by=changed_by,
                org_id=org_id,
            ))
            await session.commit()

    async def get_history(
        self,
        resource_type: str,
        public_id: int,
        org_id: str,
        since: datetime | None = None,
        count: int = 50,
    ) -> list[ResourceHistory]:
        async with self.session_factory() as session:
            stmt = (
                select(ResourceHistory)
                .where(
                    ResourceHistory.resource_type == resource_type,
                    ResourceHistory.public_id == public_id,
                    ResourceHistory.org_id == org_id,
                )
                .order_by(ResourceHistory.version_id.desc())
                .limit(count)
            )
            if since:
                stmt = stmt.where(ResourceHistory.changed_at >= since)
            result = await session.execute(stmt)
            return result.scalars().all()
```

### Step 3 — Hook into Mutations

```python
# In base service or repository — call after every create/update/delete:

async def _record_history(self, resource, operation: str, fhir_snapshot: dict, user_id: str, org_id: str):
    await self.history_repo.record(
        resource_type=self.RESOURCE_TYPE,
        public_id=resource.public_id,
        version_id=resource.version_id,
        operation=operation,
        fhir_snapshot=fhir_snapshot,
        changed_by=user_id,
        org_id=org_id,
    )
```

### Step 4 — History Router

```python
# app/routers/history.py

@router.get("/{resource_type}/{resource_id}/_history", operation_id="resource_history")
async def resource_history(
    resource_type: str,
    resource_id: int,
    request: Request,
    _since: str | None = Query(None, alias="_since"),
    _count: int = Query(50, alias="_count", ge=1, le=200),
    history_repo=Depends(get_history_repo),
):
    user = request.state.user
    since = datetime.fromisoformat(_since) if _since else None
    history = await history_repo.get_history(resource_type, resource_id, user["activeOrganizationId"], since, _count)
    entries = []
    for h in history:
        entries.append({
            "resource": h.resource_snapshot,
            "request": {"method": "DELETE" if h.operation == "delete" else ("POST" if h.version_id == 1 else "PUT"), "url": f"{resource_type}/{resource_id}"},
            "response": {"status": "200", "etag": f'W/"{h.version_id}"', "lastModified": h.changed_at.isoformat()},
        })
    return JSONResponse({
        "resourceType": "Bundle",
        "type": "history",
        "total": len(entries),
        "entry": entries,
    })
```

---

## ETag Headers

All GET responses must include ETag. All PUT responses must update it:

```python
# In router — get response
response = format_response(request, resource, ...)
response.headers["ETag"] = f'W/"{resource.version_id}"'
response.headers["Last-Modified"] = resource.updated_at.strftime("%a, %d %b %Y %H:%M:%S GMT")
return response
```

---

## History Query Parameters

| Param | Description |
|---|---|
| `_since` | Only return versions changed after this instant |
| `_count` | Page size (default 50) |
| `_at` | Return version as of this point in time |
