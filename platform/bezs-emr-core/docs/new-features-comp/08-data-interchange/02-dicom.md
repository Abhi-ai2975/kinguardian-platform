# DICOM Integration

**Standard:** https://www.dicomstandard.org/  
**DICOMweb:** https://www.dicomstandard.org/using/dicomweb  
**Medplum reference:** `packages/server/src/dicom/`

---

## Why DICOM?

DICOM (Digital Imaging and Communications in Medicine) is the universal standard for medical  
imaging. Every X-ray, CT scan, MRI, ultrasound, and pathology slide is a DICOM object.  
Without DICOM integration, an EMR cannot:
- Display imaging results alongside clinical data
- Manage radiology orders end-to-end
- Support AI image analysis workflows
- Connect to any PACS (Picture Archiving and Communication System)

---

## DICOMweb — DICOM over HTTP

DICOMweb is the modern REST API for DICOM. Three services:

| Service | Acronym | Endpoints | Purpose |
|---|---|---|---|
| WADO-RS | Web Access to DICOM Objects - RESTful | GET /studies/{uid} | Retrieve images |
| STOW-RS | Store Over the Web | POST /studies | Store images |
| QIDO-RS | Query Based on ID for DICOM Objects | GET /studies?PatientID=... | Search |

---

## FHIR + DICOM Integration Points

| FHIR Resource | DICOM Equivalent |
|---|---|
| `ImagingStudy` | DICOM Study |
| `ImagingStudy.series` | DICOM Series |
| `ImagingStudy.series.instance` | DICOM Instance (SOP Instance) |
| `ServiceRequest` (type=imaging) | DICOM Modality Worklist (MWL) |
| `DiagnosticReport` (type=imaging) | DICOM Structured Report |

---

## FHIR ImagingStudy

```json
{
  "resourceType": "ImagingStudy",
  "id": "imaging-001",
  "status": "available",
  "subject": { "reference": "Patient/10001" },
  "basedOn": [{ "reference": "ServiceRequest/80001" }],
  "started": "2024-01-15T09:00:00Z",
  "numberOfSeries": 2,
  "numberOfInstances": 45,
  "series": [
    {
      "uid": "1.2.840.10008.5.1.4.1.1.4.1.20240115",
      "number": 1,
      "modality": { "system": "http://dicom.nema.org/resources/ontology/DCM", "code": "CT" },
      "description": "CT Chest - Axial",
      "numberOfInstances": 30,
      "instance": [
        {
          "uid": "1.2.840.10008.5.1.4.1.1.4.1.20240115.1",
          "sopClass": { "system": "urn:ietf:rfc:3986", "code": "urn:oid:1.2.840.10008.5.1.4.1.1.2" },
          "number": 1
        }
      ]
    }
  ]
}
```

---

## Architecture Options

### Option A: DICOMweb Proxy

Our FHIR server proxies DICOMweb requests to an external PACS (Orthanc, dcm4chee, AWS HealthImaging):

```
Client → GET /wado/studies/1.2.3... → FHIR server → Orthanc PACS
FHIR server creates/updates ImagingStudy resource on receipt
```

### Option B: Native DICOMweb Server

Store DICOM objects in our PostgreSQL (as BYTEA/S3) and implement DICOMweb directly.  
Medplum does this. Technically complex, better for sovereignty.

**Recommendation:** Start with Option A (proxy to Orthanc), add Option B later.

---

## Implementation Plan — Option A (Proxy)

### Step 1 — DICOMweb Proxy Endpoints

