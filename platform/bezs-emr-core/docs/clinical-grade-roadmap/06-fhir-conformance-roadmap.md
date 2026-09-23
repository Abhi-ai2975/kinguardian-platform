# FHIR Conformance Roadmap

> How to make this server a conformant FHIR R4 server: CapabilityStatement, search, US Core, versioning, $everything, bulk export, subscriptions, and Inferno certification.

---

## 1. CapabilityStatement (`GET /metadata`)

The CapabilityStatement is **required by the FHIR spec** and is the **first thing Inferno checks**. A server without one fails the entire conformance test suite.

### Implementation

```python
# app/routers/metadata.py
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

router = APIRouter()

CAPABILITY_STATEMENT = {
    "resourceType": "CapabilityStatement",
    "id": "fhir-server-capability",
    "url": "https://yourplatform.com/api/fhir/v1/metadata",
    "version": "1.0.0",
    "name": "FHIRServerCapabilityStatement",
    "title": "FHIR Server CapabilityStatement",
    "status": "active",
    "date": "2026-06-01",
    "publisher": "Your Healthcare Platform",
    "kind": "instance",
    "software": {
        "name": "FHIR Server",
        "version": "1.0.0",
    },
    "implementation": {
        "description": "FHIR R4 Server",
        "url": "https://yourplatform.com/api/fhir/v1",
    },
    "fhirVersion": "4.0.1",
    "format": ["application/fhir+json", "application/json"],
    "rest": [{
        "mode": "server",
        "security": {
            "cors": True,
            "service": [{
                "coding": [{
                    "system": "http://terminology.hl7.org/CodeSystem/restful-security-service",
                    "code": "SMART-on-FHIR",
                }]
            }],
            "extension": [{
                "url": "http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris",
                "extension": [
                    {"url": "token",    "valueUri": "https://auth.yourplatform.com/token"},
                    {"url": "authorize","valueUri": "https://auth.yourplatform.com/auth"},
                    {"url": "introspect","valueUri": "https://auth.yourplatform.com/introspect"},
                ]
            }]
        },
        "resource": _build_resource_entries(),  # function generates per-resource entries
        "operation": [
            {"name": "validate",       "definition": "http://hl7.org/fhir/OperationDefinition/Resource-validate"},
            {"name": "everything",     "definition": "http://hl7.org/fhir/OperationDefinition/Patient-everything"},
            {"name": "export",         "definition": "http://hl7.org/fhir/uv/bulkdata/OperationDefinition/patient-export"},
            {"name": "match",          "definition": "http://hl7.org/fhir/OperationDefinition/Patient-match"},
        ]
    }]
}

def _build_resource_entries() -> list:
    """Generate resource capability entries for all 34 implemented resources."""
    resources = [
        "Patient", "Practitioner", "Encounter", "Appointment", "Condition",
        "Observation", "DiagnosticReport", "MedicationRequest", "Medication",
        "Procedure", "ServiceRequest", "DeviceRequest", "AllergyIntolerance",
        "Immunization", "CarePlan", "Organization", "PractitionerRole",
        "HealthcareService", "Location", "Schedule", "Slot",
        "QuestionnaireResponse", "Claim", "ClaimResponse", "Coverage",
        "Invoice", "Task", "AuditEvent", "Provenance", "DocumentReference",
        "Specimen", "RelatedPerson", "EpisodeOfCare",
    ]
    entries = []
    for resource in resources:
        entries.append({
            "type": resource,
            "profile": f"http://hl7.org/fhir/StructureDefinition/{resource}",
            "interaction": [
                {"code": "read"}, {"code": "vread"}, {"code": "update"},
                {"code": "delete"}, {"code": "create"},
                {"code": "search-type"}, {"code": "history-instance"},
                {"code": "history-type"},
            ],
            "versioning": "versioned",
            "readHistory": True,
            "updateCreate": False,
            "conditionalCreate": False,
            "conditionalRead": "not-supported",
            "conditionalUpdate": False,
            "conditionalDelete": "not-supported",
            "searchParam": _search_params_for(resource),
        })
    return entries
```

