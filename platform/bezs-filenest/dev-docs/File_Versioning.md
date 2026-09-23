# File Versioning

FileNest supports per-file version history as an opt-in feature controlled by a single project-level flag: `versioning_enabled` in `project_configs`. When the flag is off, no version records are written and the feature has zero runtime cost. When on, every confirmed upload to a file creates an immutable snapshot row that can be listed, downloaded, and restored.

---

## How it is Enabled

Versioning is configured per project through the `project_configs` table — one row per project, created atomically when the project is created.

```
project_configs.versioning_enabled  BOOLEAN  NOT NULL  DEFAULT false
```

Setting this to `true` switches versioning on for every subsequent upload in that project. Uploads that completed before the flag was enabled are not retroactively versioned — only uploads confirmed after the flag is set will have version rows.

There is no per-file override. If the project has `versioning_enabled = true`, all files in the project are versioned.

---

## Database Schema

Two columns / tables are involved.

### `files.version_count`

```sql
version_count  INTEGER  NOT NULL  DEFAULT 0
```

Added by migration `5cb875feb9aa`. Tracks the total number of confirmed uploads for this file record. It is incremented inside `confirm_upload` before the `FileVersion` row is written, so it always equals the highest `version_number` that exists in `file_versions` for that file.

### `file_versions`

```sql
CREATE TABLE file_versions (
    id               TEXT      PRIMARY KEY,
    file_id          TEXT      NOT NULL,   -- FK to files.id (not enforced at DB level)
    organization_id  TEXT      NOT NULL,
    project_id       TEXT      NOT NULL,
    version_number   INTEGER   NOT NULL,   -- 1-based, sequential per file
    storage_key      TEXT      NOT NULL,   -- object storage path at time of snapshot
    size_bytes       INTEGER   NOT NULL,
    content_type     TEXT      NOT NULL,
    created_at       TIMESTAMPTZ
);
-- Indexes on file_id, organization_id, project_id
```

Rows in this table are **immutable** — `FileVersionRepository` has no update methods. Once created, a version row is permanent (even if the parent file is soft-deleted).

`version_number` is 1-based and sequential per `file_id`: version 1 is the first confirmed upload, version 2 is the next, and so on. The `restore_version` operation also mints a new version row (see below), so the version history is a complete audit trail including restores.

---

## Upload Flow with Versioning

The version snapshot is created inside `FileService.confirm_upload()`, which is called after the client has PUT the file bytes directly to object storage via the presigned URL issued by `init_upload`.

```
1. Client → POST /v1/projects/{id}/files/upload
           ← { file_id, upload_url, expires_at }

2. Client → PUT {upload_url}    (bytes go directly to S3/MinIO — never through the backend)

3. Client → POST /v1/projects/{id}/files/{file_id}/confirm
           ← { id, status }
```

Step 3 is where versioning fires. The relevant code in `FileService.confirm_upload()`:

```python
config = await self._config_repo.get_for_project(project_id, organization_id)

if config.versioning_enabled and record.storage_key:
    record.version_count = (record.version_count or 0) + 1
    await self._version_repo.create(
        file_id=record.id,
        organization_id=self._ctx.organization_id,
        project_id=self._project_id,
        version_number=record.version_count,
        storage_key=record.storage_key,
        size_bytes=record.size_bytes,
        content_type=record.content_type,
    )
```

This runs **before** the virus scan branch, meaning the version snapshot is taken regardless of whether `virus_scan_enabled` is also set. When scanning is enabled the file status goes to `processing` first; the version row already exists.

All writes — the `FileVersion` insert, the `version_count` bump, and the outbox event — are committed in a single transaction, so the version row either fully appears or not.

---

## Listing Versions

```
GET /v1/projects/{project_id}/files/{file_id}/versions
Scope: files:read
```

Returns all version rows for the file, ordered **newest first** (highest `version_number` first). The response shape per item:

```json
{
  "id": "uuid",
  "file_id": "uuid",
  "version_number": 3,
  "storage_key": "org_id/project_id/file_id",
  "size_bytes": 204800,
  "content_type": "application/pdf",
  "created_at": "2026-06-21T14:30:00Z"
}
```

