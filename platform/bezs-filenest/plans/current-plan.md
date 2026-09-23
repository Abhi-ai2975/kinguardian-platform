# FileNest — Phase 5 Implementation Plan

**Phase:** 5 — SDKs & Developer Experience  
**Status:** 🔄 In Progress (Steps 1–6 ✅, Step 7 partial, Steps 8–9 pending)  
**Source:** `dev-docs/plan/00_Implementation_Roadmap.md` — Phase 5 section  
**Goal:** External developers can integrate FileNest in under 30 minutes. SDKs published. Example applications demonstrate every SDK feature in isolation.

**Docs to read before implementing:** `06_SDK_Specification`

**Exit criteria:**
- Node SDK: `new FileNest({ apiKey, projectId }).files.upload(buffer, { filename: "test.pdf" })` works
- React SDK: `<FileUpload>` in a bare Next.js app uploads to the right project
- Python SDK: `AsyncFileNest().files.upload(...)` works inside a FastAPI endpoint
- Webhook: `verifyWebhookSignature` returns `true` on a real delivery, `false` on tampered payload
- All four example apps start with a single command and each feature page works end-to-end

> **Completed steps** get a `✅ COMPLETED` tag on the heading — never deleted, kept as history.  
> When all steps are done → rename this file to `completed-plan-phase-5.md` and create `current-plan.md` for Phase 6.

---

## Already built (carried over from Phases 1–4)

- ✅ **FastAPI backend** — full file CRUD, upload, download, search, webhooks, projects API
- ✅ **Console app** — all product UI, OAuth 2.1 auth, server actions with `filenestApi` HTTP client
- ✅ **IAM** — BetterAuth, OAuth 2.1 PKCE, API key management (`fn_live_*` / `fn_test_*`)

---

## Step 1 — Monorepo workspace setup ✅ COMPLETED

Configure the repo root as a pnpm workspace so TypeScript SDK packages can be developed and cross-linked locally.

**Files:**
- `pnpm-workspace.yaml` — declare workspace packages: `sdks/*`, `examples/*`, `frontend/web`
- `sdks/core/package.json` — `@filenest/core`, private: false, tsup build
- `sdks/core/tsconfig.json` — strict TypeScript
- `sdks/core/tsup.config.ts` — CJS + ESM dual build, .d.ts generation
- `sdks/node/package.json` — `@filenest/node`, depends on `@filenest/core`
- `sdks/node/tsconfig.json`
- `sdks/node/tsup.config.ts`
- `sdks/react/package.json` — `@filenest/react`, peer: react@>=18
- `sdks/react/tsconfig.json`
- `sdks/react/tsup.config.ts`
- `sdks/nextjs/package.json` — `@filenest/nextjs`, peer: next@>=15
- `sdks/nextjs/tsconfig.json`
- `sdks/nextjs/tsup.config.ts`

---

## Step 2 — `@filenest/core` (shared base) ✅ COMPLETED

Shared HTTP client, error hierarchy, and TypeScript types used by all JS/TS SDKs.

**`sdks/core/src/`**

**`errors/index.ts`** — error hierarchy:
```
FileNestError (base)
  AuthenticationError       (401)
  AuthorizationError        (403)
  NotFoundError             (404)
  FileNotFoundError         (404)
  ConflictError             (409)
  WORMViolationError        (409)
  LegalHoldError            (409)
  ValidationError           (422)
  MetadataValidationError   (422)
  RateLimitError            (429 — includes retry_after)
  NetworkError              (network-level)
  StorageError              (storage provider errors)
```

**`types/index.ts`** — full TypeScript types:
- `File`, `FileStatus` (enum: uploading | processing | ready | failed | quarantined | deleted)
- `FileVersion`
- `Folder`
- `Project`, `ProjectConfig`
- `Webhook`, `WebhookDelivery`
- `SearchResults`, `SearchHit`, `SearchFilters`, `SearchFacets`
- `UploadProgress` — `{ bytesUploaded, totalBytes, percentage, chunkNumber, totalChunks }`
- `UploadSession`
- `UploadToken`
- `AuditLog`
- `ListResponse<T>` — `{ data: T[], pagination: { total, limit, offset, hasMore } }`
- `DownloadUrlResponse` — `{ url: string, expiresAt: string }`

**`http/client.ts`** — `FileNestHttpClient` class:
- Constructor: `{ apiKey, projectId?, baseUrl, timeout, maxRetries, apiVersion? }`
- `get<T>(path, params?)`, `post<T>(path, body?)`, `patch<T>(path, body?)`, `delete<T>(path)`
- Sets `Authorization: Bearer {apiKey}` header on every request
- Retry on 5xx (exponential backoff, up to `maxRetries`)
- Maps HTTP status → typed error class: `throw new AuthenticationError()` on 401, etc.
- Default `baseUrl`: `https://api.filenest.io`

**`index.ts`** — barrel: export everything from `errors/`, `types/`, `http/`

---

## Step 3 — `@filenest/node` ✅ COMPLETED

Full server-side Node.js SDK. Extends `@filenest/core` HTTP client.

**`sdks/node/src/`**

**`client.ts`** — `FileNest` class:
```typescript
export class FileNest {
  readonly files: FilesNamespace;
  readonly folders: FoldersNamespace;
  readonly search: SearchNamespace;
  readonly webhooks: WebhooksNamespace;
  readonly uploadTokens: UploadTokensNamespace;
  readonly uploads: UploadsNamespace;     // resumable multipart sessions
}
```

**`namespaces/files.ts`** — `FilesNamespace`:
- `upload(options)` — auto-selects single (<5 MB) or multipart (>=5 MB); accepts `Buffer | Readable`
- `download(fileId)` → `Readable` stream
- `downloadToBuffer(fileId)` → `Buffer`
- `getDownloadUrl(fileId, { ttl?, disposition? })` → `DownloadUrlResponse`
- `list(filters?)` → `ListResponse<File>`
- `get(fileId)` → `File`
- `update(fileId, { tags?, metadata? })` → `File`
- `delete(fileId)` → `void`
- `restore(fileId)` → `File`
- `versions` sub-namespace: `list(fileId)`, `create(fileId, opts)`, `rollback(fileId, versionNumber)`

**`namespaces/folders.ts`** — `FoldersNamespace`:
- `create({ name, parentFolderId?, metadata? })` → `Folder`
- `list({ parentFolderId? })` → `ListResponse<Folder>`
- `get(folderId, { includeStats? })` → `Folder`
- `delete(folderId, { force? })` → `void`

**`namespaces/search.ts`** — `SearchNamespace`:
- `query(q: string | SearchOptions)` → `SearchResults`
- `iterate(options)` → `AsyncIterableIterator<File>`

**`namespaces/webhooks.ts`** — `WebhooksNamespace`:
- `create({ name, url, events[] })` → `Webhook`
- `list()` → `ListResponse<Webhook>`
- `update(webhookId, patch)` → `Webhook`
- `delete(webhookId)` → `void`
- `verify(rawBody: Buffer, signature: string, secret: string)` → `boolean` — HMAC-SHA256

**`namespaces/upload-tokens.ts`** — `UploadTokensNamespace`:
- `create({ maxSize?, allowedMimeTypes?, maxFiles?, folderId?, metadata?, expiresIn? })` → `UploadToken`

**`namespaces/uploads.ts`** — `UploadsNamespace` (resumable):
- `create({ filename, size, mimeType, metadata? })` → `UploadSession`
- `resume(sessionId, { data, onProgress? })` → `File`

**`index.ts`** — export `FileNest` + re-export all types from `@filenest/core`

---

## Step 4 — `@filenest/react` ✅ COMPLETED

React SDK with `FileNestProvider`, UI components, and TanStack Query–backed hooks.

**`sdks/react/src/`**

**`context/FileNestContext.tsx`** — React context:
- `FileNestProvider` — accepts `tokenEndpoint`, `projectId`, `options?`
- Fetches upload token from `tokenEndpoint` (lazy, cached, refreshed before expiry)
- Exposes `useFileNest()` hook returning `{ upload, projectId, token, isReady }`