Mount it:
```python
# In main.py
from app.routers.metadata import router as metadata_router
app.include_router(metadata_router, prefix="/api/fhir/v1")

# In metadata.py
@router.get("/metadata", include_in_schema=False)
async def capability_statement(request: Request):
    return JSONResponse(
        content=CAPABILITY_STATEMENT,
        media_type="application/fhir+json",
    )
```

---

## 2. FHIR Search

### 2.1 Search Architecture

FHIR search is the most complex FHIR feature to implement correctly. The architecture must be:

1. **Parse** search parameters from query string
2. **Map** each parameter to a column/relationship in the ORM
3. **Build** a dynamic SQLAlchemy query
4. **Execute** with pagination
5. **Include** referenced resources (`_include` / `_revinclude`)
6. **Return** as FHIR Bundle or plain paginated JSON

### 2.2 Search Parameter Registry

```python
# app/fhir/search/parameters.py

from dataclasses import dataclass
from enum import Enum
from typing import Callable

class SearchParamType(str, Enum):
    STRING = "string"
    TOKEN = "token"
    DATE = "date"
    REFERENCE = "reference"
    QUANTITY = "quantity"
    URI = "uri"
    COMPOSITE = "composite"
    NUMBER = "number"

@dataclass
class SearchParam:
    name: str         # FHIR parameter name (e.g., "family")
    type: SearchParamType
    column_path: str  # SQLAlchemy column path (e.g., "patient.names.family")
    join: list[str]   # joins to add (e.g., ["patient_names"])
    modifier_support: set[str]  # supported modifiers: :exact, :contains, :missing

PATIENT_SEARCH_PARAMS: dict[str, SearchParam] = {
    "family": SearchParam(
        name="family",
        type=SearchParamType.STRING,
        column_path="PatientNameModel.family",
        join=["names"],
        modifier_support={":exact", ":contains", ":missing"},
    ),
    "given": SearchParam("given", SearchParamType.STRING, "PatientNameModel.given", ["names"], {":exact", ":missing"}),
    "gender": SearchParam("gender", SearchParamType.TOKEN, "PatientModel.gender", [], {":missing"}),
    "birthdate": SearchParam("birthdate", SearchParamType.DATE, "PatientModel.birth_date", [], {":missing", ":lt", ":gt", ":le", ":ge", ":eq", ":ne", ":sa", ":eb", ":ap"}),
    "identifier": SearchParam("identifier", SearchParamType.TOKEN, "PatientIdentifierModel.value", ["identifiers"], {":missing"}),
    "active": SearchParam("active", SearchParamType.TOKEN, "PatientModel.active", [], {}),
    "_id": SearchParam("_id", SearchParamType.TOKEN, "PatientModel.patient_id", [], {}),
    "_lastUpdated": SearchParam("_lastUpdated", SearchParamType.DATE, "PatientModel.updated_at", [], {}),
}
```

### 2.3 Search Query Builder

```python
# app/fhir/search/builder.py

class FHIRSearchQueryBuilder:
    def build(
        self,
        model_class,
        search_params: dict[str, SearchParam],
        query_params: dict[str, str],
        org_id: str,
        user_id: str,
    ) -> Select:
        stmt = select(model_class).where(
            model_class.org_id == org_id,
            model_class.user_id == user_id,
        )

        # Standard _filter, _has, _include handled separately
        for key, value in query_params.items():
            param_name, _, modifier = key.partition(":")
            
            if param_name not in search_params:
                continue  # unknown param — ignore or return OperationOutcome

            param = search_params[param_name]
            stmt = self._apply_param(stmt, model_class, param, value, modifier)

        # _sort
        if "_sort" in query_params:
            stmt = self._apply_sort(stmt, model_class, query_params["_sort"], search_params)

        return stmt

    def _apply_param(self, stmt, model_class, param: SearchParam, value: str, modifier: str) -> Select:
        if modifier == "missing":
            col = self._resolve_column(model_class, param)
            return stmt.where(col.is_(None) if value == "true" else col.isnot(None))

        if param.type == SearchParamType.STRING:
            col = self._resolve_column(model_class, param)
            if modifier == "exact":
                return stmt.where(col == value)
            elif modifier == "contains":
                return stmt.where(col.ilike(f"%{value}%"))
            else:  # default: starts-with
                return stmt.where(col.ilike(f"{value}%"))

        if param.type == SearchParamType.TOKEN:
            # token: system|code or just code
            if "|" in value:
                system, code = value.split("|", 1)
                col = self._resolve_column(model_class, param)
                # Also need to match system column if applicable
                return stmt.where(col == code)
            else:
                col = self._resolve_column(model_class, param)
                return stmt.where(col == value)

        if param.type == SearchParamType.DATE:
            col = self._resolve_column(model_class, param)
            prefix_map = {
                "eq": lambda c, v: c == v,
                "ne": lambda c, v: c != v,
                "lt": lambda c, v: c < v,
                "gt": lambda c, v: c > v,
                "le": lambda c, v: c <= v,
                "ge": lambda c, v: c >= v,
            }
            # Parse FHIR date prefix (e.g., "gt2024-01-01")
            for prefix, op in prefix_map.items():
                if value.startswith(prefix):
                    return stmt.where(op(col, value[len(prefix):]))
            return stmt.where(col == value)  # default eq

        return stmt
```

### 2.4 `_include` and `_revinclude`

```python
async def apply_include(
    bundle_entries: list[dict],
    include_params: list[str],  # ["Observation:subject", "Observation:performer"]
    session: AsyncSession,
) -> list[dict]:
    """
    Fetch and append included resources.
    _include=Observation:subject means: for each Observation, include Patient/Practitioner it references
    """
    extra_resources = []
    seen_refs = set()

    for include_expr in include_params:
        parts = include_expr.split(":")
        source_type = parts[0]   # "Observation"
        ref_field = parts[1]     # "subject"
        target_type = parts[2] if len(parts) > 2 else None  # optional "Patient"

        for entry in bundle_entries:
            resource = entry.get("resource", {})
            if resource.get("resourceType") != source_type:
                continue

            ref = resource.get(ref_field, {})
            if isinstance(ref, dict):
                ref_str = ref.get("reference", "")
            else:
                continue

            if ref_str in seen_refs:
                continue
            seen_refs.add(ref_str)

            # Fetch the referenced resource
            rtype, rid = ref_str.split("/")
            if target_type and rtype != target_type:
                continue

            fetched = await _fetch_resource(rtype, int(rid), session)
            if fetched:
                extra_resources.append({"resource": fetched, "search": {"mode": "include"}})

    return bundle_entries + extra_resources
```

---

## 3. Resource Versioning (`_history`)

### DB Schema Changes

Add `version_id` to every resource model and a `<resource>_versions` table:

```python
# Migration approach: add version tracking

# 1. Add version_id to base model
version_id = Column(Integer, nullable=False, default=1, server_default="1")

# 2. Create versions table (example for Patient)
class PatientVersionModel(FHIRBase):
    __tablename__ = "patient_versions"

    id = Column(Integer, primary_key=True)
    patient_id = Column(Integer, index=True)
    version_id = Column(Integer, nullable=False)
    data_snapshot = Column(JSONB)  # full FHIR JSON at this version
    changed_by = Column(String)
    changed_at = Column(DateTime, default=datetime.utcnow)
    change_type = Column(String)   # create/update/delete
```

### Repository Changes

```python
async def patch(self, patient_id: int, payload: PatientPatchSchema, updated_by: str) -> PatientModel:
    async with self.session_factory() as session:
        patient = await self._get(session, patient_id)
        if not patient:
            return None

        # Save version snapshot BEFORE applying patch
        version = PatientVersionModel(
            patient_id=patient.patient_id,
            version_id=patient.version_id,
            data_snapshot=to_fhir_patient(patient),  # current state
            changed_by=updated_by,
            changed_at=datetime.utcnow(),
            change_type="update",
        )
        session.add(version)

        # Apply patch
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(patient, field, value)
        patient.version_id += 1
        patient.updated_by = updated_by

        await session.commit()
        return patient
```

### History Endpoints

