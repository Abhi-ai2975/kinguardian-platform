"""app.models.storage_migration — SQLAlchemy ORM model for the storage_migrations table.

A StorageMigration tracks a background job that copies all file bytes for a project
from one storage provider (source) to another (target). This is triggered when a
customer switches storage config — e.g. from FileNest-managed S3 to their own MinIO.

Lifecycle:
  1. Customer configures a new StorageConfig (status='pending_verification').
  2. FileNest verifies connectivity (write + delete a test object).
  3. Customer triggers migration: POST /v1/projects/{id}/storage/migrate
  4. A dry-run is mandatory first — returns estimated file count + bytes + duration.
  5. Customer confirms: the migration job runs in the background (StorageMigrationWorker).
  6. Each file is streamed from source → target → integrity verified (size check).
  7. On completion, the project's active StorageConfig is swapped to the target.
  8. Old StorageConfig is deactivated; file bytes on the old provider are left intact
     until the customer explicitly purges them (DELETE /v1/projects/{id}/storage/purge-old).

Error handling:
  - Per-file failures are recorded in error_log (JSONB list of {file_id, error, ts}).
  - A migration with >0 failed_files completes with status='completed_with_errors'.
  - The customer can re-run migration on failed files only via retry_failed=true.
  - A migration can be paused (status='paused') and resumed at any time.
"""
import uuid
from datetime import UTC, datetime

from sqlalchemy import BigInteger, Boolean, Column, DateTime, Integer, String, Text

from app.core.database import Base


class StorageMigration(Base):
    """
    Background job record for a provider-to-provider file migration.

    source_config_id may be null when migrating from the implicit managed default
    (i.e. a project created before explicit storage_configs rows were introduced).
    target_config_id must always reference a valid StorageConfig row.
    """

    __tablename__ = "storage_migrations"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String, nullable=False, index=True)
    project_id = Column(String, nullable=False, index=True)

    # Source config — null means the FileNest platform managed default.
    source_config_id = Column(String, nullable=True)
    source_provider = Column(String(50), nullable=False)

    # Target config — the new StorageConfig being migrated to.
    target_config_id = Column(String, nullable=False)
    target_provider = Column(String(50), nullable=False)

    # Job state.
    # pending → in_progress → completed | completed_with_errors | failed | cancelled
    # dry_run is a separate status for the mandatory pre-migration estimation step.
    status = Column(String(50), nullable=False, default="pending")

    # True while this record represents a dry-run (no bytes actually copied).
    is_dry_run = Column(Boolean, nullable=False, default=False)

    # Progress counters — updated in real time by the migration worker.
    total_files = Column(Integer, nullable=True)
    completed_files = Column(Integer, nullable=False, default=0)
    failed_files = Column(Integer, nullable=False, default=0)
    skipped_files = Column(Integer, nullable=False, default=0)
    total_bytes = Column(BigInteger, nullable=True)
    migrated_bytes = Column(BigInteger, nullable=False, default=0)

    # Timing.
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    # Estimated seconds to complete — set during dry-run, used in progress UX.
    estimated_duration_seconds = Column(Integer, nullable=True)

    # Cutover timestamp — when the project's active config was switched to target.
    cutover_at = Column(DateTime(timezone=True), nullable=True)

    # Last error message for the migration job itself (not per-file errors).
    last_error = Column(Text, nullable=True)

    # Per-file error log stored as a JSON string: [{file_id, error, timestamp}, ...].
    # Kept as Text (not JSON column) for portability; parsed at the service layer.
    error_log = Column(Text, nullable=False, default="[]")

    created_by = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )
