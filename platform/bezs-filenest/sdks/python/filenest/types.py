"""
filenest.types — Pydantic v2 models for all FileNest API responses.

Field names match the backend snake_case JSON directly so that
`Model.model_validate(response_json)` works without any alias mapping.

Usage:
    from filenest.types import File, FileStatus, SearchResults
"""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Any, Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class FileStatus(StrEnum):
    """All possible states a file can be in."""
    PENDING = "pending"
    UPLOADING = "uploading"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"
    QUARANTINED = "quarantined"
    DELETED = "deleted"


class File(BaseModel):
    """A file stored in a FileNest project."""
    id: str
    project_id: str
    organization_id: str
    filename: str
    content_type: str
    size_bytes: int
    status: FileStatus
    storage_key: str
    folder_id: str | None = None
    category: str | None = None
    version_count: int = 1
    tags: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime


class FileVersion(BaseModel):
    """A historical version of a file."""
    id: str
    file_id: str
    version_number: int
    storage_key: str
    size_bytes: int
    content_type: str
    created_at: datetime


class FileListResponse(BaseModel):
    """Paginated list of files. Matches the backend FileListResponse shape."""
    items: list[File]
    total: int
    limit: int
    offset: int
    has_more: bool
    next_cursor: str | None = None


class FileVersionListResponse(BaseModel):
    """All version snapshots for a file."""
    items: list[FileVersion]
    total: int


class Folder(BaseModel):
    """A folder in a FileNest project."""
    id: str
    project_id: str
    parent_folder_id: str | None = None
    name: str
    path: str
    file_count: int | None = None
    total_size_bytes: int | None = None
    created_at: datetime


class Webhook(BaseModel):
    """A configured webhook endpoint."""
    id: str
    project_id: str
    name: str
    url: str
    events: list[str]
    status: str
    signing_secret: str
    created_at: datetime
    updated_at: datetime


class MetadataFilter(BaseModel):
    """Key-value metadata filter for search queries."""
    model_config = {"extra": "allow"}


class SearchFilters(BaseModel):
    """Filters for search queries."""
    metadata: MetadataFilter | None = None
    tags: list[str] | None = None
    mime_type: list[str] | None = None
    created_after: datetime | None = None
    created_before: datetime | None = None
    folder_id: str | None = None
    size_min: int | None = None
    size_max: int | None = None


class SearchHit(BaseModel):
    """A single search result with relevance score and highlights."""
    file_id: str
    filename: str
    score: float
    highlights: dict[str, list[str]] = Field(default_factory=dict)
    file: File


class SearchResults(BaseModel):
    """Full search response including hits, total count, and facets."""
    hits: list[SearchHit]
    total: int
    query_time_ms: int
    facets: dict[str, list[dict]] | None = None


class UploadToken(BaseModel):
    """Short-lived upload token for browser-side uploads."""
    token: str
    expires_at: datetime
    constraints: dict[str, Any] = Field(default_factory=dict)


class DownloadUrlResponse(BaseModel):
    """Presigned download URL response."""
    url: str
    expires_at: datetime