```python
@router.get("/{patient_id}/_history", operation_id="list_patient_history")
async def list_patient_history(
    patient_id: int,
    ...
):
    versions = await service.get_history(patient_id)
    return Bundle of historical versions

@router.get("/{patient_id}/_history/{vid}", operation_id="vread_patient")
async def vread_patient(
    patient_id: int,
    vid: int,
    ...
):
    version = await service.get_version(patient_id, vid)
    if not version:
        raise HTTPException(404, "Version not found")
    return the version snapshot
```

---

## 4. `Patient/$everything`

Returns all resources in the Patient compartment — the primary access mechanism for patient portal and CCD exports.

```python
@router.get(
    "/{patient_id}/$everything",
    operation_id="patient_everything",
    summary="Get all resources for a patient (Patient compartment)",
)
async def patient_everything(
    patient_id: int,
    _since: str | None = Query(None, alias="_since"),
    _type: str | None = Query(None, alias="_type"),
    _count: int = Query(100, alias="_count"),
    request: Request,
    service: PatientService = Depends(get_patient_service),
):
    # All resource types in Patient compartment per FHIR spec
    compartment_resources = [
        "AllergyIntolerance", "Appointment", "CarePlan", "Condition",
        "Coverage", "DiagnosticReport", "DocumentReference", "Encounter",
        "EpisodeOfCare", "Immunization", "MedicationRequest", "Observation",
        "Procedure", "QuestionnaireResponse", "ServiceRequest", "Specimen",
    ]

    # Filter by _type if provided
    if _type:
        compartment_resources = [r for r in compartment_resources if r in _type.split(",")]

    entries = []
    for resource_type in compartment_resources:
        resources = await _fetch_patient_resources(patient_id, resource_type, _since, session)
        entries.extend([{"resource": r, "search": {"mode": "match"}} for r in resources])

    # Include Patient itself
    patient = await service.get_patient(patient_id)
    entries.insert(0, {"resource": to_fhir_patient(patient), "search": {"mode": "match"}})

    bundle = {
        "resourceType": "Bundle",
        "type": "searchset",
        "total": len(entries),
        "entry": entries,
    }
    return JSONResponse(content=bundle, media_type="application/fhir+json")
```

---

## 5. Transaction Bundle (`POST /`)

Atomic multi-resource operations — used for admission workflows, discharge, etc.

```python
@app.post(
    "/api/fhir/v1/",
    operation_id="process_bundle",
    summary="Process a transaction or batch Bundle",
)
async def process_bundle(request: Request, db: Database = Depends(get_db)):
    body = await request.json()

    if body.get("resourceType") != "Bundle":
        raise HTTPException(400, "Expected Bundle")

    bundle_type = body.get("type")

    if bundle_type == "transaction":
        return await _process_transaction(body, db, request)
    elif bundle_type == "batch":
        return await _process_batch(body, db, request)
    else:
        raise HTTPException(400, f"Bundle type '{bundle_type}' not supported")

async def _process_transaction(bundle: dict, db: Database, request: Request) -> dict:
    """Atomic — all entries succeed or all fail (single DB transaction)."""
    response_entries = []

    async with db.session() as session:
        async with session.begin():  # single transaction for all entries
            for entry in bundle.get("entry", []):
                request_info = entry.get("request", {})
                method = request_info.get("method")
                url = request_info.get("url")
                resource = entry.get("resource")

                result = await _dispatch_bundle_entry(method, url, resource, session, request)
                response_entries.append(result)

    return {
        "resourceType": "Bundle",
        "type": "transaction-response",
        "entry": response_entries,
    }
```

---

## 6. Bulk Data `$export`

ONC (g)(10) required. Uses the FHIR Asynchronous Pattern.

### Kick-off

```python
@router.get(
    "/$export",
    operation_id="bulk_export_system",
    summary="Initiate system-level bulk export",
)
async def bulk_export(
    _type: str | None = Query(None),
    _since: str | None = Query(None),
    _outputFormat: str = Query("application/fhir+ndjson"),
    background_tasks: BackgroundTasks,
    auth: AuthContext = Depends(get_auth_context),
):
    if "system/*.rs" not in auth.scopes:
        raise HTTPException(403, "system/*.rs scope required for bulk export")

    job_id = str(uuid.uuid4())
    # Store job metadata in Redis
    await redis.hset(f"export:{job_id}", mapping={
        "status": "accepted",
        "created_at": datetime.utcnow().isoformat(),
        "org_id": auth.org_id,
        "resource_types": _type or "all",
        "since": _since or "",
    })

    # Kick off background export job
    background_tasks.add_task(run_bulk_export, job_id, auth.org_id, _type, _since)

    return Response(
        status_code=202,
        headers={"Content-Location": f"/api/fhir/v1/$export/status/{job_id}"},
    )
```