When versioning was never enabled for a file (or enabled after this file's uploads), the list returns an empty array — not an error.

---

## Downloading a Specific Version

```
GET /v1/projects/{project_id}/files/{file_id}/versions/{version_id}/download
Scope: files:download
Query: ttl (60–86400, default 3600)
```

Generates a presigned download URL pointing to **that version's `storage_key`** — not the current file's storage key. This means you get the bytes as they were at the time that version was created.

The TTL is subject to the same `require_signed_urls` / `signed_url_ttl_seconds` policy applied to regular file downloads: if `require_signed_urls = true`, the config-set TTL overrides the caller's requested TTL.

---

## Restoring a Version

```
POST /v1/projects/{project_id}/files/{file_id}/versions/{version_id}/restore
Scope: files:metadata
```

Makes a past version the current state of the file. The implementation in `FileService.restore_version()`:

1. Loads the target `FileVersion` row — 404 if it does not exist or belongs to a different file / org.
2. Updates the parent `File` record in-place:
   - `storage_key` ← version's `storage_key`
   - `size_bytes` ← version's `size_bytes`
   - `content_type` ← version's `content_type`
   - `status` ← `"ready"` (unconditional — the bytes are known-good)
   - `updated_at` ← now
   - `version_count` ← incremented by 1
3. Writes a **new `FileVersion` row** with the incremented `version_number`, copying the restored version's `storage_key`, `size_bytes`, and `content_type`. This means the restore itself appears in the history — the timeline is always append-only.
4. Publishes a `file.restored` event to the outbox with:
   ```json
   {
     "file_id": "...",
     "restored_from_version": 2,
     "new_version_number": 4,
     "storage_key": "org/project/file_id"
   }
   ```
5. Commits the transaction.

Response:
```json
{ "file_id": "uuid", "version_number": 4 }
```

### Example timeline

| version_number | Event | storage_key |
|---|---|---|
| 1 | First upload confirmed | `org/proj/file_abc` |
| 2 | Re-upload confirmed (new bytes) | `org/proj/file_abc` |
| 3 | Re-upload confirmed (new bytes) | `org/proj/file_abc` |
| 4 | `restore` called with version 2's id | `org/proj/file_abc` (same key, S3 version restored) |

After the restore, the file's current `storage_key` points to the same object path but the S3 object at that key reflects version 2's bytes (because the restore also re-sets the object at the storage layer).

---

## Tenant Isolation

Every query in `FileVersionRepository` includes `organization_id` + `file_id` in the WHERE clause. A caller cannot retrieve or restore versions from another organisation even if they know the UUID:

```python
select(FileVersion).where(
    FileVersion.id == version_id,
    FileVersion.file_id == file_id,
    FileVersion.organization_id == organization_id,
)
```

`project_id` is also stored on every row and indexed, but the lookup uses `organization_id` as the tenant fence because a version lookup always arrives with both `file_id` and `organization_id` from the verified `TenantContext`.

---

## Interaction with Other Project Config Flags

| Config flag | Interaction with versioning |
|---|---|
| `virus_scan_enabled` | Independent. The version row is written in `confirm_upload` before the scan branch. A file can be versioned even while in `processing` status. |
| `worm_enabled` | Future (Phase 8). WORM prevents deletion and modification of committed files. When both are set, versioning still creates rows but a restore would be blocked by WORM enforcement. |
| `retention_days` | Future (Phase 8). Retention applies to the file as a whole, not individual versions. |
| `require_signed_urls` | Applies to version download URLs just as it does to regular download URLs — the config TTL overrides the caller's `ttl` query param when set. |

---

## Repository Layer

`FileVersionRepository` (`backend/app/repositories/file_version.py`) exposes three methods:

| Method | Description |
|---|---|
| `create(**kwargs)` | Insert a new version row and `flush()` to get the DB-assigned `id`. Used by `FileService` inside a transaction — caller commits. |
| `list(file_id, organization_id, project_id)` | Return all versions for a file, ordered by `version_number DESC` (newest first). |
| `get(version_id, file_id, organization_id)` | Fetch a single version. Raises `NotFoundError` if not found or tenant mismatch. |

There is no `update` or `delete` method. Rows are permanent.

---

## SDK Access

### Node.js

```typescript
// List all versions (newest first)
const { items } = await fn.files.versions.list(fileId);

// Download a specific version
const { url } = await fn.files.getDownloadUrl(fileId); // current
// For a specific version, use the API directly or the version download endpoint

// Restore to a previous version
const result = await fn.files.versions.restore(fileId, versionId);
// result.versionNumber → new version number after restore
```

### Python

```python
# List versions
versions = fn.files.list_versions(file_id)

# Restore a version
result = fn.files.restore_version(file_id, version_id)
# result["version_number"] → new version number after restore
```

---

## Key Invariants

- **Version rows are immutable.** No update or delete path exists in the repository.
- **`file.version_count` is always the highest `version_number` in `file_versions` for that file.** It is incremented before the row is written, never separately.
- **Restores are versioned.** A restore writes a new `FileVersion` row, making the history append-only and audit-safe.
- **Versioning is gated by `confirm_upload`.** A file record created by `init_upload` that is never confirmed (upload never completed) will never get a version row, even if versioning is enabled.
- **The flag is project-wide.** There is no per-file or per-folder versioning toggle.
- **Disabling `versioning_enabled` mid-project** stops new version rows from being created but does not delete existing ones. Previously-versioned files retain their history.
