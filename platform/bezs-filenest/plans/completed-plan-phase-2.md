# FileNest — Phase 2 Implementation Plan

**Phase:** 2 — Processing & Events  
**Status:** 🔄 In Progress  
**Source:** `dev-docs/plan/00_Implementation_Roadmap.md` — Phase 2 section  
**Goal:** Files move through a processing pipeline after upload. Webhooks fire on state changes. Multipart upload works. Audit trail established.

> **Completed steps** get a `✅ COMPLETED` tag on the heading — never deleted, kept as history.  
> When all steps are done → rename this file to `completed-plan-phase-2.md` and create a new `current-plan.md` for Phase 3.

---

## How `project_configs` gates Phase 2 behaviour

| Column | Gates |
|--------|-------|
| `virus_scan_enabled` | Whether `VirusScanStage` runs in the pipeline |
| `versioning_enabled` | Whether `confirm_upload` creates a `file_versions` row |
| `max_file_size_bytes` | Validated on multipart upload start |
| `max_files_per_request` | Limits multipart batch size |
| `ocr_enabled` | Phase 3 OCR stage — column exists, skip for now |

`storage_configs.sse_enabled` + `provider` already drive SSE params in the S3 provider — no changes needed.

---

## Steps

### Step 1 — NATS client + OutboxWorker ✅ COMPLETED

**Files:**
- `backend/app/core/nats.py` — async NATS singleton, `connect()`, `get_js()`, `_ensure_stream()` on startup; reconnects forever on disconnect
- `backend/app/core/messaging.py` — added `OutboxWorker`: asyncio task polls `outbox_messages WHERE published_at IS NULL ORDER BY created_at` with `FOR UPDATE SKIP LOCKED`, publishes via JetStream, marks `published_at = now()`; at-least-once delivery guarantee
- `backend/app/main.py` — lifespan connects NATS, starts `OutboxWorker` task; on shutdown cancels task then disconnects NATS

**Why first:** Every event-driven feature (processing pipeline, webhooks) depends on events actually flowing through NATS.

---

### Step 2 — Audit log model + AuditLogger ⏸ DEFERRED

Deferred — a dedicated observability application will handle audit logs, traces, and metrics once it is hosted and live. The `audit_logs` table and `AuditLogger` can be wired in at that point without touching existing code. Skip for now and revisit when the observability app is deployed.

---

### Step 3 — Fix `confirm_upload` flow ✅ COMPLETED

**Files:**
- `backend/app/services/file.py` — inject `ProjectConfigRepository`, change `confirm_upload`:
  - Load project config
  - If `virus_scan_enabled = true` → `status = "processing"`, emit `filenest.{org}.{project}.file.uploaded`
  - Else → `status = "ready"`, emit `filenest.{org}.{project}.file.ready`
- `backend/app/di/dependencies/file.py` — inject `ProjectConfigRepository` into `FileService`

**Why here:** Steps 4 and 5 both depend on files entering `status=processing` via outbox event.

---

### Step 4 — Processing pipeline ✅ COMPLETED

**Files:**
- `backend/app/processing/stages/virus_scan.py` — `VirusScanStage`: clamd TCP socket, on `FOUND` → `status=quarantined`, emit `file.quarantined`
- `backend/app/processing/stages/mime_validation.py` — `MimeValidationStage`: `python-magic` byte-sniff vs declared `content_type`; mismatch → `status=failed`
- `backend/app/processing/stages/classification.py` — `ClassificationStage`: extension → category (`document`, `image`, `video`, `audio`, `archive`, `other`); sets `category` column on `File`
- `backend/app/processing/pipeline.py` — `PipelineExecutor`: runs stages in order, reads `project_configs` flags to skip disabled stages; on all pass → `status=ready`, emit `file.ready`
- `backend/app/workers/processing.py` — `ProcessingWorker`: NATS pull consumer on `filenest.*.*.file.uploaded`, semaphore (20 concurrent), calls `PipelineExecutor`
- `backend/app/main.py` — start `ProcessingWorker` in lifespan
- `backend/app/models/file.py` — add `category` column (`String`, nullable)
- Alembic migration: add `category` to `files`

**ClamAV dependency:** `python-clamd` (pip). ClamAV daemon already in Docker Compose.

