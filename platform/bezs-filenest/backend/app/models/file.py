"""app.models.file — SQLAlchemy ORM model for the files table."""
import uuid
from datetime import UTC, datetime

from sqlalchemy import Column, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY

from app.core.database import Base


class File(Base):
    """
    A file record — metadata only. Actual bytes live in object storage (storage_key).

    The status column drives the file lifecycle:
      pending → uploading → ready | failed | quarantined
    """

    __tablename__ = "files"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String, nullable=False, index=True)
    project_id = Column(String, nullable=False, index=True)
    filename = Column(String, nullable=False)
    content_type = Column(String, nullable=False)
    size_bytes = Column(Integer, nullable=False)
    status = Column(String, nullable=False, default="pending")
    storage_key = Column(String, nullable=True)     # set after upload confirmed
    folder_id = Column(String, nullable=True)
    # Classification result set by ClassificationStage: document, image, video, audio, archive, other
    category = Column(String, nullable=True)
    # Incremented on each confirmed upload when versioning_enabled = true
    version_count = Column(Integer, nullable=False, default=0)
    # Free-form JSON metadata supplied by the caller at upload time or updated later.
    metadata_json = Column(Text, nullable=False, default="{}")
    # Searchable string labels. Stored as a PostgreSQL text array.
    tags = Column(ARRAY(String), nullable=False, server_default="{}")
    # Optional owner scoping — copied from the upload token at upload time; never set by the browser.
    owner_user_id = Column(String, nullable=True, index=True)
    owner_org_id = Column(String, nullable=True, index=True)

    deleted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )
