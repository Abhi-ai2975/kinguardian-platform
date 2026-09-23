"""app.models.storage_config — SQLAlchemy ORM model for the storage_configs table.

Each project has one StorageConfig per environment that governs where file bytes are
stored. There are two modes:

  managed — FileNest owns the bucket. No credentials needed from the customer.
            The StorageResolver reads platform-level settings (S3_BUCKET, etc.).

  byob    — Customer supplies their own endpoint + credentials.
            Credentials are AES-256-GCM encrypted (see app.core.crypto) and stored
            in config_encrypted. Plaintext never persists outside application memory.

The status column gates whether the config is live: a BYOB config starts as
'pending_verification', becomes 'active' only after FileNest writes and deletes a
test object to confirm connectivity. Managed configs are created as 'active'.

When a project switches providers (managed → BYOB, or BYOB → different BYOB), the
old config is deactivated and a StorageMigration job copies all existing file bytes
to the new target before the new config is promoted to 'active'.
"""
import uuid
from datetime import UTC, datetime

from sqlalchemy import Boolean, Column, DateTime, LargeBinary, String, Text, UniqueConstraint

from app.core.database import Base


class StorageConfig(Base):
    """
    Storage configuration for one project + environment pair.

    Constraints:
    - UNIQUE(project_id, environment): only one config per project per environment.
    - config_encrypted is null for managed mode (platform credentials used instead).
    - endpoint_url is required for minio, r2, and rustfs; null for s3/azure/gcs.
    """

    __tablename__ = "storage_configs"
    __table_args__ = (
        UniqueConstraint("project_id", "environment", name="uq_storage_configs_project_env"),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String, nullable=False, index=True)
    project_id = Column(String, nullable=False, index=True)

    # Environment this config applies to. Defaults to 'production'.
    environment = Column(String(50), nullable=False, default="production")

    # 'managed': FileNest-hosted bucket (zero customer config required).
    # 'byob': customer-supplied endpoint + credentials.
    storage_mode = Column(String(20), nullable=False, default="managed")

    # Which storage provider backs this config.
    provider = Column(String(50), nullable=False, default="s3")

    # Provider-specific credentials — AES-256-GCM encrypted, null for managed mode.
    # Decrypted at runtime by app.core.crypto.decrypt_storage_credentials().
    config_encrypted = Column(LargeBinary, nullable=True)

    # Non-sensitive routing config — stored plaintext for display and provider init.
    region = Column(String(100), nullable=True)
    bucket_name = Column(String(255), nullable=True)
    # Required for minio / r2 / rustfs; null for managed s3/azure/gcs.
    endpoint_url = Column(Text, nullable=True)

    # Server-side encryption — S3-family only. NULL for Azure Blob and GCS
    # (both enforce always-on SSE that is not configurable via credentials).
    server_side_encryption = Column(String(50), nullable=True)
    # KMS key ARN — only relevant when server_side_encryption = 'aws:kms'.
    kms_key_id = Column(Text, nullable=True)

    # Whether SSE is active for this config. For S3 / R2 / Azure / GCS this is
    # always True (set at creation); for MinIO and RustFS the user can toggle it
    # via the console (requires KMS configured on the server).
    sse_enabled = Column(Boolean, nullable=False, default=False)

    # Lifecycle state.
    # managed configs start 'active'. BYOB configs start 'pending_verification'
    # and become 'active' only after a successful connectivity test.
    status = Column(String(50), nullable=False, default="active")

    # Timestamp of the last successful connectivity verification write/delete cycle.
    last_verified_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )
