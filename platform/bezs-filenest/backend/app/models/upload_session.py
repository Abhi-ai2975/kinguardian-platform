"""
app.models.upload_session — SQLAlchemy ORM model for the upload_sessions table.

Tracks an in-progress multipart upload from start to completion or abort.
One row is created per multipart upload initiation and updated when the upload
completes or is aborted.

The s3_upload_id column stores the provider-native handle:
  S3 / MinIO / RustFS / R2 → the AWS multipart upload ID string
  Azure                     → the blob-level SAS token (used to generate part URLs)
  GCS                       → the UUID prefix used to locate temp part objects

Usage:
    from app.models.upload_session import UploadSession
"""
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import BigInteger, Column, DateTime, Integer, String

from app.core.database import Base


class UploadSession(Base):
    """
    In-progress multipart upload session.

    Expires 24 hours after creation if not completed. The background cleanup
    worker (Phase 6) aborts and removes stale sessions.
    """

    __tablename__ = "upload_sessions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String, nullable=False, index=True)
    project_id = Column(String, nullable=False, index=True)
    file_id = Column(String, nullable=False, index=True)
    # Provider-native handle: S3 UploadId / Azure SAS token / GCS upload_id prefix
    s3_upload_id = Column(String, nullable=False)
    filename = Column(String, nullable=False)
    content_type = Column(String, nullable=False)
    total_size_bytes = Column(BigInteger, nullable=False)
    part_count = Column(Integer, nullable=True)           # set on complete
    # in_progress, completed, aborted
    status = Column(String, nullable=False, default="in_progress")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    expires_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC) + timedelta(hours=24),
    )
