# FileNest v1.0 — API Specification

**Version:** 1.0.0
**Base URL:** `https://api.filenest.io/v1`
**Authentication:** Bearer token (API Key or Service Account)
**Content-Type:** `application/json`
**Last Updated:** 2026-06-15

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Common Schemas](#2-common-schemas)
3. [Organizations API](#3-organizations-api)
4. [Projects API](#4-projects-api)
5. [Files API](#5-files-api)
6. [Upload API](#6-upload-api)
7. [Download API](#7-download-api)
8. [Folders API](#8-folders-api)
9. [Metadata API](#9-metadata-api)
10. [Search API](#10-search-api)
11. [Processing API](#11-processing-api)
12. [Webhooks API](#12-webhooks-api)
13. [API Keys API](#13-api-keys-api)
14. [Service Accounts API](#14-service-accounts-api)
15. [Audit API](#15-audit-api)
16. [Compliance API](#16-compliance-api)
17. [Healthcare API](#17-healthcare-api)
18. [Error Reference](#18-error-reference)

---

## 1. Authentication

### 1.1 API Key Authentication

All API requests require a Bearer token in the Authorization header.

```http
Authorization: Bearer fn_live_abc123...
```

**Token Prefixes:**
| Prefix | Type | Environment |
|--------|------|-------------|
| `fn_live_` | API Key | Production |
| `fn_test_` | API Key | Development/Staging |
| `fn_sa_` | Service Account | Any |

### 1.2 Rate Limiting

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1718447400
X-RateLimit-Window: 60
```

Rate limits by plan:
| Plan | Requests/min | Concurrent Uploads |
|------|-------------|-------------------|
| Starter | 100 | 10 |
| Professional | 1,000 | 100 |
| Enterprise | 10,000 | 1,000 |

### 1.3 Request Headers

```
Authorization: Bearer {token}           # Required
Content-Type: application/json          # Required for POST/PUT/PATCH
X-Request-ID: {uuid}                    # Optional, returned in response
X-Idempotency-Key: {key}               # Optional, for idempotent operations
Accept: application/json
```

### 1.4 Response Headers

```
X-Request-ID: {uuid}
X-FileNest-Version: 1.0.0
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1718447400
```

---

## 2. Common Schemas

### 2.1 Pagination

All list endpoints return paginated results using cursor-based pagination.

**Request parameters:**
```
limit      int    Items per page (default: 20, max: 100)
cursor     string Opaque cursor from previous response
sort_by    string Field to sort by
sort_order string "asc" or "desc" (default: "desc")
```

**Response wrapper:**
```json
{
  "data": [...],
  "pagination": {
    "limit": 20,
    "total": 1542,
    "cursor": "eyJpZCI6InByb2pfYWJjIiwiY3JlYXRlZF9hdCI6IjIwMjYtMDYtMTUifQ==",
    "hasMore": true
  }
}
```

### 2.2 Error Response

```json
{
  "error": {
    "code": "file_not_found",
    "message": "File file_abc123 was not found in this project",
    "request_id": "req_xyz789",
    "documentation_url": "https://docs.filenest.io/errors/file_not_found",
    "details": {}
  }
}
```

### 2.3 File Object

```json
{
  "id": "file_abc123",
  "projectId": "proj_xyz",
  "environmentId": "env_prod",
  "folderId": "folder_abc",
  "filename": "discharge-summary.pdf",
  "originalFilename": "Discharge Summary - Dr Smith.pdf",
  "size": 524288,
  "mimeType": "application/pdf",
  "checksum": {
    "md5": "d8e8fca2dc0f896fd7cb4cb0031ba249",
    "sha256": "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
  },
  "status": "ready",
  "tags": ["clinical", "discharge"],
  "metadata": {
    "patientId": "P-12345",
    "documentType": "Discharge"
  },
  "versionCount": 2,
  "currentVersion": {
    "id": "ver_001",
    "versionNumber": 2,
    "createdAt": "2026-06-15T10:30:00Z"
  },
  "compliance": {
    "legalHoldActive": false,
    "wormCommitted": false,
    "retainUntil": "2033-06-15T00:00:00Z"
  },
  "processing": {
    "virusScanResult": "clean",
    "phiDetected": false,
    "ocrExtracted": true,
    "classification": "medical_discharge"
  },
  "downloadCount": 12,
  "lastDownloadedAt": "2026-06-15T09:00:00Z",
  "uploadedBy": "sa_backend_worker",
  "createdAt": "2026-06-15T10:30:00Z",
  "updatedAt": "2026-06-15T10:35:00Z"
}
```

---

## 3. Organizations API

### 3.1 Create Organization

```
POST /v1/organizations
```

**Authorization:** None (public endpoint for signup)

**Request:**
```json
{
  "name": "Acme Healthcare",
  "slug": "acme-healthcare",
  "billingEmail": "billing@acme.com",
  "adminUser": {
    "email": "admin@acme.com",
    "name": "Admin User",
    "password": "SecurePassword123!"
  }
}
```

**Response:** `201 Created`
```json
{
  "organization": {
    "id": "org_abc123",
    "name": "Acme Healthcare",
    "slug": "acme-healthcare",
    "plan": "starter",
    "status": "active",
    "createdAt": "2026-06-15T10:00:00Z"
  },
  "user": {
    "id": "user_xyz",
    "email": "admin@acme.com",
    "role": "admin"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiJ9..."
}
```

**Errors:**
| Code | HTTP | Description |
|------|------|-------------|
| `slug_taken` | 409 | Organization slug already in use |
| `email_taken` | 409 | Admin email already registered |
| `validation_error` | 422 | Request body validation failed |

---

### 3.2 Get Organization

```
GET /v1/organizations/{organizationId}
```

**Authorization:** API Key (any scope)

**Response:** `200 OK`
```json
{
  "id": "org_abc123",
  "name": "Acme Healthcare",
  "slug": "acme-healthcare",
  "plan": "enterprise",
  "status": "active",
  "maxProjects": 100,
  "maxStorageGb": 10000,
  "baaSigned": true,
  "baaSignedAt": "2026-01-15T00:00:00Z",
  "createdAt": "2026-01-01T00:00:00Z"
}
```

---

## 4. Projects API

### 4.1 Create Project

```
POST /v1/projects
```

**Authorization:** API Key (scope: `admin`)

**Request:**
```json
{
  "name": "Patient Records",
  "slug": "patient-records",
  "description": "HIPAA-compliant clinical document storage",
  "capabilityPack": "healthcare",
  "config": {
    "storage": {
      "mode": "managed",
      "provider": "s3",
      "region": "us-east-1",
      "encryption": "aws:kms",
      "kmsKeyId": "arn:aws:kms:us-east-1:123456789:key/abc123"
    },
    "_storageByobExample_": {
      "_comment": "BYOB mode — customer supplies their own storage endpoint",
      "mode": "byob",
      "provider": "minio",
      "endpointUrl": "https://storage.acme.com:9000",
      "bucketName": "acme-files",
      "region": "us-east-1",
      "credentials": {
        "accessKey": "AKIAIOSFODNN7EXAMPLE",
        "secretKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
      }
    },
    "_storageRustFSExample_": {
      "_comment": "BYOB with RustFS Docker instance",
      "mode": "byob",
      "provider": "rustfs",
      "endpointUrl": "http://rustfs.acme.internal:9000",
      "bucketName": "files",
      "credentials": {
        "accessKey": "mykey",
        "secretKey": "mysecret"
      }
    },
    "compliance": {
      "profile": "healthcare",
      "hipaaControls": true,
      "phiDetection": true,
      "auditRetentionYears": 7,
      "legalHoldEnabled": true
    },
    "processing": {
      "virusScan": true,
      "ocr": true,
      "phiDetection": true,
      "classification": true,
      "thumbnailGeneration": true
    },
    "metadata": {
      "enforceSchema": true,
      "schema": {
        "properties": {
          "patientId": { "type": "string", "minLength": 1 },
          "documentType": {
            "type": "string",
            "enum": ["LabReport", "Discharge", "Consent", "Imaging"]
          },
          "encounterId": { "type": "string" }
        },
        "required": ["patientId", "documentType"]
      }
    },
    "security": {
      "allowedOrigins": ["https://portal.acme.com"],
      "signedUrlTtlSeconds": 3600
    },
    "versioning": {
      "enabled": true,
      "maxVersions": 50
    }
  }
}
```

**Response:** `201 Created`
```json
{
  "id": "proj_abc123",
  "organizationId": "org_xyz",
  "name": "Patient Records",
  "slug": "patient-records",
  "status": "active",
  "complianceProfile": "healthcare",
  "storageProvider": "s3",
  "config": { "...": "full config" },
  "createdAt": "2026-06-15T10:00:00Z"
}
```

**Errors:**
| Code | HTTP | Description |
|------|------|-------------|
| `slug_taken` | 409 | Project slug already exists in org |
| `invalid_capability_pack` | 422 | Unknown capability pack name |
| `worm_irreversible` | 422 | Cannot enable WORM on existing non-WORM project |
| `baa_required` | 403 | Healthcare pack requires signed BAA |

---

### 4.2 Get Project

```
GET /v1/projects/{projectId}
```

**Response:** `200 OK` — Full project object with config

---

### 4.3 Update Project Config

```
PATCH /v1/projects/{projectId}/config
```

**Authorization:** API Key (scope: `admin`)

**Request:**
```json
{
  "processing": {
    "embeddingGeneration": true
  },
  "security": {
    "allowedOrigins": [
      "https://portal.acme.com",
      "https://app2.acme.com"
    ]
  }
}
```

**Response:** `200 OK` — Updated project config

**Notes:**
- Partial updates supported (PATCH semantics)
- Config changes are versioned and audited
- Compliance-reducing changes (e.g., disabling PHI detection) require admin role + explicit confirmation

---

### 4.4 List Projects

```
GET /v1/projects
```

**Query Parameters:**
```
limit          int
cursor         string
status         string  active|suspended|archived
complianceProfile  string  healthcare|finance|legal|generic
```

**Response:** `200 OK`
```json
{
  "data": [
    { "id": "proj_abc", "name": "Patient Records", "..." }
  ],
  "pagination": { "..." }
}
```

---

### 4.5 Storage Configuration

Storage config endpoints manage where a project's file bytes are stored.
All endpoints require scope `projects:read` (GET) or `projects:update` (PATCH / POST).

#### GET /v1/projects/{projectId}/storage

Returns the non-sensitive storage configuration. Encrypted credentials are never returned.

**Response:** `200 OK`
```json
{
  "project_id": "proj_abc",
  "environment": "production",
  "storage_mode": "managed",
  "provider": "rustfs",
  "region": "us-east-1",
  "bucket_name": "fn-proj_abc",
  "endpoint_url": null,
  "server_side_encryption": null,
  "sse_enabled": false,
  "status": "active",
  "last_verified_at": "2026-06-20T10:00:00Z"
}
```

`server_side_encryption` is `null` for Azure Blob and GCS (always-on, not configurable).
`sse_enabled` is `true` for S3 / R2 / Azure / GCS by default; `false` for MinIO / RustFS by default.

---

#### PATCH /v1/projects/{projectId}/storage

Save BYOB credentials for a project. After saving, `status` is set to `pending_verification`.
Call the verify endpoint to activate the config.

**Request:**
```json
{
  "bucket_name": "acme-files",
  "region": "us-east-1",
  "endpoint_url": "https://storage.acme.com:9000",

  "_s3_minio_rustfs_r2": "S3-compatible providers require these fields:",
  "access_key_id": "AKIAIOSFODNN7EXAMPLE",
  "secret_access_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  "server_side_encryption": "AES256",
  "kms_key_id": null,

  "_azure_blob": "Azure Blob Storage requires these fields instead:",
  "account_name": "acmestorage",
  "account_key": "base64encodedkey==",

  "_gcs": "Google Cloud Storage requires this field instead:",
  "credentials_json": "{\"type\":\"service_account\", ...}"
}
```

**Response:** `200 OK` — Updated `StorageConfigResponse` (same shape as GET above)

---

#### POST /v1/projects/{projectId}/storage/verify

Probe the project's storage provider by writing and deleting a test object.
Updates `status` to `active` on success, `verification_failed` on error.

**Response:** `200 OK`
```json
{
  "ok": true,
  "latency_ms": 42.3,
  "error": null
}
```

---

#### PATCH /v1/projects/{projectId}/storage/sse

Toggle server-side encryption for MinIO and RustFS projects.
When enabled, FileNest sends `ServerSideEncryption: AES256` on every PUT.
The MinIO/RustFS server must have a KMS key configured for encryption to take effect.

Returns `422` for S3, R2, Azure Blob, and GCS — those providers use always-on encryption
that is not togglable via FileNest.

**Request:**
```json
{ "sse_enabled": true }
```

**Response:** `200 OK` — Updated `StorageConfigResponse`

---

## 5. Files API

### 5.1 List Files

```
GET /v1/files
```

**Authorization:** API Key (scope: `files:read`)

**Query Parameters:**
```
limit          int         default: 20, max: 100
cursor         string
folderId       string      Filter by folder
status         string      ready|processing|uploading|quarantined|deleted
mimeType       string      Filter by MIME type
tags           string[]    Filter by tags (comma-separated)
metadata[key]  string      Filter by metadata field (e.g., metadata[patientId]=P-123)
createdAfter   datetime    ISO 8601
createdBefore  datetime    ISO 8601
sortBy         string      created_at|filename|size|updated_at
sortOrder      string      asc|desc
```

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "file_abc123",
      "filename": "discharge-summary.pdf",
      "size": 524288,
      "mimeType": "application/pdf",
      "status": "ready",
      "tags": ["clinical"],
      "metadata": { "patientId": "P-12345" },
      "createdAt": "2026-06-15T10:30:00Z"
    }
  ],
  "pagination": {
    "limit": 20,
    "total": 1542,
    "cursor": "eyJ...",
    "hasMore": true
  }
}
```

---

### 5.2 Get File

```
GET /v1/files/{fileId}
```

**Authorization:** API Key (scope: `files:read`)

**Response:** `200 OK` — Full file object

**Query Parameters:**
```
includeVersions     boolean  Include version history
includeProcessing   boolean  Include detailed processing results
```

---

### 5.3 Update File

```
PATCH /v1/files/{fileId}
```

**Authorization:** API Key (scope: `files:update_metadata`)

**Request:**
```json
{
  "filename": "discharge-summary-updated.pdf",
  "tags": ["clinical", "discharge", "reviewed"],
  "metadata": {
    "patientId": "P-12345",
    "documentType": "Discharge",
    "reviewedBy": "Dr. Smith"
  },
  "folderId": "folder_xyz"
}
```

**Response:** `200 OK` — Updated file object

**Validation:**
- Metadata validated against project schema
- Cannot update `filename` if WORM is committed
- Tag list replaces existing tags entirely

---

### 5.4 Delete File

```
DELETE /v1/files/{fileId}
```

**Authorization:** API Key (scope: `files:delete`)

**Response:** `204 No Content`

**Errors:**
| Code | HTTP | Description |
|------|------|-------------|
| `worm_violation` | 409 | File is WORM committed |
| `legal_hold_active` | 409 | File is under legal hold |
| `retention_active` | 409 | File is within retention period |
| `file_not_found` | 404 | File not found or already deleted |

---

### 5.5 Restore File

```
POST /v1/files/{fileId}/restore
```

**Authorization:** API Key (scope: `files:delete`)

**Response:** `200 OK`
```json
{
  "id": "file_abc123",
  "status": "ready",
  "restoredAt": "2026-06-15T12:00:00Z"
}
```

---

### 5.6 Get File Versions

```
GET /v1/files/{fileId}/versions
```

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "ver_001",
      "versionNumber": 2,
      "size": 524288,
      "checksumSha256": "2cf24dba...",
      "changeNote": "Updated with corrected patient name",
      "createdBy": "sa_backend",
      "createdAt": "2026-06-15T11:00:00Z"
    },
    {
      "id": "ver_000",
      "versionNumber": 1,
      "size": 512000,
      "createdAt": "2026-06-15T10:30:00Z"
    }
  ]
}
```

---

### 5.7 Rollback Version

```
POST /v1/files/{fileId}/versions/{versionNumber}/rollback
```

**Request:**
```json
{
  "changeNote": "Rolling back due to incorrect data"
}
```

**Response:** `200 OK` — Updated file object with new version

---

## 6. Upload API

### 6.1 Create Upload Session

```
POST /v1/uploads
```

**Authorization:** API Key (scope: `upload`)

**Request:**
```json
{
  "filename": "discharge-summary.pdf",
  "mimeType": "application/pdf",
  "size": 524288,
  "folderId": "folder_abc",
  "tags": ["clinical", "discharge"],
  "metadata": {
    "patientId": "P-12345",
    "documentType": "Discharge",
    "encounterId": "E-67890"
  },
  "checksumSha256": "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
}
```

**Response:** `201 Created`

**Single upload (< 100MB):**
```json
{
  "sessionId": "sess_abc123",
  "fileId": "file_xyz789",
  "uploadType": "single",
  "uploadUrl": "https://filenest-uploads.s3.amazonaws.com/...",
  "uploadMethod": "PUT",
  "uploadHeaders": {
    "Content-Type": "application/pdf",
    "x-amz-server-side-encryption": "aws:kms"
  },
  "expiresAt": "2026-06-15T11:00:00Z"
}
```

**Multipart upload (≥ 100MB):**
```json
{
  "sessionId": "sess_abc123",
  "fileId": "file_xyz789",
  "uploadType": "multipart",
  "chunkSize": 5242880,
  "totalChunks": 100,
  "expiresAt": "2026-06-16T10:30:00Z"
}
```

**Errors:**
| Code | HTTP | Description |
|------|------|-------------|
| `file_too_large` | 413 | File exceeds project maximum |
| `mime_type_not_allowed` | 422 | MIME type not allowed in project |
| `metadata_validation_failed` | 422 | Metadata fails schema validation |
| `worm_overwrite_violation` | 409 | Cannot overwrite existing file in WORM project |
| `storage_quota_exceeded` | 402 | Organization storage quota exceeded |

---

### 6.2 Get Chunk Upload URL

```
POST /v1/uploads/{sessionId}/chunks/{partNumber}
```

**Authorization:** API Key (scope: `upload`)

**Path Parameters:**
```
sessionId   string  Upload session ID
partNumber  int     Chunk number (1-based)
```

**Response:** `200 OK`
```json
{
  "partNumber": 1,
  "uploadUrl": "https://filenest-uploads.s3.amazonaws.com/...?partNumber=1&uploadId=...",
  "uploadMethod": "PUT",
  "uploadHeaders": {
    "Content-Type": "application/octet-stream"
  },
  "expiresAt": "2026-06-15T11:00:00Z"
}
```

---

### 6.3 Complete Upload

```
POST /v1/uploads/{sessionId}/complete
```

**Request (multipart):**
```json
{
  "parts": [
    { "partNumber": 1, "etag": "abc123" },
    { "partNumber": 2, "etag": "def456" }
  ],
  "checksumSha256": "2cf24dba..."
}
```

**Request (single upload):**
```json
{
  "checksumSha256": "2cf24dba..."
}
```

**Response:** `200 OK`
```json
{
  "fileId": "file_xyz789",
  "status": "processing",
  "processingStages": ["virus_scan", "phi_detection", "ocr", "classification", "indexing"],
  "processingJobId": "job_abc123",
  "estimatedProcessingSeconds": 15
}
```

---

### 6.4 Get Upload Session Status

```
GET /v1/uploads/{sessionId}
```

**Response:** `200 OK`
```json
{
  "sessionId": "sess_abc123",
  "fileId": "file_xyz789",
  "status": "in_progress",
  "uploadType": "multipart",
  "totalChunks": 100,
  "uploadedChunks": [1, 2, 3, 4, 5],
  "percentComplete": 5,
  "expiresAt": "2026-06-16T10:30:00Z"
}
```

---

### 6.5 Abort Upload

```
DELETE /v1/uploads/{sessionId}
```

**Response:** `204 No Content`

---

### 6.6 Create Upload Token (for Frontend SDK)

```
POST /v1/upload-tokens
```

**Authorization:** API Key (scope: `upload`) — Used from **backend** to generate frontend tokens

**Request:**
```json
{
  "maxSize": 52428800,
  "allowedMimeTypes": ["application/pdf", "image/jpeg"],
  "maxFiles": 10,
  "folderId": "folder_abc",
  "metadata": {
    "uploadedBy": "user_123",
    "sessionId": "web_session_abc"
  },
  "expiresIn": 3600
}
```

**Response:** `201 Created`
```json
{
  "token": "fn_upload_token_xyz...",
  "expiresAt": "2026-06-15T11:30:00Z",
  "constraints": {
    "maxSize": 52428800,
    "allowedMimeTypes": ["application/pdf", "image/jpeg"],
    "maxFiles": 10
  }
}
```

---

## 7. Download API

### 7.1 Get Download URL

```
GET /v1/files/{fileId}/download
```

**Authorization:** API Key (scope: `download`)

**Query Parameters:**
```
ttl         int     URL expiration in seconds (default: 3600, max: 86400)
singleUse   bool    Invalidate after first download
version     int     Specific version number (default: latest)
disposition string  "attachment" or "inline" (default: attachment)
```

**Response:** `200 OK`
```json
{
  "url": "https://filenest-uploads.s3.amazonaws.com/org_abc/proj_xyz/...?X-Amz-Signature=...",
  "expiresAt": "2026-06-15T11:30:00Z",
  "filename": "discharge-summary.pdf",
  "contentType": "application/pdf",
  "size": 524288,
  "checksumSha256": "2cf24dba..."
}
```

**Errors:**
| Code | HTTP | Description |
|------|------|-------------|
| `file_not_found` | 404 | File not found |
| `file_quarantined` | 451 | File is quarantined (virus detected) |
| `file_not_ready` | 202 | File is still uploading or processing |

---

### 7.2 Direct Download (Proxy Stream)

```
GET /v1/files/{fileId}/stream
```

**Response:** `200 OK` with file content as response body

**Headers returned:**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="discharge-summary.pdf"
Content-Length: 524288
X-FileNest-Checksum-SHA256: 2cf24dba...
X-FileNest-File-ID: file_abc123
```

---

## 8. Folders API

### 8.1 Create Folder

```
POST /v1/folders
```

**Authorization:** API Key (scope: `files:upload`)

**Request:**
```json
{
  "name": "Lab Reports",
  "parentFolderId": "folder_root",
  "metadata": {
    "department": "pathology"
  }
}
```

**Response:** `201 Created`
```json
{
  "id": "folder_abc123",
  "name": "Lab Reports",
  "path": "/patients/2026/lab-reports",
  "parentFolderId": "folder_root",
  "metadata": { "department": "pathology" },
  "legalHoldActive": false,
  "createdAt": "2026-06-15T10:00:00Z"
}
```

---

### 8.2 List Folders

```
GET /v1/folders
```

**Query Parameters:**
```
parentFolderId  string   List children of this folder (null = root)
limit           int
cursor          string
```

---

### 8.3 Get Folder

```
GET /v1/folders/{folderId}
```

**Query Parameters:**
```
includeStats  bool  Include file count and total size
```

---

### 8.4 Update Folder

```
PATCH /v1/folders/{folderId}
```

**Request:**
```json
{
  "name": "Updated Folder Name",
  "metadata": { "reviewed": true }
}
```

---

### 8.5 Delete Folder

```
DELETE /v1/folders/{folderId}
```

**Query Parameters:**
```
force   bool  Delete even if folder contains files (moves to root) — default: false
```

**Errors:**
| Code | HTTP | Description |
|------|------|-------------|
| `folder_not_empty` | 409 | Folder contains files and force=false |
| `legal_hold_active` | 409 | Folder is under legal hold |

---

## 9. Metadata API

### 9.1 Get Metadata Schema

```
GET /v1/metadata-schemas/active
```

**Response:** `200 OK`
```json
{
  "id": "schema_abc123",
  "name": "healthcare_v1",
  "version": 3,
  "schema": {
    "properties": {
      "patientId": { "type": "string", "minLength": 1 },
      "documentType": {
        "type": "string",
        "enum": ["LabReport", "Discharge", "Consent"]
      }
    },
    "required": ["patientId", "documentType"],
    "additionalProperties": false
  },
  "updatedAt": "2026-06-01T00:00:00Z"
}
```

---

### 9.2 Create Metadata Schema

```
POST /v1/metadata-schemas
```

**Authorization:** API Key (scope: `admin`)

**Request:**
```json
{
  "name": "healthcare_v2",
  "schema": {
    "properties": {
      "patientId": { "type": "string", "minLength": 1 },
      "documentType": {
        "type": "string",
        "enum": ["LabReport", "Discharge", "Consent", "Imaging", "Pathology"]
      },
      "encounterId": { "type": "string" },
      "physicianNpi": { "type": "string", "pattern": "^[0-9]{10}$" }
    },
    "required": ["patientId", "documentType"]
  }
}
```

---

### 9.3 Validate Metadata

```
POST /v1/metadata-schemas/validate
```

**Request:**
```json
{
  "metadata": {
    "patientId": "P-12345",
    "documentType": "InvalidType"
  }
}
```

**Response:** `200 OK` (valid) or `422 Unprocessable Entity` (invalid)
```json
{
  "valid": false,
  "errors": [
    {
      "field": "documentType",
      "message": "'InvalidType' is not one of ['LabReport', 'Discharge', 'Consent']",
      "value": "InvalidType"
    }
  ]
}
```

---

## 10. Search API

### 10.1 Search Files

```
POST /v1/search
```

**Authorization:** API Key (scope: `search`)

**Request:**
```json
{
  "q": "discharge summary smith",
  "filters": {
    "metadata": {
      "patientId": "P-12345",
      "documentType": ["Discharge", "LabReport"]
    },
    "tags": ["clinical"],
    "mimeType": ["application/pdf"],
    "status": "ready",
    "createdAfter": "2026-01-01T00:00:00Z",
    "createdBefore": "2026-12-31T23:59:59Z",
    "folderId": "folder_abc",
    "size": {
      "gte": 1024,
      "lte": 10485760
    }
  },
  "facets": ["documentType", "tags", "mimeType"],
  "highlight": true,
  "limit": 20,
  "cursor": null,
  "sortBy": "relevance",
  "sortOrder": "desc"
}
```

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "file_abc123",
      "filename": "discharge-summary.pdf",
      "mimeType": "application/pdf",
      "size": 524288,
      "status": "ready",
      "tags": ["clinical", "discharge"],
      "metadata": { "patientId": "P-12345", "documentType": "Discharge" },
      "score": 4.82,
      "highlights": {
        "ocrContent": [
          "...Patient Smith was <em>discharged</em> on June 14th..."
        ],
        "filename": ["<em>discharge</em>-summary.pdf"]
      },
      "createdAt": "2026-06-15T10:30:00Z"
    }
  ],
  "pagination": {
    "limit": 20,
    "total": 3,
    "cursor": null,
    "hasMore": false
  },
  "facets": {
    "documentType": [
      { "value": "Discharge", "count": 2 },
      { "value": "LabReport", "count": 1 }
    ],
    "tags": [
      { "value": "clinical", "count": 3 },
      { "value": "discharge", "count": 2 }
    ],
    "mimeType": [
      { "value": "application/pdf", "count": 3 }
    ]
  },
  "queryTimeMs": 23
}
```

---

### 10.2 Quick Search (GET)

```
GET /v1/search?q={query}&limit={limit}&cursor={cursor}
```

Simplified endpoint for basic search without filters.

---

### 10.3 Saved Searches

```
POST /v1/saved-searches
```

**Request:**
```json
{
  "name": "Unreviewed Lab Reports - Patient P-12345",
  "query": {
    "filters": {
      "metadata": { "patientId": "P-12345", "documentType": "LabReport" },
      "tags": ["pending-review"]
    }
  }
}
```

```
GET /v1/saved-searches              # List saved searches
GET /v1/saved-searches/{id}/run     # Execute saved search
DELETE /v1/saved-searches/{id}      # Delete saved search
```

---

## 11. Processing API

### 11.1 Get Processing Job

```
GET /v1/processing/jobs/{jobId}
```

**Response:** `200 OK`
```json
{
  "id": "job_abc123",
  "fileId": "file_xyz789",
  "status": "completed",
  "stages": [
    {
      "name": "virus_scan",
      "status": "completed",
      "result": { "result": "clean", "provider": "clamav" },
      "durationMs": 1245
    },
    {
      "name": "phi_detection",
      "status": "completed",
      "result": {
        "detected": false,
        "entities": [],
        "scannedAt": "2026-06-15T10:30:15Z"
      },
      "durationMs": 850
    },
    {
      "name": "ocr",
      "status": "completed",
      "result": {
        "provider": "tesseract",
        "textLength": 4532,
        "confidence": 0.94,
        "language": "en"
      },
      "durationMs": 8234
    },
    {
      "name": "indexing",
      "status": "completed",
      "durationMs": 234
    }
  ],
  "startedAt": "2026-06-15T10:30:10Z",
  "completedAt": "2026-06-15T10:30:25Z"
}
```

---

### 11.2 Reprocess File

```
POST /v1/files/{fileId}/reprocess
```

**Authorization:** API Key (scope: `admin`)

**Request:**
```json
{
  "stages": ["ocr", "classification", "embedding"],
  "force": true
}
```

**Response:** `202 Accepted`
```json
{
  "jobId": "job_new_abc",
  "fileId": "file_xyz789",
  "stages": ["ocr", "classification", "embedding"],
  "status": "queued"
}
```

---

### 11.3 Get Processing Pipeline Config

```
GET /v1/processing/config
```

**Response:** `200 OK`
```json
{
  "stages": {
    "virusScan": { "enabled": true, "provider": "clamav" },
    "ocr": { "enabled": true, "provider": "tesseract", "enabledForMimeTypes": ["application/pdf", "image/*"] },
    "phiDetection": { "enabled": true, "provider": "presidio" },
    "piiDetection": { "enabled": false },
    "classification": { "enabled": true },
    "thumbnailGeneration": { "enabled": true, "enabledForMimeTypes": ["image/*", "application/pdf"] },
    "embeddingGeneration": { "enabled": false }
  }
}
```

---

## 12. Webhooks API

### 12.1 Create Webhook

```
POST /v1/webhooks
```

**Authorization:** API Key (scope: `webhook:manage`)

**Request:**
```json
{
  "name": "Processing Complete Notifier",
  "url": "https://api.acme.com/webhooks/filenest",
  "subscribedEvents": [
    "file.uploaded",
    "file.processed",
    "file.deleted",
    "file.virus_detected"
  ],
  "maxRetries": 5,
  "timeoutSeconds": 30
}
```

**Response:** `201 Created`
```json
{
  "id": "wh_abc123",
  "name": "Processing Complete Notifier",
  "url": "https://api.acme.com/webhooks/filenest",
  "subscribedEvents": ["file.uploaded", "file.processed"],
  "signingSecret": "whsec_abc123xyz...",
  "status": "active",
  "createdAt": "2026-06-15T10:00:00Z"
}
```

**Note:** `signingSecret` is returned only at creation time.

---

### 12.2 Webhook Payload Format

All webhook deliveries use this format:

```json
{
  "id": "evt_abc123",
  "type": "file.processed",
  "version": "1.0",
  "timestamp": "2026-06-15T10:35:00.000Z",
  "organizationId": "org_abc",
  "projectId": "proj_xyz",
  "data": {
    "fileId": "file_abc123",
    "filename": "discharge-summary.pdf",
    "status": "ready",
    "processingResults": {
      "virusScanResult": "clean",
      "phiDetected": false,
      "ocrExtracted": true
    }
  }
}
```

**Signature verification:**
```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(signature)
  );
}
```

---

### 12.3 List Webhooks

```
GET /v1/webhooks
```

---

### 12.4 Get Webhook

```
GET /v1/webhooks/{webhookId}
```

---

### 12.5 Update Webhook

```
PATCH /v1/webhooks/{webhookId}
```

---

### 12.6 Delete Webhook

```
DELETE /v1/webhooks/{webhookId}
```

---

### 12.7 List Webhook Deliveries

```
GET /v1/webhooks/{webhookId}/deliveries
```

**Query Parameters:**
```
status   string  delivered|failed|dead_lettered|pending
limit    int
cursor   string
```

---

### 12.8 Redeliver Webhook

```
POST /v1/webhooks/{webhookId}/deliveries/{deliveryId}/redeliver
```

---

### 12.9 Rotate Signing Secret

```
POST /v1/webhooks/{webhookId}/rotate-secret
```

**Response:**
```json
{
  "signingSecret": "whsec_newSecret...",
  "rotatedAt": "2026-06-15T12:00:00Z"
}
```

---

## 13. API Keys API

### 13.1 Create API Key

```
POST /v1/api-keys
```

**Authorization:** API Key (scope: `admin`)

**Request:**
```json
{
  "name": "Production Backend",
  "environment": "production",
  "scopes": ["upload", "download", "search", "files:read"],
  "expiresAt": "2027-06-15T00:00:00Z",
  "allowedIps": ["203.0.113.0/24"],
  "description": "Used by backend API server"
}
```

**Response:** `201 Created`
```json
{
  "id": "apikey_abc123",
  "keyId": "fn_key_abc12345",
  "key": "fn_live_abc123...xyz",
  "prefix": "fn_live_abc1...",
  "name": "Production Backend",
  "environment": "production",
  "scopes": ["upload", "download", "search", "files:read"],
  "expiresAt": "2027-06-15T00:00:00Z",
  "createdAt": "2026-06-15T10:00:00Z"
}
```

**The `key` field is only returned at creation. Store it securely.**

---

### 13.2 List API Keys

```
GET /v1/api-keys
```

**Response excludes the actual key value — only prefix shown.**

---

### 13.3 Rotate API Key

```
POST /v1/api-keys/{keyId}/rotate
```

**Response:** `200 OK`
```json
{
  "newKey": "fn_live_newkey...",
  "newPrefix": "fn_live_newk...",
  "oldKeyExpiresAt": "2026-06-15T11:00:00Z"
}
```

The old key remains valid for 1 hour after rotation to allow graceful transition.

---

### 13.4 Revoke API Key

```
DELETE /v1/api-keys/{keyId}
```

**Response:** `204 No Content`

---

## 14. Service Accounts API

### 14.1 Create Service Account

```
POST /v1/service-accounts
```

**Request:**
```json
{
  "name": "Background Processing Worker",
  "environment": "production",
  "scopes": ["upload", "download", "search"],
  "description": "Used by async processing workers"
}
```

**Response:** `201 Created`
```json
{
  "id": "sa_abc123",
  "clientId": "fn_sa_clientid...",
  "clientSecret": "fn_sa_secret...",
  "name": "Background Processing Worker",
  "scopes": ["upload", "download", "search"],
  "createdAt": "2026-06-15T10:00:00Z"
}
```

---

### 14.2 Rotate Service Account Secret

```
POST /v1/service-accounts/{id}/rotate
```

---

### 14.3 Revoke Service Account

```
DELETE /v1/service-accounts/{id}
```

---

## 15. Audit API

### 15.1 List Audit Events

```
GET /v1/audit
```

**Authorization:** API Key (scope: `audit:read`)

**Query Parameters:**
```
eventType       string    file.uploaded|file.downloaded|file.deleted|...
subjectId       string    Filter by subject (file ID, folder ID, etc.)
actorId         string    Filter by actor
dateFrom        datetime  ISO 8601
dateTo          datetime  ISO 8601
phiInvolved     bool      Filter PHI-related events only
limit           int       Max: 1000
cursor          string
```

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "audit_abc123",
      "eventType": "file.downloaded",
      "subjectType": "file",
      "subjectId": "file_xyz789",
      "actorType": "service_account",
      "actorId": "sa_abc",
      "actorName": "Backend Worker",
      "ipAddress": "203.0.113.1",
      "payload": {
        "filename": "discharge-summary.pdf",
        "size": 524288,
        "legalHoldActive": false
      },
      "phiInvolved": false,
      "occurredAt": "2026-06-15T10:30:00Z"
    }
  ],
  "pagination": { "..." }
}
```

---

### 15.2 Create Audit Export

```
POST /v1/audit/exports
```

**Request:**
```json
{
  "dateFrom": "2026-01-01T00:00:00Z",
  "dateTo": "2026-03-31T23:59:59Z",
  "eventTypes": ["file.uploaded", "file.downloaded", "file.deleted"],
  "format": "csv",
  "includePayload": true
}
```

**Response:** `202 Accepted`
```json
{
  "exportId": "export_abc123",
  "status": "generating",
  "estimatedSeconds": 30
}
```

---

### 15.3 Get Audit Export Status

```
GET /v1/audit/exports/{exportId}
```

**Response:** `200 OK`
```json
{
  "exportId": "export_abc123",
  "status": "ready",
  "downloadUrl": "https://...",
  "downloadUrlExpiresAt": "2026-06-15T12:00:00Z",
  "rowCount": 45231,
  "fileSizeBytes": 8542012
}
```

---

## 16. Compliance API

### 16.1 Set Legal Hold

```
POST /v1/files/{fileId}/legal-hold
```

**Authorization:** API Key (scope: `compliance:manage`)

**Request:**
```json
{
  "reason": "SEC investigation case 2026-CV-1234",
  "indefinite": true,
  "releasesAt": null
}
```

**Response:** `200 OK`
```json
{
  "fileId": "file_abc123",
  "legalHoldActive": true,
  "legalHoldReason": "SEC investigation case 2026-CV-1234",
  "legalHoldSetAt": "2026-06-15T12:00:00Z",
  "legalHoldSetBy": "user_compliance_officer"
}
```

---

### 16.2 Release Legal Hold

```
DELETE /v1/files/{fileId}/legal-hold
```

**Request:**
```json
{
  "releaseReason": "Investigation closed 2026-06-15"
}
```

---

### 16.3 Set Folder Legal Hold

```
POST /v1/folders/{folderId}/legal-hold
```

Cascades to all files in the folder.

---

### 16.4 Commit WORM

```
POST /v1/files/{fileId}/worm-commit
```

**Authorization:** API Key (scope: `compliance:manage`)

**Warning:** This action is irreversible.

**Request:**
```json
{
  "confirm": true,
  "reason": "Regulatory filing requirement"
}
```

**Response:** `200 OK`
```json
{
  "fileId": "file_abc123",
  "wormCommitted": true,
  "wormCommittedAt": "2026-06-15T12:00:00Z"
}
```

---

### 16.5 Get Compliance Status

```
GET /v1/compliance/status
```

**Response:** `200 OK`
```json
{
  "profile": "healthcare",
  "controls": {
    "hipaaControls": true,
    "phiDetection": true,
    "auditRetentionYears": 7,
    "legalHoldEnabled": true,
    "wormEnabled": false,
    "encryptionEnabled": true,
    "immutableAudit": true
  },
  "statistics": {
    "filesUnderLegalHold": 12,
    "wormCommittedFiles": 0,
    "auditEventsLast30Days": 4521
  }
}
```

---

## 17. Healthcare API

### 17.1 Get FHIR DocumentReference

```
GET /v1/fhir/DocumentReference/{fileId}
```

**Authorization:** API Key (scope: `files:read`)

**Response:** `200 OK` — FHIR R4 DocumentReference resource

```json
{
  "resourceType": "DocumentReference",
  "id": "fn-file_abc123",
  "status": "current",
  "docStatus": "final",
  "type": {
    "coding": [{
      "system": "http://loinc.org",
      "code": "18842-5",
      "display": "Discharge summary"
    }]
  },
  "subject": {
    "reference": "Patient/P-12345"
  },
  "date": "2026-06-15T10:30:00Z",
  "content": [{
    "attachment": {
      "contentType": "application/pdf",
      "size": 524288,
      "title": "discharge-summary.pdf",
      "url": "https://api.filenest.io/v1/files/file_abc123/download",
      "hash": "2cf24dba..."
    }
  }],
  "context": {
    "encounter": [{ "reference": "Encounter/E-67890" }]
  }
}
```

---

### 17.2 Search FHIR DocumentReferences

```
GET /v1/fhir/DocumentReference?subject=Patient/P-12345&status=current
```

---

### 17.3 Create FHIR Binary (Upload via FHIR)

```
POST /v1/fhir/Binary
Content-Type: application/pdf

<binary content>
```

---

### 17.4 XDS Provide and Register

```
POST /v1/xds/provide-and-register
```

**Request:** XDS ProvideAndRegisterDocumentSet-b transaction body

---

### 17.5 PHI Detection Results

```
GET /v1/files/{fileId}/phi-detection
```

**Response:** `200 OK`
```json
{
  "fileId": "file_abc123",
  "scanStatus": "completed",
  "phiDetected": true,
  "entities": [
    {
      "type": "PatientName",
      "score": 0.98,
      "redacted": false
    },
    {
      "type": "DateOfBirth",
      "score": 0.95,
      "redacted": false
    }
  ],
  "recommendation": "review_before_external_sharing",
  "scannedAt": "2026-06-15T10:30:15Z"
}
```

---

## 18. Error Reference

### 18.1 HTTP Status Codes

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 201 | Created |
| 202 | Accepted (async operation started) |
| 204 | No Content (successful delete) |
| 302 | Redirect (download URL redirect) |
| 400 | Bad Request (malformed request) |
| 401 | Unauthorized (missing or invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 409 | Conflict (WORM, legal hold, etc.) |
| 413 | Payload Too Large (file exceeds limit) |
| 422 | Unprocessable Entity (validation error) |
| 429 | Too Many Requests (rate limit) |
| 451 | Unavailable For Legal Reasons (quarantined file) |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

### 18.2 Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `unauthorized` | 401 | Invalid or missing API key |
| `token_expired` | 401 | API key has expired |
| `forbidden` | 403 | Insufficient scope |
| `organization_suspended` | 403 | Organization account suspended |
| `baa_required` | 403 | BAA must be signed for healthcare features |
| `file_not_found` | 404 | File not found or deleted |
| `folder_not_found` | 404 | Folder not found |
| `project_not_found` | 404 | Project not found |
| `worm_violation` | 409 | Operation blocked by WORM policy |
| `legal_hold_active` | 409 | Operation blocked by legal hold |
| `retention_active` | 409 | File within retention period |
| `file_quarantined` | 451 | File quarantined due to malware |
| `file_too_large` | 413 | File exceeds project size limit |
| `mime_type_not_allowed` | 422 | MIME type not permitted |
| `metadata_validation_failed` | 422 | Metadata fails schema validation |
| `storage_quota_exceeded` | 402 | Organization storage quota exceeded |
| `rate_limit_exceeded` | 429 | Too many requests |
| `upload_session_expired` | 410 | Upload session has expired |
| `checksum_mismatch` | 422 | Uploaded file checksum does not match declared |
| `processing_failed` | 500 | Processing pipeline failure |