**`components/FileUpload.tsx`** — `<FileUpload>`:
- Props: `accept`, `maxSize`, `maxFiles`, `multiple`, `folderId`, `metadata`, `metadataForm`, `variant` (`dropzone | button | minimal`), `placeholder`, `showProgress`, `showPreview`
- Callbacks: `onUploadStart`, `onProgress`, `onComplete`, `onError`, `onValidationError`
- Uses `react-dropzone` internally
- Calls `useFileNest().upload()` after token fetch
- Shows per-file progress bars, error badges, success states

**`components/FileExplorer/`** — `<FileExplorer>` (rebuilt as 16-file directory — Google Drive UX):
- Props: `rootFolderId`, `defaultView` (`grid | list`), `showFolders`, `showSearch`, `showFilters`, `showUploadButton`, `columns`, `searchFacets`, `selectable`, `multiSelect`, `selectedIds`, `onSelectionChange`, `actions`, `onFileClick`, `metadataColumns`, `emptyState`
- Internal: folder sidebar + file grid/list + search bar
- Uses `useFiles`, `useFolder`, `useSearch` internally

**`components/FilePreview.tsx`** — `<FilePreview>` (basic):
- Props: `fileId`, `showMetadata`, `showVersionHistory`, `allowDownload`, `downloadTtl`, `height`, `width`, `onClose`, `onDownload`, `onVersionSelect`
- Renders image inline or PDF via `<iframe>` for now (full PDF.js in Phase 7)
- Fetches file detail via `useFile()`

**`components/FileViewer.tsx`** — `<FileViewer>`:
- Props: `fileId`, `showToolbar`, `showSidebar`, `pdf`, `image`, `layout`, `onClose`
- Full-page viewer wrapper around `<FilePreview>` with toolbar chrome

**`hooks/useUpload.ts`** — programmatic upload:
- Returns `{ upload, uploads, isUploading, cancel, retry }`
- `uploads[]`: per-file state with `{ id, filename, status, progress, error }`

**`hooks/useFiles.ts`** — TanStack Query list:
- Returns `{ files, isLoading, isError, error, hasMore, loadMore, refresh, totalCount }`

**`hooks/useSearch.ts`** — debounced search:
- Returns `{ results, facets, isLoading, totalCount, queryTimeMs, search, hasMore, loadMore }`

**`hooks/useFile.ts`** — single file detail:
- Returns `{ file, isLoading, mutate }`

**`hooks/useFolder.ts`** — folder navigation:
- Returns `{ folder, files, subfolders, isLoading, breadcrumbs }`

**`hooks/useInfiniteFiles.ts`** — TanStack Query infinite scroll (added beyond original spec):
- `useInfiniteQuery` with `initialPageParam: 0`, `getNextPageParam` from pagination response
- Used inside `<FileExplorer>` with `IntersectionObserver` sentinel for scroll-to-load

**`index.ts`** — export all components and hooks

---

## Step 5 — `@filenest/nextjs` ✅ COMPLETED

Next.js server utilities. Thin wrapper — delegates to `@filenest/node` for API calls.

**`sdks/nextjs/src/`**

**`server/index.ts`**:
- `filenestServer({ apiKey, projectId })` — returns a `FileNest` instance (from `@filenest/node`) configured for server-side use. Marks with `"server-only"` guard.
- `createUploadToken(options)` — calls `filenestServer().uploadTokens.create(options)`. Used in `/api/filenest-token` route handlers.
- `verifyWebhookSignature(body: string, signature: string, secret: string)` → `boolean`
- `parseWebhookEvent(body: string)` → typed union of all webhook event shapes

**`middleware.ts`** (optional — skip for now, scaffolded with a comment):
- `fileNestMiddleware({ rateLimit? })` — adds rate limiting to token endpoint

**`types/events.ts`** — webhook event union types:
- `FileUploadedEvent`, `FileProcessedEvent`, `FileDeletedEvent`, `FileVirusDetectedEvent`, `WebhookEvent` (union)

**`index.ts`** — re-export from server + types

---

## Step 6 — `filenest` Python SDK ✅ COMPLETED

