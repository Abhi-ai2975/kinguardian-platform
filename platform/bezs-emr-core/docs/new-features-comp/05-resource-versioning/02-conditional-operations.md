# Conditional Operations

**FHIR Spec:** https://www.hl7.org/fhir/R4/http.html#concurrency

---

## What Are Conditional Operations?

Conditional operations allow clients to make requests that only succeed under specific conditions.  
This prevents lost updates when multiple clients edit the same resource concurrently.

---

## `If-Match` — Optimistic Concurrency Control

Prevents overwriting a resource that has been updated since the client last read it.

```
PUT /Patient/10001
If-Match: W/"3"
Content-Type: application/fhir+json

{ "resourceType": "Patient", "id": "10001", ... }
```

**Server behavior:**
- If current `version_id == 3` → proceed with update, increment to `version_id = 4`
- If current `version_id != 3` → return `409 Conflict`

```json
{
  "resourceType": "OperationOutcome",
  "issue": [{
    "severity": "error",
    "code": "conflict",
    "diagnostics": "Version conflict: resource has been modified. Expected version 3, current is 5."
  }]
}
```

### Implementation

```python
# In PATCH/PUT router:
@router.put("/{resource_type}/{resource_id}")
async def update_resource(
    resource_type: str,
    resource_id: int,
    body: dict,
    request: Request,
    if_match: str | None = Header(None, alias="If-Match"),
    svc=Depends(get_service),
):
    if if_match:
        expected_version = parse_etag(if_match)  # 'W/"3"' → 3
        current = await svc.get_version(resource_id)
        if current != expected_version:
            raise HTTPException(409, "Version conflict")
    return await svc.update(resource_id, body, ...)

def parse_etag(etag: str) -> int:
    # 'W/"3"' → 3
    return int(etag.strip().removeprefix('W/"').removesuffix('"'))
```

---

## `If-None-Match: *` — Conditional Create

Only create the resource if it doesn't already exist with the given identifier.

```
POST /Patient
If-None-Match: *
Content-Type: application/fhir+json

{ "resourceType": "Patient", "identifier": [{ "system": "http://example.org/mrn", "value": "MRN-12345" }], ... }
```

**Server behavior:**
- If a Patient with MRN-12345 already exists → return `200 OK` with the existing resource (no duplicate created)
- If no such Patient exists → create and return `201 Created`

### Implementation

```python
@router.post("/{resource_type}")
async def create_resource(
    resource_type: str,
    body: dict,
    request: Request,
    if_none_match: str | None = Header(None, alias="If-None-Match"),
    svc=Depends(get_service),
):
    if if_none_match == "*":
        # Check for existing resource by identifier
        identifiers = body.get("identifier", [])
        if identifiers:
            existing = await svc.find_by_identifier(identifiers[0])
            if existing:
                # Return existing, don't create duplicate
                fhir = to_fhir(existing)
                return JSONResponse(fhir, status_code=200, headers={"ETag": f'W/"{existing.version_id}"'})
    return await svc.create(body, ...)
```

---

## `If-Modified-Since` — Conditional Read

Only return the resource if it has been modified since the given date.

```
GET /Patient/10001
If-Modified-Since: Mon, 01 Jan 2024 00:00:00 GMT
```

**Server behavior:**
- If `updated_at > If-Modified-Since` → return `200 OK` with resource
- If `updated_at <= If-Modified-Since` → return `304 Not Modified` (no body)

```python
@router.get("/{resource_type}/{resource_id}")
async def get_resource(
    resource_type: str,
    resource_id: int,
    request: Request,
    if_modified_since: str | None = Header(None, alias="If-Modified-Since"),
    svc=Depends(get_service),
):
    resource = await svc.get(resource_id, ...)
    if if_modified_since:
        last_modified = parsedate_to_datetime(if_modified_since)
        if resource.updated_at <= last_modified:
            return Response(status_code=304, headers={"ETag": f'W/"{resource.version_id}"'})
    response = format_response(request, resource, ...)
    response.headers["ETag"] = f'W/"{resource.version_id}"'
    response.headers["Last-Modified"] = resource.updated_at.strftime("%a, %d %b %Y %H:%M:%S GMT")
    return response
```

---

## Conditional Update — `PUT` with Search

```
PUT /Patient?identifier=http://example.org/mrn|MRN-12345
Content-Type: application/fhir+json

{ "resourceType": "Patient", ... }
```

**Server behavior:**
- 0 matches → create new resource (`201 Created`)
- 1 match → update that resource (`200 OK`)
- Multiple matches → `412 Precondition Failed`

```python
@router.put("/{resource_type}")
async def conditional_update(
    resource_type: str,
    body: dict,
    request: Request,
    svc=Depends(get_service),
):
    # Extract search params from query string
    search_params = dict(request.query_params)
    matches = await svc.search(search_params, ...)
    if len(matches) == 0:
        return await svc.create(body, ...)
    elif len(matches) == 1:
        return await svc.update(matches[0].public_id, body, ...)
    else:
        raise HTTPException(412, "Conditional update matched multiple resources")
```

---

## Conditional Delete — `DELETE` with Search

```
DELETE /Patient?identifier=http://example.org/mrn|MRN-12345
```

**Server behavior:**
- 0 matches → `204 No Content` (idempotent — no error)
- 1 match → delete and return `204 No Content`
- Multiple matches → `412 Precondition Failed`

---

## Conditional Read at Version

```
GET /Patient/10001/_history/2
```

Returns the resource at `version_id = 2`.

```python
@router.get("/{resource_type}/{resource_id}/_history/{version_id}")
async def get_version(
    resource_type: str,
    resource_id: int,
    version_id: int,
    history_repo=Depends(get_history_repo),
):
    version = await history_repo.get_version(resource_type, resource_id, version_id)
    if not version:
        raise HTTPException(404, f"Version {version_id} not found")
    return JSONResponse(version.resource_snapshot)
```

---

## Bundle of Conditional Creates (Transaction)

In batch/transaction bundles, conditional creates are common:

```json
{
  "resourceType": "Bundle",
  "type": "transaction",
  "entry": [{
    "resource": { "resourceType": "Patient", "identifier": [{"system": "...", "value": "MRN-001"}], ... },
    "request": {
      "method": "PUT",
      "url": "Patient?identifier=http://example.org/mrn|MRN-001",
      "ifNoneExist": "identifier=http://example.org/mrn|MRN-001"
    }
  }]
}
```

The server processes all entries atomically — either all succeed or all fail.

---

## ETag Best Practices

- Always return `ETag` on every GET, POST (create), PUT, PATCH response
- Use `W/"version_id"` format (weak ETag)
- Don't use strong ETags (`"hash"`) — FHIR uses weak ETags by convention
- Cache headers: `Cache-Control: no-cache` (client must revalidate, but can cache)
