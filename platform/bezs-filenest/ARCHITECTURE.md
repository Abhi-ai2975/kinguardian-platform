# FileNest Architecture

FileNest is a **multi-tenant file infrastructure platform** — think Stripe for files. It sits between client applications and cloud storage providers, handling uploads, processing, search, compliance, and webhook delivery as a managed service.

---

## System Map

Three separate deployments communicate over HTTP and share no code:

```
┌─────────────────────────────────────────────────────────────┐
│  iam/  — FileNest IAM                                       │
│  BetterAuth · Prisma · PostgreSQL                           │
│  OAuth 2.1 / OIDC server · user & org management · API keys│
│  Runs at: http://localhost:3001 (dev)                       │
└────────────────────────┬────────────────────────────────────┘
                         │  OAuth 2.1 PKCE
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  frontend/web  — FileNest Console                           │
│  Next.js 16 · React 19 · Tailwind v4 · shadcn/ui           │
│  Projects · file explorer · API keys · webhooks · usage     │
│  Runs at: http://localhost:3000 (dev)                       │
└────────────────────────┬────────────────────────────────────┘
                         │  REST API  (Bearer token from IAM)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  backend/  — FileNest API                                   │
│  FastAPI · PostgreSQL · Redis · NATS JetStream · OpenSearch │
│  All file operations, processing pipeline, webhook delivery │
│  Runs at: http://localhost:8000 (dev)                       │
└─────────────────────────────────────────────────────────────┘
```

Each deployment has its own database. They share no ORM models or schema files.

---

## Tenant and Data Model

```
User  ──<  Organization  ──<  Project  ──<  File
              (IAM DB)        (FileNest DB)
```

| Entity | Database | Reason |
|--------|----------|--------|
| Users, sessions, API keys, OAuth clients | IAM (BetterAuth / Prisma) | Identity concern — lives in the auth layer |
| Organizations, members, teams, roles | IAM (BetterAuth / Prisma) | Tenant identity owned by BetterAuth organization plugin |
| Projects | FileNest PostgreSQL | Domain data — carries storage config, processing config, compliance settings |
| Files, folders, versions | FileNest PostgreSQL | Domain data |
| Webhooks, audit logs, events | FileNest PostgreSQL | Domain data |

The `organization_id` foreign key on every FileNest table links back to the IAM without requiring a cross-database join. All queries in the backend include both `organization_id` and `project_id` — nothing is addressable without both.

---

## IAM — Auth Layer

The IAM (`iam/`) is a standalone BetterAuth v1.5 server. It owns everything identity-related:

- **OAuth 2.1 / OIDC server** — the console app is a pure OAuth client; it redirects users here for login, signup, 2FA, and password reset.
- **API key management** — issues `fn_live_`, `fn_test_`, `fn_sa_` keys. The backend calls the IAM's `/api/internal/verify-api-key` endpoint on every request to validate them.
- **Organization management** — BetterAuth's organization plugin handles members, roles, invitations, and teams.
- **JWT verification** — the backend fetches JWKS from the IAM to verify access tokens issued during the OAuth flow.

### Console Auth Flow (OAuth 2.1 PKCE)

```
1. User hits /login
   → generate random state (CSRF) + code_verifier (PKCE)
   → store in localStorage → redirect to IAM /authorize

2. User authenticates on IAM (login / signup / 2FA all handled there)
   → IAM redirects back: APP_URL/callback?code=...&state=...

3. /callback page validates state → POST /api/auth/token

4. /api/auth/token (server route) exchanges code with IAM → receives JWT
   → sets httpOnly session cookie → returns { redirectUrl }

5. Browser navigates to redirectUrl (/dashboard or /onboarding)
```

The console never holds an API key in the browser. It uses the JWT from the cookie for server-component calls and issues short-lived upload tokens for browser-side file operations.

---

## Backend — Clean Architecture

```
backend/app/
├── main.py              # FastAPI factory + lifespan
├── core/                # config, database sessions, logging, NATS connection
├── auth/                # TenantContext, authenticate_request, require_scope
├── errors/              # exception hierarchy + global HTTP exception handlers
├── models/              # SQLAlchemy ORM models
├── schemas/             # Pydantic request/response DTOs
├── repositories/        # all DB queries (tenant-scoped, no business logic)
├── services/            # all business logic (coordinates repo + storage + events)
├── storage/             # StorageProvider protocol + S3/RustFS/MinIO/Azure/GCS/R2
├── processing/          # pipeline stage registry + individual stages
├── workers/             # NATS JetStream consumers
└── routers/             # HTTP handlers (validate → service call → return schema)
```