```python
# app/routers/dicom.py

dicom_router = APIRouter(prefix="/wado", tags=["DICOMweb"])

@dicom_router.get("/studies", operation_id="qido_search_studies")
async def search_studies(
    PatientID: str | None = None,
    StudyDate: str | None = None,
    ModalitiesInStudy: str | None = None,
    request: Request = ...,
):
    """QIDO-RS: Search studies."""
    params = {k: v for k, v in {"PatientID": PatientID, "StudyDate": StudyDate, "ModalitiesInStudy": ModalitiesInStudy}.items() if v}
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{settings.DICOM_PACS_URL}/studies", params=params, headers=await dicom_auth_headers())
    return Response(content=resp.content, media_type="application/dicom+json")

@dicom_router.get("/studies/{study_uid}", operation_id="wado_retrieve_study")
async def retrieve_study(study_uid: str):
    """WADO-RS: Retrieve entire study."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{settings.DICOM_PACS_URL}/studies/{study_uid}")
    return Response(content=resp.content, media_type=resp.headers.get("content-type"))

@dicom_router.post("/studies", operation_id="stow_store_study")
async def store_study(request: Request):
    """STOW-RS: Store new images."""
    body = await request.body()
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{settings.DICOM_PACS_URL}/studies",
            content=body,
            headers={"Content-Type": request.headers.get("content-type")},
        )
    # Extract study metadata and create/update ImagingStudy FHIR resource
    await imaging_study_svc.upsert_from_dicom_response(resp.json())
    return Response(content=resp.content, media_type="application/dicom+json")
```

### Step 2 — FHIR ↔ DICOM Sync

When a study is stored in PACS, create/update `ImagingStudy` in FHIR:

```python
# app/services/imaging_study_service.py

class ImagingStudyService:
    async def upsert_from_dicom(self, dicom_study: dict) -> ImagingStudy:
        """Create or update ImagingStudy from DICOM study metadata."""
        study_uid = dicom_study["StudyInstanceUID"]["Value"][0]
        patient_mrn = dicom_study["PatientID"]["Value"][0]

        # Find patient by MRN
        patient = await self.patient_repo.find_by_identifier("MRN", patient_mrn)

        return await self.imaging_study_repo.upsert({
            "status": "available",
            "subject": { "reference": f"Patient/{patient.patient_id}" } if patient else None,
            "started": dicom_study.get("StudyDate", {}).get("Value", [None])[0],
            "description": dicom_study.get("StudyDescription", {}).get("Value", [None])[0],
            "numberOfSeries": dicom_study.get("NumberOfStudyRelatedSeries", {}).get("Value", [0])[0],
            "numberOfInstances": dicom_study.get("NumberOfStudyRelatedInstances", {}).get("Value", [0])[0],
            "series": self._build_series(dicom_study),
        }, user_id=SYSTEM_USER, org_id=patient.org_id if patient else DEFAULT_ORG)
```

### Step 3 — DICOM Viewer Link

Store viewer URLs in `ImagingStudy.endpoint`:

```json
{
  "resourceType": "ImagingStudy",
  "endpoint": [{
    "reference": "Endpoint/ohif-viewer"
  }]
}
```

The viewer endpoint:
```json
{
  "resourceType": "Endpoint",
  "id": "ohif-viewer",
  "status": "active",
  "connectionType": { "system": "http://terminology.hl7.org/CodeSystem/endpoint-connection-type", "code": "dicom-wado-rs" },
  "address": "https://viewer.example.com/ohif?StudyInstanceUIDs="
}
```

---

## DICOM Modality Worklist

When a `ServiceRequest` for imaging is created, push it to the PACS worklist:

```python
@automation.on("ServiceRequest?category=imaging")
async def push_to_modality_worklist(ctx: AutomationContext):
    sr = ctx.resource
    await dicom_worklist_svc.create_mwl_entry({
        "PatientID": extract_mrn(sr["subject"]),
        "RequestedProcedureDescription": sr.get("code", {}).get("text", ""),
        "AccessionNumber": str(sr["id"]),
        "Modality": get_modality(sr["code"]),
    })
```

---

## AI Imaging Analysis

With DICOMweb + `$ai`, we can build AI-powered radiology:

```python
@router.post("/ImagingStudy/{study_id}/$ai-analyze", operation_id="analyze_imaging_study")
async def analyze_imaging(study_id: int, request: Request, ai_svc=Depends(get_ai_service)):
    """Send imaging study to AI for preliminary read."""
    study = await imaging_study_repo.get(study_id)
    # Fetch study thumbnails from PACS
    thumbnails = await dicom_svc.get_study_thumbnails(study.dicom_uid)
    # Send to vision model
    result = await ai_svc.analyze_images(thumbnails, prompt="Provide a preliminary radiological interpretation.")
    # Save as DiagnosticReport (draft, pending radiologist review)
    await diag_report_svc.create_ai_read(study_id, result)
    return JSONResponse(result)
```
