# FileNest — Phase 1 Implementation Plan

**Phase:** 1 — Foundation  
**Status:** ✅ Complete  
**Source:** `dev-docs/plan/00_Implementation_Roadmap.md` — Phase 1 section  
**Goal:** Working backend with auth, project CRUD, and single-file upload to S3. Console app auth skeleton connected to real data.

**Exit criteria:**
- `curl -H "Authorization: Bearer fn_live_..." -F file=@test.pdf http://localhost:8000/v1/projects/{id}/files/upload` → file in MinIO, record in DB
- Presigned download URL works
- New user signs up via console → creates org → can see empty project list

> **Completed steps** get a `✅ COMPLETED` tag on the heading — never deleted, kept as history.  
> **Incomplete steps** get a `❌ INCOMPLETE` tag with notes on what's missing.  
> When all steps are done → rename this file to `completed-plan-phase-1.md` and update Phase 2 plan.

---

## Step 1 — Database schema & migrations ✅ COMPLETED

**Tables required:** `projects`, `files`, `storage_configs`, `storage_migrations`, `outbox_messages`, `upload_sessions`

**Files:**
- `backend/migrations/versions/2a0f1ed95f60_initial_schema.py` — covers `projects`, `files`, `storage_configs`, `storage_migrations`, `outbox_messages`
- `backend/migrations/versions/3c4e7e394948_add_upload_sessions.py` — covers `upload_sessions`
- `backend/app/models/project.py` — `Project` ORM model
- `backend/app/models/file.py` — `File` ORM model (includes `category`, `version_count`, `metadata_json`, `folder_id`)
- `backend/app/models/storage_config.py` — `StorageConfig` ORM model
- `backend/app/models/storage_migration.py` — `StorageMigration` ORM model
- `backend/app/models/upload_session.py` — `UploadSession` ORM model

---

## Step 2 — Dev environment ✅ COMPLETED

**Files:**
- `docker-compose.yml` — PostgreSQL ×2 (backend 5434, IAM 5433), Redis, RustFS (S3-compatible), NATS JetStream, ClamAV
- `justfile` — recipes: `dev` (docker compose up), `backend` (uvicorn hot-reload), `migrate` (alembic upgrade head), `seed-dev`, `down`, `reset`, `logs`, `test`, `lint`, `fmt`, `types`, `web`, `iam`
- `backend/scripts/seed_dev.py` — bootstraps a dev project with managed storage, prints org_id + project_id

---

## Step 3 — Project API ✅ COMPLETED

**Endpoints:**
- `POST /v1/projects` — create project; body: `name`, `slug`, `description`, `storage_mode`, `storage_provider`; auto-creates `StorageConfig` row
- `GET /v1/projects` — list projects in org; supports pagination (`page`, `page_size`), search, filter by `storage_provider` / `storage_mode`, sort
- `GET /v1/projects/{id}` — get single project
- `PATCH /v1/projects/{id}` — update `name`, `description`, `versioning_enabled`, `ocr_enabled`
- `DELETE /v1/projects/{id}` — soft delete (`deleted_at` set)

**Files:**
- `backend/app/routers/projects.py`
- `backend/app/services/project.py` — includes managed bucket provisioning + connectivity probe on create
- `backend/app/repositories/project.py`
- `backend/app/schemas/project.py`

---

## Step 4 — Storage Config API ✅ COMPLETED

**Endpoints:**
- `GET /v1/projects/{id}/storage` — non-sensitive fields only (mode, provider, region, bucket, endpoint_url, sse_enabled, status)
- `PATCH /v1/projects/{id}/storage` — save BYOB credentials (AES-256-GCM encrypted in `config_encrypted`); sets status → `pending_verification`
- `POST /v1/projects/{id}/storage/verify` — write + delete probe object; sets status → `active` or `verification_failed`; returns `{ ok, latency_ms, error }`
- `PATCH /v1/projects/{id}/storage/sse` — toggle SSE (MinIO/RustFS only; rejected for S3/R2/Azure/GCS)

**Auto-creation:** `StorageConfig` row created automatically in `ProjectService.create_project`.

**Files:**
- `backend/app/routers/storage.py`
- `backend/app/services/storage_config.py` — credential encryption/decryption via `app.core.crypto`
- `backend/app/repositories/storage_config.py`
- `backend/app/schemas/storage.py`

---

## Step 5 — File Upload & Download ✅ COMPLETED

