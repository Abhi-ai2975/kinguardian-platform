# FileNest v1.0 — GDPR Compliance

**Version:** 1.0.0
**Status:** Approved for Engineering
**Last Updated:** 2026-06-15

---

## Table of Contents

1. [Scope and Role](#1-scope-and-role)
2. [Right to Erasure (Article 17)](#2-right-to-erasure-article-17)
3. [GDPR vs HIPAA Conflict Resolution](#3-gdpr-vs-hipaa-conflict-resolution)
4. [Right to Data Portability (Article 20)](#4-right-to-data-portability-article-20)
5. [Data Subject Access Request (Article 15)](#5-data-subject-access-request-article-15)
6. [Erasure Implementation](#6-erasure-implementation)
7. [Consent and Lawful Basis Tracking](#7-consent-and-lawful-basis-tracking)
8. [Data Retention Minimization](#8-data-retention-minimization)
9. [API Endpoints](#9-api-endpoints)
10. [Database Schema](#10-database-schema)

---

## 1. Scope and Role

### 1.1 FileNest as Data Processor

Under GDPR, FileNest is a **Data Processor**. The customer (organization) is the **Data Controller**. This distinction determines who is responsible for what:

| Responsibility | Data Controller (Customer) | Data Processor (FileNest) |
|---------------|---------------------------|--------------------------|
| Defining lawful basis for processing | ✅ Customer | — |
| Responding to data subject requests | ✅ Customer | Provides tooling to execute |
| Notifying supervisory authority of breach | ✅ Customer (72 hours) | Notifies customer within 24 hours |
| Appointing a DPO | ✅ If required | FileNest has internal DPO |
| Ensuring sub-processors are compliant | ✅ Customer must verify | ✅ FileNest maintains sub-processor list |
| Implementing technical safeguards | — | ✅ FileNest |
| Data Processing Agreement (DPA) | Both sign | Both sign |

### 1.2 Data Categories Stored

| Category | Location | Contains Personal Data |
|----------|----------|----------------------|
| File content | Object storage (S3/etc.) | Potentially (customer-controlled) |
| File metadata | PostgreSQL `files` table | Potentially (custom metadata fields) |
| OCR text | PostgreSQL `ocr_text` table | Potentially |
| Search index | OpenSearch | Potentially (indexed metadata + OCR) |
| Audit logs | PostgreSQL `audit_logs` | Actor IDs, IP addresses, timestamps |
| User accounts | PostgreSQL `users` table | Name, email |
| API key records | PostgreSQL `api_keys` | Key prefix only (no plaintext) |

---

## 2. Right to Erasure (Article 17)

### 2.1 Erasure Scope

When a customer submits an erasure request for a data subject, FileNest must delete or anonymize all personal data for that subject across:

1. File content in object storage
2. File metadata records in PostgreSQL
3. OCR extracted text
4. Search index entries
5. Audit log records (with exceptions — see §3)
6. User account data (if the data subject is a FileNest user)

### 2.2 Erasure Exceptions

The GDPR explicitly permits retention when erasure conflicts with legal obligations (Article 17(3)(b)):

| Exception | Applies When | Action |
|-----------|-------------|--------|
| Legal obligation | Healthcare HIPAA retention (7 years), Finance SEC retention (7 years), Legal chain of custody | Retain but quarantine — inaccessible except to compliance officers |
| Legal proceedings | Active legal hold on file | Block erasure; notify requestor |
| Legitimate interest override | Active litigation, fraud investigation | Block erasure; log override reason |
| Statistical / scientific purpose | Aggregate anonymized data only | Anonymize rather than delete |

### 2.3 Erasure States

```
PENDING    → Request received, verification in progress
PROCESSING → Deletion job running
COMPLETED  → All erasable data removed; exceptions documented
PARTIAL    → Some data retained under legal exception (documented)
REJECTED   → Legal hold or retention obligation blocks erasure
```

---

## 3. GDPR vs HIPAA Conflict Resolution

This is the most complex scenario: an EU patient requests erasure of their medical records stored in a HIPAA-compliant FileNest project.

**The conflict:** GDPR Article 17 says erase it. HIPAA requires retaining medical records for a minimum of 6 years (state law may require longer).

**Resolution:**

GDPR Article 17(3)(b) explicitly allows retention when required by law. HIPAA is a legal obligation that overrides the erasure right. This position is supported by European Data Protection Board guidance.

**Implementation:**

```python
async def process_erasure_request(
    request: ErasureRequest,
    db: AsyncSession,
) -> ErasureResult:

    files = await get_files_for_subject(request.subject_identifier, db)
    results = []

    for file in files:
        project = await get_project(file.project_id, db)
        profile = project.config["compliance"]["profile"]

        # Check for legal hold — absolute block
        if file.legal_hold_active:
            results.append(ErasureFileResult(
                file_id=file.id,
                status="retained",
                reason="legal_hold_active",
                exception_basis="GDPR Art. 17(3)(e) — legal proceedings",
            ))
            continue

        # Check HIPAA retention — healthcare projects
        if profile == "healthcare" and file.retain_until:
            if file.retain_until > datetime.utcnow():
                # Cannot erase — quarantine instead
                await quarantine_for_erasure(file, db)
                results.append(ErasureFileResult(
                    file_id=file.id,
                    status="quarantined",
                    reason=f"hipaa_retention_until_{file.retain_until.date()}",
                    exception_basis="GDPR Art. 17(3)(b) — legal obligation (HIPAA)",
                    accessible_until=file.retain_until,
                ))
                continue

        # No blocking exception — proceed with erasure
        await erase_file(file, db)
        results.append(ErasureFileResult(
            file_id=file.id,
            status="erased",
        ))

    return ErasureResult(
        request_id=request.id,
        subject_identifier=request.subject_identifier,
        files_erased=sum(1 for r in results if r.status == "erased"),
        files_quarantined=sum(1 for r in results if r.status == "quarantined"),
        files_retained=sum(1 for r in results if r.status == "retained"),
        results=results,
        completed_at=datetime.utcnow(),
    )
```

**Quarantine** means the file:
- Cannot be downloaded via any API path (returns `HTTP 451 Unavailable For Legal Reasons`)
- Cannot be returned in search results
- Cannot be listed in folder listings
- Remains in storage only to satisfy the legal retention obligation
- Is automatically deleted when `retain_until` passes

---

## 4. Right to Data Portability (Article 20)

```python
class DataPortabilityExport:
    """Produce a machine-readable export of all data for a subject."""

    async def export(
        self,
        org_id: str,
        subject_identifier: str,  # e.g. email or patientId
        identifier_field: str,    # e.g. "metadata.patientId"
        db: AsyncSession,
        storage: StorageProvider,
    ) -> str:  # Returns download URL to export archive

        files = await get_files_for_subject(subject_identifier, db)

        # Build manifest
        manifest = {
            "export_date": datetime.utcnow().isoformat(),
            "subject_identifier": subject_identifier,
            "generated_by": "FileNest Data Portability Export",
            "format_version": "1.0",
            "files": [],
        }

        # Create zip in memory (stream for large exports)
        with tempfile.SpooledTemporaryFile(max_size=100 * 1024**2) as tmp:
            with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zf:
                for file in files:
                    # Include file content
                    file_bytes = await download_file_bytes(file, storage)
                    zf.writestr(f"files/{file.id}/{file.original_filename}", file_bytes)

                    # Include metadata as JSON
                    metadata = {
                        "id": str(file.id),
                        "filename": file.original_filename,
                        "size": file.size,
                        "mime_type": file.mime_type,
                        "created_at": file.created_at.isoformat(),
                        "metadata": file.metadata,
                    }
                    zf.writestr(
                        f"files/{file.id}/metadata.json",
                        json.dumps(metadata, indent=2),
                    )
                    manifest["files"].append(metadata)

                # Include manifest
                zf.writestr("manifest.json", json.dumps(manifest, indent=2))

            # Upload export to storage with 7-day TTL
            export_key = f"exports/gdpr/{org_id}/{uuid4()}/export.zip"
            tmp.seek(0)
            await storage.upload(export_key, tmp.read(), "application/zip")

        signed_url = await storage.generate_signed_url(
            export_key, ttl_seconds=7 * 86400
        )
        return signed_url
```

---

## 5. Data Subject Access Request (Article 15)

A DSAR gives the data subject the right to know what data is held about them. FileNest provides this through the same subject-lookup mechanism used for erasure:

```
GET /v1/gdpr/subject-data?identifier=patient%40example.com&field=metadata.patientId

Response:
{
  "subject_identifier": "patient@example.com",
  "data_found": true,
  "summary": {
    "file_count": 12,
    "total_size_bytes": 45678901,
    "earliest_record": "2024-01-15T10:00:00Z",
    "latest_record": "2026-06-10T14:30:00Z",
    "projects": ["proj_abc", "proj_xyz"]
  },
  "files": [
    {
      "id": "file_abc",
      "filename": "discharge-summary.pdf",
      "created_at": "2024-01-15T10:00:00Z",
      "metadata": { "patientId": "patient@example.com", "documentType": "discharge" }
    }
  ]
}
```

---

## 6. Erasure Implementation

### 6.1 Erase File (No Legal Block)

```python
async def erase_file(file: File, db: AsyncSession, storage: StorageProvider) -> None:
    # 1. Delete from object storage
    await storage.delete(file.storage_key)

    # 2. Delete all versions from storage
    for version in file.versions:
        await storage.delete(version.storage_key)

    # 3. Delete OCR text
    await db.execute(delete(OCRText).where(OCRText.file_id == file.id))

    # 4. Remove from search index
    await search_indexer.delete_file(file.id, file.project_id)

    # 5. Anonymize file record (do not delete row — preserves referential integrity)
    await db.execute(
        update(File)
        .where(File.id == file.id)
        .values(
            original_filename="[erased]",
            storage_key="[erased]",
            metadata={},
            checksum="[erased]",
            status=FileStatus.ERASED,
            erased_at=datetime.utcnow(),
            erased_reason="gdpr_erasure_request",
        )
    )

    # 6. Anonymize audit log entries (replace actor PII, keep action/timestamp)
    # Note: audit log structure is preserved for compliance — only PII fields are nulled
    await db.execute(
        update(AuditLog)
        .where(AuditLog.resource_id == str(file.id))
        .values(metadata=func.jsonb_set(AuditLog.metadata, "{erased}", "true"))
    )
```

### 6.2 Why Anonymize Rather Than Delete File Row

The `files` table row is anonymized rather than deleted to preserve:
- Foreign key integrity (processing_jobs, file_versions reference file_id)
- Audit log continuity (audit_logs reference resource_id)
- Usage metrics (storage GB calculations would be incorrect if rows vanish)

The file record with `status = 'erased'` is excluded from all API responses, search results, and folder listings.

---

## 7. Consent and Lawful Basis Tracking

FileNest does not manage consent directly (that is the Data Controller's responsibility), but provides a `lawful_basis` metadata field that controllers can set per file:

```json
{
  "metadata": {
    "_gdpr": {
      "lawful_basis": "contract",
      "data_subject_id": "usr_abc",
      "consent_recorded_at": "2026-01-01T00:00:00Z",
      "retention_justification": "HIPAA §164.530(j)"
    }
  }
}
```

This field is stored with the file, included in DSAR exports, and used by the erasure job to determine applicable exceptions.

---

## 8. Data Retention Minimization

Temporary data generated during file processing is deleted as soon as it is no longer needed:

| Data | Deleted When |
|------|-------------|
| Upload session multipart parts | 24 hours after `complete_upload` or `abort_upload` |
| Virus scan temp files | Immediately after scan |
| OCR intermediate images | Immediately after text extraction |
| Thumbnail temp files | After upload to storage |
| Export archives (GDPR exports) | 7 days after generation |
| Webhook delivery payloads | After 30 days |
| Processing job stage results | After 90 days (kept for debugging) |

---

## 9. API Endpoints

```
POST   /v1/gdpr/erasure-requests
GET    /v1/gdpr/erasure-requests/{id}
GET    /v1/gdpr/subject-data?identifier=X&field=Y
POST   /v1/gdpr/portability-exports
GET    /v1/gdpr/portability-exports/{id}
GET    /v1/gdpr/sub-processors           # List of FileNest sub-processors for DPA
```

All GDPR endpoints require `admin` role. Erasure requests are logged in the audit trail with the requestor identity.

---

## 10. Database Schema

```sql
CREATE TABLE gdpr_erasure_requests (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id           UUID NOT NULL REFERENCES organizations(id),
    subject_identifier  TEXT NOT NULL,
    identifier_field    TEXT NOT NULL DEFAULT 'email',
    requested_by     UUID NOT NULL REFERENCES users(id),
    status           TEXT NOT NULL DEFAULT 'pending',
    -- pending | processing | completed | partial | rejected
    files_erased     INT NOT NULL DEFAULT 0,
    files_quarantined INT NOT NULL DEFAULT 0,
    files_retained   INT NOT NULL DEFAULT 0,
    result_detail    JSONB,
    requested_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at     TIMESTAMPTZ,
    CONSTRAINT valid_status CHECK (
        status IN ('pending','processing','completed','partial','rejected')
    )
);

CREATE INDEX idx_erasure_org ON gdpr_erasure_requests (org_id);
CREATE INDEX idx_erasure_status ON gdpr_erasure_requests (status) WHERE status != 'completed';
```