Sync + async Python SDK. Packaged as `filenest` on PyPI.

**`sdks/python/`**

**`pyproject.toml`**:
- Package: `filenest`, version `0.1.0`
- Dependencies: `httpx>=0.27`, `pydantic>=2.0`
- Optional extras: `[django]` → `django>=4.2`, `[fastapi]` → `fastapi>=0.100`

**`filenest/__init__.py`** — exports `FileNest`, `AsyncFileNest`, `verify_webhook_signature`

**`filenest/types.py`** — Pydantic v2 models:
- `File`, `FileStatus` (StrEnum), `FileVersion`
- `Folder`
- `Webhook`
- `SearchResults`, `SearchHit`, `SearchFilters`, `MetadataFilter`
- `UploadProgress`, `UploadToken`
- `ListResponse[T]` — generic wrapper

**`filenest/exceptions.py`** — exception hierarchy (mirrors TS):
- `FileNestError`, `AuthenticationError`, `AuthorizationError`, `FileNotFoundError`
- `WORMViolationError`, `LegalHoldError`, `MetadataValidationError`, `RateLimitError`

**`filenest/http/client.py`** — `FileNestHttpClient`:
- Wraps `httpx.Client` (sync) — `get`, `post`, `patch`, `delete`
- Maps HTTP status → exception classes
- Retry on 5xx with exponential backoff

**`filenest/http/async_client.py`** — `AsyncFileNestHttpClient`:
- Wraps `httpx.AsyncClient` — `async get`, `async post`, etc.
- Same error mapping, async retry

**`filenest/namespaces/files.py`** — `FilesNamespace` (sync) + `AsyncFilesNamespace`:
- `upload(filename, data, mime_type, metadata?, tags?, folder_id?, on_progress?)` → `File`
- `upload_from_path(path, metadata?, on_progress?)` → `File`
- `get_download_url(file_id, ttl?)` → `DownloadUrlResponse`
- `download_to_path(file_id, path)` → `Path`
- `download_to_bytes(file_id)` → `bytes`
- `list(filters?)` → `ListResponse[File]`
- `get(file_id)` → `File`
- `update(file_id, tags?, metadata?)` → `File`
- `delete(file_id)` → `None`

**`filenest/namespaces/search.py`** — `SearchNamespace`:
- `query(q?, filters?, facets?, limit?)` → `SearchResults`
- `iterate(q, ...)` → `Iterator[File]` (sync) / `AsyncIterator[File]` (async)

**`filenest/namespaces/webhooks.py`** — `WebhooksNamespace`:
- `verify(body: bytes, signature: str, secret: str)` → `bool`

**`filenest/client.py`** — `FileNest` (sync) and `AsyncFileNest` (async context manager):
- Composes all namespaces
- `AsyncFileNest` implements `__aenter__` / `__aexit__`

**`filenest/django/__init__.py`** — `get_filenest()` reads from `django.conf.settings.FILENEST`

**`filenest/fastapi/__init__.py`** — `get_filenest()` as FastAPI dependency via `lru_cache`

---

## Step 7 — Example applications 🔄 In Progress

Four standalone apps. Each lives in `examples/`, has its own `README.md` and `.env.example`, and requires only `FILENEST_API_KEY + FILENEST_PROJECT_ID + FILENEST_API_URL` to run.

> **Note:** Only `examples/nextjs-sdk/` has been built. The node, react, and python examples are explicitly deferred — user will request them separately when ready.

### `examples/node-sdk/` — Express + `@filenest/node` ⏳ Deferred

**Files:**
- `package.json` — deps: express, multer, `@filenest/node`
- `.env.example`
- `src/index.ts` — Express app factory, mounts all routers
- `src/routes/files.ts` — upload, list, get, download URL, delete, metadata, tags
- `src/routes/search.ts` — `POST /search`
- `src/routes/webhooks.ts` — `POST /webhooks/receive` (verify + log)
- `README.md` — `cp .env.example .env && pnpm install && pnpm dev`

Each route is self-contained — imports `FileNest` directly, no shared state beyond the client instance.

