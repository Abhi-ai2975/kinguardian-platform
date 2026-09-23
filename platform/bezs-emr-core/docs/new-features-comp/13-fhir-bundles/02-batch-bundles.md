# Batch Bundles — Non-Atomic Multi-Request Processing

**FHIR Spec:** https://www.hl7.org/fhir/R4/http.html#transaction

---

## Batch vs. Transaction

| Feature | Transaction | Batch |
|---|---|---|
| Atomicity | All-or-nothing | Each entry independent |
| Rollback on failure | Yes | No — other entries continue |
| `urn:uuid:` references | Resolved across entries | Only within the same entry |
| Use case | Creating related resources | Bulk operations, mixed reads/writes |
| Performance | Slightly slower (DB transaction) | Faster (no transaction overhead) |

---

## Batch Bundle Structure

```json
{
  "resourceType": "Bundle",
  "type": "batch",
  "entry": [
    {
      "request": { "method": "GET", "url": "Patient/10001" }
    },
    {
      "request": { "method": "GET", "url": "Encounter?patient=Patient/10001&_count=5" }
    },
    {
      "resource": { "resourceType": "Observation", "status": "final", "code": { "text": "Heart Rate" }, "subject": { "reference": "Patient/10001" }, "valueQuantity": { "value": 72, "unit": "bpm" } },
      "request": { "method": "POST", "url": "Observation" }
    },
    {
      "request": { "method": "DELETE", "url": "Appointment/40001" }
    }
  ]
}
```

---

## Batch Response

Each entry gets its own response. Failures don't stop other entries:

```json
{
  "resourceType": "Bundle",
  "type": "batch-response",
  "entry": [
    {
      "resource": { "resourceType": "Patient", "id": "10001", ... },
      "response": { "status": "200 OK", "etag": "W/\"3\"" }
    },
    {
      "resource": { "resourceType": "Bundle", "type": "searchset", "total": 5, "entry": [...] },
      "response": { "status": "200 OK" }
    },
    {
      "response": { "status": "201 Created", "location": "Observation/160001/_history/1" }
    },
    {
      "response": {
        "status": "404 Not Found",
        "outcome": { "resourceType": "OperationOutcome", "issue": [{ "severity": "error", "code": "not-found" }] }
      }
    }
  ]
}
```

---

## Common Use Cases

### 1. Clinical Dashboard Load

Load everything needed for a patient dashboard in one round-trip:

```json
{
  "resourceType": "Bundle",
  "type": "batch",
  "entry": [
    { "request": { "method": "GET", "url": "Patient/10001" } },
    { "request": { "method": "GET", "url": "Condition?patient=Patient/10001&clinical-status=active" } },
    { "request": { "method": "GET", "url": "MedicationRequest?patient=Patient/10001&status=active" } },
    { "request": { "method": "GET", "url": "AllergyIntolerance?patient=Patient/10001" } },
    { "request": { "method": "GET", "url": "Observation?patient=Patient/10001&category=vital-signs&_sort=-date&_count=1" } },
    { "request": { "method": "GET", "url": "Appointment?patient=Patient/10001&status=booked&_sort=date&_count=3" } }
  ]
}
```

This is 6 FHIR reads in **one** HTTP call — critical for mobile/low-latency clients.

### 2. Bulk Status Updates

Update multiple appointments at once:

```json
{
  "resourceType": "Bundle",
  "type": "batch",
  "entry": [
    { "resource": { "resourceType": "Appointment", "id": "40001", "status": "cancelled" }, "request": { "method": "PUT", "url": "Appointment/40001" } },
    { "resource": { "resourceType": "Appointment", "id": "40002", "status": "cancelled" }, "request": { "method": "PUT", "url": "Appointment/40002" } },
    { "resource": { "resourceType": "Appointment", "id": "40003", "status": "cancelled" }, "request": { "method": "PUT", "url": "Appointment/40003" } }
  ]
}
```

### 3. Multi-Patient Lab Results Ingestion

When a lab system sends results for multiple patients:

```json
{
  "resourceType": "Bundle",
  "type": "batch",
  "entry": [
    { "resource": { "resourceType": "Observation", "subject": { "reference": "Patient/10001" }, "code": { "coding": [{ "system": "http://loinc.org", "code": "4548-4" }] }, "valueQuantity": { "value": 7.8, "unit": "%" } }, "request": { "method": "POST", "url": "Observation" } },
    { "resource": { "resourceType": "Observation", "subject": { "reference": "Patient/10002" }, "code": { "coding": [{ "system": "http://loinc.org", "code": "4548-4" }] }, "valueQuantity": { "value": 9.1, "unit": "%" } }, "request": { "method": "POST", "url": "Observation" } }
  ]
}
```

---

## Implementation Plan

### Batch Processor (extends TransactionBundleProcessor)

```python
# app/services/bundle_processor.py (addition)

async def _process_batch(self, bundle: dict, user_id: str, org_id: str) -> dict:
    """Process each entry independently — failures don't stop other entries."""
    entries = bundle.get("entry", [])
    response_entries = []

    for entry in entries:
        try:
            response = await self._process_entry(
                entry,
                id_map={},     # no cross-entry reference resolution in batch
                user_id=user_id,
                org_id=org_id,
                session=None,  # each entry gets its own session
            )
            response_entries.append(response)
        except Exception as e:
            status = "404 Not Found" if isinstance(e, NotFoundError) else "400 Bad Request"
            response_entries.append({
                "response": {
                    "status": status,
                    "outcome": {
                        "resourceType": "OperationOutcome",
                        "issue": [{"severity": "error", "code": "processing", "diagnostics": str(e)}],
                    },
                }
            })

    return {
        "resourceType": "Bundle",
        "type": "batch-response",
        "entry": response_entries,
    }
```

---

## Performance Considerations

- **Batch GET requests** should be processed concurrently using `asyncio.gather()`:

```python
async def _process_batch_concurrent(self, entries: list, user_id: str, org_id: str) -> list:
    """Process all GET entries concurrently, writes sequentially."""
    reads = [(i, e) for i, e in enumerate(entries) if e.get("request", {}).get("method") == "GET"]
    writes = [(i, e) for i, e in enumerate(entries) if e.get("request", {}).get("method") != "GET"]

    # Concurrent reads
    read_tasks = [self._process_entry(e, {}, user_id, org_id) for _, e in reads]
    read_results = await asyncio.gather(*read_tasks, return_exceptions=True)

    # Sequential writes (avoid deadlocks)
    write_results = []
    for _, entry in writes:
        result = await self._process_entry(entry, {}, user_id, org_id)
        write_results.append(result)

    # Merge in original order
    responses = [None] * len(entries)
    for (i, _), result in zip(reads, read_results):
        responses[i] = result if not isinstance(result, Exception) else self._error_response(result)
    for (i, _), result in zip(writes, write_results):
        responses[i] = result
    return responses
```

- Set a **maximum batch size** (e.g., 500 entries) to prevent abuse
- Each batch `GET` against a list endpoint counts as one request for rate limiting

---

## Batch Size Limits

```python
@bundle_router.post("/")
async def process_bundle(body: dict, ...):
    entries = body.get("entry", [])
    if len(entries) > 500:
        return JSONResponse(
            {"resourceType": "OperationOutcome", "issue": [{"severity": "error", "code": "too-costly", "diagnostics": "Batch size exceeds limit of 500 entries."}]},
            status_code=400,
        )
```
