# FileNest v1.0 — Healthcare Pack

**Version:** 1.0.0
**Status:** Approved for Engineering
**Compliance:** HIPAA, FHIR R4, IHE XDS.b
**Last Updated:** 2026-06-15

---

## Table of Contents

1. [Healthcare Pack Overview](#1-healthcare-pack-overview)
2. [HIPAA Controls Implementation](#2-hipaa-controls-implementation)
3. [FHIR Integration Architecture](#3-fhir-integration-architecture)
4. [FHIR Resource Mappings](#4-fhir-resource-mappings)
5. [FHIR API Endpoints](#5-fhir-api-endpoints)
6. [XDS Integration](#6-xds-integration)
7. [DICOM Support](#7-dicom-support)
8. [PHI Detection Engine](#8-phi-detection-engine)
9. [Healthcare Metadata Schema](#9-healthcare-metadata-schema)
10. [Healthcare Audit Requirements](#10-healthcare-audit-requirements)
11. [Clinical Document Lifecycle](#11-clinical-document-lifecycle)
12. [Integration Patterns](#12-integration-patterns)

---

## 1. Healthcare Pack Overview

### 1.1 What the Healthcare Pack Activates

The Healthcare Pack is a configuration preset that activates the following capabilities:

```yaml
healthcare_pack:
  compliance:
    profile: healthcare
    hipaa_controls: true
    phi_detection: true
    audit_retention_years: 7
    immutable_audit: true
    legal_hold_enabled: true
    encryption_required: true
    baa_required: true
    data_residency: us           # US by default, configurable

  processing:
    virus_scan: true
    phi_detection: true
    ocr: true
    classification: true
    thumbnail_generation: true   # For image/PDF preview
    phi_entity_extraction: true  # Structured PHI entities, not just detection

  metadata:
    schema_template: healthcare_v1
    enforce_schema: true
    required_fields: [patientId, documentType]

  integrations:
    fhir:
      enabled: true
      version: R4
      base_url: null             # Set by customer to their FHIR server
    xds:
      enabled: false             # Opt-in
      repository_role: true
    dicom:
      enabled: false             # Opt-in
      store_raw: true
      extract_metadata: true

  search:
    enabled: true
    index_ocr_content: true
    facets: [documentType, patientId, encounterId]
    phi_aware_search: true       # Audit every search containing patient identifiers

  security:
    signed_url_max_ttl_seconds: 3600  # Max 1 hour for PHI files
    require_purpose_of_use: false     # v2: require justification for access
```

### 1.2 Architecture Overview

```
Clinical Application
  ↓
FileNest Healthcare Service
  ├── FHIR Adapter (maps FileNest ↔ FHIR resources)
  ├── XDS Adapter (maps FileNest ↔ XDS ebRIM metadata)
  ├── PHI Detection Engine (Presidio-based)
  ├── DICOM Handler (extract metadata, store raw)
  └── Healthcare Audit Logger (extended compliance fields)

Storage Layer
  └── S3 with KMS encryption (customer-managed key)

FHIR Server (external, customer-managed)
  └── DocumentReference, Binary, Patient, Encounter
```

---

## 2. HIPAA Controls Implementation

### 2.1 Technical Safeguards (HIPAA § 164.312)

**Access Controls (§ 164.312(a)(1)):**
```
Implementation:
  - Unique API keys per service account
  - Role-based access control (RBAC)
  - Project-level isolation
  - Signed URLs with short TTL (max 1 hour for PHI)
  - IP allowlisting per project
```

**Audit Controls (§ 164.312(b)):**
```
Implementation:
  - All file access (upload, download, delete) logged to immutable audit_logs
  - PHI-specific flag on every audit event
  - Actor identity captured (API key, service account, user)
  - Network context (IP, user agent, request ID)
  - 7-year retention minimum
  - Tamper-evident via hash chaining
```

**Integrity Controls (§ 164.312(c)(1)):**
```
Implementation:
  - SHA-256 checksum on all uploads
  - Checksum verified on download (streaming)
  - Version history prevents silent overwrites
  - WORM optional for max integrity assurance
```

**Transmission Security (§ 164.312(e)(1)):**
```
Implementation:
  - TLS 1.3 on all API endpoints
  - TLS 1.2 minimum (TLS 1.0/1.1 disabled)
  - Signed URLs expire (no permanent URLs)
  - Data encrypted in transit to storage provider
```

### 2.2 PHI Minimum Necessary Rule

```python
class PHIAccessLogger:
    """
    HIPAA minimum necessary: log who accessed PHI and for what purpose.
    In v1, purpose is the API key scope. In v2, add purpose_of_use parameter.
    """

    async def log_phi_access(
        self,
        file: File,
        event_type: str,
        auth: AuthContext,
        request: Request,
    ) -> None:
        await self.audit_logger.log(
            event_type=event_type,
            subject_type="file",
            subject_id=file.id,
            payload={
                "filename": file.filename,
                "phi_detected": file.phi_detected,
                "phi_entities": file.phi_entity_types,  # e.g., ['PatientName', 'DOB']
                "accessed_metadata": {
                    "patientId": file.metadata.get("patientId"),
                    "documentType": file.metadata.get("documentType"),
                },
                # v2 addition:
                # "purpose_of_use": request.headers.get("X-Purpose-Of-Use"),
                # "treatment_relationship": auth.treatment_relationship,
            },
            phi_involved=True,
            auth=auth,
            request=request,
        )
```

### 2.3 Access Control Validation

```python
async def validate_hipaa_access(
    file: File,
    requested_operation: str,
    auth: AuthContext,
    project_config: ProjectConfig,
) -> None:
    """Additional HIPAA-specific access checks beyond standard RBAC."""

    if not project_config.compliance.hipaa_controls:
        return  # Standard checks only

    # Check if actor is authorized for PHI access
    if file.phi_detected and requested_operation in ("download", "stream"):
        # Verify actor has been granted PHI access scope
        if "phi:access" not in auth.scopes and "admin" not in auth.scopes:
            raise AuthorizationError(
                "PHI file access requires explicit 'phi:access' scope. "
                "Update your API key or service account to include this scope."
            )
```

---

## 3. FHIR Integration Architecture

### 3.1 FHIR Adapter Design

FileNest does not replace a FHIR server. It provides:

1. **FHIR-shaped views** of FileNest files (read-only FHIR resources)
2. **FHIR-based upload** (upload files via FHIR Binary endpoint)
3. **FHIR metadata mapping** (file metadata ↔ FHIR resource fields)
4. **FHIR server sync** (push DocumentReference to customer's FHIR server)

```
Option A: FileNest as FHIR endpoint (lightweight, standalone)
  Client → GET /v1/fhir/DocumentReference/{fileId}
  FileNest → Maps file record to FHIR JSON
  Returns FHIR DocumentReference (not stored in separate FHIR server)

Option B: FileNest + External FHIR Server (full integration)
  Upload → FileNest
  FileNest → Creates DocumentReference in customer's FHIR server
  FHIR server → Authoritative for queries
  FileNest → Provides binary storage + signed URL for content URL in DocumentReference
```

### 3.2 FHIR Server Configuration

```python
class FHIRServerConfig(BaseModel):
    base_url: str                          # https://fhir.hospital.com/r4
    auth_type: Literal["bearer", "smart", "basic"]
    bearer_token: str | None = None
    client_id: str | None = None
    client_secret: str | None = None
    token_url: str | None = None
    verify_ssl: bool = True

    # Sync behavior
    auto_create_document_reference: bool = True
    auto_update_document_reference: bool = True

class FHIRClient:
    def __init__(self, config: FHIRServerConfig):
        self.base_url = config.base_url.rstrip("/")
        self.config = config

    async def create_document_reference(
        self, doc_ref: dict
    ) -> dict:
        async with self._get_client() as client:
            response = await client.post(
                f"{self.base_url}/DocumentReference",
                json=doc_ref,
                headers=await self._get_auth_headers(),
            )
            response.raise_for_status()
            return response.json()

    async def update_document_reference(
        self, fhir_id: str, doc_ref: dict
    ) -> dict:
        async with self._get_client() as client:
            response = await client.put(
                f"{self.base_url}/DocumentReference/{fhir_id}",
                json=doc_ref,
                headers=await self._get_auth_headers(),
            )
            response.raise_for_status()
            return response.json()
```

---

## 4. FHIR Resource Mappings

### 4.1 FileNest File → FHIR DocumentReference

```python
class FHIRMapper:
    LOINC_DOCUMENT_TYPES = {
        "LabReport":        {"code": "11502-2", "display": "Laboratory report"},
        "Discharge":        {"code": "18842-5", "display": "Discharge summary"},
        "Consent":          {"code": "64300-7", "display": "Informed consent"},
        "Imaging":          {"code": "18748-4", "display": "Diagnostic imaging study"},
        "Pathology":        {"code": "11526-1", "display": "Pathology report"},
        "ProgressNote":     {"code": "11506-3", "display": "Progress note"},
        "ReferralNote":     {"code": "57133-1", "display": "Referral note"},
        "OperativeNote":    {"code": "11504-8", "display": "Surgical operation note"},
        "NursingNote":      {"code": "34746-8", "display": "Nurse note"},
    }

    def file_to_document_reference(
        self,
        file: File,
        content_url: str,          # Signed download URL
        project_config: ProjectConfig,
    ) -> dict:
        doc_type = file.metadata.get("documentType")
        loinc = self.LOINC_DOCUMENT_TYPES.get(
            doc_type, {"code": "51899-3", "display": "Details Document"}
        )

        doc_ref = {
            "resourceType": "DocumentReference",
            "id": f"fn-{file.id}",
            "meta": {
                "source": "urn:filenest:file",
                "tag": [{
                    "system": "urn:filenest:project",
                    "code": str(file.project_id),
                }],
                "lastUpdated": file.updated_at.isoformat(),
            },
            "masterIdentifier": {
                "system": "urn:filenest:file-id",
                "value": str(file.id),
            },
            "status": "current" if file.status == "ready" else "preliminary",
            "docStatus": "final" if file.status == "ready" else "preliminary",
            "type": {
                "coding": [{
                    "system": "http://loinc.org",
                    "code": loinc["code"],
                    "display": loinc["display"],
                }]
            },
            "category": [{
                "coding": [{
                    "system": "http://hl7.org/fhir/us/core/CodeSystem/us-core-documentreference-category",
                    "code": "clinical-note",
                    "display": "Clinical Note",
                }]
            }],
            "subject": {
                "reference": f"Patient/{file.metadata.get('patientId')}",
            },
            "date": file.created_at.isoformat(),
            "author": [{
                "reference": f"Practitioner/{file.metadata.get('practitionerId')}"
            }] if file.metadata.get("practitionerId") else [],
            "content": [{
                "attachment": {
                    "contentType": file.mime_type,
                    "size": file.size,
                    "hash": file.checksum_sha256,
                    "title": file.original_filename,
                    "url": content_url,
                    "creation": file.created_at.date().isoformat(),
                },
                "format": self._get_format_code(file.mime_type),
            }],
            "context": {
                "encounter": [
                    {"reference": f"Encounter/{file.metadata.get('encounterId')}"}
                ] if file.metadata.get("encounterId") else [],
                "period": {
                    "start": file.metadata.get("encounterDate") or file.created_at.date().isoformat(),
                },
                "facilityType": self._get_facility_type(file.metadata),
                "practiceSetting": self._get_practice_setting(file.metadata),
                "sourcePatientInfo": {
                    "reference": f"Patient/{file.metadata.get('patientId')}",
                },
            },
        }

        # Add custodian if healthcare organization is configured
        if project_config.integrations.fhir.organization_reference:
            doc_ref["custodian"] = {
                "reference": project_config.integrations.fhir.organization_reference
            }

        return doc_ref

    def _get_format_code(self, mime_type: str) -> dict | None:
        FORMAT_CODES = {
            "application/pdf": {
                "system": "urn:oid:1.3.6.1.4.1.19376.1.2.3",
                "code": "urn:ihe:iti:xds-sd:pdf:2008",
                "display": "PDF document",
            },
            "application/hl7-v3+xml": {
                "system": "urn:oid:1.3.6.1.4.1.19376.1.2.3",
                "code": "urn:ihe:pcc:xphr:2007",
                "display": "HL7 CCD Document",
            },
        }
        code = FORMAT_CODES.get(mime_type)
        return {"coding": [code]} if code else None
```

### 4.2 FileNest File → FHIR Binary

```python
def file_to_binary(self, file: File, content_url: str) -> dict:
    return {
        "resourceType": "Binary",
        "id": f"fn-bin-{file.id}",
        "contentType": file.mime_type,
        "securityContext": {
            "reference": f"DocumentReference/fn-{file.id}",
        },
        "url": content_url,
    }
```

### 4.3 FileNest File → FHIR Media

For imaging files (images, videos):

```python
def file_to_media(self, file: File) -> dict:
    modality_map = {
        "image/jpeg": {"code": "photograph", "display": "Photograph"},
        "image/png":  {"code": "photograph", "display": "Photograph"},
        "video/mp4":  {"code": "video", "display": "Video"},
        "application/dicom": {"code": file.metadata.get("modality", "OT"), "display": "DICOM"},
    }

    modality = modality_map.get(file.mime_type, {"code": "OT", "display": "Other"})

    return {
        "resourceType": "Media",
        "id": f"fn-media-{file.id}",
        "status": "completed",
        "type": {
            "coding": [{
                "system": "http://terminology.hl7.org/CodeSystem/media-type",
                **modality,
            }]
        },
        "subject": {
            "reference": f"Patient/{file.metadata.get('patientId')}",
        },
        "operator": {
            "reference": f"Practitioner/{file.metadata.get('practitionerId')}",
        } if file.metadata.get("practitionerId") else None,
        "createdDateTime": file.created_at.isoformat(),
        "content": {
            "contentType": file.mime_type,
            "url": f"/v1/fhir/Binary/fn-bin-{file.id}",
            "size": file.size,
            "hash": file.checksum_sha256,
            "title": file.original_filename,
        },
    }
```

### 4.4 FHIR Upload → FileNest File

```python
async def binary_to_file(
    self,
    binary_content: bytes,
    content_type: str,
    fhir_metadata: dict,
    project_id: str,
    auth: AuthContext,
) -> File:
    """Convert a FHIR Binary upload to a FileNest file."""

    # Extract FileNest metadata from FHIR context
    metadata = {}

    if fhir_metadata.get("subject", {}).get("reference", "").startswith("Patient/"):
        metadata["patientId"] = fhir_metadata["subject"]["reference"].split("/")[1]

    if fhir_metadata.get("context", {}).get("encounter"):
        encounter_ref = fhir_metadata["context"]["encounter"][0].get("reference", "")
        if encounter_ref.startswith("Encounter/"):
            metadata["encounterId"] = encounter_ref.split("/")[1]

    doc_type = self._map_loinc_to_document_type(
        fhir_metadata.get("type", {}).get("coding", [])
    )
    if doc_type:
        metadata["documentType"] = doc_type

    # Create FileNest file
    return await self.file_service.upload(
        data=binary_content,
        filename=fhir_metadata.get("description", "fhir-document"),
        mime_type=content_type,
        metadata=metadata,
        auth=auth,
    )
```

---

## 5. FHIR API Endpoints

### 5.1 Capability Statement

```
GET /v1/fhir/metadata
```

Returns a FHIR CapabilityStatement describing what FileNest supports:

```json
{
  "resourceType": "CapabilityStatement",
  "status": "active",
  "kind": "capability",
  "fhirVersion": "4.0.1",
  "format": ["application/fhir+json"],
  "rest": [{
    "mode": "server",
    "resource": [
      {
        "type": "DocumentReference",
        "interaction": [
          {"code": "read"},
          {"code": "search-type"},
          {"code": "create"}
        ],
        "searchParam": [
          {"name": "subject", "type": "reference"},
          {"name": "status", "type": "token"},
          {"name": "type", "type": "token"},
          {"name": "date", "type": "date"},
          {"name": "_id", "type": "token"}
        ]
      },
      {
        "type": "Binary",
        "interaction": [
          {"code": "read"},
          {"code": "create"}
        ]
      }
    ]
  }]
}
```

### 5.2 DocumentReference Operations

```
# Read
GET /v1/fhir/DocumentReference/{fileId}

# Search
GET /v1/fhir/DocumentReference?subject=Patient/P-12345
GET /v1/fhir/DocumentReference?subject=Patient/P-12345&status=current
GET /v1/fhir/DocumentReference?subject=Patient/P-12345&type=http://loinc.org|11502-2
GET /v1/fhir/DocumentReference?date=ge2026-01-01&date=le2026-06-30

# Create (creates FileNest file + DocumentReference)
POST /v1/fhir/DocumentReference

# Read binary content
GET /v1/fhir/Binary/{fileId}

# Create via Binary
POST /v1/fhir/Binary

# Media
GET /v1/fhir/Media/{fileId}
GET /v1/fhir/Media?subject=Patient/P-12345
```

### 5.3 FHIR Search Implementation

```python
@router.get("/v1/fhir/DocumentReference")
async def search_document_references(
    subject: str | None = None,           # Patient/P-12345
    status: str | None = None,            # current|superseded|entered-in-error
    type: str | None = None,              # system|code
    date: list[str] | None = Query(None), # ge2026-01-01
    _id: str | None = None,
    _count: int = 20,
    auth: AuthContext = Depends(require_scope("files:read")),
):
    filters = {}

    if subject and subject.startswith("Patient/"):
        patient_id = subject.split("/")[1]
        filters["metadata.patientId"] = patient_id

    if _id:
        filters["id"] = _id.removeprefix("fn-")

    if status == "current":
        filters["status"] = ["ready", "processing"]
    elif status == "superseded":
        filters["status"] = "deleted"

    if type:
        # Map LOINC code to documentType
        loinc_code = type.split("|")[-1] if "|" in type else type
        doc_type = loinc_to_document_type(loinc_code)
        if doc_type:
            filters["metadata.documentType"] = doc_type

    files = await file_repo.search(
        project_id=auth.project_id,
        filters=filters,
        limit=_count,
    )

    # Map to FHIR Bundle
    return {
        "resourceType": "Bundle",
        "type": "searchset",
        "total": len(files),
        "entry": [
            {
                "resource": fhir_mapper.file_to_document_reference(
                    file,
                    content_url=await generate_content_url(file),
                    project_config=project_config,
                ),
                "search": {"mode": "match"},
            }
            for file in files
        ],
    }
```

---

## 6. XDS Integration

### 6.1 XDS.b Architecture

FileNest can act as an **IHE XDS.b Document Repository**.

```
Registry (customer-owned, e.g., OpenXDS)
  ↕ ITI-42 (Register Document Set)

Repository (FileNest)
  ↕ ITI-43 (Retrieve Document Set)
  ↕ ITI-41 (Provide and Register Document Set)
```

### 6.2 XDS Metadata Mapping

```python
class XDSMetadataMapper:
    def file_to_xds_metadata(self, file: File) -> dict:
        """Map FileNest file to XDS Document Entry metadata."""
        return {
            # Required XDS metadata
            "patientId":          f"{file.metadata.get('patientId')}^^^&2.16.840.1.113883.3.72.5.9.1&ISO",
            "documentUniqueId":   f"2.16.840.1.113883.3.72.5.9.2.{file.id}",
            "repositoryUniqueId": f"2.16.840.1.113883.3.72.5.9.1",
            "classCode":          self._get_xds_class_code(file.metadata.get("documentType")),
            "typeCode":           self._get_xds_type_code(file.metadata.get("documentType")),
            "formatCode":         self._get_xds_format_code(file.mime_type),
            "healthcareFacilityTypeCode": file.metadata.get("facilityType", "394802001"),
            "practiceSettingCode":        file.metadata.get("practiceSetting", "General Medicine"),
            "creationTime":       file.created_at.strftime("%Y%m%d%H%M%S"),
            "sourcePatientId":    f"{file.metadata.get('patientId')}^^^&2.16.840.1.113883.3.72.5.9.1&ISO",
            "authorInstitution":  file.metadata.get("organizationName", "Unknown"),
            "authorPerson":       file.metadata.get("authorPerson"),
            "encounterId":        file.metadata.get("encounterId"),
            "size":               file.size,
            "hash":               file.checksum_sha256,
            "mimeType":           file.mime_type,
            "status":             "urn:oasis:names:tc:ebxml-regrep:StatusType:Approved",
        }

    XDS_CLASS_CODES = {
        "LabReport":    "11502-2",
        "Discharge":    "18842-5",
        "Consent":      "64300-7",
        "Imaging":      "18748-4",
    }

    XDS_FORMAT_CODES = {
        "application/pdf": "urn:ihe:iti:xds-sd:pdf:2008",
        "text/xml":        "urn:ihe:pcc:xphr:2007",
    }
```

### 6.3 Provide and Register (ITI-41)

```python
@router.post("/v1/xds/provide-and-register")
async def provide_and_register(
    request: Request,
    auth: AuthContext = Depends(require_scope("upload")),
):
    """
    ITI-41: Provide And Register Document Set-b transaction.
    Accepts multipart SOAP with document and metadata.
    Stores document in FileNest and registers with configured XDS registry.
    """
    # Parse multipart SOAP body
    soap_body, documents = await parse_xds_provide_and_register(request)

    results = []
    for doc_submission in soap_body.submission_set.documents:
        # Extract file
        doc_content = documents[doc_submission.document_id]
        xds_metadata = doc_submission.metadata

        # Map XDS metadata to FileNest
        filenest_metadata = xds_metadata_to_filenest(xds_metadata)

        # Store in FileNest
        file = await file_service.upload(
            data=doc_content,
            filename=xds_metadata.get("title", "xds-document"),
            mime_type=xds_metadata.get("mimeType", "application/octet-stream"),
            metadata=filenest_metadata,
            auth=auth,
        )

        # Register with XDS registry
        if project_config.integrations.xds.registry_url:
            await xds_client.register_document(
                registry_url=project_config.integrations.xds.registry_url,
                file=file,
                xds_metadata=xds_metadata,
            )

        results.append({"fileId": str(file.id), "status": "success"})

    return xds_response_builder.build_success(results)
```

---

## 7. DICOM Support

### 7.1 DICOM Storage

DICOM files are stored as binary blobs with metadata extraction:

```python
class DICOMHandler:
    def extract_metadata(self, dicom_bytes: bytes) -> dict:
        import pydicom
        from pydicom.uid import UID

        ds = pydicom.dcmread(io.BytesIO(dicom_bytes))

        return {
            "dicom": {
                "studyInstanceUID":  str(ds.get("StudyInstanceUID", "")),
                "seriesInstanceUID": str(ds.get("SeriesInstanceUID", "")),
                "sopInstanceUID":    str(ds.get("SOPInstanceUID", "")),
                "modality":          str(ds.get("Modality", "")),
                "studyDate":         str(ds.get("StudyDate", "")),
                "studyDescription":  str(ds.get("StudyDescription", "")),
                "bodyPartExamined":  str(ds.get("BodyPartExamined", "")),
                "rows":              int(ds.get("Rows", 0)),
                "columns":           int(ds.get("Columns", 0)),
                "bitsAllocated":     int(ds.get("BitsAllocated", 0)),
                "numberOfFrames":    int(ds.get("NumberOfFrames", 1)),
            },
            # Patient identifiers extracted separately for PHI handling
            "_phi_patient_name":   str(ds.get("PatientName", "")),
            "_phi_patient_id":     str(ds.get("PatientID", "")),
            "_phi_patient_dob":    str(ds.get("PatientBirthDate", "")),
        }

    async def process_dicom_upload(
        self, file: File, dicom_bytes: bytes
    ) -> dict:
        metadata = self.extract_metadata(dicom_bytes)

        # PHI fields are stored separately and flagged
        phi_metadata = {
            k.removeprefix("_phi_"): v
            for k, v in metadata.items()
            if k.startswith("_phi_") and v
        }

        technical_metadata = {
            k: v for k, v in metadata.items()
            if not k.startswith("_phi_")
        }

        return {
            "technical": technical_metadata,
            "phi": phi_metadata,
            "phi_detected": bool(phi_metadata),
        }
```

---

## 8. PHI Detection Engine

### 8.1 Architecture

```python
# Using Microsoft Presidio (open source)
from presidio_analyzer import AnalyzerEngine, RecognizerRegistry
from presidio_analyzer.nlp_engine import NlpEngineProvider

class PHIDetectionEngine:
    def __init__(self):
        provider = NlpEngineProvider(nlp_configuration={
            "nlp_engine_name": "spacy",
            "models": [{"lang_code": "en", "model_name": "en_core_web_lg"}],
        })
        self.analyzer = AnalyzerEngine(
            nlp_engine=provider.create_engine(),
            supported_languages=["en"],
        )

    PHI_ENTITY_TYPES = [
        "PERSON",
        "DATE_TIME",
        "US_SSN",
        "US_DRIVER_LICENSE",
        "US_PASSPORT",
        "PHONE_NUMBER",
        "EMAIL_ADDRESS",
        "LOCATION",
        "MEDICAL_LICENSE",
        "IP_ADDRESS",
        "URL",
        "CREDIT_CARD",
    ]

    async def analyze(self, text: str) -> PHIDetectionResult:
        results = self.analyzer.analyze(
            text=text,
            entities=self.PHI_ENTITY_TYPES,
            language="en",
        )

        entities_found = [
            PHIEntity(
                type=r.entity_type,
                score=r.score,
                start=r.start,
                end=r.end,
                text=text[r.start:r.end] if r.score > 0.85 else None,
            )
            for r in results
            if r.score > 0.7
        ]

        return PHIDetectionResult(
            phi_detected=bool(entities_found),
            entities=entities_found,
            entity_types=list({e.type for e in entities_found}),
            high_confidence_count=sum(1 for e in entities_found if e.score > 0.9),
        )

    async def analyze_file(
        self, file: File, project_config: ProjectConfig
    ) -> PHIDetectionResult:
        # Get OCR text (from previous processing stage)
        ocr_text = await self.ocr_repo.get_text(file.id)
        if not ocr_text:
            return PHIDetectionResult(phi_detected=False, entities=[], entity_types=[])

        result = await self.analyze(ocr_text)

        # Store result in processing_job_stages
        # Update file.phi_detected flag

        # Take action based on project config
        action = project_config.processing.phi_action
        if action == "quarantine" and result.phi_detected:
            await self.file_service.quarantine(file.id, reason="PHI detected")
        elif action == "block" and result.phi_detected:
            await self.file_service.block(file.id, reason="PHI detected")
        # "log" and "flag" just store the result — file remains accessible

        return result
```

### 8.2 PHI Actions

| Action | Description | Use Case |
|--------|-------------|----------|
| `log` | Default — record detection in audit, no file restriction | Most healthcare projects |
| `flag` | Set `phi_detected=true` on file, add tag, send webhook | Alert-based workflows |
| `quarantine` | Prevent file access until manually reviewed | High-security environments |
| `block` | Reject upload if PHI detected | Prevent external document leakage |

### 8.3 PHI-Aware Search

```python
async def phi_aware_search(
    query: SearchQuery,
    auth: AuthContext,
    project_config: ProjectConfig,
) -> SearchResults:
    """
    For healthcare projects, search queries containing patient identifiers
    are flagged in audit logs to support HIPAA minimum necessary tracking.
    """
    contains_patient_identifier = (
        any(k in (query.filters or {}).get("metadata", {})
            for k in ["patientId", "encounterId", "ssn"])
        or bool(re.search(r'\b[A-Z]-\d{4,}\b', query.q or ""))  # MRN pattern
    )

    results = await self.search_service.query(query, auth)

    # Audit PHI-involved searches
    if contains_patient_identifier:
        await self.audit_logger.log(
            event_type="search.phi_involved",
            payload={
                "query": query.q,
                "filters": query.filters,
                "results_count": results.pagination.total,
            },
            phi_involved=True,
            auth=auth,
        )

    return results
```

---

## 9. Healthcare Metadata Schema

### 9.1 Default Healthcare Schema

```json
{
  "name": "healthcare_v1",
  "schema": {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "properties": {
      "patientId": {
        "type": "string",
        "minLength": 1,
        "description": "EHR patient identifier (MRN)"
      },
      "documentType": {
        "type": "string",
        "enum": [
          "LabReport", "Discharge", "Consent", "Imaging",
          "Pathology", "ProgressNote", "ReferralNote",
          "OperativeNote", "NursingNote", "Prescription", "Other"
        ]
      },
      "encounterId": {
        "type": "string",
        "description": "Associated encounter/visit identifier"
      },
      "practitionerId": {
        "type": "string",
        "description": "NPI of ordering/authoring practitioner"
      },
      "facilityId": {
        "type": "string",
        "description": "Facility identifier"
      },
      "serviceDate": {
        "type": "string",
        "format": "date",
        "description": "Date of service (YYYY-MM-DD)"
      },
      "departmentCode": {
        "type": "string",
        "description": "Department or specialty code"
      },
      "externalDocumentId": {
        "type": "string",
        "description": "Source system document ID for deduplication"
      },
      "confidentialityCode": {
        "type": "string",
        "enum": ["N", "R", "V"],
        "default": "N",
        "description": "HL7 confidentiality: Normal, Restricted, Very Restricted"
      }
    },
    "required": ["patientId", "documentType"],
    "additionalProperties": true
  }
}
```

---

## 10. Healthcare Audit Requirements

### 10.1 HIPAA Audit Event Types

```python
HEALTHCARE_AUDIT_EVENTS = {
    # Standard events + healthcare extensions
    "file.uploaded":              {"phi_relevant": True, "min_retention_years": 7},
    "file.downloaded":            {"phi_relevant": True, "min_retention_years": 7},
    "file.deleted":               {"phi_relevant": True, "min_retention_years": 7},
    "file.shared":                {"phi_relevant": True, "min_retention_years": 7},
    "file.phi_detected":          {"phi_relevant": True, "min_retention_years": 7},
    "search.phi_involved":        {"phi_relevant": True, "min_retention_years": 7},
    "file.legal_hold_set":        {"phi_relevant": True, "min_retention_years": 7},
    "file.legal_hold_released":   {"phi_relevant": True, "min_retention_years": 7},
    "api_key.created":            {"phi_relevant": False, "min_retention_years": 7},
    "api_key.revoked":            {"phi_relevant": False, "min_retention_years": 7},
    "user.login":                 {"phi_relevant": False, "min_retention_years": 7},
    "fhir.document_reference_read": {"phi_relevant": True, "min_retention_years": 7},
    "xds.document_registered":   {"phi_relevant": True, "min_retention_years": 7},
}
```

### 10.2 Extended HIPAA Audit Fields

For healthcare projects, audit log entries include additional fields:

```python
class HIPAAAuditLog(AuditLog):
    # Extended HIPAA fields
    purpose_of_use: str | None = None       # WHY the PHI was accessed
    patient_id: str | None = None           # Patient whose data was accessed
    encounter_id: str | None = None         # Associated encounter
    data_sensitivity: str = "N"             # N=Normal, R=Restricted, V=Very Restricted
    access_result: str = "success"          # 'success' | 'failure' | 'error'
    message_type: str | None = None         # HL7 message type if applicable
```

---

## 11. Clinical Document Lifecycle

### 11.1 Document State Machine

```
                    [Upload]
                       │
                       ▼
                  [uploading]
                       │
                  (bytes received)
                       │
                       ▼
               [upload_complete]
                       │
              (processing pipeline)
               ┌───────┴──────────┐
               │                  │
          [virus scan]       [phi detection]
               │                  │
            (clean)          (clean/flagged)
               └───────┬──────────┘
                        │
                    [ocr]
                        │
               [classification]
                        │
                   [indexing]
                        │
                        ▼
                     [ready]
                        │
              ┌─────────┼──────────┐
              │         │          │
         [retained]  [legal   [worm
          (normal)   hold]   committed]
              │         │          │
              │    (no delete)  (no delete
              │                 or modify)
         (retain_until)
              │
              ▼
         [expired retention]
              │
    ┌─────────┼──────────┐
    │         │          │
 [archive] [soft      [keep]
           delete]
```

### 11.2 Supersession Workflow

When a document is corrected or superseded:

```python
async def supersede_document(
    original_file_id: str,
    replacement_upload: UploadRequest,
    reason: str,
    auth: AuthContext,
) -> tuple[File, File]:
    # Upload replacement
    new_file = await file_service.upload(
        **replacement_upload.model_dump(),
        metadata={
            **replacement_upload.metadata,
            "supersedesDocumentId": original_file_id,
            "supersessionReason": reason,
        },
    )

    # Mark original as superseded
    original_file = await file_repo.get(original_file_id, auth)
    original_file.metadata["supersededBy"] = str(new_file.id)
    original_file.metadata["supersededAt"] = datetime.utcnow().isoformat()

    # Update FHIR DocumentReference status to 'superseded' if FHIR integration enabled
    if project_config.integrations.fhir.enabled:
        await fhir_client.update_document_status(
            fhir_id=f"fn-{original_file_id}",
            status="superseded",
        )

    await audit_logger.log(
        event_type="file.superseded",
        subject_id=original_file_id,
        payload={"superseded_by": str(new_file.id), "reason": reason},
        phi_involved=True,
        auth=auth,
    )

    return original_file, new_file
```

---

## 12. Integration Patterns

### 12.1 EHR Integration Pattern

```
EHR System (Epic, Cerner, MEDITECH)
  ↓ patient document created
EHR sends HL7 message or FHIR DocumentReference
  ↓
Integration Engine (Rhapsody, Mirth, Azure Logic Apps)
  ↓ transforms + routes
FileNest API (POST /v1/files/upload or POST /v1/fhir/Binary)
  ↓
FileNest stores file, runs PHI detection, OCR, creates FHIR resources
  ↓
Webhook → EHR notified (file.processed event)
  or
FHIR Server → DocumentReference created (if FHIR integration configured)
```

### 12.2 Patient Portal Pattern

```
Patient Portal (React + @filenest/react)
  ↓ patient logs in, requests their records
Backend → POST /v1/upload-tokens
  (constrained to patient's patientId metadata)
Frontend SDK → uploads directly to FileNest
  ↓
FileNest → PHI detection → confirms file is patient's own data
  ↓
Audit log: "patient self-upload" (purpose of use: TREATMENT)
```

### 12.3 Radiology Integration Pattern

```
DICOM Modality (CT/MRI/X-Ray)
  ↓ DICOM file generated
DICOM Gateway / PACS sends to FileNest (via S3 or API)
  ↓
FileNest DICOM Handler:
  → Extracts DICOM header metadata
  → Stores raw DICOM file
  → Creates FileNest metadata record
  → Associates with patient ID and study
  → Creates FHIR Media resource
  ↓
Clinical workflow: access via FHIR or FileNest API
```

---

## 13. HIPAA Compliance Boundary

### 13.1 What FileNest Covers (Technical Safeguards)

FileNest implements the **technical safeguards** required by HIPAA Security Rule §164.312. When the Healthcare preset is active, the following are enforced by the platform:

| HIPAA Technical Safeguard | FileNest Implementation |
|--------------------------|------------------------|
| §164.312(a)(1) Access Control | RBAC, scoped API keys, `phi:access` scope enforcement |
| §164.312(a)(2)(i) Unique User Identification | Every user and API key has a unique immutable ID tied to all audit records |
| §164.312(a)(2)(iii) Automatic Logoff | Upload tokens expire; signed URLs have max TTL |
| §164.312(a)(2)(iv) Encryption/Decryption | AES-256 at rest (SSE-KMS), TLS 1.3 in transit |
| §164.312(b) Audit Controls | Immutable append-only audit log, hash-chained, 7-year retention, archived to S3 Glacier |
| §164.312(c)(1) Integrity | SHA-256 checksum on every file, verified on every download |
| §164.312(c)(2) Transmission Integrity | TLS 1.3 with certificate pinning option |
| §164.312(e)(1) Transmission Security | All API endpoints HTTPS-only; storage access via signed URLs |
| §164.312(e)(2)(ii) Encryption | KMS-managed encryption keys, separate key per project |

### 13.2 What FileNest Does NOT Cover (Operational Safeguards)

**HIPAA compliance requires both technical and operational safeguards.** FileNest handles the technical layer. Customers remain responsible for the operational layer. This boundary must be clearly communicated during onboarding and in the BAA.

| HIPAA Operational Requirement | Customer Responsibility |
|-------------------------------|------------------------|
| §164.308(a)(1) Risk Analysis | Customer must conduct and document a formal risk assessment |
| §164.308(a)(3) Workforce Training | Customer must train employees on PHI handling procedures |
| §164.308(a)(6) Incident Procedures | Customer must have a breach response plan and notification process |
| §164.308(a)(7) Contingency Plan | Customer must define their own BCP/DR procedures |
| §164.310 Physical Safeguards | Customer must secure workstations and physical devices accessing FileNest |
| §164.314 Business Associate Agreements | Customer must have BAAs in place with all their own subcontractors |
| Breach Notification (§164.400) | Customer is the Covered Entity and must notify HHS and patients within 60 days |

### 13.3 BAA Scope

FileNest acts as a **Business Associate** under HIPAA. The BAA covers:

- FileNest's storage, processing, search, and audit infrastructure
- FileNest's employees and contractors who may access PHI during support
- FileNest's subcontractors (AWS, infrastructure providers) — FileNest maintains downstream BAAs with these parties

The BAA **does not** extend to:
- The customer's own application code
- The customer's own workforce access to PHI via FileNest APIs
- Third-party systems the customer integrates with (EHRs, patient portals) — customer must manage those BAAs separately

### 13.4 Platform Limitations to Communicate at Onboarding

These limitations must be disclosed to Healthcare customers before go-live:

1. **PHI detection is not guaranteed to catch all PHI.** Presidio/spaCy detection has known false-negative rates, particularly for handwritten content, uncommon name formats, and rare identifiers. PHI detection is a risk-reduction tool, not a guarantee of PHI-free files.

2. **OCR accuracy affects PHI detection.** PHI detection runs on OCR-extracted text. Low-quality scans (< 100 DPI, heavy artifacts) may produce OCR text that misses PHI. Customers uploading scanned paper records should use high-quality scanning equipment.

3. **FileNest does not perform de-identification.** PHI detection flags and optionally quarantines files. It does not remove or redact PHI from file content. De-identification (Safe Harbor or Expert Determination) remains the customer's responsibility.

4. **The audit log is the authoritative record, not the file content.** If a customer needs to prove compliance in an audit, FileNest's audit log export is the evidence source. Customers should test the audit export workflow before they need it.
```