### `examples/react-sdk/` — Vite + React + `@filenest/react` ⏳ Deferred

**Files:**
- `package.json` — deps: vite, react, react-dom, react-router-dom, `@filenest/react`
- `.env.example` — `VITE_FILENEST_PROJECT_ID`, token endpoint URL
- `src/main.tsx` — wraps `<App>` in `<FileNestProvider tokenEndpoint="...">`
- `src/App.tsx` — React Router routes
- `src/pages/UploadDropzone.tsx` — `<FileUpload variant="dropzone">`
- `src/pages/UploadButton.tsx` — `<FileUpload variant="button">`
- `src/pages/UploadProgrammatic.tsx` — `useUpload()` demo
- `src/pages/Explorer.tsx` — `<FileExplorer>`
- `src/pages/Preview.tsx` — `<FilePreview fileId={...}>`
- `src/pages/FileList.tsx` — `useFiles()` with filter controls
- `src/pages/Search.tsx` — `useSearch()` with facets
- `src/pages/FileDetail.tsx` — `useFile()` single file card
- `src/pages/FolderView.tsx` — `useFolder()` breadcrumbs
- `src/api/token.ts` — tiny Express server (separate process) that issues upload tokens
- `README.md`

### `examples/nextjs-sdk/` — Next.js 16 App Router + `@filenest/nextjs` ✅ COMPLETED

**Files:**
- `package.json` — deps: next, react, `@filenest/nextjs`, `@filenest/react`
- `.env.example`
- `src/app/layout.tsx` — `<FileNestProvider>`
- `src/app/page.tsx` — index with links
- `src/app/server-component/page.tsx` — RSC calling `filenestServer().files.list()`
- `src/app/server-action/page.tsx` — client form + server action for upload
- `src/app/upload-token/page.tsx` — `<FileUpload>` consuming token endpoint
- `src/app/webhooks/page.tsx` — webhook log display
- `src/app/search/page.tsx` — server component calling `filenestServer().search.query()`
- `src/app/api/filenest-token/route.ts` — `createUploadToken()`
- `src/app/api/webhooks/filenest/route.ts` — `verifyWebhookSignature` + `parseWebhookEvent`
- `src/app/api/webhooks/filenest/log/route.ts` — in-memory event log endpoint for webhook demo page
- `src/app/api/webhooks/filenest/route.ts` — `verifyWebhookSignature` + `parseWebhookEvent`

Additional pages built beyond original spec:
- `src/app/file-detail/page.tsx` — `useFile()` demo with version history table
- `src/app/folder/page.tsx` — `useFolder()` with clickable breadcrumbs + subfolder cards
- `src/app/files/page.tsx` — `useFiles()` with paginated list + live state display
- `src/app/webhooks/page.tsx` — webhook event log with 3-second polling
- `src/app/file-explorer/page.tsx` — full Google Drive-inspired `<FileExplorer>` demo

### `examples/python-sdk/` — FastAPI + `filenest` ⏳ Deferred

**Files:**
- `pyproject.toml` — deps: fastapi, uvicorn, python-multipart, filenest
- `.env.example`
- `src/main.py` — FastAPI app, mounts all routers
- `src/routers/files.py` — upload, list, download URL, delete, metadata
- `src/routers/search.py` — `POST /search`
- `src/routers/webhooks.py` — `POST /webhooks/receive`
- `src/dependencies.py` — `get_filenest()` singleton
- `README.md` — `cp .env.example .env && uvicorn src.main:app --reload`

---

## Step 8 — Wire console app to real SDK packages

Update `frontend/web` to use the workspace-linked SDK packages instead of raw `filenestApi` calls where appropriate.

**Changes:**
- Add `@filenest/react` and `@filenest/nextjs` to `frontend/web/package.json` as workspace deps
- `frontend/web/src/app/layout.tsx` — wrap children in `<FileNestProvider tokenEndpoint="/api/filenest-token" projectId={...}>`
- `frontend/web/src/app/api/filenest-token/route.ts` — replace current implementation with `createUploadToken()` from `@filenest/nextjs/server`
- `frontend/web/src/app/api/webhooks/filenest/route.ts` — use `verifyWebhookSignature` + `parseWebhookEvent` from `@filenest/nextjs/server`
- Files page — replace `<FileUpload>` placeholder with real `<FileUpload>` from `@filenest/react` inside the existing upload modal

