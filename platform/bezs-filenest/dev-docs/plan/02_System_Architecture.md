# FileNest v1.0 — System Architecture

**Version:** 1.0.0
**Status:** Approved for Engineering
**Last Updated:** 2026-06-15

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Service Map](#2-service-map)
3. [Service Boundaries](#3-service-boundaries)
4. [Communication Patterns](#4-communication-patterns)
5. [Data Flow Diagrams](#5-data-flow-diagrams)
6. [Upload Architecture](#6-upload-architecture)
7. [Download Architecture](#7-download-architecture)
8. [Processing Architecture](#8-processing-architecture)
9. [Storage Architecture](#9-storage-architecture)
10. [Event Architecture](#10-event-architecture)
11. [Search Architecture](#11-search-architecture)
12. [Deployment Architecture](#12-deployment-architecture)
13. [Network Architecture](#13-network-architecture)
14. [Caching Architecture](#14-caching-architecture)
15. [Scalability Architecture](#15-scalability-architecture)
16. [Disaster Recovery Architecture](#16-disaster-recovery-architecture)

---

## 1. Architecture Overview

### 1.1 System Context

FileNest sits between client applications and cloud storage providers:

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT APPLICATIONS                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │  Web App     │  │  Mobile App  │  │  Backend Svc │             │
│  │  (React SDK) │  │  (REST API)  │  │  (Node SDK)  │             │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘             │
└─────────┼─────────────────┼─────────────────┼───────────────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         FILENEST PLATFORM                           │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │           FileNest IAM  (BetterAuth / Next.js)              │   │
│  │   Users · Orgs · API keys (fn_live_ / fn_test_) · OAuth     │   │
│  └────────────────────────┬────────────────────────────────────┘   │
│                           │  Bearer token / PKCE                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │           FileNest Backend  (single FastAPI process)         │   │
│  │                                                              │   │
│  │  routers/ → services/ → repositories/ → models/             │   │
│  │                       → storage/                            │   │
│  │                       → core/messaging (outbox)             │   │
│  │                                                              │   │
│  │  Modules: files · projects · metadata · search · processing │   │
│  │           audit · webhooks · compliance · healthcare         │   │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │        Processing Worker  (same codebase, NATS consumer)     │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────────────────────┐
│  PostgreSQL  │  │   Redis      │  │   Object Storage             │
│  (Primary    │  │   (Cache)    │  │   S3 / Azure / GCS / MinIO   │
│   DB)        │  │              │  │                              │
└──────────────┘  └──────────────┘  └──────────────────────────────┘
          │                                   │
          ▼                                   ▼
┌──────────────┐                   ┌──────────────────────────────┐
│  OpenSearch  │                   │   NATS / RabbitMQ            │
│  (Search)    │                   │   (Message Broker)           │
└──────────────┘                   └──────────────────────────────┘
```

### 1.2 Architecture Principles

1. **Modular Monolith (current)** — All domain logic runs in a single FastAPI process (`backend/`). Each domain (files, projects, processing, compliance, etc.) is a self-contained module with its own service, repository, schemas, and router. No cross-module DB joins; cross-module work goes through the NATS outbox. This makes the system simple to run and deploy now, and straightforward to split into separate microservices later if scale demands it.
2. **Designed for future extraction** — When a module needs to become its own service, the work is: create a new FastAPI app, copy the module's files, point it at the same DB schema. No business logic refactoring needed because the boundaries are already clean.
3. **Stateless** — No in-memory state. State lives in PostgreSQL, Redis, or object storage.
4. **Async by Default** — File processing is always asynchronous. The upload API returns immediately after persisting the file record.
5. **Event-Driven** — Every significant state change emits an event via NATS. Modules subscribe to relevant events.
6. **Fail-Safe** — Processing pipeline failures do not block file availability. Files are accessible after upload, before processing completes.
7. **Configuration-Driven** — No module contains hardcoded industry-specific logic. Behaviour comes from project configuration.
8. **Multi-Tenant by Construction** — `organization_id` + `project_id` in every query, every log line, every NATS event payload.

---

## 2. Service Map

### 2.1 Core Services

| Component | Type | Protocol | Port | Replicas (prod) |
|-----------|------|----------|------|-----------------|
| FileNest IAM | Stateless | HTTP | 3000 | 3–10 |
| FileNest Backend (API) | Stateless | HTTP | 8000 | 5–50 |
| Processing Worker | Worker | NATS Subscriber | — | 5–50 |
| Webhook Worker | Worker | NATS Subscriber | — | 3–10 |

The backend and workers share the same codebase (`backend/`). Workers are launched with a different entrypoint that starts NATS consumers instead of the HTTP server.

### 2.2 Data Services

| Service | Technology | Version | Replication |
|---------|-----------|---------|-------------|
| Primary Database | PostgreSQL | 16 | Streaming replication (1 primary, 2 replicas) |
| Cache | Redis | 7.x | Redis Cluster (3 masters, 3 replicas) |
| Search | OpenSearch | 2.x | 3 master-eligible nodes, 3+ data nodes |
| Message Broker | NATS JetStream | 2.x | 3-node cluster |
| Object Storage | S3/Azure/GCS/MinIO | — | Provider-managed |

---

## 3. Module Responsibilities

All domain logic lives in `backend/app/services/` as Python modules within a single FastAPI process. Modules communicate through direct function calls — never HTTP.

### 3.1 IAM (External — `iam/`)

**Owns:**
- Organizations, users, roles, sessions
- API key creation, rotation, revocation (BetterAuth `apiKey` plugin, prefix `fn_`)
- OAuth 2.1 / OIDC server (console app authenticates here via PKCE)

**Backend interaction:** The backend calls `POST /api/internal/verify-api-key` to validate incoming API keys. JWT tokens are verified locally via JWKS.

---

### 3.2 Project Module (`services/project.py`)

**Owns:**
- Project CRUD and configuration
- Compliance profile assignment and capability pack activation
- Metadata schema definitions
- Storage configuration per project

**Rule:** All other modules read project config via `project_repo.get_config(project_id)` before processing any request. Project config is cached in Redis with a 5-minute TTL.

---

### 3.3 File Module (`services/file.py`)

**Owns:**
- Upload session lifecycle
- File record CRUD, version history, folder structure
- Soft delete and restore
- Download URL generation (delegates to `storage/`)
- Emits `file.uploaded` event via transactional outbox

---

### 3.4 Storage Module (`storage/`)

**Owns:**
- `StorageProvider` Protocol and S3 implementation
- `StorageResolver` — resolves provider from project config
- Signed URL and multipart upload management

**Rule:** Never imported by `routers/` directly — always accessed through `services/file.py`.

---

### 3.5 Processing Module (`services/processing.py`)

**Owns:**
- `ProcessingWorker` — NATS consumer subscribing to `file.uploaded`
- `PipelineExecutor` — stage registry and orchestration
- Stage implementations in `services/stages/`

**Rule:** Processing is always triggered by NATS events, never by direct function calls from routers.

---

## 4. Communication Patterns

### 4.1 In-Process Calls (Synchronous)

Within the backend, all module-to-module communication is direct Python function calls. There are no inter-service HTTP calls. The only external HTTP call the backend makes is to the IAM to verify API keys.

```
Client → FileNest Backend (FastAPI)
            routers/ → services/file.py
                              → repositories/file.py  (DB)
                              → storage/resolver.py   (S3)
                              → services/project.py   (config)
                              → core/messaging.py     (outbox)
```

The IAM is the sole external synchronous dependency:
```
services/ → IAM POST /api/internal/verify-api-key  (API key validation only)
```

### 4.2 Asynchronous Communication (NATS JetStream)

Used for:
- Processing pipeline triggering
- Event delivery to webhook consumers
- Search index updates
- Audit log writes
- Inter-service notifications

```
File module (via outbox)
  → Publishes: file.uploaded
     ↓
Processing Worker (NATS subscriber)
  → Runs: virus_scan, ocr, phi_detection
  → Publishes: file.processed
     ↓
Search indexer (NATS subscriber, same worker binary)
  → Indexes file content
  → Publishes: file.indexed
     ↓
Webhook worker (NATS subscriber)
  → Delivers webhooks to customer endpoints
```

NATS Topic naming convention:
```
filenest.{organization_id}.{project_id}.{event_type}
filenest.*.*.file.uploaded        # Admin wildcard subscription
filenest.org_abc.proj_xyz.file.uploaded  # Project-specific subscription
```

### 4.3 Publish-Subscribe Patterns

| Publisher | Topic | Subscribers |
|-----------|-------|-------------|
| File module | file.uploaded | Processing worker, Audit, Webhook worker |
| File module | file.deleted | Search indexer, Audit, Webhook worker |
| File module | file.downloaded | Audit, Webhook worker |
| Processing worker | file.processed | Search indexer, File module (status update), Webhook worker |
| Processing worker | file.virus_detected | File module (quarantine), Audit, Webhook worker |
| Search indexer | file.indexed | Webhook worker |
| IAM | apikey.rotated | Backend (Redis cache invalidation) |
| Project module | project.config_changed | Backend (Redis config cache invalidation) |

---

## 5. Data Flow Diagrams

### 5.1 Upload Flow — Complete Sequence

```
Client                 API GW          File Svc         Storage Svc      NATS
  │                      │                │                 │               │
  │ POST /v1/files/upload│                │                 │               │
  ├─────────────────────►│                │                 │               │
  │                      │ ValidateAPIKey │                 │               │
  │                      ├──────────────► │                 │               │
  │                      │ GetProjectConf │                 │               │
  │                      ├──────────────► │                 │               │
  │                      │ ValidateMetadata                 │               │
  │                      ├──────────────► │                 │               │
  │                      │                │ CreateFileRecord│               │
  │                      │                ├────────────────►│               │
  │                      │                │ GetUploadURL    │               │
  │                      │                ├────────────────►│               │
  │                      │                │◄────────────────┤               │
  │                      │                │ presignedPutURL │               │
  │◄─────────────────────┤                │                 │               │
  │ {fileId, uploadUrl}  │                │                 │               │
  │                      │                │                 │               │
  │ PUT bytes → Storage Provider (direct) │                 │               │
  ├───────────────────────────────────────────────────────►│               │
  │                                                         │               │
  │ POST /v1/files/{id}/complete          │                 │               │
  ├─────────────────────►│                │                 │               │
  │                      ├──────────────► │                 │               │
  │                      │                │ VerifyChecksum  │               │
  │                      │                ├────────────────►│               │
  │                      │                │ UpdateStatus=ready              │
  │                      │                │                 │               │
  │                      │                │ Publish: file.uploaded          │
  │                      │                ├────────────────────────────────►│
  │◄─────────────────────┤                │                 │               │
  │ {fileId, status}     │                │                 │               │
```

### 5.2 Download Flow — Complete Sequence

```
Client               API GW         File Svc        Storage Svc     Audit Svc
  │                    │               │                 │               │
  │ GET /v1/files/{id}/download        │                 │               │
  ├───────────────────►│               │                 │               │
  │                    │ ValidateAPIKey│                 │               │
  │                    ├─────────────► │                 │               │
  │                    │ CheckPermission                 │               │
  │                    ├─────────────► │                 │               │
  │                    │ CheckLegalHold│                 │               │
  │                    ├─────────────► │                 │               │
  │                    │ GetFileRecord │                 │               │
  │                    ├─────────────► │                 │               │
  │                    │               │ GenerateSignedURL               │
  │                    │               ├────────────────►│               │
  │                    │               │◄────────────────┤               │
  │                    │               │ signedUrl       │               │
  │                    │               │                 │               │
  │                    │               │ Publish: file.downloaded        │
  │                    │               ├─────────────────────────────────►
  │◄───────────────────┤               │                 │               │
  │ 302 → signedUrl    │               │                 │               │
  │                    │               │                 │               │
  │ GET signedUrl (direct to storage)  │                 │               │
  ├──────────────────────────────────────────────────────►               │
  │◄──────────────────────────────────────────────────────               │
  │ file bytes         │               │                 │               │
```

### 5.3 Processing Flow — Pipeline Sequence

```
NATS           Processing Svc    Virus Scanner    OCR Engine    PHI Detector   Search Svc
  │                  │                │               │               │              │
  │ file.uploaded    │                │               │               │              │
  ├─────────────────►│                │               │               │              │
  │                  │ CreateJob      │               │               │              │
  │                  ├──────────────► │               │               │              │
  │                  │                │ ScanFile      │               │              │
  │                  │                ├──────────────►│               │              │
  │                  │                │ virusResult   │               │              │
  │                  │                │◄──────────────┤               │              │
  │                  │                │               │               │              │
  │                  │ [if healthcare] │               │               │              │
  │                  ├─────────────────────────────────────────────► │              │
  │                  │                │               │  DetectPHI    │              │
  │                  │                │               │◄──────────────┤              │
  │                  │                │               │               │              │
  │                  │ [if ocr enabled]│               │               │              │
  │                  ├──────────────────────────────►│               │              │
  │                  │                │ ExtractText   │               │              │
  │                  │                │◄──────────────┤               │              │
  │                  │                │               │               │              │
  │                  │ UpdateFileRecord (processing results)          │              │
  │                  │                │               │               │              │
  │                  │ Publish: file.processed        │               │              │
  ├◄─────────────────┤                │               │               │              │
  │                  │                │               │               │              │
  │ file.processed ──────────────────────────────────────────────────────────────► │
  │                  │                │               │               │  IndexFile   │
  │                  │                │               │               │◄─────────────┤
```

---

## 6. Upload Architecture

### 6.1 Upload Types

| Type | Max Size | Use Case |
|------|----------|----------|
| Single Upload | 100 MB | Small files, simple integrations |
| Multipart Upload | 5 GB | Large files, parallel chunk upload |
| Resumable Upload | 5 GB | Unreliable networks, long uploads |
| Direct Browser Upload | 5 GB | Frontend SDK — direct to storage |
| Server-Side Upload | 5 GB | Backend-to-backend via SDK |

### 6.2 Multipart Upload Architecture

```
Client           File Svc         Storage Svc          DB
  │                 │                 │                  │
  │ CreateSession   │                 │                  │
  ├───────────────► │                 │                  │
  │                 │ InitMultipart   │                  │
  │                 ├───────────────► │                  │
  │                 │ uploadId        │                  │
  │                 │◄────────────────┤                  │
  │                 │ CreateUploadSession                │
  │                 ├──────────────────────────────────►│
  │ {sessionId, uploadId}             │                  │
  │◄────────────────┤                 │                  │
  │                 │                 │                  │
  │ [Repeat per chunk]                │                  │
  │ GetChunkURL(part N)               │                  │
  ├───────────────► │                 │                  │
  │                 │ PresignChunkPut │                  │
  │                 ├───────────────► │                  │
  │ {chunkUrl}      │◄────────────────┤                  │
  │◄────────────────┤                 │                  │
  │ PUT chunk → chunkUrl (direct)     │                  │
  ├──────────────────────────────────►│                  │
  │ {ETag}          │                 │                  │
  │◄────────────────────────────────-─┤                  │
  │                 │                 │                  │
  │ CompleteUpload({parts: [{n, etag}]})                │
  ├───────────────► │                 │                  │
  │                 │ CompleteMultipart                  │
  │                 ├───────────────► │                  │
  │                 │ VerifyChecksum  │                  │
  │                 ├──────────────────────────────────►│
  │                 │ PublishUploadedEvent               │
  │◄────────────────┤                 │                  │
  │ {fileId, status: processing}      │                  │
```

### 6.3 Resumable Upload Logic

Upload sessions are stored in Redis with TTL of 24 hours:

```
Key: upload_session:{session_id}
Value: {
  "sessionId": "sess_abc",
  "fileId": "file_xyz",
  "projectId": "proj_abc",
  "totalSize": 524288000,
  "chunkSize": 5242880,
  "totalChunks": 100,
  "uploadedChunks": [1,2,3,...,47],
  "startedAt": "2026-06-15T10:00:00Z",
  "expiresAt": "2026-06-16T10:00:00Z"
}
```

On resume:
1. Client calls `GET /v1/uploads/{sessionId}/status`
2. FileNest returns list of already-uploaded chunks
3. Client re-uploads only missing chunks
4. Complete when all chunks uploaded

---

## 7. Download Architecture

### 7.1 Download Flow

FileNest **never** exposes raw storage URLs. All downloads go through an authorization + signed URL redirect pattern.

```
GET /v1/files/{fileId}/download?ttl=3600
  ↓
1. Validate API key → get organization_id, project_id
2. Verify file belongs to project
3. Check user/service account has download permission
4. Check file is not under legal hold restriction
5. Check file is in "ready" or "available" state
6. Check IP allowlist (if configured on project)
7. Generate signed URL from Storage Service
8. Log audit event: file.downloaded
9. Return 302 redirect to signed URL
```

### 7.2 Signed URL Properties

```json
{
  "url": "https://s3.amazonaws.com/bucket/key?X-Amz-Signature=...",
  "expiresAt": "2026-06-15T11:00:00Z",
  "ttlSeconds": 3600,
  "singleUse": false,
  "ipRestricted": false,
  "downloadCount": 0,
  "maxDownloads": null
}
```

### 7.3 Direct Streaming (Enterprise)

For files where 302 redirect is problematic, FileNest supports streaming proxy:

```
GET /v1/files/{fileId}/stream
  → FileNest fetches from storage and streams bytes to client
  → Adds X-FileNest-FileId and X-FileNest-Checksum headers
  → Enables download count enforcement
  → Slower than signed URL redirect (extra hop)
  → Use only when client cannot follow redirects
```

---

## 8. Processing Architecture

### 8.1 Pipeline Orchestration

Processing pipelines are project-configured and executed asynchronously by the Processing Service.

```
Project Configuration:
  processing:
    stages: [virus_scan, phi_detection, ocr, classification, indexing]
    parallelStages: [virus_scan, phi_detection]  # Run in parallel
    sequentialStages: [ocr, classification, indexing]  # Run in order
```

### 8.2 Worker Architecture

```
NATS JetStream (file.uploaded)
  ↓
Processing Consumer Group
  ↓
Worker Pool (Celery/Dramatiq workers)
  ├── Virus Scan Worker
  ├── OCR Worker
  ├── PII/PHI Detection Worker
  ├── Classification Worker
  ├── Embedding Worker
  └── Indexing Worker
```

Workers are stateless and pull from a work queue. Dead letter queue captures permanently failed jobs.

### 8.3 Pipeline Stage Isolation

Each stage is isolated:
- Failure of one stage does not block other stages
- Stage results are stored independently
- File is available to download even if all processing stages fail
- Processing can be re-triggered manually

---

## 9. Storage Architecture

### 9.1 Storage Provider Abstraction

```python
class StorageProvider(Protocol):
    async def upload(self, key: str, data: BinaryIO, content_type: str) -> str: ...
    async def download(self, key: str) -> BinaryIO: ...
    async def delete(self, key: str) -> None: ...
    async def exists(self, key: str) -> bool: ...
    async def copy(self, source_key: str, dest_key: str) -> str: ...
    async def move(self, source_key: str, dest_key: str) -> str: ...
    async def generate_signed_url(
        self, key: str, ttl_seconds: int, method: str = "GET"
    ) -> str: ...
    async def generate_multipart_upload_id(self, key: str) -> str: ...
    async def generate_part_url(self, key: str, upload_id: str, part_number: int) -> str: ...
    async def complete_multipart(self, key: str, upload_id: str, parts: List[Part]) -> str: ...
    async def abort_multipart(self, key: str, upload_id: str) -> None: ...
```

### 9.2 Storage Key Construction

```python
def build_storage_key(
    organization_id: str,
    project_id: str,
    environment: str,
    file_id: str,
    version_id: str,
    filename: str,
) -> str:
    date_prefix = datetime.utcnow().strftime("%Y/%m")
    safe_filename = sanitize_filename(filename)
    return (
        f"{organization_id}/{project_id}/{environment}/"
        f"{date_prefix}/{file_id}/{version_id}/{safe_filename}"
    )
```

### 9.3 BYOB Architecture

```
Customer Setup:
  1. Customer creates S3 bucket in their AWS account
  2. Customer creates IAM role with trust policy allowing FileNest's AWS account
  3. Customer provides FileNest with role ARN
  4. FileNest assumes role via STS AssumeRole
  5. FileNest stores encrypted {roleArn, externalId} in project config

Runtime:
  1. File Service → Storage Service.getProviderForProject(project_id)
  2. Storage Service → reads project config → detects byob=true
  3. Storage Service → assumes customer role via STS
  4. Storage Service → creates S3 client with assumed credentials
  5. Storage Service → performs operation against customer bucket
  6. Credentials are cached in Redis for 15 minutes (STS session duration up to 1 hour)
```

---

## 10. Event Architecture

### 10.1 NATS JetStream Configuration

```
Stream: FILENEST_EVENTS
Subjects: filenest.>
Retention: WorkQueuePolicy (deleted on ack)
Storage: File (persisted to disk)
Replicas: 3
MaxAge: 7 days
MaxBytes: 50GB
```

### 10.2 Consumer Groups

| Consumer | Subject Filter | Durable | Deliver | Processing |
|----------|---------------|---------|---------|------------|
| processing-consumer | filenest.*.*.file.uploaded | processing-workers | New | Processing Service |
| search-consumer | filenest.*.*.file.processed | search-workers | New | Search Service |
| webhook-consumer | filenest.> | webhook-workers | New | Webhook Service |
| audit-consumer | filenest.> | audit-workers | New | Audit Service |

### 10.3 Event Schemas

```json
// file.uploaded
{
  "eventId": "evt_abc123",
  "eventType": "file.uploaded",
  "version": "1.0",
  "timestamp": "2026-06-15T10:30:00.000Z",
  "organizationId": "org_abc",
  "projectId": "proj_xyz",
  "environmentId": "env_prod",
  "payload": {
    "fileId": "file_abc",
    "filename": "discharge-summary.pdf",
    "mimeType": "application/pdf",
    "size": 524288,
    "storageKey": "org_abc/proj_xyz/prod/2026/06/file_abc/v1/discharge-summary.pdf",
    "storageProvider": "s3",
    "metadata": { "patientId": "P-12345", "documentType": "Discharge" },
    "uploadedBy": "sa_backend_worker",
    "uploadedAt": "2026-06-15T10:30:00.000Z"
  }
}
```

---

## 11. Search Architecture

### 11.1 OpenSearch Index Design

One index per project:
```
Index: filenest-{project_id}
Settings:
  shards: 3
  replicas: 1
  refresh_interval: 5s
```

### 11.2 Index Mapping

```json
{
  "mappings": {
    "properties": {
      "fileId": { "type": "keyword" },
      "projectId": { "type": "keyword" },
      "organizationId": { "type": "keyword" },
      "filename": {
        "type": "text",
        "analyzer": "standard",
        "fields": { "keyword": { "type": "keyword" } }
      },
      "mimeType": { "type": "keyword" },
      "size": { "type": "long" },
      "tags": { "type": "keyword" },
      "metadata": { "type": "object", "dynamic": true },
      "ocrContent": {
        "type": "text",
        "analyzer": "standard",
        "index_options": "positions"
      },
      "createdAt": { "type": "date" },
      "updatedAt": { "type": "date" },
      "status": { "type": "keyword" },
      "folderId": { "type": "keyword" },
      "processingResults": {
        "type": "object",
        "properties": {
          "phiDetected": { "type": "boolean" },
          "piiDetected": { "type": "boolean" },
          "classification": { "type": "keyword" }
        }
      }
    }
  }
}
```

---

## 12. Deployment Architecture

### 12.1 Kubernetes Cluster Topology

```
Production Cluster (per region)
├── Node Pool: API (c5.xlarge × 5–20 nodes, autoscaling)
│   ├── filenest-iam (2–5 pods)          # Next.js BetterAuth IAM
│   └── filenest-backend (5–50 pods)     # FastAPI — handles all HTTP
│
├── Node Pool: Workers (c5.2xlarge × 5–50 nodes, autoscaling)
│   ├── processing-workers (3–50 pods)   # Same backend image, worker entrypoint
│   └── webhook-workers (2–10 pods)      # Same backend image, worker entrypoint
│
├── Node Pool: Data (r5.2xlarge × 3 nodes, fixed)
│   ├── PostgreSQL (via RDS or CloudNativePG)
│   ├── Redis Cluster (via ElastiCache or Redis Operator)
│   └── NATS Cluster (3 pods)
│
└── Node Pool: Search (r5.2xlarge × 3–6 nodes, autoscaling)
    └── OpenSearch Cluster (3–6 pods)
```

Workers share the same Docker image as the API; they're launched with a different command:
- API: `uvicorn app.main:app`
- Processing worker: `python -m app.workers.processing`
- Webhook worker: `python -m app.workers.webhook`

### 12.2 Helm Chart Structure

```
helm/filenest/
├── Chart.yaml
├── values.yaml
├── values.production.yaml
├── values.staging.yaml
├── templates/
│   ├── _helpers.tpl
│   ├── iam/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   └── hpa.yaml
│   ├── backend/
│   │   ├── deployment.yaml       # API deployment
│   │   ├── service.yaml
│   │   ├── hpa.yaml
│   │   ├── processing-worker.yaml  # Worker deployment (same image)
│   │   └── webhook-worker.yaml
│   ├── ingress.yaml
│   ├── namespace.yaml
│   └── rbac.yaml
```

### 12.3 Ingress Architecture

```
Internet
  ↓
AWS ALB / Azure Application Gateway / GCP GLB
  ↓
Nginx Ingress Controller (Kubernetes)
  ↓
Rules:
  api.filenest.io → api-gateway service (port 8000)
  app.filenest.io → dashboard-frontend service (port 3000)
  *.webhook.filenest.io → webhook-service (port 8007)

TLS:
  cert-manager with Let's Encrypt or customer-provided certificates
  Wildcard cert for *.filenest.io
```

---

## 13. Network Architecture

### 13.1 Network Segmentation

```
VPC
├── Public Subnet (AZ-a, AZ-b, AZ-c)
│   └── Load Balancers only
│
├── Private Subnet — Application Tier (AZ-a, AZ-b, AZ-c)
│   └── Kubernetes worker nodes
│       └── All application pods
│
├── Private Subnet — Data Tier (AZ-a, AZ-b, AZ-c)
│   ├── PostgreSQL
│   ├── Redis
│   └── NATS
│
└── Private Subnet — Search Tier (AZ-a, AZ-b, AZ-c)
    └── OpenSearch Cluster
```

### 13.2 Service-to-Service Communication

```yaml
NetworkPolicy:
  filenest-backend:
    ingress:
      - from: ingress-controller
    egress:
      - to: filenest-iam (port 3000)    # API key verification
      - to: postgres (port 5432)
      - to: redis (port 6379)
      - to: nats (port 4222)
      - to: opensearch (port 9200)
      - to: s3-compatible (port 9000)
  processing-worker:
    ingress: []                          # Workers have no inbound HTTP
    egress:
      - to: nats (port 4222)
      - to: postgres (port 5432)
      - to: redis (port 6379)
      - to: s3-compatible (port 9000)
      - to: clamav (port 3310)
```

### 13.3 External Connectivity

| Direction | Traffic | Security |
|-----------|---------|----------|
| Inbound | Client API calls | TLS 1.3, WAF, DDoS protection |
| Inbound | Webhook callbacks (none — FileNest sends webhooks) | N/A |
| Outbound | Storage provider APIs | VPC endpoint where possible |
| Outbound | Customer webhook endpoints | Egress via NAT gateway |
| Outbound | OCR/PHI detection APIs (if external) | mTLS |

---

## 14. Caching Architecture

### 14.1 Cache Strategy

| Data | Cache Key | TTL | Invalidation |
|------|-----------|-----|--------------|
| Project config | `project_config:{project_id}` | 5 min | On config change event |
| API key validation | `apikey:{key_hash}` | 10 min | On rotation event |
| File metadata | `file_meta:{file_id}` | 1 min | On file update |
| Signed URLs | Not cached (generated per request) | — | — |
| Processing job status | `job_status:{job_id}` | 30 sec | On job update |
| Search results | `search:{hash}` | 30 sec | Not invalidated (eventual) |
| Storage credentials (BYOB) | `byob_creds:{project_id}` | 15 min | On rotation |

### 14.2 Redis Cluster Configuration

```
Redis Cluster: 3 masters, 3 replicas
Master 1: slots 0–5460    (organization data, project config)
Master 2: slots 5461–10922 (file metadata, API keys)
Master 3: slots 10923–16383 (processing, search cache)

Maxmemory: 8GB per master
Eviction: allkeys-lru
Persistence: AOF with fsync every second
```

### 14.3 Cache-Aside Pattern

```python
async def get_project_config(project_id: str) -> ProjectConfig:
    cache_key = f"project_config:{project_id}"

    cached = await redis.get(cache_key)
    if cached:
        return ProjectConfig.model_validate_json(cached)

    config = await db.query(ProjectConfig).filter_by(project_id=project_id).first()
    if not config:
        raise ProjectNotFoundError(project_id)

    await redis.setex(cache_key, 300, config.model_dump_json())
    return config
```

---

## 15. Scalability Architecture

### 15.1 Horizontal Scaling

| Service | Scaling Trigger | Min | Max |
|---------|----------------|-----|-----|
| API Gateway | CPU > 60% or RPS > 1000/pod | 2 | 20 |
| File Service | CPU > 60% or RPS > 500/pod | 3 | 50 |
| Processing Workers | Queue depth > 100 jobs/worker | 5 | 100 |
| Search Service | CPU > 70% | 2 | 10 |
| Storage Service | RPS > 500/pod | 2 | 20 |

### 15.2 Database Scaling

| Strategy | Implementation |
|----------|---------------|
| Connection pooling | PgBouncer (transaction pooling mode) |
| Read replicas | Route read queries to replicas via SQLAlchemy |
| Table partitioning | `audit_logs` and `files` partitioned by `created_at` monthly |
| Vertical scaling | Start on r5.2xlarge, scale to r5.8xlarge before sharding |
| Future sharding | Shard by `organization_id` when single instance saturates |

### 15.3 Processing Scaling

```
Job Queue Depth Metric → Prometheus → KEDA (Kubernetes Event-Driven Autoscaler)
  → Scale processing workers based on NATS consumer lag
  → Minimum: 5 workers
  → Maximum: 100 workers
  → Scale-up threshold: 50 pending jobs per worker
  → Scale-down: 3 minute stabilization window
```

---

## 16. Disaster Recovery Architecture

### 16.1 Backup Strategy

| Component | Backup Frequency | Retention | Method |
|-----------|-----------------|-----------|--------|
| PostgreSQL | Continuous WAL + daily snapshot | 30 days | pg_basebackup + WAL-G |
| Redis | Every 15 minutes RDB snapshot | 7 days | Redis persistence + S3 export |
| OpenSearch | Daily snapshots | 14 days | OpenSearch snapshot API to S3 |
| NATS | JetStream built-in replication | N/A | 3-node cluster |
| Object Storage | Provider-managed | Per project retention policy | Cross-region replication |

### 16.2 Multi-Region Architecture

```
Primary Region (US-East-1)
├── Active — all traffic
├── PostgreSQL primary
├── Redis cluster primary
└── OpenSearch primary

Secondary Region (US-West-2)
├── Standby — zero traffic
├── PostgreSQL replica (streaming replication, ~100ms lag)
├── Redis replica (async replication)
└── OpenSearch replica cluster
```

**Failover procedure:**
1. Primary region health check fails (Route53 health check)
2. Route53 DNS failover activates secondary region endpoint
3. Secondary PostgreSQL promoted to primary (pg_promote)
4. Redis secondary promoted (REPLICAOF NO ONE)
5. OpenSearch traffic shifted to secondary cluster
6. RTO target: 15 minutes, RPO target: 5 minutes

### 16.3 Recovery Testing

- Monthly automated failover test in staging environment
- Quarterly game day DR drill in production (with traffic shift to secondary)
- Annual full DR test
- All recovery procedures documented in runbooks
