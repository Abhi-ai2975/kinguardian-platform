# $validate — Resource Conformance Validation

**FHIR Spec:** https://www.hl7.org/fhir/R4/resource-operation-validate.html  
**Medplum reference:** `packages/server/src/fhir/operations/validate.ts`

---

## What It Does

The `$validate` operation checks whether a FHIR resource conforms to:
1. The base FHIR R4 resource definition (required fields, cardinality, data types)
2. A specific StructureDefinition profile (when `profile` parameter is supplied)
3. Business rules (e.g., dates must be in the past, codes must exist in a ValueSet)

It returns an `OperationOutcome` — never raises an HTTP error for validation failures.  
HTTP 200 = the operation ran. The outcome severity tells you if the resource is valid.

---

## API Surface

```
POST /[resource]/$validate          — validate an instance of [resource]
POST /[resource]/[id]/$validate     — validate an existing stored resource
POST /$validate                     — validate any resource (type inferred from resourceType field)
```

### Request Body

```json
{
  "resourceType": "Parameters",
  "parameter": [
    {
      "name": "resource",
      "resource": {
        "resourceType": "Patient",
        "name": [{ "family": "Smith" }]
      }
    },
    {
      "name": "profile",
      "valueUri": "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"
    }
  ]
}
```

### Successful Response (valid resource)

```json
{
  "resourceType": "OperationOutcome",
  "issue": [
    {
      "severity": "information",
      "code": "informational",
      "diagnostics": "All OK"
    }
  ]
}
```

### Response with Validation Errors

```json
{
  "resourceType": "OperationOutcome",
  "issue": [
    {
      "severity": "error",
      "code": "required",
      "details": { "text": "Patient.identifier is required by US Core" },
      "expression": ["Patient.identifier"]
    }
  ]
}
```

---

## Current State

We have no `$validate` operation. Pydantic validates request bodies at the router level  
but this is only input schema validation — not FHIR profile conformance validation.

---

## Implementation Plan

### Step 1 — Validation Engine

Create `app/services/validation_service.py`:

```python
from app.schemas.fhir_base import FHIRResourceDict
from app.errors.application import ApplicationError

class ValidationService:
    async def validate(
        self,
        resource: FHIRResourceDict,
        profile: str | None = None,
    ) -> dict:
        issues = []
        issues.extend(self._validate_base_r4(resource))
        if profile:
            issues.extend(await self._validate_profile(resource, profile))
        return self._build_outcome(issues)

    def _validate_base_r4(self, resource: dict) -> list[dict]:
        """Check FHIR R4 invariants: required fields, cardinality, data types."""
        issues = []
        resource_type = resource.get("resourceType")
        if not resource_type:
            issues.append({
                "severity": "error",
                "code": "required",
                "diagnostics": "resourceType is required",
                "expression": ["resourceType"],
            })
        # ... per-resource rules
        return issues

    async def _validate_profile(self, resource: dict, profile: str) -> list[dict]:
        """Check profile constraints (loaded from StructureDefinition)."""
        # Phase 1: return empty (profile validation is phase 2)
        return []

    def _build_outcome(self, issues: list[dict]) -> dict:
        if not issues:
            issues = [{
                "severity": "information",
                "code": "informational",
                "diagnostics": "All OK",
            }]
        return {"resourceType": "OperationOutcome", "issue": issues}
```

### Step 2 — Router

Create `app/routers/operations/validate.py`:

```python
from fastapi import APIRouter, Request
from app.di.dependencies.validation import get_validation_service

router = APIRouter(tags=["Operations"])

@router.post(
    "/{resource_type}/$validate",
    operation_id="validate_resource",
    summary="Validate a FHIR resource",
    description="Checks a FHIR resource against R4 base rules and optionally a named profile.",
    responses={200: {"content": {"application/fhir+json": {}}}},
)
async def validate_resource(
    resource_type: str,
    body: dict,
    request: Request,
    svc=Depends(get_validation_service),
):
    resource = body.get("parameter", [{}])[0].get("resource", body)
    profile = next(
        (p.get("valueUri") for p in body.get("parameter", []) if p.get("name") == "profile"),
        None,
    )
    outcome = await svc.validate(resource, profile)
    return JSONResponse(outcome)
```

### Step 3 — StructureDefinition Storage (Phase 2)

For full profile validation we need to store FHIR StructureDefinitions:

```sql
CREATE TABLE structure_definitions (
    id SERIAL PRIMARY KEY,
    url TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    definition JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_sd_url ON structure_definitions(url);
```

Seed from the FHIR R4 specification package (`hl7.fhir.r4.core`) and US Core (`hl7.fhir.us.core`).

---

## Testing Strategy

```python
async def test_validate_valid_patient():
    resp = await client.post("/Patient/$validate", json={
        "resourceType": "Parameters",
        "parameter": [{"name": "resource", "resource": VALID_PATIENT}],
    })
    assert resp.status_code == 200
    outcome = resp.json()
    assert outcome["resourceType"] == "OperationOutcome"
    assert all(i["severity"] != "error" for i in outcome["issue"])

async def test_validate_missing_resource_type():
    resp = await client.post("/Patient/$validate", json={
        "resourceType": "Parameters",
        "parameter": [{"name": "resource", "resource": {"name": [{"family": "X"}]}}],
    })
    assert resp.status_code == 200
    issues = resp.json()["issue"]
    assert any(i["severity"] == "error" for i in issues)
```

---

## Dependencies

- Phase 1: Pure Python, no external deps
- Phase 2 (profile validation): `fhir.resources` Python library or custom StructureDefinition parser