Note: Server actions (`filenestApi` calls in `XxxRestService`) remain as-is — `@filenest/nextjs` is for external developer use, not for the console's own server layer which already has a clean architecture.

---

## Step 9 — Docs audit — Console app docs route

Review all Phase 5 features and update the docs route.

**Checklist:**
- `sdks/node.mdx` — update from placeholder to real API surface (files, search, webhooks, upload tokens)
- `sdks/react.mdx` — update from placeholder: `<FileNestProvider>`, `<FileUpload>`, `<FileExplorer>`, hooks
- `sdks/nextjs.mdx` — update from placeholder: `filenestServer()`, `createUploadToken()`, `verifyWebhookSignature()`
- `sdks/python.mdx` — update from placeholder: `FileNest`, `AsyncFileNest`, Django + FastAPI helpers
- `console/files.mdx` — mention `<FileUpload>` is now powered by `@filenest/react`
- `nav.ts` — verify SDK entries already present (they are, from Phase 4 audit)

---

## Backend fixes (done during Phase 5)

**Startup CORS restoration** — `backend/app/main.py`

`_apply_startup_cors` previously only restored CORS on the default platform bucket. Per-project managed buckets (`fn-{project_id}`) only got CORS set at project creation time. After a Docker restart or volume wipe, those bucket CORS policies were lost, blocking browser presigned URL uploads.

Fix: added a second pass that queries all active managed `storage_configs`, joins `project_configs` for each project's `allowed_origins`, and calls `set_bucket_cors` on every per-project bucket concurrently via `asyncio.gather`. Individual failures are logged but do not block startup.

---

**NATS consumer delivery + pipeline crash fixes** — `backend/app/workers/`, `backend/app/processing/`

Three bugs prevented files from reaching `status=ready` after upload:

1. **Pull consumers only delivered the first message per session** — `pull_subscribe` + `fetch()` loop stopped registering fetch requests with NATS after the first delivery (`num_waiting` stuck at 0). Switched both `ProcessingWorker` and `WebhookWorker` to durable push consumers (`js.subscribe(cb=...)`) which deliver messages via callback as they arrive.

2. **`python-magic` crashed the worker process on Windows** — the unbundled `python-magic` package requires a separately installed `libmagic.dll`; without it, `magic.from_buffer()` terminates the process with exit code 9 (uncatchable native crash), leaving the file stuck in `processing`. Replaced with `python-magic-bin` which bundles the DLL.

3. **`ConsumerConfig` passed to `pull_subscribe` broke the subscription** — the installed python-nats version silently fails the subscription when `config=` is passed, leaving `num_pending > 0` and `num_waiting = 0` permanently. Removed the `config=` parameter.

Additional: removed startup recovery logic that was blocking HTTP requests; added idempotency guard in `PipelineExecutor` (`if file.status != "processing": return`) to handle duplicate NATS delivery; added `--reload-exclude .venv` to the backend dev command to prevent spurious reloads when packages are installed.

---

## Summary

| Step | Description | Status |
|------|-------------|--------|
| 1 | Monorepo workspace setup — pnpm-workspace, package.json, tsup configs | ✅ Completed |
| 2 | `@filenest/core` — HTTP client, error hierarchy, shared types | ✅ Completed |
| 3 | `@filenest/node` — full server-side Node SDK | ✅ Completed |
| 4 | `@filenest/react` — provider, components, hooks, Google Drive FileExplorer, useInfiniteFiles | ✅ Completed |
| 5 | `@filenest/nextjs` — server utilities | ✅ Completed |
| 6 | `filenest` Python SDK | ✅ Completed |
| 7 | Example applications — nextjs done; node/react/python deferred | 🔄 In Progress |
| 8 | Wire console app to real SDK packages | ⏳ Pending |
| 9 | Docs audit — SDK docs route | ⏳ Pending |