### Status Poll

```python
@router.get("/$export/status/{job_id}")
async def bulk_export_status(job_id: str):
    job = await redis.hgetall(f"export:{job_id}")
    if not job:
        raise HTTPException(404, "Export job not found")

    if job["status"] == "accepted":
        return Response(status_code=202, headers={"X-Progress": "Building export"})
    elif job["status"] == "running":
        pct = job.get("progress_pct", "0")
        return Response(status_code=202, headers={"X-Progress": f"{pct}% complete"})
    elif job["status"] == "completed":
        manifest = json.loads(job["manifest"])
        return JSONResponse(content=manifest)
    elif job["status"] == "error":
        raise HTTPException(500, job.get("error_message", "Export failed"))
```

### Background Export Worker

```python
async def run_bulk_export(job_id: str, org_id: str, resource_types: str | None, since: str | None):
    """Writes NDJSON files to S3 and stores manifest in Redis."""
    s3 = boto3.client("s3")
    bucket = settings.EXPORT_S3_BUCKET

    resources_to_export = resource_types.split(",") if resource_types else ALL_EXPORTABLE_RESOURCES
    output_files = []

    for resource_type in resources_to_export:
        ndjson_lines = []
        async for resource in stream_all_resources(resource_type, org_id, since):
            ndjson_lines.append(json.dumps(resource))

        if ndjson_lines:
            key = f"exports/{org_id}/{job_id}/{resource_type}.ndjson"
            s3.put_object(
                Bucket=bucket,
                Key=key,
                Body="\n".join(ndjson_lines).encode(),
                ContentType="application/fhir+ndjson",
            )
            url = s3.generate_presigned_url("get_object", Params={"Bucket": bucket, "Key": key}, ExpiresIn=3600)
            output_files.append({"type": resource_type, "url": url})

    manifest = {
        "transactionTime": datetime.utcnow().isoformat() + "Z",
        "request": f"/api/fhir/v1/$export",
        "requiresAccessToken": True,
        "output": output_files,
        "error": [],
    }

    await redis.hset(f"export:{job_id}", mapping={
        "status": "completed",
        "manifest": json.dumps(manifest),
    })
```

---

## 7. FHIR Subscriptions

```python
# app/models/subscription/subscription.py
class SubscriptionModel(FHIRBase):
    __tablename__ = "subscriptions"
    id = Column(Integer, primary_key=True)
    subscription_id = Column(Integer, Sequence("subscription_seq", start=370000))
    org_id = Column(String, index=True)
    status = Column(String)       # requested, active, error, off
    criteria = Column(String)     # e.g., "Observation?code=8480-6"
    channel_type = Column(String) # rest-hook, websocket, email
    endpoint = Column(String)     # webhook URL
    payload = Column(String)      # application/fhir+json
    headers = Column(JSONB)       # additional HTTP headers
    end = Column(DateTime)        # subscription expiry

# app/services/subscription_dispatcher.py
class SubscriptionDispatcher:
    async def dispatch(self, resource: dict, resource_type: str, action: str):
        """Called after any resource write — check subscriptions and notify."""
        active_subs = await self.repo.list_active_for_type(resource_type)

        for sub in active_subs:
            if await self._criteria_matches(sub.criteria, resource, resource_type):
                await self._notify(sub, resource, action)

    async def _notify(self, sub: SubscriptionModel, resource: dict, action: str):
        if sub.channel_type == "rest-hook":
            notification = {
                "resourceType": "Bundle",
                "type": "history",
                "entry": [{"resource": resource}],
            }
            async with httpx.AsyncClient() as client:
                await client.post(
                    sub.endpoint,
                    json=notification,
                    headers={**sub.headers, "Content-Type": "application/fhir+json"},
                    timeout=10.0,
                )
```

---