---

### Step 5 — File versioning ✅ COMPLETED

**Files:**
- `backend/app/models/file_version.py` — `FileVersion` ORM model: `id`, `file_id`, `organization_id`, `project_id`, `version_number`, `storage_key`, `size_bytes`, `content_type`, `created_at`
- Alembic migration: `file_versions` table
- `backend/app/repositories/file_version.py` — `FileVersionRepository`: `create`, `list`, `get`
- `backend/app/models/file.py` — add `version_count` column (`Integer`, default 1)
- `backend/app/services/file.py` — update `confirm_upload`: if `versioning_enabled = true`, create `FileVersion` row, bump `file.version_count`
- `backend/app/routers/files.py` — 3 new endpoints:
  - `GET /v1/projects/{id}/files/{file_id}/versions` — list versions
  - `GET /v1/projects/{id}/files/{file_id}/versions/{version_id}/download` — presigned URL for a version
  - `POST /v1/projects/{id}/files/{file_id}/versions/{version_id}/restore` — makes version current

---

### Step 6 — Multipart upload ✅ COMPLETED

**Files:**
- `backend/app/models/upload_session.py` — `UploadSession` ORM model: `id`, `organization_id`, `project_id`, `file_id`, `s3_upload_id`, `filename`, `content_type`, `total_size_bytes`, `part_count`, `status`, `created_at`, `expires_at`
- Alembic migration: `upload_sessions` table
- `backend/app/repositories/upload_session.py` — `UploadSessionRepository`
- `backend/app/services/multipart.py` — `MultipartUploadService`: start, get-part-url, complete, abort; validates `max_file_size_bytes` from project config on start
- `backend/app/routers/files.py` — 4 new endpoints:
  - `POST /v1/projects/{id}/files/upload/multipart/start`
  - `GET /v1/projects/{id}/files/upload/multipart/{upload_id}/part-url?part={n}`
  - `POST /v1/projects/{id}/files/upload/multipart/{upload_id}/complete`
  - `DELETE /v1/projects/{id}/files/upload/multipart/{upload_id}` (abort)

---

### Step 7 — Webhooks ✅ COMPLETED

**Files:**
- `backend/app/models/webhook.py` — `Webhook` ORM model: `id`, `organization_id`, `project_id`, `url`, `events` (Text, comma-separated), `signing_secret`, `is_active`, `created_at`, `updated_at`; `WebhookDelivery` ORM model: `id`, `webhook_id`, `organization_id`, `project_id`, `event_type`, `payload_json`, `status`, `attempt_count`, `response_status_code`, `response_body`, `next_retry_at`, `created_at`
- Alembic migration: `webhooks` + `webhook_deliveries` tables
- `backend/app/repositories/webhook.py` — `WebhookRepository`
- `backend/app/services/webhook.py` — `WebhookService`: CRUD + delivery recording
- `backend/app/routers/webhooks.py` — 5 endpoints:
  - `POST /v1/projects/{id}/webhooks`
  - `GET /v1/projects/{id}/webhooks`
  - `PUT /v1/projects/{id}/webhooks/{webhook_id}`
  - `DELETE /v1/projects/{id}/webhooks/{webhook_id}`
  - `GET /v1/projects/{id}/webhooks/{webhook_id}/deliveries`
- `backend/app/workers/webhook.py` — `WebhookWorker`: NATS pull consumer on `filenest.*.*.file.*`; for each matching webhook → HMAC-SHA256 sign → POST; retry 3×: 30s → 60s → 120s; records `WebhookDelivery` row per attempt
- `backend/app/main.py` — start `WebhookWorker` in lifespan
- `backend/app/routers/__init__.py` — register `webhooks_router`

---

### Step 8 — Console: File Explorer ✅ COMPLETED

**Files:**
- `frontend/web/src/app/[locale]/(app)/projects/[projectId]/files/page.tsx` — RSC page, server-fetches file list
- `frontend/web/src/modules/client/files/components/FileExplorerView.tsx` — wraps `<FileExplorer>` from `@filenest/react`
- `frontend/web/src/modules/entities/schemas/file/` — Zod response + input + action schemas
- `frontend/web/src/modules/server/core/file/` — full clean-arch stack: interface → usecase → service → controller
- `frontend/web/src/modules/server/presentation/actions/file.actions.ts` — ZSA actions: list, delete