**Endpoints:**
- `POST /v1/projects/{id}/files/upload` — returns presigned PUT URL (1-hour expiry); creates file record (`status=pending`)
- `POST /v1/projects/{id}/files/{file_id}/confirm` — confirms upload; sets `status=ready` (or `processing` if virus scan enabled)
- `GET /v1/projects/{id}/files` — list files; cursor-based pagination; filter by `folder_id`, `status`, `mime_type`
- `GET /v1/projects/{id}/files/{file_id}` — get file metadata
- `GET /v1/projects/{id}/files/{file_id}/download` — presigned download URL (TTL 60–86400s, default 3600)
- `DELETE /v1/projects/{id}/files/{file_id}` — soft delete (`deleted_at` set)

**Files:**
- `backend/app/routers/files.py`
- `backend/app/services/file.py`
- `backend/app/repositories/file.py`
- `backend/app/schemas/file.py`
- `backend/app/storage/` — `StorageProvider` protocol, `S3Provider`, `StorageResolver`

---

## Step 6 — Health endpoints ✅ COMPLETED

**Endpoints:**
- `GET /health/live` — always 200, returns `{ status: "ok" }`; no dependency checks (liveness probe)
- `GET /health` — alias for `/health/live` (backwards compatibility)
- `GET /health/ready` — checks PostgreSQL (SELECT 1) + Redis (PING); returns 200 `{ status: "ok" }` or 503 `{ status: "degraded", checks: { database, cache } }`

**File:** `backend/app/routers/health.py`

---

## Step 7 — Console App: Auth connected ✅ COMPLETED

**Login → Callback → Session:**
- `app/[locale]/(auth)/login/page.tsx` — PKCE init: generates state + verifier, redirects to IAM
- `app/[locale]/(auth)/callback/page.tsx` — validates state from localStorage, calls `/api/auth/token`
- `app/api/auth/token/route.ts` — server-side code exchange with IAM; sets httpOnly session cookie

**Session reading:**
- `modules/server/auth/get-session.ts` — `getServerSession()` forwards cookie to IAM; returns `AuthResponse` or null

**First-login onboarding wizard:**
- `app/[locale]/(onboarding)/layout.tsx` — requires session; redirects to `/dashboard` if org already active
- `app/[locale]/(onboarding)/onboarding/create-org/page.tsx` — name + slug pre-filled from user.name; calls `POST /api/onboarding/org`
- `app/api/onboarding/org/route.ts` — creates org in IAM + activates it; sets `activeOrganizationId` in session cookie
- `app/[locale]/(onboarding)/onboarding/get-api-key/page.tsx` — creates `fn_live_...` key; shown once
- `app/[locale]/(onboarding)/onboarding/install-sdk/page.tsx` — Node.js / Python snippets → `/dashboard`

**Dashboard with real data:**
- `app/[locale]/(app)/dashboard/page.tsx` — calls `listProjectsAction()`; shows project count + recent 3 projects + quick actions

**Route protection:**
- `app/[locale]/(app)/layout.tsx` — redirects to `/login` if no session; to `/onboarding/create-org` if no `activeOrganizationId`
- `app/[locale]/(onboarding)/layout.tsx` — redirects to `/dashboard` if `activeOrganizationId` already set (idempotent)

---

## Step 8 — Docs audit — Console app docs route ✅ COMPLETED

Reviewed all Phase 1 features against `frontend/web/src/content/docs/`. The docs route already covered projects, files, storage, authentication, and SDKs from initial scaffolding. The following were confirmed present and accurate:

- `api/authentication.mdx` — Bearer token types, scopes, error responses
- `api/projects.mdx` — full project CRUD
- `api/files.mdx` — upload, list, get, download, delete
- `api/storage.mdx` — storage config
- `console/overview.mdx` — onboarding wizard, layout
- `console/projects.mdx` — project list, create, delete, tabs
- `console/settings.mdx` — storage, uploads, processing, security tabs

`DocActions.tsx` (Copy MD + Open in AI toolbar) added to `[[...slug]]/page.tsx` so every docs page has the action bar.

---

## Summary

| Step | Description | Status |
|------|-------------|--------|
| 1 | Database schema & migrations | ✅ Complete |
| 2 | Dev environment | ✅ Complete |
| 3 | Project API | ✅ Complete |
| 4 | Storage Config API | ✅ Complete |
| 5 | File Upload & Download | ✅ Complete |
| 6 | Health endpoints | ✅ Complete |
| 7 | Console App — Auth connected | ✅ Complete |
| 8 | Docs audit — Console app docs route | ✅ Complete |

**All steps complete. Phase 1 is done.**
