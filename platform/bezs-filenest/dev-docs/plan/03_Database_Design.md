# FileNest v1.0 — Database Design

**Version:** 1.0.0
**Status:** Approved for Engineering
**Database:** PostgreSQL 16
**Last Updated:** 2026-06-15

---

## Table of Contents

1. [Design Principles](#1-design-principles)
2. [Tenant Isolation Strategy](#2-tenant-isolation-strategy)
3. [Schema Overview](#3-schema-overview)
4. [Table Definitions](#4-table-definitions)
5. [ER Diagram](#5-er-diagram)
6. [Indexing Strategy](#6-indexing-strategy)
7. [Partitioning Strategy](#7-partitioning-strategy)
8. [Migration Strategy](#8-migration-strategy)
9. [Performance Considerations](#9-performance-considerations)
10. [Data Retention and Archival](#10-data-retention-and-archival)

---

## 1. Design Principles

1. **Tenant isolation via `organization_id`** — every tenant-owned table includes `organization_id`, never queried without it
2. **UUIDs as primary keys** — no auto-increment integers exposed externally
3. **Soft deletes** — `deleted_at` timestamp, never hard delete from the application layer
4. **Audit fields on all tables** — `created_at`, `updated_at`, `created_by`, `updated_by`
5. **JSONB for flexibility** — metadata, configuration, and processing results stored as JSONB
6. **Immutable audit logs** — `audit_logs` table is append-only, no updates or deletes
7. **Enums via PostgreSQL CHECK constraints** — not ENUM types (easier to migrate)
8. **UTC timestamps everywhere** — `TIMESTAMP WITH TIME ZONE` for all datetime columns

---

## 2. Tenant Isolation Strategy

### 2.1 Row-Level Security (RLS)

PostgreSQL RLS is enabled on all tenant tables. Application sets the session variable before every query:

```sql
-- Set at connection time from auth middleware
SET app.current_organization_id = 'org_abc123';

-- RLS policy on all tenant tables
CREATE POLICY tenant_isolation ON files
  USING (organization_id = current_setting('app.current_organization_id'));
```

### 2.2 Application-Level Enforcement

Even with RLS, the application always includes `organization_id` in WHERE clauses:

```python
# Always use organization-scoped queries
result = await db.execute(
    select(File).where(
        File.organization_id == ctx.organization_id,
        File.project_id == ctx.project_id,
        File.file_id == file_id,
    )
)
```

### 2.3 Database Roles

```sql
-- Application role (used by all services)
CREATE ROLE filenest_app WITH LOGIN PASSWORD '...';
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO filenest_app;

-- Read-only role (used by analytics, audit exports)
CREATE ROLE filenest_readonly WITH LOGIN PASSWORD '...';
GRANT SELECT ON ALL TABLES IN SCHEMA public TO filenest_readonly;

-- Migration role (used only by Alembic)
CREATE ROLE filenest_migrate WITH LOGIN PASSWORD '...';
GRANT ALL ON ALL TABLES IN SCHEMA public TO filenest_migrate;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO filenest_migrate;
```

---

## 3. Schema Overview

```
organizations
  └── projects
       ├── environments
       ├── files
       │    ├── file_versions
       │    ├── file_tags
       │    └── file_processing_results
       ├── folders
       ├── metadata_schemas
       ├── storage_configs
       ├── compliance_profiles
       ├── processing_pipeline_configs
       └── search_index_configs

users (organization-scoped)
roles
user_roles

api_keys (project-scoped)
service_accounts (project-scoped)
service_account_scopes

webhooks (project-scoped)
webhook_events

audit_logs (organization-scoped, append-only)

processing_jobs (file-scoped)
processing_job_stages

events (organization-scoped)
```

---

## 4. Table Definitions

### 4.1 organizations

```sql
CREATE TABLE organizations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug                VARCHAR(63) NOT NULL UNIQUE,
    name                VARCHAR(255) NOT NULL,
    plan                VARCHAR(50) NOT NULL DEFAULT 'starter'
                            CHECK (plan IN ('starter', 'professional', 'enterprise', 'healthcare_enterprise')),
    status              VARCHAR(50) NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'suspended', 'cancelled')),
    
    -- Billing
    billing_email       VARCHAR(255),
    stripe_customer_id  VARCHAR(255),
    
    -- Limits
    max_projects        INT NOT NULL DEFAULT 5,
    max_storage_gb      BIGINT NOT NULL DEFAULT 50,
    max_users           INT NOT NULL DEFAULT 10,
    
    -- Settings
    settings            JSONB NOT NULL DEFAULT '{}',
    
    -- Compliance
    baa_signed          BOOLEAN NOT NULL DEFAULT FALSE,
    baa_signed_at       TIMESTAMP WITH TIME ZONE,
    baa_signed_by       VARCHAR(255),
    
    -- Audit
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_status ON organizations(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_organizations_plan ON organizations(plan) WHERE deleted_at IS NULL;
```

---

### 4.2 projects

```sql
CREATE TABLE projects (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    slug                VARCHAR(63) NOT NULL,
    name                VARCHAR(255) NOT NULL,
    description         TEXT,
    status              VARCHAR(50) NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'suspended', 'archived')),
    
    -- Configuration (the core of FileNest)
    config              JSONB NOT NULL DEFAULT '{}',
    
    -- Quick-access config fields (denormalized for query performance)
    compliance_profile  VARCHAR(50) NOT NULL DEFAULT 'generic'
                            CHECK (compliance_profile IN (
                                'generic', 'healthcare', 'finance', 'legal', 'insurance', 'custom'
                            )),
    -- Storage: mode = 'managed' (FileNest-hosted) or 'byob' (customer endpoint)
    storage_mode        VARCHAR(20) NOT NULL DEFAULT 'managed'
                            CHECK (storage_mode IN ('managed', 'byob')),
    storage_provider    VARCHAR(50) NOT NULL DEFAULT 's3'
                            CHECK (storage_provider IN ('s3', 'azure_blob', 'gcs', 'minio', 'r2', 'rustfs')),
    data_residency      VARCHAR(50) DEFAULT 'us'
                            CHECK (data_residency IN ('us', 'eu', 'india', 'middle_east', 'any')),
    
    -- Feature flags (denormalized from config for performance)
    versioning_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
    worm_enabled        BOOLEAN NOT NULL DEFAULT FALSE,
    legal_hold_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
    ocr_enabled         BOOLEAN NOT NULL DEFAULT FALSE,
    phi_detection_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    pii_detection_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Metadata
    created_by          UUID REFERENCES users(id),
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(organization_id, slug)
);

CREATE INDEX idx_projects_organization_id ON projects(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_compliance_profile ON projects(compliance_profile) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_storage_provider ON projects(storage_provider) WHERE deleted_at IS NULL;
```

---

### 4.3 project_configs

One row per project (1:1). Auto-created in the same transaction as the parent project.
Stores all per-project configuration as discrete typed columns — no JSONB blobs.
Grouped into three logical categories: upload restrictions, network security, and compliance.

```sql
CREATE TABLE project_configs (
    id                      VARCHAR PRIMARY KEY,
    organization_id         VARCHAR NOT NULL,
    project_id              VARCHAR NOT NULL UNIQUE,   -- 1:1 with projects

    -- ── Upload restrictions ──────────────────────────────────────────────────
    -- null = unlimited / all allowed

    -- Maximum file size accepted for this project.
    max_file_size_bytes     BIGINT,

    -- Comma-separated MIME types that are accepted, e.g. "image/jpeg,image/png".
    -- null = all MIME types accepted.
    allowed_mime_types      TEXT,

    -- Comma-separated file extensions, e.g. ".pdf,.docx".
    -- null = all extensions accepted.
    allowed_extensions      TEXT,

    -- Maximum number of files accepted in a single multipart upload request.
    -- null = unlimited.
    max_files_per_request   INTEGER,

    -- ── Network security ────────────────────────────────────────────────────
    -- null = no restriction

    -- Comma-separated CIDR blocks allowed to call the API for this project,
    -- e.g. "10.0.0.0/8,203.0.113.42/32". null = all IPs allowed.
    allowed_ips             TEXT,

    -- Comma-separated origins permitted for browser (CORS) requests,
    -- e.g. "https://app.example.com,https://www.example.com". null = all origins.
    allowed_origins         TEXT,

    -- When true, all file downloads must go through a signed URL.
    require_signed_urls     BOOLEAN NOT NULL DEFAULT FALSE,

    -- Lifetime of generated signed URLs in seconds. Default 1 hour.
    signed_url_ttl_seconds  INTEGER NOT NULL DEFAULT 3600,

    -- ── Processing / feature flags ───────────────────────────────────────────
    -- These mirror versioning_enabled and ocr_enabled on the projects table.
    -- The canonical values will be migrated here in a future phase; until then
    -- both tables carry the flag and must be kept in sync on update.

    -- Enable per-file version history.
    versioning_enabled      BOOLEAN NOT NULL DEFAULT FALSE,

    -- Run OCR (optical character recognition) on supported file types after upload.
    ocr_enabled             BOOLEAN NOT NULL DEFAULT FALSE,

    -- Run ClamAV virus scan on every upload before marking the file ready.
    virus_scan_enabled      BOOLEAN NOT NULL DEFAULT FALSE,

    -- ── Compliance (stored now; enforced in Phase 8) ─────────────────────────

    -- Number of days files must be retained before they can be deleted.
    -- null = no minimum retention.
    retention_days          INTEGER,

    -- Write-once-read-many: prevents all modifications and deletions to files
    -- once committed. Enforced at Phase 8.
    worm_enabled            BOOLEAN NOT NULL DEFAULT FALSE,

    -- Enables legal hold on individual files — overrides retention and WORM.
    -- Enforced at Phase 8.
    legal_hold_enabled      BOOLEAN NOT NULL DEFAULT FALSE,

    -- Geographic region where file bytes must be stored.
    -- null = no restriction. Enforced at Phase 8.
    data_residency          VARCHAR(50)
                                CHECK (data_residency IN ('us', 'eu', 'india', 'middle_east', 'any')),

    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_project_configs_organization_id ON project_configs(organization_id);
```

---

### 4.4 environments

```sql
CREATE TABLE environments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL REFERENCES organizations(id),
    project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name                VARCHAR(50) NOT NULL
                            CHECK (name IN ('development', 'staging', 'production')),
    slug                VARCHAR(50) NOT NULL,
    
    -- Environment-specific overrides on project config
    config_overrides    JSONB NOT NULL DEFAULT '{}',
    
    -- Relaxed compliance for non-production
    enforce_compliance  BOOLEAN NOT NULL DEFAULT TRUE,
    
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    UNIQUE(project_id, name)
);

CREATE INDEX idx_environments_project_id ON environments(project_id);
```

---

### 4.4 users

```sql
CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Identity
    email               VARCHAR(255) NOT NULL,
    email_verified      BOOLEAN NOT NULL DEFAULT FALSE,
    name                VARCHAR(255),
    avatar_url          VARCHAR(500),
    
    -- Auth
    password_hash       VARCHAR(255),        -- Null for SSO-only users
    last_login_at       TIMESTAMP WITH TIME ZONE,
    failed_login_count  INT NOT NULL DEFAULT 0,
    locked_at           TIMESTAMP WITH TIME ZONE,
    
    -- SSO
    sso_provider        VARCHAR(50),         -- 'saml', 'google', 'okta'
    sso_external_id     VARCHAR(255),
    
    -- Status
    status              VARCHAR(50) NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'inactive', 'invited', 'suspended')),
    
    -- Audit
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(organization_id, email)
);

CREATE INDEX idx_users_organization_id ON users(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_sso_external_id ON users(sso_provider, sso_external_id)
    WHERE sso_external_id IS NOT NULL;
```

---

### 4.5 roles

```sql
CREATE TABLE roles (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID REFERENCES organizations(id),  -- NULL = system role
    name                VARCHAR(100) NOT NULL,
    description         TEXT,
    is_system_role      BOOLEAN NOT NULL DEFAULT FALSE,
    permissions         JSONB NOT NULL DEFAULT '[]',
    
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    UNIQUE(organization_id, name)
);

-- System roles (organization_id = NULL)
INSERT INTO roles (id, name, is_system_role, permissions) VALUES
    (gen_random_uuid(), 'admin', TRUE,
     '["files:*", "projects:*", "users:*", "api_keys:*", "audit:read", "compliance:*"]'),
    (gen_random_uuid(), 'manager', TRUE,
     '["files:*", "projects:read", "projects:update", "users:read", "api_keys:create"]'),
    (gen_random_uuid(), 'editor', TRUE,
     '["files:upload", "files:download", "files:delete", "files:update_metadata"]'),
    (gen_random_uuid(), 'viewer', TRUE,
     '["files:download", "files:read"]'),
    (gen_random_uuid(), 'auditor', TRUE,
     '["files:read", "audit:read", "compliance:read"]');
```

---

### 4.6 user_roles

```sql
CREATE TABLE user_roles (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL REFERENCES organizations(id),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id             UUID NOT NULL REFERENCES roles(id),
    
    -- Scope: null = organization-wide, set = project-specific
    project_id          UUID REFERENCES projects(id) ON DELETE CASCADE,
    
    granted_by          UUID REFERENCES users(id),
    granted_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at          TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(user_id, role_id, project_id)
);

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_project_id ON user_roles(project_id) WHERE project_id IS NOT NULL;
```

---

### 4.7 api_keys

```sql
CREATE TABLE api_keys (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL REFERENCES organizations(id),
    project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Key material
    key_id              VARCHAR(24) NOT NULL UNIQUE,     -- Public identifier (fn_live_abc123)
    key_hash            VARCHAR(255) NOT NULL,           -- bcrypt hash of the full key
    key_prefix          VARCHAR(20) NOT NULL,            -- First 8 chars for display
    
    name                VARCHAR(255) NOT NULL,
    description         TEXT,
    environment         VARCHAR(50) NOT NULL DEFAULT 'production'
                            CHECK (environment IN ('development', 'staging', 'production')),
    
    -- Permissions
    scopes              VARCHAR(50)[] NOT NULL DEFAULT '{}',
    -- Values: 'upload', 'download', 'delete', 'search', 'metadata:read',
    --         'metadata:write', 'admin', 'webhook:manage'
    
    -- Network restrictions
    allowed_ips         INET[] DEFAULT NULL,  -- NULL = no restriction
    allowed_origins     VARCHAR(255)[] DEFAULT NULL,
    
    -- Status
    status              VARCHAR(50) NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'revoked', 'expired')),
    last_used_at        TIMESTAMP WITH TIME ZONE,
    usage_count         BIGINT NOT NULL DEFAULT 0,
    
    -- Expiration
    expires_at          TIMESTAMP WITH TIME ZONE,
    
    -- Rotation tracking
    rotated_from        UUID REFERENCES api_keys(id),
    rotated_at          TIMESTAMP WITH TIME ZONE,
    
    -- Audit
    created_by          UUID REFERENCES users(id),
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    revoked_at          TIMESTAMP WITH TIME ZONE,
    revoked_by          UUID REFERENCES users(id)
);

CREATE INDEX idx_api_keys_key_id ON api_keys(key_id);
CREATE INDEX idx_api_keys_project_id ON api_keys(project_id);
CREATE INDEX idx_api_keys_organization_id ON api_keys(organization_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_status ON api_keys(status) WHERE status = 'active';
```

---

### 4.8 service_accounts

```sql
CREATE TABLE service_accounts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL REFERENCES organizations(id),
    project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    name                VARCHAR(255) NOT NULL,
    description         TEXT,
    environment         VARCHAR(50) NOT NULL DEFAULT 'production',
    
    -- Credentials
    client_id           VARCHAR(64) NOT NULL UNIQUE,
    client_secret_hash  VARCHAR(255) NOT NULL,
    client_secret_prefix VARCHAR(20) NOT NULL,
    
    -- Permissions
    scopes              VARCHAR(50)[] NOT NULL DEFAULT '{}',
    
    -- Status
    status              VARCHAR(50) NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'revoked')),
    last_used_at        TIMESTAMP WITH TIME ZONE,
    
    created_by          UUID REFERENCES users(id),
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_service_accounts_client_id ON service_accounts(client_id);
CREATE INDEX idx_service_accounts_project_id ON service_accounts(project_id);
```

---

### 4.9 storage_configs

```sql
CREATE TABLE storage_configs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL REFERENCES organizations(id),
    project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    environment         VARCHAR(50) NOT NULL,

    -- 'managed' = FileNest provides and manages the bucket (default, zero customer config)
    -- 'byob'    = customer provides their own endpoint URL + credentials
    storage_mode        VARCHAR(20) NOT NULL DEFAULT 'managed'
                            CHECK (storage_mode IN ('managed', 'byob')),

    provider            VARCHAR(50) NOT NULL
                            CHECK (provider IN ('s3', 'azure_blob', 'gcs', 'minio', 'r2', 'rustfs')),

    -- Provider-specific config (encrypted at application level, AES-256)
    -- For 'managed' mode: empty — platform defaults are used
    -- For 'byob' mode: access key, secret, connection string, service account JSON, etc.
    config_encrypted    BYTEA,

    -- Derived non-sensitive config (stored plaintext for display + routing)
    region              VARCHAR(100),
    bucket_name         VARCHAR(255),
    -- endpoint_url is required for byob minio / rustfs / r2; null for managed S3/GCS/Azure
    endpoint_url        VARCHAR(500),

    -- S3-family (s3, minio, rustfs, r2) only — NULL for Azure Blob and GCS
    -- (those providers enforce always-on encryption that is not configurable here).
    server_side_encryption VARCHAR(50)
                            CHECK (server_side_encryption IN ('AES256', 'aws:kms')),
    kms_key_id          VARCHAR(500),

    -- When TRUE, FileNest sends ServerSideEncryption: AES256 on every PUT request.
    -- Defaults TRUE for s3 / r2 / azure_blob / gcs (always-on); FALSE for minio / rustfs
    -- (requires KMS key on the server — user-togglable via PATCH /storage/sse).
    sse_enabled         BOOLEAN NOT NULL DEFAULT FALSE,

    -- Verification: FileNest writes a test object to confirm byob connectivity
    status              VARCHAR(50) NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'inactive', 'pending_verification', 'verification_failed')),
    last_verified_at    TIMESTAMP WITH TIME ZONE,

    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    UNIQUE(project_id, environment)
);
```

---

### 4.10 storage_migrations

Tracks a background job that copies all file bytes for a project from one storage
provider to another. Triggered when a customer switches storage config (e.g. managed
S3 → their own MinIO). A dry-run step is mandatory before the actual copy runs.

```sql
CREATE TABLE storage_migrations (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id             UUID NOT NULL,
    project_id                  UUID NOT NULL REFERENCES projects(id),

    -- Source — null means the FileNest platform managed default.
    source_config_id            UUID REFERENCES storage_configs(id),
    source_provider             VARCHAR(50) NOT NULL,

    -- Target — the new StorageConfig being migrated to.
    target_config_id            UUID NOT NULL REFERENCES storage_configs(id),
    target_provider             VARCHAR(50) NOT NULL,

    -- Job state.
    -- pending → dry_run → in_progress → completed | completed_with_errors | failed | cancelled
    status                      VARCHAR(50) NOT NULL DEFAULT 'pending'
                                    CHECK (status IN (
                                        'pending', 'dry_run', 'in_progress', 'paused',
                                        'completed', 'completed_with_errors', 'failed', 'cancelled'
                                    )),
    is_dry_run                  BOOLEAN NOT NULL DEFAULT FALSE,

    -- Progress counters — updated in real time by the migration worker.
    total_files                 INTEGER,
    completed_files             INTEGER NOT NULL DEFAULT 0,
    failed_files                INTEGER NOT NULL DEFAULT 0,
    skipped_files               INTEGER NOT NULL DEFAULT 0,
    total_bytes                 BIGINT,
    migrated_bytes              BIGINT NOT NULL DEFAULT 0,

    -- Timing.
    started_at                  TIMESTAMPTZ,
    completed_at                TIMESTAMPTZ,
    estimated_duration_seconds  INTEGER,

    -- Cutover: when the project's active config was switched to the target.
    cutover_at                  TIMESTAMPTZ,

    -- Error tracking.
    last_error                  TEXT,
    -- Per-file error log: [{file_id, error, timestamp}, ...]
    error_log                   JSONB NOT NULL DEFAULT '[]',

    created_by                  TEXT,   -- user_id from IAM (string FK, no cross-DB constraint)
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_storage_migrations_project
    ON storage_migrations(project_id, status);
```

---

### 4.11 metadata_schemas

```sql
CREATE TABLE metadata_schemas (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL REFERENCES organizations(id),
    project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    name                VARCHAR(255) NOT NULL,
    description         TEXT,
    version             INT NOT NULL DEFAULT 1,
    
    -- The JSON Schema definition
    schema              JSONB NOT NULL,
    
    -- Example:
    -- {
    --   "properties": {
    --     "patientId": { "type": "string", "required": true },
    --     "documentType": {
    --       "type": "string",
    --       "enum": ["LabReport", "Discharge", "Consent"],
    --       "required": true
    --     },
    --     "encounterId": { "type": "string" }
    --   },
    --   "additionalProperties": false
    -- }
    
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    
    created_by          UUID REFERENCES users(id),
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    UNIQUE(project_id, name, version)
);

CREATE INDEX idx_metadata_schemas_project_id ON metadata_schemas(project_id)
    WHERE is_active = TRUE;
```

---

### 4.12 folders

```sql
CREATE TABLE folders (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL REFERENCES organizations(id),
    project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    environment_id      UUID NOT NULL REFERENCES environments(id),
    
    name                VARCHAR(500) NOT NULL,
    path                TEXT NOT NULL,          -- Full path: /patients/2026/lab-reports
    parent_folder_id    UUID REFERENCES folders(id) ON DELETE CASCADE,
    
    -- Permissions can be inherited or overridden
    permissions_inherited BOOLEAN NOT NULL DEFAULT TRUE,
    permissions         JSONB DEFAULT NULL,
    
    -- Metadata
    metadata            JSONB NOT NULL DEFAULT '{}',
    
    -- Legal hold (cascades to all files in folder)
    legal_hold_active   BOOLEAN NOT NULL DEFAULT FALSE,
    legal_hold_reason   TEXT,
    
    created_by          UUID REFERENCES users(id),
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(project_id, environment_id, path)
);

CREATE INDEX idx_folders_project_id ON folders(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_folders_parent_folder_id ON folders(parent_folder_id);
CREATE INDEX idx_folders_path ON folders(project_id, path text_pattern_ops);
```

---

### 4.13 files

```sql
CREATE TABLE files (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL REFERENCES organizations(id),
    project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
    environment_id      UUID NOT NULL REFERENCES environments(id),
    folder_id           UUID REFERENCES folders(id) ON DELETE SET NULL,
    
    -- Identity
    filename            VARCHAR(500) NOT NULL,
    original_filename   VARCHAR(500) NOT NULL,
    slug                VARCHAR(255),
    
    -- File properties
    size                BIGINT NOT NULL,
    mime_type           VARCHAR(255) NOT NULL,
    mime_type_verified  VARCHAR(255),           -- Detected via magic bytes
    checksum_md5        VARCHAR(32),
    checksum_sha256     VARCHAR(64),
    
    -- Storage
    storage_key         TEXT NOT NULL,
    storage_provider    VARCHAR(50) NOT NULL,
    storage_bucket      VARCHAR(255) NOT NULL,
    storage_region      VARCHAR(100),
    
    -- Status
    status              VARCHAR(50) NOT NULL DEFAULT 'uploading'
                            CHECK (status IN (
                                'uploading',        -- Upload in progress
                                'upload_complete',  -- Bytes received, not yet processed
                                'processing',       -- Pipeline running
                                'ready',            -- Available for download
                                'failed',           -- Processing failed (still downloadable)
                                'quarantined',      -- Virus detected
                                'deleted'           -- Soft deleted
                            )),
    
    -- Versioning
    current_version_id  UUID,                   -- FK to file_versions set after creation
    version_count       INT NOT NULL DEFAULT 1,
    
    -- Metadata
    metadata            JSONB NOT NULL DEFAULT '{}',
    tags                VARCHAR(100)[] NOT NULL DEFAULT '{}',
    
    -- Compliance
    legal_hold_active   BOOLEAN NOT NULL DEFAULT FALSE,
    legal_hold_reason   TEXT,
    legal_hold_set_by   UUID REFERENCES users(id),
    legal_hold_set_at   TIMESTAMP WITH TIME ZONE,
    
    worm_committed      BOOLEAN NOT NULL DEFAULT FALSE,
    worm_committed_at   TIMESTAMP WITH TIME ZONE,
    
    retention_policy_id UUID,
    retain_until        TIMESTAMP WITH TIME ZONE,
    
    -- Processing results (summary)
    virus_scan_result   VARCHAR(50)             -- 'clean', 'infected', 'pending', 'failed'
                            CHECK (virus_scan_result IN ('clean', 'infected', 'pending', 'failed', NULL)),
    phi_detected        BOOLEAN,
    pii_detected        BOOLEAN,
    ocr_extracted       BOOLEAN NOT NULL DEFAULT FALSE,
    classification      VARCHAR(255),
    
    -- Download tracking
    download_count      BIGINT NOT NULL DEFAULT 0,
    last_downloaded_at  TIMESTAMP WITH TIME ZONE,
    
    -- Upload info
    uploaded_by         UUID REFERENCES users(id),
    uploaded_by_sa      UUID REFERENCES service_accounts(id),
    upload_ip           INET,
    upload_user_agent   VARCHAR(500),
    
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT files_size_positive CHECK (size >= 0)
) PARTITION BY RANGE (created_at);

-- Partitions by month
CREATE TABLE files_2026_01 PARTITION OF files
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE files_2026_02 PARTITION OF files
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
-- ... create for each month, automated via migration

-- Indexes on the parent table (inherited by partitions)
CREATE INDEX idx_files_organization_id ON files(organization_id, created_at DESC)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_files_project_id ON files(project_id, created_at DESC)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_files_folder_id ON files(folder_id)
    WHERE deleted_at IS NULL AND folder_id IS NOT NULL;
CREATE INDEX idx_files_status ON files(project_id, status)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_files_mime_type ON files(project_id, mime_type)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_files_tags ON files USING GIN(tags)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_files_metadata ON files USING GIN(metadata)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_files_legal_hold ON files(project_id, legal_hold_active)
    WHERE legal_hold_active = TRUE;
CREATE INDEX idx_files_retain_until ON files(project_id, retain_until)
    WHERE deleted_at IS NULL AND retain_until IS NOT NULL;
```

---

### 4.14 file_versions

```sql
CREATE TABLE file_versions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL REFERENCES organizations(id),
    file_id             UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    project_id          UUID NOT NULL REFERENCES projects(id),
    
    version_number      INT NOT NULL,
    label               VARCHAR(100),           -- Optional user-provided label
    
    -- Version-specific storage
    storage_key         TEXT NOT NULL,
    size                BIGINT NOT NULL,
    checksum_sha256     VARCHAR(64),
    
    -- Version metadata (snapshot of file metadata at this version)
    metadata_snapshot   JSONB NOT NULL DEFAULT '{}',
    
    -- Who created this version
    created_by          UUID REFERENCES users(id),
    created_by_sa       UUID REFERENCES service_accounts(id),
    
    -- Change information
    change_note         TEXT,
    
    -- This version's processing status
    virus_scan_result   VARCHAR(50),
    
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    UNIQUE(file_id, version_number)
);

CREATE INDEX idx_file_versions_file_id ON file_versions(file_id, version_number DESC);
```

---

### 4.15 upload_sessions

```sql
CREATE TABLE upload_sessions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL REFERENCES organizations(id),
    project_id          UUID NOT NULL REFERENCES projects(id),
    environment_id      UUID NOT NULL REFERENCES environments(id),
    
    file_id             UUID REFERENCES files(id),  -- Set after file record created
    
    -- Upload type
    upload_type         VARCHAR(50) NOT NULL DEFAULT 'single'
                            CHECK (upload_type IN ('single', 'multipart', 'resumable', 'direct')),
    
    -- Multipart/resumable state
    provider_upload_id  VARCHAR(500),           -- S3 multipart upload ID etc.
    total_size          BIGINT,
    chunk_size          INT NOT NULL DEFAULT 5242880,  -- 5MB default
    total_chunks        INT,
    uploaded_chunks     INT[] NOT NULL DEFAULT '{}',
    
    -- Pre-declared metadata
    filename            VARCHAR(500) NOT NULL,
    mime_type           VARCHAR(255),
    metadata            JSONB NOT NULL DEFAULT '{}',
    
    -- Status
    status              VARCHAR(50) NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'expired')),
    
    initiated_by        UUID REFERENCES users(id),
    initiated_by_sa     UUID REFERENCES service_accounts(id),
    
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at          TIMESTAMP WITH TIME ZONE NOT NULL
                            DEFAULT (NOW() + INTERVAL '24 hours'),
    completed_at        TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_upload_sessions_project_id ON upload_sessions(project_id)
    WHERE status IN ('pending', 'in_progress');
CREATE INDEX idx_upload_sessions_expires_at ON upload_sessions(expires_at)
    WHERE status NOT IN ('completed', 'failed', 'expired');
```

---

### 4.16 processing_jobs

```sql
CREATE TABLE processing_jobs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL REFERENCES organizations(id),
    project_id          UUID NOT NULL REFERENCES projects(id),
    file_id             UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    version_id          UUID REFERENCES file_versions(id),
    
    -- Pipeline configuration at time of job creation
    pipeline_config     JSONB NOT NULL,
    
    -- Overall status
    status              VARCHAR(50) NOT NULL DEFAULT 'pending'
                            CHECK (status IN (
                                'pending', 'running', 'completed', 'failed',
                                'partially_failed', 'cancelled'
                            )),
    
    -- Timing
    queued_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    started_at          TIMESTAMP WITH TIME ZONE,
    completed_at        TIMESTAMP WITH TIME ZONE,
    
    -- Retry
    attempt_count       INT NOT NULL DEFAULT 0,
    max_attempts        INT NOT NULL DEFAULT 3,
    next_retry_at       TIMESTAMP WITH TIME ZONE,
    
    -- Results summary
    stages_completed    VARCHAR(50)[] NOT NULL DEFAULT '{}',
    stages_failed       VARCHAR(50)[] NOT NULL DEFAULT '{}',
    error_message       TEXT,
    
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

CREATE TABLE processing_jobs_2026_01 PARTITION OF processing_jobs
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE INDEX idx_processing_jobs_file_id ON processing_jobs(file_id);
CREATE INDEX idx_processing_jobs_status ON processing_jobs(status, queued_at)
    WHERE status IN ('pending', 'running');
```

---

### 4.17 processing_job_stages

```sql
CREATE TABLE processing_job_stages (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id              UUID NOT NULL REFERENCES processing_jobs(id) ON DELETE CASCADE,
    organization_id     UUID NOT NULL REFERENCES organizations(id),
    
    stage_name          VARCHAR(100) NOT NULL,
    -- Values: 'virus_scan', 'mime_validation', 'ocr', 'phi_detection',
    --         'pii_detection', 'classification', 'thumbnail', 'preview',
    --         'embedding', 'indexing'
    
    status              VARCHAR(50) NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
    
    -- Stage-specific results
    result              JSONB,
    -- Example for virus_scan:
    -- { "provider": "clamav", "result": "clean", "scanned_at": "..." }
    -- Example for ocr:
    -- { "provider": "tesseract", "text_length": 1234, "confidence": 0.95 }
    -- Example for phi_detection:
    -- { "detected": true, "entities": ["Name", "DOB"], "count": 3 }
    
    error_message       TEXT,
    duration_ms         INT,
    
    started_at          TIMESTAMP WITH TIME ZONE,
    completed_at        TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(job_id, stage_name)
);

CREATE INDEX idx_processing_job_stages_job_id ON processing_job_stages(job_id);
```

---

### 4.18 audit_logs

```sql
-- IMPORTANT: This table is APPEND-ONLY. No UPDATE or DELETE is permitted.
-- RLS enforces this: only INSERT is allowed for the app role.

CREATE TABLE audit_logs (
    id                  UUID NOT NULL DEFAULT gen_random_uuid(),
    
    -- Tenant context
    organization_id     UUID NOT NULL,
    project_id          UUID,
    environment_id      UUID,
    
    -- Event
    event_type          VARCHAR(100) NOT NULL,
    -- Values: 'file.uploaded', 'file.downloaded', 'file.deleted',
    --         'file.restored', 'file.versioned', 'file.legal_hold_set',
    --         'file.legal_hold_released', 'file.metadata_updated',
    --         'api_key.created', 'api_key.revoked', 'api_key.rotated',
    --         'project.created', 'project.config_changed',
    --         'user.login', 'user.logout', 'user.created', 'user.role_changed'
    
    -- Subject (what was acted upon)
    subject_type        VARCHAR(100) NOT NULL,  -- 'file', 'folder', 'project', 'user', etc.
    subject_id          UUID,
    
    -- Actor (who did it)
    actor_type          VARCHAR(50) NOT NULL
                            CHECK (actor_type IN ('user', 'service_account', 'api_key', 'system')),
    actor_id            UUID,
    actor_name          VARCHAR(255),
    actor_api_key_id    UUID,
    
    -- Network context
    ip_address          INET,
    user_agent          VARCHAR(500),
    request_id          UUID,
    
    -- Event payload (immutable snapshot)
    payload             JSONB NOT NULL DEFAULT '{}',
    -- Contains before/after state where applicable
    -- Example: { "before": {"status": "active"}, "after": {"status": "deleted"} }
    
    -- Compliance tagging
    compliance_relevant BOOLEAN NOT NULL DEFAULT FALSE,
    phi_involved        BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Timestamp
    occurred_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Partitioning key (same as occurred_at for partition pruning)
    PRIMARY KEY (id, occurred_at)
) PARTITION BY RANGE (occurred_at);

-- Monthly partitions
CREATE TABLE audit_logs_2026_01 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
-- Auto-created going forward

-- Indexes
CREATE INDEX idx_audit_logs_org_id ON audit_logs(organization_id, occurred_at DESC);
CREATE INDEX idx_audit_logs_project_id ON audit_logs(project_id, occurred_at DESC)
    WHERE project_id IS NOT NULL;
CREATE INDEX idx_audit_logs_subject ON audit_logs(subject_type, subject_id, occurred_at DESC);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_type, actor_id, occurred_at DESC);
CREATE INDEX idx_audit_logs_event_type ON audit_logs(organization_id, event_type, occurred_at DESC);
CREATE INDEX idx_audit_logs_phi ON audit_logs(organization_id, occurred_at DESC)
    WHERE phi_involved = TRUE;

-- Prevent updates and deletes via RLS
CREATE POLICY audit_logs_insert_only ON audit_logs FOR INSERT WITH CHECK (TRUE);
CREATE POLICY audit_logs_select ON audit_logs FOR SELECT
    USING (organization_id = current_setting('app.current_organization_id')::UUID);
-- No UPDATE or DELETE policies = those operations are blocked
```

---

### 4.19 webhooks

```sql
CREATE TABLE webhooks (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL REFERENCES organizations(id),
    project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    name                VARCHAR(255) NOT NULL,
    url                 VARCHAR(2048) NOT NULL,
    
    -- Event subscriptions
    subscribed_events   VARCHAR(100)[] NOT NULL DEFAULT '{}',
    -- ['file.uploaded', 'file.processed', 'file.deleted', '*']
    
    -- Security
    signing_secret      VARCHAR(255) NOT NULL,  -- Used for HMAC-SHA256 signature
    
    -- Status
    status              VARCHAR(50) NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'inactive', 'failing')),
    
    -- Reliability settings
    max_retries         INT NOT NULL DEFAULT 5,
    timeout_seconds     INT NOT NULL DEFAULT 30,
    
    -- Health tracking
    last_success_at     TIMESTAMP WITH TIME ZONE,
    last_failure_at     TIMESTAMP WITH TIME ZONE,
    consecutive_failures INT NOT NULL DEFAULT 0,
    
    created_by          UUID REFERENCES users(id),
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhooks_project_id ON webhooks(project_id) WHERE status = 'active';
```

---

### 4.20 webhook_deliveries

```sql
CREATE TABLE webhook_deliveries (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL REFERENCES organizations(id),
    webhook_id          UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    
    event_type          VARCHAR(100) NOT NULL,
    event_id            UUID NOT NULL,
    
    -- Delivery state
    status              VARCHAR(50) NOT NULL DEFAULT 'pending'
                            CHECK (status IN (
                                'pending', 'in_flight', 'delivered',
                                'failed', 'dead_lettered'
                            )),
    
    attempt_count       INT NOT NULL DEFAULT 0,
    next_attempt_at     TIMESTAMP WITH TIME ZONE,
    
    -- Request/response log
    request_payload     JSONB NOT NULL,
    request_headers     JSONB,
    response_status     INT,
    response_body       TEXT,
    response_time_ms    INT,
    
    -- Timing
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_attempted_at   TIMESTAMP WITH TIME ZONE,
    delivered_at        TIMESTAMP WITH TIME ZONE
) PARTITION BY RANGE (created_at);

CREATE TABLE webhook_deliveries_2026_01 PARTITION OF webhook_deliveries
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE INDEX idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id, created_at DESC);
CREATE INDEX idx_webhook_deliveries_retry ON webhook_deliveries(next_attempt_at)
    WHERE status IN ('pending', 'failed');
```

---

### 4.21 compliance_profiles

```sql
CREATE TABLE compliance_profiles (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID REFERENCES organizations(id),  -- NULL = system profile
    
    name                VARCHAR(100) NOT NULL,
    description         TEXT,
    is_system_profile   BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- The full capability configuration
    config              JSONB NOT NULL,
    -- {
    --   "hipaaControls": true,
    --   "phiDetection": true,
    --   "auditRetentionYears": 7,
    --   "legalHoldEnabled": true,
    --   "worm": false,
    --   "retentionDays": 2555,
    --   "immutableAudit": true,
    --   "encryptionRequired": true,
    --   "allowedStorageProviders": ["s3", "azure"],
    --   "dataResidencyRequired": true
    -- }
    
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    UNIQUE(organization_id, name)
);

-- System profiles
INSERT INTO compliance_profiles (name, is_system_profile, config) VALUES
('generic', TRUE, '{"retentionDays": 365, "auditRetentionYears": 1}'),
('healthcare', TRUE, '{
    "hipaaControls": true, "phiDetection": true, "auditRetentionYears": 7,
    "legalHoldEnabled": true, "immutableAudit": true, "encryptionRequired": true
}'),
('finance', TRUE, '{
    "worm": true, "legalHoldEnabled": true, "retentionDays": 2555,
    "auditRetentionYears": 7, "piiDetection": true
}'),
('legal', TRUE, '{
    "legalHoldEnabled": true, "chainOfCustody": true, "retentionDays": 3650,
    "auditRetentionYears": 10, "immutableAudit": true
}'),
('insurance', TRUE, '{
    "worm": true, "retentionDays": 2555, "auditRetentionYears": 7,
    "piiDetection": true, "classification": true
}');
```

---

### 4.22 events (outbox pattern)

```sql
-- Transactional outbox: events written atomically with DB changes,
-- then published to NATS by outbox worker
CREATE TABLE events (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL,
    project_id          UUID,
    
    event_type          VARCHAR(100) NOT NULL,
    subject_id          UUID,
    
    payload             JSONB NOT NULL,
    
    -- Outbox status
    status              VARCHAR(50) NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'published', 'failed')),
    published_at        TIMESTAMP WITH TIME ZONE,
    attempt_count       INT NOT NULL DEFAULT 0,
    
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

CREATE TABLE events_2026_01 PARTITION OF events
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE INDEX idx_events_pending ON events(created_at)
    WHERE status = 'pending';
```

---

### 4.23 tags (global tag registry)

```sql
CREATE TABLE tags (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL REFERENCES organizations(id),
    project_id          UUID NOT NULL REFERENCES projects(id),
    
    name                VARCHAR(100) NOT NULL,
    color               VARCHAR(7),     -- Hex color
    description         TEXT,
    
    usage_count         BIGINT NOT NULL DEFAULT 0,
    
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    UNIQUE(project_id, name)
);

CREATE INDEX idx_tags_project_id ON tags(project_id);
```

---

## 5. ER Diagram

```
organizations
    ├── id (PK)
    ├── slug
    └── plan
         │
         ├──► projects
         │        ├── id (PK)
         │        ├── organization_id (FK → organizations)
         │        ├── config (JSONB)
         │        ├── compliance_profile
         │        │
         │        ├──► environments
         │        │        └── id (PK)
         │        │
         │        ├──► files (partitioned)
         │        │        ├── id (PK)
         │        │        ├── folder_id (FK → folders)
         │        │        ├── metadata (JSONB)
         │        │        ├── legal_hold_active
         │        │        │
         │        │        ├──► file_versions
         │        │        │        └── id (PK)
         │        │        │
         │        │        └──► processing_jobs
         │        │                 └──► processing_job_stages
         │        │
         │        ├──► folders
         │        │        ├── id (PK)
         │        │        └── parent_folder_id (FK → self)
         │        │
         │        ├──► metadata_schemas
         │        ├──► storage_configs
         │        ├──► api_keys
         │        ├──► service_accounts
         │        └──► webhooks
         │                 └──► webhook_deliveries
         │
         ├──► users
         │        └──► user_roles ──► roles
         │
         └──► audit_logs (partitioned, append-only)
                  └──► events (outbox, partitioned)
```

---

## 6. Indexing Strategy

### 6.1 Index Naming Convention

```
idx_{table}_{columns}[_{suffix}]

Examples:
idx_files_project_id
idx_files_metadata  (GIN)
idx_audit_logs_org_id
```

### 6.2 Partial Indexes

Partial indexes dramatically reduce index size for high-cardinality status columns:

```sql
-- Only index active files (deleted_at IS NULL)
CREATE INDEX idx_files_project_id ON files(project_id, created_at DESC)
    WHERE deleted_at IS NULL;

-- Only index active API keys
CREATE INDEX idx_api_keys_status ON api_keys(project_id, status)
    WHERE status = 'active';

-- Only index pending events (processed ones drop off the index)
CREATE INDEX idx_events_pending ON events(created_at)
    WHERE status = 'pending';
```

### 6.3 GIN Indexes for JSONB

```sql
-- JSONB metadata search
CREATE INDEX idx_files_metadata ON files USING GIN(metadata jsonb_path_ops);

-- Array tags search
CREATE INDEX idx_files_tags ON files USING GIN(tags);

-- Schema properties search
CREATE INDEX idx_metadata_schemas_schema ON metadata_schemas USING GIN(schema);
```

### 6.4 Text Search Indexes

```sql
-- Full-text search on filename (for DB-level search, supplementing OpenSearch)
CREATE INDEX idx_files_filename_fts ON files
    USING GIN(to_tsvector('english', filename))
    WHERE deleted_at IS NULL;
```

---

## 7. Partitioning Strategy

### 7.1 Partitioned Tables

| Table | Partition Key | Partition By | Reason |
|-------|--------------|--------------|--------|
| `files` | `created_at` | Monthly RANGE | High volume, time-range queries |
| `audit_logs` | `occurred_at` | Monthly RANGE | Append-only, massive volume, time-range queries |
| `processing_jobs` | `created_at` | Monthly RANGE | High volume, mostly accessed recently |
| `webhook_deliveries` | `created_at` | Monthly RANGE | High volume, rarely accessed after delivery |
| `events` | `created_at` | Monthly RANGE | Outbox pattern, processed events archived |

### 7.2 Partition Management

```sql
-- Function to auto-create next month's partition
CREATE OR REPLACE FUNCTION create_monthly_partition(
    parent_table TEXT,
    target_month DATE
) RETURNS VOID AS $$
DECLARE
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
BEGIN
    partition_name := parent_table || '_' || TO_CHAR(target_month, 'YYYY_MM');
    start_date := DATE_TRUNC('month', target_month);
    end_date := start_date + INTERVAL '1 month';

    EXECUTE FORMAT(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF %I
         FOR VALUES FROM (%L) TO (%L)',
        partition_name, parent_table, start_date, end_date
    );
END;
$$ LANGUAGE plpgsql;

-- Scheduled: run on the 25th of each month to create next month's partitions
SELECT create_monthly_partition('files', NOW() + INTERVAL '1 month');
SELECT create_monthly_partition('audit_logs', NOW() + INTERVAL '1 month');
SELECT create_monthly_partition('processing_jobs', NOW() + INTERVAL '1 month');
SELECT create_monthly_partition('webhook_deliveries', NOW() + INTERVAL '1 month');
SELECT create_monthly_partition('events', NOW() + INTERVAL '1 month');
```

### 7.3 Partition Pruning

```sql
-- PostgreSQL automatically prunes partitions when WHERE clause includes partition key
-- Always include created_at or occurred_at in queries for partition pruning

-- GOOD: Uses partition pruning
SELECT * FROM files
WHERE organization_id = $1
  AND project_id = $2
  AND created_at >= '2026-01-01'
  AND created_at < '2026-02-01';

-- BAD: Full scan across all partitions
SELECT * FROM files
WHERE organization_id = $1
  AND project_id = $2;
```

---

## 8. Migration Strategy

### 8.1 Alembic Configuration

```python
# alembic/env.py
from app.models import Base
from app.config import settings

target_metadata = Base.metadata

def run_migrations_online():
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        url=settings.database_url,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
        )
        with context.begin_transaction():
            context.run_migrations()
```

### 8.2 Migration Naming Convention

```
{YYYYMMDD_HHMMSS}_{description}.py

Examples:
20260615_120000_create_organizations.py
20260615_120100_create_projects.py
20260615_120200_create_files.py
20260615_120300_add_phi_detection_to_files.py
```

### 8.3 Zero-Downtime Migration Patterns

**Adding a column:**
```sql
-- Safe: new column with default, nullable
ALTER TABLE files ADD COLUMN new_field VARCHAR(100) DEFAULT NULL;

-- Not safe: NOT NULL without default on large table
-- Instead: add nullable, backfill, then add NOT NULL constraint
ALTER TABLE files ADD COLUMN new_required_field VARCHAR(100);
UPDATE files SET new_required_field = 'default_value' WHERE new_required_field IS NULL;
ALTER TABLE files ALTER COLUMN new_required_field SET NOT NULL;
```

**Adding an index:**
```sql
-- Always use CONCURRENTLY on production tables (does not lock)
CREATE INDEX CONCURRENTLY idx_files_new_field ON files(new_field)
    WHERE deleted_at IS NULL;
```

**Renaming a column:**
```sql
-- Step 1 (deploy): Add new column, write to both
ALTER TABLE files ADD COLUMN new_name VARCHAR(100);
-- Step 2 (backfill): Copy data
UPDATE files SET new_name = old_name;
-- Step 3 (deploy): Read from new column only
-- Step 4 (cleanup): Drop old column
ALTER TABLE files DROP COLUMN old_name;
```

---

## 9. Performance Considerations

### 9.1 Connection Pooling

```ini
# PgBouncer configuration
[databases]
filenest = host=postgres-primary port=5432 dbname=filenest

[pgbouncer]
pool_mode = transaction
max_client_conn = 5000
default_pool_size = 50
min_pool_size = 10
reserve_pool_size = 10
server_idle_timeout = 600
```

### 9.2 Read Replica Routing

```python
# SQLAlchemy read/write splitting
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session

write_engine = create_engine(settings.database_primary_url)
read_engine = create_engine(settings.database_replica_url)

class RoutingSession(Session):
    def get_bind(self, mapper=None, clause=None, **kwargs):
        if clause is not None and clause.is_select and not self.get_transaction():
            return read_engine
        return write_engine
```

### 9.3 Query Optimization

```sql
-- Use covering indexes to avoid heap fetches
CREATE INDEX idx_files_list ON files(project_id, created_at DESC)
    INCLUDE (filename, size, mime_type, status)
    WHERE deleted_at IS NULL;

-- Avoid N+1 with eager loading
SELECT f.*, fv.version_number, fv.storage_key
FROM files f
JOIN file_versions fv ON fv.id = f.current_version_id
WHERE f.project_id = $1 AND f.deleted_at IS NULL
ORDER BY f.created_at DESC
LIMIT 50 OFFSET 0;
```

---

## 10. Data Retention and Archival

### 10.1 Audit Log Retention

```sql
-- Audit logs are never deleted within retention period
-- After retention period, archive to cold storage (S3 Glacier)

-- Background job: archive old partitions
CREATE OR REPLACE FUNCTION archive_old_audit_partition(retention_years INT)
RETURNS VOID AS $$
DECLARE
    cutoff_date DATE := NOW() - (retention_years || ' years')::INTERVAL;
    partition_name TEXT;
BEGIN
    -- Export to S3 via COPY
    EXECUTE FORMAT(
        'COPY (SELECT * FROM audit_logs WHERE occurred_at < %L) TO PROGRAM
         ''aws s3 cp - s3://filenest-archive/audit-logs/%s.csv''',
        cutoff_date,
        TO_CHAR(cutoff_date, 'YYYY_MM')
    );
    -- Drop old partition after successful export
    partition_name := 'audit_logs_' || TO_CHAR(cutoff_date, 'YYYY_MM');
    EXECUTE FORMAT('DROP TABLE IF EXISTS %I', partition_name);
END;
$$ LANGUAGE plpgsql;
```

### 10.2 File Retention Enforcement

```sql
-- Background job query: find files past retention that are safe to delete
SELECT f.id, f.storage_key, f.organization_id, f.project_id
FROM files f
WHERE f.deleted_at IS NULL
  AND f.legal_hold_active = FALSE
  AND f.worm_committed = FALSE
  AND f.retain_until IS NOT NULL
  AND f.retain_until < NOW()
ORDER BY f.retain_until ASC
LIMIT 1000;
```