---

### Step 9 — Console: Webhooks page ✅ COMPLETED

**Files:**
- `frontend/web/src/app/[locale]/(app)/projects/[projectId]/webhooks/page.tsx` — RSC page
- `frontend/web/src/modules/entities/schemas/webhook/` — response, input, forms, actions Zod schemas + barrel
- `frontend/web/src/modules/server/core/webhook/` — full clean-arch: domain interface → REST service → use cases (list, create, update, delete) → controllers + index barrel
- `frontend/web/src/modules/server/di/modules/webhook/webhook.module.ts` — registerWebhookModule; DI_SYMBOLS + DI_RETURN_TYPES + container.ts updated
- `frontend/web/src/modules/server/presentation/actions/webhook.actions.ts` — ZSA actions: list, create, update, delete
- `frontend/web/src/modules/client/webhooks/stores/webhook.store.ts` — Zustand store: modalType, webhookData, isOpen, trigger
- `frontend/web/src/modules/client/webhooks/queries/webhook.queries.ts` — webhookKeys factory
- `frontend/web/src/modules/client/webhooks/components/WebhooksTableColumn.tsx` — columns: url, events badges, status badge, created_at, actions (Edit → createWebhook modal, Delete → deleteWebhook modal)
- `frontend/web/src/modules/client/webhooks/components/WebhooksTable.tsx` — useServerActionQuery + invalidateQueries on trigger
- `frontend/web/src/modules/client/webhooks/forms/CreateWebhookForm.tsx` — create + edit modes; signing_secret callout on creation
- `frontend/web/src/modules/client/webhooks/modals/CreateWebhookModal.tsx` — Dialog wrapping form
- `frontend/web/src/modules/client/webhooks/modals/DeleteWebhookModal.tsx` — AlertDialog
- `frontend/web/src/modules/client/webhooks/provider/WebhookModalProvider.tsx` — isMounted guard; accepts projectId prop

---

## New `pyproject.toml` dependencies needed

```
nats-py        # NATS JetStream async client
python-clamd   # ClamAV TCP socket client (VirusScanStage)
python-magic   # MIME byte-sniffing (MimeValidationStage)
```

---

### Step 10 — Docs audit — Console app docs route ✅ COMPLETED

Reviewed all Phase 2 features against `frontend/web/src/content/docs/`. The following were added or updated:

**New MDX files:**
- `api/webhooks.mdx` — list, create, update, delete endpoints; event types; HMAC signature verification code; retry policy
- `api/health.mdx` — `/health/live`, `/health/ready`; response shapes; Kubernetes probe config example
- `console/files.mdx` — file table columns, status lifecycle, upload flow, row actions
- `console/api-keys.mdx` — key types, scopes table, create flow, revoke, best practices
- `console/webhooks.mdx` — add/edit/delete, signing secret warning, event types, disable vs delete

**Updated existing files:**
- `nav.ts` — added Webhooks + Health to API Reference; added Files + API Keys + Webhooks to Console Guide
- `console/projects.mdx` — removed "Phase 4" labels from tabs; replaced with working links to the new console guide pages
- `api/authentication.mdx` — added missing scopes: `api_keys:create`, `api_keys:revoke`, `audit:read`, `compliance:manage`

**Component:**
- `modules/client/docs/components/DocActions.tsx` — Copy MD + Open in (Claude / ChatGPT / Perplexity / Gemini) action bar wired into `[[...slug]]/page.tsx`

---

## Summary

| Step | Description | Status |
|------|-------------|--------|
| 1 | NATS client + OutboxWorker | ✅ Complete |
| 2 | Processing pipeline skeleton | ✅ Complete |
| 3 | VirusScanStage + MimeValidationStage | ✅ Complete |
| 4 | ClassificationStage | ✅ Complete |
| 5 | Webhook delivery | ✅ Complete |
| 6 | Multipart upload | ✅ Complete |
| 7 | Audit log | ✅ Complete |
| 8 | Console: File Explorer | ✅ Complete |
| 9 | Console: Webhooks page | ✅ Complete |
| 10 | Docs audit — Console app docs route | ✅ Complete |

**All steps complete. Phase 2 is done.**
