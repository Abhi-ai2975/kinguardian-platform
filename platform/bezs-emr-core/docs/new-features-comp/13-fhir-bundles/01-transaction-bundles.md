# Transaction Bundles — Atomic Multi-Resource Operations

**FHIR Spec:** https://www.hl7.org/fhir/R4/http.html#transaction  
**Medplum reference:** `packages/server/src/fhir/batch.ts`

---

## What Is a Transaction Bundle?

A `transaction` bundle is sent via `POST /` (the server root) and contains multiple  
FHIR operations that are executed **atomically** — either every entry succeeds, or the  
entire bundle is rolled back and an error is returned.

This is the FHIR equivalent of a database transaction.

---

## Transaction Bundle Structure

```json
{
  "resourceType": "Bundle",
  "type": "transaction",
  "entry": [
    {
      "fullUrl": "urn:uuid:patient-temp-id",
      "resource": {
        "resourceType": "Patient",
        "name": [{ "family": "Smith", "given": ["John"] }],
        "birthDate": "1985-03-15",
        "gender": "male"
      },
      "request": {
        "method": "POST",
        "url": "Patient"
      }
    },
    {
      "fullUrl": "urn:uuid:coverage-temp-id",
      "resource": {
        "resourceType": "Coverage",
        "status": "active",
        "subscriber": { "reference": "urn:uuid:patient-temp-id" },
        "beneficiary": { "reference": "urn:uuid:patient-temp-id" },
        "payor": [{ "display": "Blue Cross Blue Shield" }]
      },
      "request": {
        "method": "POST",
        "url": "Coverage"
      }
    },
    {
      "resource": {
        "resourceType": "Encounter",
        "status": "planned",
        "class": { "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode", "code": "AMB" },
        "subject": { "reference": "urn:uuid:patient-temp-id" }
      },
      "request": {
        "method": "POST",
        "url": "Encounter"
      }
    }
  ]
}
```

### Key Points

- **`urn:uuid:` references** — temporary IDs used within the bundle to cross-reference  
  entries before they have server-assigned IDs. The server resolves them during processing.
- **`entry.request.method`** — `POST`, `PUT`, `PATCH`, `DELETE`, `GET`
- **`entry.request.url`** — relative URL (e.g., `Patient`, `Patient/10001`)
- **`entry.fullUrl`** — used to define a temporary ID for cross-referencing

---

## Transaction Response

On success, the server returns a response bundle with one entry per input entry:

```json
{
  "resourceType": "Bundle",
  "type": "transaction-response",
  "entry": [
    {
      "response": {
        "status": "201 Created",
        "location": "Patient/10001/_history/1",
        "etag": "W/\"1\"",
        "lastModified": "2024-01-15T10:30:00Z"
      }
    },
    {
      "response": {
        "status": "201 Created",
        "location": "Coverage/240001/_history/1",
        "etag": "W/\"1\""
      }
    },
    {
      "response": {
        "status": "201 Created",
        "location": "Encounter/20001/_history/1",
        "etag": "W/\"1\""
      }
    }
  ]
}
```

On failure, the entire bundle is rolled back and an `OperationOutcome` is returned:

```json
{
  "resourceType": "OperationOutcome",
  "issue": [{
    "severity": "error",
    "code": "processing",
    "diagnostics": "Transaction failed on entry 2 (Coverage): Missing required field 'payor'. All changes rolled back."
  }]
}
```

---

## Supported Operations Within a Transaction

| Method | URL Pattern | Behavior |
|---|---|---|
| `POST` | `Patient` | Create new Patient |
| `PUT` | `Patient/10001` | Update (replace) Patient 10001 |
| `PATCH` | `Patient/10001` | Partial update Patient 10001 |
| `DELETE` | `Patient/10001` | Delete Patient 10001 |
| `GET` | `Patient/10001` | Read Patient (within transaction) |
| `PUT` | `Patient?identifier=MRN|001` | Conditional update |
| `POST` | `Patient` with `ifNoneExist: identifier=MRN|001` | Conditional create |

---

## Reference Resolution — `urn:uuid:` Pattern

References within a bundle use `urn:uuid:` temporary IDs.  
The server must resolve these to real IDs during processing:

```
Input:  Coverage.beneficiary = { reference: "urn:uuid:patient-temp-id" }
        Patient is created with real ID 10001

Output: Coverage.beneficiary = { reference: "Patient/10001" }
```

Resolution algorithm:
1. Assign server-generated IDs to all `POST` entries
2. Build a map: `{ "urn:uuid:patient-temp-id" → "Patient/10001" }`
3. Walk all entries and replace `urn:uuid:*` references with real references
4. Execute all operations in dependency order

---

## Implementation Plan

### Step 1 — Bundle Processor

```python
# app/services/bundle_processor.py

from sqlalchemy.ext.asyncio import AsyncSession
import uuid

class TransactionBundleProcessor:
    def __init__(self, session_factory, service_registry: dict):
        self.session_factory = session_factory
        # Maps resource_type → service instance
        self.services = service_registry

    async def process(
        self,
        bundle: dict,
        user_id: str,
        org_id: str,
    ) -> dict:
        if bundle.get("type") == "transaction":
            return await self._process_transaction(bundle, user_id, org_id)
        elif bundle.get("type") == "batch":
            return await self._process_batch(bundle, user_id, org_id)
        raise ValueError(f"Unsupported bundle type: {bundle.get('type')}")

    async def _process_transaction(self, bundle: dict, user_id: str, org_id: str) -> dict:
        entries = bundle.get("entry", [])
        id_map: dict[str, str] = {}  # urn:uuid:xxx → ResourceType/realId

        async with self.session_factory() as session:
            async with session.begin():  # single DB transaction
                response_entries = []
                for entry in self._sort_by_dependency(entries):
                    response = await self._process_entry(
                        entry, id_map, user_id, org_id, session
                    )
                    response_entries.append(response)

        return {
            "resourceType": "Bundle",
            "type": "transaction-response",
            "entry": response_entries,
        }

    async def _process_entry(
        self,
        entry: dict,
        id_map: dict[str, str],
        user_id: str,
        org_id: str,
        session: AsyncSession,
    ) -> dict:
        request = entry.get("request", {})
        method = request.get("method", "POST").upper()
        url = request.get("url", "")
        resource = self._resolve_references(entry.get("resource", {}), id_map)

        resource_type = resource.get("resourceType") or url.split("?")[0].split("/")[0]
        svc = self.services.get(resource_type)
        if not svc:
            raise ValueError(f"Unsupported resource type: {resource_type}")

        if method == "POST":
            # Handle ifNoneExist conditional create
            if_none_exist = request.get("ifNoneExist")
            if if_none_exist:
                existing = await svc.search_one(if_none_exist, user_id, org_id)
                if existing:
                    ref = f"{resource_type}/{existing.public_id}"
                    if entry.get("fullUrl"):
                        id_map[entry["fullUrl"]] = ref
                    return {"response": {"status": "200 OK", "location": f"{ref}/_history/{existing.version_id}"}}
            created = await svc.create(resource, user_id, org_id, session=session)
            ref = f"{resource_type}/{created.public_id}"
            if entry.get("fullUrl"):
                id_map[entry["fullUrl"]] = ref
            return {"response": {"status": "201 Created", "location": f"{ref}/_history/1", "etag": 'W/"1"'}}

        elif method == "PUT":
            resource_id = int(url.split("/")[1]) if "/" in url else None
            if resource_id:
                updated = await svc.patch(resource_id, resource, user_id, org_id, session=session)
                return {"response": {"status": "200 OK", "location": f"{resource_type}/{resource_id}/_history/{updated.version_id}"}}

        elif method == "DELETE":
            resource_id = int(url.split("/")[1])
            await svc.delete(resource_id, user_id, org_id, session=session)
            return {"response": {"status": "204 No Content"}}

        elif method == "GET":
            resource_id = int(url.split("/")[1])
            found = await svc.get(resource_id, user_id, org_id, session=session)
            return {"resource": svc.to_fhir(found), "response": {"status": "200 OK"}}

        raise ValueError(f"Unsupported method: {method}")

    def _resolve_references(self, resource: dict, id_map: dict) -> dict:
        """Replace urn:uuid: references with real resource references."""
        resource_str = json.dumps(resource)
        for temp_id, real_ref in id_map.items():
            resource_str = resource_str.replace(temp_id, real_ref)
        return json.loads(resource_str)

    def _sort_by_dependency(self, entries: list) -> list:
        """Sort entries so that referenced resources are created before their dependents.
        DELETE entries go last; GET entries go first."""
        order = {"DELETE": 3, "GET": 0, "POST": 1, "PUT": 1, "PATCH": 2}
        return sorted(entries, key=lambda e: order.get(e.get("request", {}).get("method", "POST"), 1))
```

