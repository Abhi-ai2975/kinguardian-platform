"""app.schemas.storage_config — Pydantic request/response models for storage configuration."""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class StorageConfigUpdateRequest(BaseModel):
    """
    Body for updating BYOB storage credentials.

    Sensitive credential fields vary by provider family:
      S3 / MinIO / RustFS / R2 — access_key_id + secret_access_key (+ optional kms_key_id)
      Azure Blob               — account_name + account_key
      GCS                      — credentials_json (full service account JSON string)

    Plaintext routing fields (bucket_name, region, endpoint_url) are stored as-is
    for display and provider init. Credentials are AES-256-GCM encrypted before
    persistence — plaintext never leaves application memory.

    endpoint_url is required for minio, r2, and rustfs; leave null for s3, azure_blob,
    and gcs which use standard SDK endpoints.
    """

    bucket_name: str = Field(..., min_length=1, max_length=255)
    region: str | None = Field(default=None, max_length=100)
    endpoint_url: str | None = Field(default=None, description="Required for MinIO, R2, and RustFS.")

    # S3-compatible (s3 / minio / rustfs / r2)
    access_key_id: str | None = None
    secret_access_key: str | None = None
    server_side_encryption: Literal["AES256", "aws:kms"] = "AES256"
    kms_key_id: str | None = Field(default=None, description="Only used when server_side_encryption is aws:kms.")

    # Azure Blob Storage
    account_name: str | None = None
    account_key: str | None = None

    # Google Cloud Storage
    credentials_json: str | None = Field(
        default=None,
        description="Full service account JSON string (GCS only).",
    )


class StorageConfigResponse(BaseModel):
    """
    Non-sensitive storage configuration for a project.

    Encrypted credentials are never returned — only plaintext routing fields.
    server_side_encryption is null for Azure Blob and GCS (always-on SSE, not configurable).
    sse_enabled reflects whether SSE headers are sent on upload; for Azure / GCS this
    is always True (platform-enforced encryption, not configurable via FileNest).
    """

    project_id: str
    environment: str
    storage_mode: str
    provider: str
    region: str | None
    bucket_name: str | None
    endpoint_url: str | None
    server_side_encryption: str | None
    sse_enabled: bool
    status: str
    last_verified_at: datetime | None


class UpdateSseRequest(BaseModel):
    """Toggle server-side encryption for a MinIO or RustFS project."""

    sse_enabled: bool


class StorageVerifyResponse(BaseModel):
    """Result of a storage connectivity probe (write + delete a test object)."""

    ok: bool
    latency_ms: float | None = None
    error: str | None = None