## 8. US Core Profile Conformance

US Core v9.0.0 (STU9) mandates specific fields and bindings. Key requirements:

### US Core Patient Profile (R4)

Must-have fields with binding:
- `identifier` — 1..* (MRN or SSN + system)
- `name` — 1..* with `family` required
- `gender` — 1..1 bound to `http://hl7.org/fhir/ValueSet/administrative-gender` (required)
- `birthDate` — SHOULD have
- `race` extension — USCDI required (`http://hl7.org/fhir/us/core/StructureDefinition/us-core-race`)
- `ethnicity` extension — USCDI required
- `birthSex` extension — USCDI required

Validation check (inline at write time):
```python
def validate_us_core_patient(patient: PatientCreateSchema) -> list[str]:
    issues = []
    if not patient.identifiers:
        issues.append("US Core Patient requires at least one identifier")
    if not patient.names:
        issues.append("US Core Patient requires at least one name")
    if not any(n.family for n in patient.names):
        issues.append("US Core Patient name must include family name")
    if not patient.gender:
        issues.append("US Core Patient requires gender")
    return issues
```

### US Core Observation (Vital Signs) Profile

Vitals Observations must have:
- `status` — required
- `category` — required, code `vital-signs`
- `code` — LOINC code from FHIR vitals value set
- `subject` — reference to Patient
- `effective[x]` — date/time of observation
- `value[x]` — the measured value

---

## 9. FHIR Terminology Operations Under FHIR Namespace

Current terminology service is at `/api/v1/terminology` (non-FHIR). Add FHIR-standard endpoints:

```python
# app/routers/terminology_fhir.py

@router.get("/ValueSet/{id}/$expand")
async def expand_value_set_fhir(id: str, ...):
    # delegates to existing terminology service

@router.post("/ValueSet/$validate-code")
async def validate_code_fhir(body: dict, ...):
    ...

@router.get("/CodeSystem/$lookup")
async def lookup_fhir(system: str, code: str, ...):
    ...

@router.post("/ConceptMap/$translate")
async def translate_fhir(body: dict, ...):
    ...
```

---

## 10. Inferno Test Preparation

### Running Inferno Locally

```bash
docker run --rm -it \
  -p 4567:4567 \
  healthlake/inferno:latest

# Point it at your server:
# FHIR server URL: https://yourplatform.com/api/fhir/v1
# Client ID: inferno-test-client
# Redirect URI: http://localhost:4567/inferno/oauth2/static/redirect
```

### Inferno Test Groups (in order)

1. **SMART App Launch** — discovery, authorization code + PKCE, token, token refresh
2. **Single Patient US Core API** — Patient read, Condition, Observation, MedicationRequest, etc.
3. **Multi-Patient Authorization** — system scope, bulk data kick-off
4. **Bulk Data** — $export kick-off, status polling, file download, NDJSON validation

### Pre-Inferno Checklist

- [ ] `GET /metadata` returns valid CapabilityStatement with SMART extensions
- [ ] `GET /.well-known/smart-configuration` returns valid discovery document
- [ ] Authorization code + PKCE flow works end-to-end
- [ ] Patient search returns US Core-conformant resources
- [ ] MedicationRequest, Condition, Observation, AllergyIntolerance, Immunization all readable
- [ ] `Patient/{id}/$everything` returns all compartment resources
- [ ] `GET /$export` returns 202 + Content-Location header
- [ ] Export status polling works
- [ ] Downloaded NDJSON is valid FHIR

### Common Inferno Failures to Preemptively Fix

| Inferno Failure | Fix |
|---|---|
| "Unsupported grant type" | Keycloak must have authorization_code + PKCE enabled |
| "No scopes in token" | Keycloak scope mapper must include SMART scopes in JWT |
| "CapabilityStatement missing SMART oauth extensions" | Add security.extension to capability statement |
| "Patient search returns no results" | Ensure test patient is in DB with correct org_id |
| "MedicationRequest missing medicationCodeableConcept" | US Core requires either medicationCodeableConcept or medicationReference |
| "Bulk export returns 404" | Ensure $export endpoint is mounted correctly |
| "NDJSON file invalid" | Validate each exported resource against US Core profile |
