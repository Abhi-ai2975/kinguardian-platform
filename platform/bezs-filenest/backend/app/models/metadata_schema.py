"""
app.models.metadata_schema — SQLAlchemy ORM model for the metadata_schemas table.

Stores versioned JSON Schema definitions that constrain file metadata for a project.
Only one schema is active at a time (is_active = True). Creating a new schema
atomically deactivates all previous ones. The active schema is enforced on metadata
writes when project_configs.enforce_schema = True.

Usage:
    from app.models.metadata_schema import MetadataSchema
"""
import uuid
from datetime import UTC, datetime

from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text

from app.core.database import Base


class MetadataSchema(Base):
    """
    A versioned JSON Schema definition for a project's file metadata.

    version is a monotonically increasing integer scoped to the project —
    each call to create_schema increments it. is_active marks the current
    canonical schema; all previous versions have is_active = False and are
    retained for audit purposes.
    """

    __tablename__ = "metadata_schemas"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String, nullable=False, index=True)
    project_id = Column(String, nullable=False, index=True)
    version = Column(Integer, nullable=False, default=1)
    # JSON Schema definition stored as a JSON string.
    schema_json = Column(Text, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