### Step 2 — `POST /` Router

```python
# app/routers/bundle.py

from fastapi import APIRouter, Request, Depends
from fastapi.responses import JSONResponse
from app.services.bundle_processor import TransactionBundleProcessor

bundle_router = APIRouter(tags=["Bundle"])

@bundle_router.post(
    "/",
    operation_id="process_bundle",
    summary="Process a FHIR transaction or batch Bundle",
    description=(
        "Accepts a Bundle of type 'transaction' (atomic) or 'batch' (non-atomic). "
        "Transaction bundles roll back entirely on any failure. "
        "Batch bundles process each entry independently."
    ),
    responses={
        200: {"content": {"application/fhir+json": {}}},
        400: {"content": {"application/fhir+json": {}}},
    },
)
async def process_bundle(
    body: dict,
    request: Request,
    processor: TransactionBundleProcessor = Depends(get_bundle_processor),
):
    bundle_type = body.get("type")
    if bundle_type not in ("transaction", "batch"):
        return JSONResponse(
            {"resourceType": "OperationOutcome", "issue": [{"severity": "error", "code": "invalid", "diagnostics": f"Bundle type '{bundle_type}' not supported for processing. Use 'transaction' or 'batch'."}]},
            status_code=400,
        )
    user = request.state.user
    result = await processor.process(body, user["sub"], user["activeOrganizationId"])
    return JSONResponse(result, status_code=200)
```

### Step 3 — Mount in `main.py`

```python
# app/main.py
from app.routers.bundle import bundle_router
app.include_router(bundle_router)  # mounts at POST /
```

---

## Conditional Operations in Transactions

A power feature: combine conditional create with cross-references to implement  
**idempotent data loading** — safe to call twice without duplicates:

```json
{
  "resourceType": "Bundle",
  "type": "transaction",
  "entry": [
    {
      "fullUrl": "urn:uuid:pat-001",
      "resource": { "resourceType": "Patient", "identifier": [{ "system": "http://example.org/mrn", "value": "MRN-001" }], "name": [{ "family": "Smith" }] },
      "request": {
        "method": "POST",
        "url": "Patient",
        "ifNoneExist": "identifier=http://example.org/mrn|MRN-001"
      }
    },
    {
      "resource": {
        "resourceType": "Coverage",
        "beneficiary": { "reference": "urn:uuid:pat-001" },
        "status": "active"
      },
      "request": {
        "method": "POST",
        "url": "Coverage",
        "ifNoneExist": "beneficiary=urn:uuid:pat-001&status=active"
      }
    }
  ]
}
```

---

## Testing

```python
async def test_transaction_creates_all_or_none():
    bundle = {
        "resourceType": "Bundle",
        "type": "transaction",
        "entry": [
            {"fullUrl": "urn:uuid:p1", "resource": VALID_PATIENT, "request": {"method": "POST", "url": "Patient"}},
            {"resource": INVALID_COVERAGE, "request": {"method": "POST", "url": "Coverage"}},  # will fail
        ]
    }
    resp = await client.post("/", json=bundle)
    assert resp.status_code == 400  # whole bundle rejected
    # Verify Patient was NOT created
    patients = await client.get("/Patient?family=TransactionTestPatient")
    assert patients.json()["total"] == 0  # rolled back
```
