"""
app.models.project_config — SQLAlchemy ORM model for the project_configs table.

Stores all per-project configuration as discrete typed columns — no JSONB blobs.
One row exists per project (1:1) and is auto-created in the same transaction as
the parent Project row by ProjectService.create_project().

Configuration is grouped into four logical categories:

  upload      — max file size, allowed MIME types, allowed extensions, max files per request
  security    — IP allowlist, CORS origins, signed-URL requirements
  processing  — versioning, OCR, virus scan (mirrors Project flags; canonical home for Phase 2+)
  compliance  — retention, WORM, legal hold, data residency (stored now; enforced Phase 8)

Null values on upload and security list columns mean "no restriction configured".
"""
import uuid
from datetime import UTC, datetime

from sqlalchemy import BigInteger, Boolean, Column, DateTime, Integer, String, Text

from app.core.database import Base


class ProjectConfig(Base):
    """
    Per-project configuration record. Created atomically with its parent Project.

    project_id is UNIQUE — this is a strict 1:1 relationship with projects.

    Comma-separated TEXT columns (allowed_mime_types, allowed_extensions,
    allowed_ips, allowed_origins) are parsed into list[str] by the service layer
    before being returned to callers. The repository stores and retrieves them
    as plain strings.
    """

    __tablename__ = "project_configs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String, nullable=False, index=True)
    # Strict 1:1 with projects — unique=True enforces the relationship at DB level.
    project_id = Column(String, nullable=False, unique=True, index=True)

    # ── Upload restrictions ──────────────────────────────────────────────────
    # null = no restriction / all values accepted.

    # Maximum byte count accepted per individual file. null = unlimited.
    max_file_size_bytes = Column(BigInteger, nullable=True)

    # Comma-separated MIME types accepted for upload, e.g. "image/jpeg,application/pdf".
    # null = all MIME types accepted.
    allowed_mime_types = Column(Text, nullable=True)

    # Comma-separated file extensions including the dot, e.g. ".jpg,.pdf,.docx".
    # null = all extensions accepted.
    allowed_extensions = Column(Text, nullable=True)

    # Maximum number of files allowed in a single multipart upload call. null = unlimited.
    max_files_per_request = Column(Integer, nullable=True)

    # ── Network security ─────────────────────────────────────────────────────
    # null on list columns = no restriction.

    # Comma-separated CIDR blocks that may call the API for this project,
    # e.g. "10.0.0.0/8,203.0.113.42/32". null = all source IPs allowed.
    allowed_ips = Column(Text, nullable=True)

    # Comma-separated origins for browser CORS requests,
    # e.g. "https://app.example.com,https://www.example.com". null = all origins (*).
    allowed_origins = Column(Text, nullable=True)

    # When true, presigned URLs are required for both upload and download operations.
    # The SDK defaults to presigned URL mode; signed_url_ttl_seconds is the TTL for all
    # generated URLs and cannot be overridden by the caller when this is enabled.
    require_signed_urls = Column(Boolean, nullable=False, default=False)

    # Lifetime in seconds for generated signed URLs. Default 3600 (1 hour).
    signed_url_ttl_seconds = Column(Integer, nullable=False, default=3600)

    # When true, metadata writes (upload, PUT/PATCH metadata) are validated against
    # the project's active metadata schema. Rejects with 422 on violation.
    enforce_schema = Column(Boolean, nullable=False, default=False)

    # ── Processing / feature flags ────────────────────────────────────────────
    # These mirror versioning_enabled and ocr_enabled on the Project model.
    # Project remains the source of truth until a future migration consolidates
    # feature flags into project_configs.

    # Enable per-file version history.
    versioning_enabled = Column(Boolean, nullable=False, default=False)

    # Run OCR on supported document types after upload.
    ocr_enabled = Column(Boolean, nullable=False, default=False)

    # Run ClamAV virus scan on every upload before the file is marked ready.
    virus_scan_enabled = Column(Boolean, nullable=False, default=False)

    # ── Compliance ───────────────────────────────────────────────────────────
    # Stored now; enforcement begins in Phase 8.

    # Minimum days a file must be retained before deletion is permitted. null = no floor.
    retention_days = Column(Integer, nullable=True)

    # Write-once-read-many: prohibits modifications and deletions after commit.
    worm_enabled = Column(Boolean, nullable=False, default=False)

    # Enables legal-hold capability on individual files — overrides retention and WORM.
    legal_hold_enabled = Column(Boolean, nullable=False, default=False)

    # Geographic region where file bytes must reside. null = no restriction.
    data_residency = Column(String(50), nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )
