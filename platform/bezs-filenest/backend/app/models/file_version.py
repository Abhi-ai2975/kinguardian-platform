"""
app.models.file_version — SQLAlchemy ORM model for the file_versions table.

Each row is an immutable snapshot of a file's bytes at the moment
confirm_upload completed while versioning_enabled = true. The parent file's
version_count column tracks the total count and the current version number is
inferred from the row count per file_id.

Usage:
    from app.models.file_version import FileVersion
"""
import uuid
from datetime import UTC, datetime

from sqlalchemy import Column, DateTime, Integer, String

from app.core.database import Base


class FileVersion(Base):
    """
    Immutable version snapshot created on each confirmed upload when versioning is on.

    Attributes:
        version_number: 1-based counter per file (1 = first upload, 2 = first overwrite, …).
        storage_key:    Object storage key at the time this version was created.
    """

    __tablename__ = "file_versions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    file_id = Column(String, nullable=False, index=True)
    organization_id = Column(String, nullable=False, index=True)
    project_id = Column(String, nullable=False, index=True)
    version_number = Column(Integer, nullable=False)
    storage_key = Column(String, nullable=False)
    size_bytes = Column(Integer, nullable=False)
    content_type = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
