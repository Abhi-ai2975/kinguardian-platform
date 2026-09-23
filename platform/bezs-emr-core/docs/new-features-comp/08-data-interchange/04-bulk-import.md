# Bulk Data Import

Importing existing patient data is a day-one requirement when onboarding new organizations.  
Clinical data comes in many formats that must be ingested into our FHIR store.

---

## Import Sources

| Source | Format | Priority |
|---|---|---|
| Another FHIR server | NDJSON (Bulk Data export) | HIGH |
| Epic/Cerner/Athena export | FHIR NDJSON | HIGH |
| Legacy EMR | CSV / Excel | MEDIUM |
| Claims data | X12 837 / CSV | MEDIUM |
| Lab system | HL7 v2 ORU batch | MEDIUM |
| Pharmacy system | NCPDP SCRIPT / CSV | LOW |
| Health plan | FHIR NDJSON (CMS Blue Button) | LOW |

---

## FHIR NDJSON Import — `$import`

The cleanest import path: FHIR Bulk Data NDJSON files (from another FHIR server or export).

### API

```
POST /$import
Content-Type: application/json

{
  "resourceType": "Parameters",
  "parameter": [
    { "name": "inputFormat", "valueString": "application/fhir+ndjson" },
    { "name": "inputSource", "valueUri": "https://source.example.com/bulk-export/abc123" },
    { "name": "input", "part": [
      { "name": "type", "valueCode": "Patient" },
      { "name": "url", "valueUri": "https://source.example.com/bulk-export/abc123/Patient.ndjson" }
    ]},
    { "name": "input", "part": [
      { "name": "type", "valueCode": "Encounter" },
      { "name": "url", "valueUri": "https://source.example.com/bulk-export/abc123/Encounter.ndjson" }
    ]}
  ]
}
→ 202 Accepted
→ Content-Location: /bulk-status/import-job-xyz
```

### Implementation

```python
# app/workers/bulk_import.py

class BulkImportWorker:
    async def run(self, job_id: str, files: list[ImportFile], org_id: str) -> None:
        await job_svc.mark_active(job_id)
        total_imported = 0
        errors = []

        for file in files:
            resource_type = file.resource_type
            async with httpx.AsyncClient() as client:
                async with client.stream("GET", file.url) as resp:
                    async for line in resp.aiter_lines():
                        if not line.strip():
                            continue
                        try:
                            resource = json.loads(line)
                            await self._import_resource(resource_type, resource, org_id)
                            total_imported += 1
                        except Exception as e:
                            errors.append({"url": file.url, "error": str(e)})

        await job_svc.mark_complete(job_id, imported=total_imported, errors=errors)

    async def _import_resource(self, resource_type: str, resource: dict, org_id: str) -> None:
        """Import a single FHIR resource, handling ID conflicts via conditional update."""
        service = get_service_for_type(resource_type)
        existing_id = resource.get("id")
        if existing_id:
            # Try conditional update: PUT if exists, POST if not
            existing = await service.get_by_external_id(existing_id, org_id)
            if existing:
                await service.update(existing.public_id, resource, IMPORT_USER, org_id)
            else:
                await service.create_with_external_id(resource, existing_id, IMPORT_USER, org_id)
        else:
            await service.create(resource, IMPORT_USER, org_id)
```

---

## CSV Import

For legacy systems that export CSV/Excel, we need a flexible CSV-to-FHIR mapper.

### CSV Patient Import

```csv
first_name,last_name,dob,gender,mrn,email,phone,address,city,state,zip
John,Smith,1985-03-15,M,MRN-001,john@example.com,617-555-1234,123 Main St,Boston,MA,02101
Jane,Jones,1990-07-22,F,MRN-002,jane@example.com,617-555-5678,456 Oak Ave,Cambridge,MA,02139
```

### CSV Import Endpoint

```
POST /Patient/$csv-import
Content-Type: multipart/form-data

file=@patients.csv
mapping={"first_name": "name.given[0]", "last_name": "name.family", "dob": "birthDate", ...}
```

### CSV Mapping Engine

```python
# app/services/csv_import_service.py

class CSVImportService:
    DEFAULT_PATIENT_MAPPING = {
        "first_name": "name.given.0",
        "last_name": "name.family",
        "dob": "birthDate",
        "gender": "gender",
        "mrn": "identifier.0.value",  # + system from config
        "email": "telecom.email",
        "phone": "telecom.phone",
        "address": "address.0.line.0",
        "city": "address.0.city",
        "state": "address.0.state",
        "zip": "address.0.postalCode",
    }

    async def import_csv(
        self,
        csv_content: str,
        resource_type: str,
        mapping: dict | None,
        org_id: str,
    ) -> ImportResult:
        mapping = mapping or self.DEFAULT_PATIENT_MAPPING
        reader = csv.DictReader(io.StringIO(csv_content))
        results = ImportResult()

        for row in reader:
            try:
                resource = self._map_row_to_fhir(row, resource_type, mapping)
                await self._upsert(resource_type, resource, org_id)
                results.success += 1
            except Exception as e:
                results.errors.append({"row": row, "error": str(e)})

        return results

    def _map_row_to_fhir(self, row: dict, resource_type: str, mapping: dict) -> dict:
        resource = {"resourceType": resource_type}
        for csv_col, fhir_path in mapping.items():
            value = row.get(csv_col)
            if value:
                set_fhir_path(resource, fhir_path, value)
        return resource
```

---

## ID Management During Import

External systems use their own IDs. We need to:
1. Store the external ID as an `identifier` with the source system as the system URI
2. Map external references (e.g., `"subject": "Patient/EXTERNAL-001"`) to our internal IDs

```python
# Maintain an ID mapping table
CREATE TABLE import_id_mappings (
    id SERIAL PRIMARY KEY,
    import_job_id UUID NOT NULL,
    source_system TEXT NOT NULL,
    external_id TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    internal_public_id INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (import_job_id, resource_type, external_id)
);
```

---

## Import Progress Tracking

```json
{
  "resourceType": "Parameters",
  "parameter": [
    { "name": "status", "valueCode": "active" },
    { "name": "progress", "valueInteger": 65 },
    { "name": "imported", "valueInteger": 6500 },
    { "name": "failed", "valueInteger": 23 },
    { "name": "remaining", "valueInteger": 3500 }
  ]
}
```

---

## Validation During Import

Options:
1. **Strict mode** — validate each resource against `$validate` before inserting; fail the row if invalid
2. **Lenient mode** — import everything, flag invalid resources with `_importError` tag
3. **Auto-correct mode** — use AI to fix common issues (date format, code normalization)

```python
@router.post("/$import-validate", operation_id="validate_import_file")
async def validate_before_import(file: UploadFile, svc=Depends(get_import_svc)):
    """Pre-validate an import file without actually importing."""
    content = await file.read()
    issues = await svc.validate_ndjson(content.decode())
    return {"total": issues.total, "valid": issues.valid, "invalid": issues.invalid, "sample_errors": issues.sample_errors[:10]}
```