**Dependency direction is strict: routers → services → repositories → DB.** No layer skips another and no layer imports from a layer above it.

### Authentication

Every backend request is authenticated by `authenticate_request`, which inspects the `Authorization: Bearer` header and produces a `TenantContext`:

| Token prefix | Type | Verified by |
|---|---|---|
| `fn_live_` / `fn_test_` | API key | IAM `/api/internal/verify-api-key` |
| `fn_sa_` | Service account | IAM |
| `fn_upload_token_` | Short-lived browser token | Backend-issued, Redis-stored |
| JWT (no prefix) | OAuth access token | IAM JWKS |

Every route uses `Depends(require_scope("scope:name"))` — there are no unscoped endpoints.

### Storage Abstraction

The `StorageProvider` protocol (`backend/app/storage/provider.py`) defines the interface all storage backends implement:

```python
class StorageProvider(Protocol):
    async def generate_presigned_upload_url(...) -> str: ...
    async def generate_presigned_download_url(...) -> str: ...
    async def delete_object(key: str) -> None: ...
    async def copy_object(source_key: str, dest_key: str) -> None: ...
    async def create_multipart_upload(...) -> str: ...
    # ...
```

Service code always depends on this protocol — never on a concrete class. `StorageResolver.get_provider(project_id, environment)` returns the right backend based on the project's configuration: either the platform-managed bucket or the customer-supplied (BYOB) endpoint.

Storage keys follow the pattern: `{organization_id}/{project_id}/{file_id}` — fixed per file, never per version.

---

## Upload Flow

FileNest uses a **presigned URL pattern** — file bytes never pass through the backend.

### Single file (< 100 MB by default)

```
Client → POST /v1/projects/{id}/files/upload
       ← { file_id, upload_url, expires_at }

Client → PUT {upload_url}          ← bytes go directly to S3/RustFS
       ← 200 OK from storage provider

Client → POST /v1/projects/{id}/files/{file_id}/confirm
       ← { id, status: "processing" }
```

The `confirm` call triggers the processing pipeline asynchronously. The upload response is immediate — status transitions happen in the background.

### Multipart (≥ 100 MB)

```
Client → POST /files/upload/multipart/start     ← init multipart session
       ← { upload_id, file_id }

for each 5 MB chunk:
  Client → GET /multipart/{upload_id}/part-url  ← presigned part URL
  Client → PUT {part_url}                       ← chunk bytes to storage

Client → POST /multipart/{upload_id}/complete   ← assemble all parts
       ← { file_id, status }
```

The SDK handles chunking automatically. `fn.files.upload()` switches to multipart when the file exceeds the threshold.

---

## Processing Pipeline

After `confirm`, the backend writes a `file.uploaded` event to the outbox and returns immediately. Processing happens in a separate NATS consumer.

```
confirm_upload()
    │
    ├── write file.uploaded event to `events` table (same DB transaction)
    │
    └── return { status: "processing" }

OutboxWorker (background)
    │
    └── publish event to NATS subject: filenest.{org_id}.{project_id}.file.uploaded

ProcessingWorker (NATS push consumer)
    │
    ├── VirusScanStage      → ClamAV scans bytes; quarantines on detection
    ├── MimeValidationStage → libmagic confirms declared type matches actual bytes
    └── ClassificationStage → assigns category (image / document / video / archive / other)
    │
    └── update file status: "ready" or "failed" or "quarantined"
        publish file.ready / file.processing_failed / file.quarantined event
        WebhookWorker delivers signed event to registered endpoints
```

Pipeline failures do not block file availability — the file is accessible before processing completes (status = `processing`). Stages are independent: a classification failure doesn't prevent a ready status if scan and MIME validation passed.

---

## Event Architecture

All significant state changes emit events. The **transactional outbox pattern** ensures events are never lost: the event row is written in the same DB transaction as the business operation, before the commit. A separate `OutboxWorker` polls the table and publishes to NATS.

**Subject format:** `filenest.{organization_id}.{project_id}.{event_type}`

