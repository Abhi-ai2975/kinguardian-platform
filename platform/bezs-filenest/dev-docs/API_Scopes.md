# FileNest API — Scopes Reference

Every API key issued through the FileNest Console has a set of **scopes** that control which endpoints it can call. The backend checks the scope on every request and returns `403 Forbidden` if the required scope is not present.

---

## Scope Namespaces

| Namespace | Controls |
|-----------|---------|
| `files:*` | File CRUD — upload, download, read metadata, delete, update metadata/tags |
| `folders:*` | Folder management — create, list, resolve paths, delete |
| `upload_tokens:*` | Issuing short-lived browser upload tokens |
| `webhooks:*` | Webhook endpoint configuration and delivery history |
| `projects:*` | Project settings, storage config, metadata schemas, usage |
| `audit:*` | Audit log access |
| `compliance:*` | WORM, legal hold, and retention policy management |

---

## Full Scope Table

### Files

| Scope | Method | URL | Description |
|-------|--------|-----|-------------|
| `files:upload` | `POST` | `/v1/projects/{project_id}/files/upload` | Initiate a presigned upload |
| `files:upload` | `POST` | `/v1/projects/{project_id}/files/{file_id}/confirm` | Confirm upload after PUT to storage |
| `files:upload` | `POST` | `/v1/projects/{project_id}/files/multipart/initiate` | Start a multipart upload session |
| `files:upload` | `POST` | `/v1/projects/{project_id}/files/multipart/{upload_id}/part` | Upload a part |
| `files:upload` | `POST` | `/v1/projects/{project_id}/files/multipart/{upload_id}/complete` | Complete multipart upload |
| `files:upload` | `POST` | `/v1/projects/{project_id}/files/multipart/{upload_id}/abort` | Abort multipart upload |
| `files:download` | `GET` | `/v1/projects/{project_id}/files/{file_id}/download-url` | Get presigned download URL |
| `files:download` | `GET` | `/v1/projects/{project_id}/files/{file_id}/versions/{version_id}/download-url` | Get presigned download URL for a specific version |
| `files:read` | `GET` | `/v1/projects/{project_id}/files` | List files with filters and pagination |
| `files:read` | `GET` | `/v1/projects/{project_id}/files/{file_id}` | Get a single file's metadata |
| `files:read` | `GET` | `/v1/projects/{project_id}/files/{file_id}/versions` | List version history for a file |
| `files:delete` | `DELETE` | `/v1/projects/{project_id}/files/{file_id}` | Soft-delete a file |
| `files:metadata` | `PUT` | `/v1/projects/{project_id}/files/{file_id}/tags` | Replace the full tag list on a file |
| `files:metadata` | `POST` | `/v1/projects/{project_id}/files/{file_id}/tags` | Append tags to a file |
| `files:metadata` | `PATCH` | `/v1/projects/{project_id}/files/{file_id}` | Rename a file |
| `files:metadata` | `POST` | `/v1/projects/{project_id}/files/{file_id}/versions/{version_id}/restore` | Restore a past version |

---

### Folders

| Scope | Method | URL | Description |
|-------|--------|-----|-------------|
| `folders:read` | `GET` | `/v1/projects/{project_id}/folders` | List all folders (optional `?name=` filter) |
| `folders:read` | `GET` | `/v1/projects/{project_id}/folders/by-path?path=john/uploads` | Resolve a path string to a folder |
| `folders:read` | `GET` | `/v1/projects/{project_id}/folders/{folder_id}` | Get a single folder by ID |
| `folders:read` | `GET` | `/v1/projects/{project_id}/folders/{folder_id}/files` | List files inside a folder |
| `folders:write` | `POST` | `/v1/projects/{project_id}/folders` | Create a folder |
| `folders:write` | `POST` | `/v1/projects/{project_id}/folders/ensure-path` | Idempotently create a full path |
| `folders:write` | `DELETE` | `/v1/projects/{project_id}/folders/{folder_id}` | Soft-delete a folder |
| `folders:write` | `POST` | `/v1/projects/{project_id}/files/{file_id}/move` | Move a file to a different folder |

---

### Upload Tokens

| Scope | Method | URL | Description |
|-------|--------|-----|-------------|
| `upload_tokens:create` | `POST` | `/v1/projects/{project_id}/upload-tokens` | Issue a short-lived browser upload token |

---

### Webhooks

| Scope | Method | URL | Description |
|-------|--------|-----|-------------|
| `webhooks:read` | `GET` | `/v1/projects/{project_id}/webhooks` | List webhook endpoints |
| `webhooks:read` | `GET` | `/v1/projects/{project_id}/webhooks/{webhook_id}/deliveries` | List delivery history |
| `webhooks:write` | `POST` | `/v1/projects/{project_id}/webhooks` | Create a webhook endpoint |
| `webhooks:write` | `PUT` | `/v1/projects/{project_id}/webhooks/{webhook_id}` | Update a webhook |
| `webhooks:write` | `DELETE` | `/v1/projects/{project_id}/webhooks/{webhook_id}` | Delete a webhook |

---

### Projects

| Scope | Method | URL | Description |
|-------|--------|-----|-------------|
| `projects:read` | `GET` | `/v1/projects` | List all projects in the organisation |
| `projects:read` | `GET` | `/v1/projects/{project_id}` | Get a project's details |
| `projects:read` | `GET` | `/v1/projects/{project_id}/storage` | Get storage configuration |
| `projects:read` | `GET` | `/v1/projects/{project_id}/metadata-schemas` | List metadata schemas |
| `projects:read` | `GET` | `/v1/projects/{project_id}/metadata-schemas/{schema_id}` | Get a metadata schema |
| `projects:read` | `GET` | `/v1/projects/{project_id}/usage` | Get storage and API usage stats |
| `projects:read` | `GET` | `/v1/projects/{project_id}/dashboard` | Get dashboard summary |
| `projects:update` | `POST` | `/v1/projects` | Create a project |
| `projects:update` | `PATCH` | `/v1/projects/{project_id}` | Update project settings |
| `projects:update` | `DELETE` | `/v1/projects/{project_id}` | Delete a project |
| `projects:update` | `PUT` | `/v1/projects/{project_id}/storage` | Set storage provider config |
| `projects:update` | `POST` | `/v1/projects/{project_id}/storage/test` | Test storage connectivity |
| `projects:update` | `POST` | `/v1/projects/{project_id}/metadata-schemas` | Create a metadata schema |
| `projects:update` | `PUT` | `/v1/projects/{project_id}/metadata-schemas/{schema_id}` | Update a metadata schema |

---

### Audit & Compliance

| Scope | Method | URL | Description |
|-------|--------|-----|-------------|
| `audit:read` | `GET` | `/v1/projects/{project_id}/audit` | Read audit log entries |
| `compliance:manage` | `POST` | `/v1/projects/{project_id}/files/{file_id}/legal-hold` | Set legal hold on a file |
| `compliance:manage` | `DELETE` | `/v1/projects/{project_id}/files/{file_id}/legal-hold` | Release legal hold |

---

## Recommended API Key Configurations

### Files key — upload/download operations

Scopes the key to file I/O only. Safe to use in server-side token endpoints that are close to the browser.

```
files:upload
files:download
files:read
upload_tokens:create
```

### Admin key — full management

Full control over files, folders, webhooks, and project settings. **Never expose this key to the browser or client-side code.**

```
files:upload
files:download
files:read
files:delete
files:metadata
folders:read
folders:write
upload_tokens:create
projects:read
projects:update
webhooks:read
webhooks:write
audit:read
```

### Read-only key — reporting / analytics

For dashboards or third-party integrations that only need to inspect data.

```
files:read
folders:read
projects:read
webhooks:read
audit:read
```

---

## Two-Instance Pattern

The recommended server-side pattern — two clients, two keys with different scope sets:

```ts
// Server-side: management operations only
const fnAdmin = new FileNest({
  apiKey: process.env.FILENEST_ADMIN_KEY,  // scopes: folders:write, projects:read, …
  projectId: process.env.FILENEST_PROJECT_ID,
});

// Server-side: file I/O + token issuance
const fnFiles = new FileNest({
  apiKey: process.env.FILENEST_FILES_KEY,  // scopes: files:upload, files:read, upload_tokens:create
  projectId: process.env.FILENEST_PROJECT_ID,
});

// Typical per-request flow:
const folder = await fnAdmin.folders.ensurePath(`${session.userId}/uploads`);
const token  = await fnFiles.uploadTokens.create({
  folderId:    folder.id,
  ownerUserId: session.userId,
  ownerOrgId:  session.orgId,
  expiresIn:   3600,
});
// Return `token.token` to the browser — it expires in 1 hour
```

---

## Token Types and Their Implicit Scopes

Short-lived tokens issued by the `/upload-tokens` endpoint have fixed scopes regardless of the issuing key's scopes. The browser cannot request additional scopes.

| Token prefix | Implicit scopes |
|---|---|
| `fn_upload_token_*` | `files:upload`, `files:read` |
| `fn_live_*` / `fn_test_*` | Whatever scopes were assigned at key creation |
