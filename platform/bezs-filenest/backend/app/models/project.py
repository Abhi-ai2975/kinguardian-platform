"""app.models.project — SQLAlchemy ORM model for the projects table."""
import uuid
from datetime import UTC, datetime

from sqlalchemy import Boolean, Column, DateTime, Index, String, Text
from sqlalchemy.sql import expression

from app.core.database import Base


class Project(Base):
    """
    A project belongs to one organisation and is the unit of storage/processing config.

    The organization_id is a string FK to the IAM's BetterAuth organisation — no
    cross-DB join is needed because the IAM is the source of truth for org identity.

    storage_mode + storage_provider are denormalised from storage_configs for fast
    routing decisions without an extra join on every request. They must stay in sync
    with the active StorageConfig row for this project.

    The slug uniqueness constraint is a partial index scoped to non-deleted rows so
    that soft-deleted projects release their slug for reuse.
    """

    __tablename__ = "projects"
    __table_args__ = (
        Index(
            "uq_projects_org_slug_active",
            "organization_id",
            "slug",
            unique=True,
            postgresql_where=expression.text("deleted_at IS NULL"),
        ),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)

    # Storage — denormalised from the active StorageConfig for routing performance.
    # 'managed': FileNest hosts the bucket. 'byob': customer-supplied endpoint.
    storage_mode = Column(String(20), nullable=False, default="managed")
    # Which provider backs this project. Defaults to s3 (FileNest platform bucket).
    storage_provider = Column(String(50), nullable=False, default="s3")

    # Processing feature flags — toggled per project in settings.
    versioning_enabled = Column(Boolean, nullable=False, default=False)
    ocr_enabled = Column(Boolean, nullable=False, default=False)

    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )
    deleted_at = Column(DateTime(timezone=True), nullable=True)