| Event | Fired when |
|---|---|
| `file.uploaded` | File saved to storage, processing starting |
| `file.ready` | All pipeline stages passed |
| `file.processing_failed` | MIME mismatch or pipeline error |
| `file.quarantined` | Virus detected |
| `file.deleted` | File soft-deleted |
| `file.restored` | Soft-deleted file restored |

**Webhook delivery** is handled by a second NATS consumer (`WebhookWorker`) that delivers HMAC-SHA256 signed HTTP POST requests to customer endpoints. Delivery is retried with exponential backoff. Signature format matches Stripe:

```
X-FileNest-Signature: t=<unix-timestamp>,v1=<hmac-sha256-hex>
```

---

## File Versioning

Versioning is an opt-in project-level feature (`project_configs.versioning_enabled`).

When enabled, every `confirm_upload` call creates an immutable row in `file_versions` and increments `files.version_count`. The version history is append-only: restore operations write a new version row rather than mutating existing ones.

All versions of a file share the same storage key (`org/project/file_id`). Per-version byte preservation via `copy_object` is planned for a future phase.

---

## Multi-Tenancy

Multi-tenancy is enforced by construction, not by convention:

- **Every repository query** includes `organization_id` and `project_id` in the WHERE clause. There are no queries that operate across tenants.
- **Every log line** includes `organization_id` and `project_id` as structured fields.
- **Every NATS event payload** includes `organization_id` and `project_id`.
- **Every storage key** is prefixed with `{organization_id}/{project_id}/`.

A caller cannot access another tenant's data even if they know a UUID, because the query always filters by the `organization_id` extracted from the verified token.

---

## SDK Architecture

Four TypeScript packages and one Python package share a common HTTP client interface:

```
sdks/
├── core/    @filenest/core   — shared HTTP client, response types, error classes
├── node/    @filenest/node   — FilesNamespace, UploadsNamespace, WebhooksNamespace, ...
├── react/   @filenest/react  — FileNestProvider (context + token management), hooks, components
├── nextjs/  @filenest/nextjs — server utilities: filenestServer(), verifyWebhookSignature()
└── python/  filenest         — FileNest (sync) + AsyncFileNest, identical namespace API
```

**Python and Node SDKs maintain namespace parity.** Every method on `fn.files`, `fn.folders`, `fn.uploads`, `fn.search`, `fn.webhooks`, and `fn.upload_tokens` exists in both SDKs with matching semantics.

The React SDK uses the **upload token pattern** — the browser never holds an API key. `<FileNestProvider tokenEndpoint="/api/filenest-token">` POSTs to a server-side endpoint that issues a short-lived `fn_upload_token_` credential scoped to the project.

---

## Local Stack

```
docker compose up -d
```

| Service | Port | Image |
|---|---|---|
| FileNest PostgreSQL | `5434` | `postgres:16-alpine` |
| IAM PostgreSQL | `5433` | `postgres:16-alpine` |
| Redis | `6379` | `redis:7-alpine` |
| RustFS (S3-compatible) | `9000` (API) / `9001` (console) | `rustfs/rustfs:latest` |
| NATS JetStream | `4222` (client) / `8222` (monitor) | `nats:2-alpine` |
| ClamAV | `3310` | `clamav/clamav:stable` |

RustFS is the default local storage provider — it is API-compatible with S3 so the same `aioboto3` client code works in production against real S3, Cloudflare R2, or Azure Blob Storage.

---

## Implementation Phases

| Phase | Description | Status |
|---|---|---|
| 1 — Foundation | Auth, single-file upload to S3, basic CRUD | Complete |
| 2 — Processing & Events | Virus scan, MIME validation, NATS, webhooks, multipart | Complete |
| 3 — Metadata & Search | Custom schemas, folders, tags, OCR, OpenSearch | Planned |
| 4 — Console App | Next.js OAuth client, file explorer, API key management | Complete |
| 5 — SDKs | `@filenest/node`, `@filenest/react`, `@filenest/nextjs`, Python | In progress |
| 6 — Production | Kubernetes, observability, rate limiting, usage metering | Planned |
| 7 — Advanced | All storage providers, previews, sharing, bulk ops, semantic search | Planned |
| 8 — Compliance | HIPAA, GDPR, WORM, legal hold, PHI detection, FHIR | Planned |
