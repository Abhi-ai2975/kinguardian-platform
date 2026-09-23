"""
app.models.folder — SQLAlchemy ORM model for the folders table.

Folders are a database-only concept — they do not map to any path in the
underlying object storage. File bytes are always stored under a flat key
(org/project/file_id). The folder tree is used purely for organisation and
display inside the FileNest Console and SDK.

The path column stores the materialised full path (e.g. "/invoices/2026")
so breadcrumbs and listings never need recursive queries.

Usage:
    from app.models.folder import Folder
"""
import uuid
from datetime import UTC, datetime

from sqlalchemy import Column, DateTime, ForeignKey, String

from app.core.database import Base


class Folder(Base):
    """
    A folder record inside a project.

    parent_folder_id is a self-referential FK. Null means the folder sits at
    the root level. The path column is maintained by FolderService at creation
    time — it is never updated by the repository directly.
    """

    __tablename__ = "folders"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String, nullable=False, index=True)
    project_id = Column(String, nullable=False, index=True)
    # Null → root-level folder. References folders.id (same table).
    parent_folder_id = Column(String, ForeignKey("folders.id"), nullable=True)
    name = Column(String, nullable=False)
    # Materialised full path, e.g. "/invoices/2026/q1". Built at create time.
    path = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    deleted_at = Column(DateTime(timezone=True), nullable=True)
