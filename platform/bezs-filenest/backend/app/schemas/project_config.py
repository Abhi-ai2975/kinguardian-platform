"""
app.schemas.project_config — Pydantic request/response models for project configuration.

The project_configs table stores comma-separated TEXT for list fields (allowed_mime_types,
allowed_extensions, allowed_ips, allowed_origins). The schemas here expose those as
proper list[str] to API consumers. Serialisation to/from comma-separated strings
is handled by ProjectConfigService, not here.

Four config categories map to four patch schemas (one endpoint per category)
and a single read schema that combines all of them.

Usage:
    from app.schemas.project_config import ProjectConfigResponse, UpdateUploadConfigRequest
"""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


# ── Upload restrictions ──────────────────────────────────────────────────────

class UpdateUploadConfigRequest(BaseModel):
    """Partial update for upload restriction settings. All fields are optional."""

    max_file_size_bytes: int | None = Field(
        default=None,
        ge=1,
        description="Maximum file size in bytes. null removes the limit.",
    )
    allowed_mime_types: list[str] | None = Field(
        default=None,
        description="Accepted MIME types e.g. ['image/jpeg', 'application/pdf']. null = all allowed.",
    )
    allowed_extensions: list[str] | None = Field(
        default=None,
        description="Accepted file extensions including the dot e.g. ['.jpg', '.pdf']. null = all allowed.",
    )
    max_files_per_request: int | None = Field(
        default=None,
        ge=1,
        description="Maximum files per multipart upload call. null removes the limit.",
    )


# ── Network security ─────────────────────────────────────────────────────────

class UpdateSecurityConfigRequest(BaseModel):
    """Partial update for network security settings. All fields are optional."""

    allowed_ips: list[str] | None = Field(
        default=None,
        description="CIDR blocks allowed to call the API, e.g. ['10.0.0.0/8']. null = all IPs allowed.",
    )
    allowed_origins: list[str] | None = Field(
        default=None,
        description="Origins allowed for CORS, e.g. ['https://app.example.com']. null = all origins.",
    )
    require_signed_urls: bool | None = Field(
        default=None,
        description="When true, downloads require a signed URL rather than a direct response.",
    )
    signed_url_ttl_seconds: int | None = Field(
        default=None,
        ge=60,
        le=86400,
        description="Signed URL lifetime in seconds (60–86400). Default 3600.",
    )


# ── Processing flags ──────────────────────────────────────────────────────────

class UpdateProcessingConfigRequest(BaseModel):
    """Partial update for processing feature flags. All fields are optional."""

    versioning_enabled: bool | None = Field(
        default=None,
        description="Enable per-file version history.",
    )
    ocr_enabled: bool | None = Field(
        default=None,
        description="Run OCR on supported document types after upload.",
    )
    virus_scan_enabled: bool | None = Field(
        default=None,
        description="Run ClamAV virus scan on every upload before the file is marked ready.",
    )


# ── Compliance ────────────────────────────────────────────────────────────────

class UpdateComplianceConfigRequest(BaseModel):
    """
    Partial update for compliance settings.

    These fields are stored and returned by the API immediately but are not
    enforced by the backend until Phase 8.
    """

    retention_days: int | None = Field(
        default=None,
        ge=1,
        description="Minimum days a file must be retained before deletion. null = no floor.",
    )
    worm_enabled: bool | None = Field(
        default=None,
        description="Write-once-read-many: prohibits modifications and deletions after commit.",
    )
    legal_hold_enabled: bool | None = Field(
        default=None,
        description="Enable legal-hold capability on individual files.",
    )
    data_residency: str | None = Field(
        default=None,
        description="Required storage region: 'us', 'eu', 'india', 'middle_east', 'any'. null = no restriction.",
    )


# ── Response ─────────────────────────────────────────────────────────────────

class ProjectConfigResponse(BaseModel):
    """Full project configuration — all four categories in one response object."""

    id: str
    organization_id: str
    project_id: str

    # Upload
    max_file_size_bytes: int | None
    allowed_mime_types: list[str] | None
    allowed_extensions: list[str] | None
    max_files_per_request: int | None

    # Security
    allowed_ips: list[str] | None
    allowed_origins: list[str] | None
    require_signed_urls: bool
    signed_url_ttl_seconds: int

    # Processing
    versioning_enabled: bool
    ocr_enabled: bool
    virus_scan_enabled: bool

    # Compliance
    retention_days: int | None
    worm_enabled: bool
    legal_hold_enabled: bool
    data_residency: str | None

    created_at: datetime
    updated_at: datetime
