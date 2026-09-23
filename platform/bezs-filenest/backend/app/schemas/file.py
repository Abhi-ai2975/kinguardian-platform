"""app.schemas.file — Pydantic request/response models for files and file versions."""
from datetime import datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field, field_validator


class FileStatus(StrEnum):
    """File lifecycle states."""
    PENDING = "pending"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"
    QUARANTINED = "quarantined"


class UploadInitRequest(BaseModel):
    """Body for initiating a file upload."""
    filename: str
    content_type: str
    size_bytes: int
    folder_id: str | None = None
    tags: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class UploadInitResponse(BaseModel):
    """Returned after upload initiation. Client PUTs bytes to upload_url."""
    file_id: str
    upload_url: str
    upload_id: str | None = None  # multipart only
    expires_at: datetime


class FileResponse(BaseModel):
    """Full file metadata record."""
    id: str
    organization_id: str
    project_id: str
    filename: str
    content_type: str
    size_bytes: int
    status: FileStatus
    storage_key: str
    folder_id: str | None
    category: str | None
    version_count: int
    tags: list[str]
    metadata: dict[str, Any]
    created_at: datetime
    updated_at: datetime


class FileListResponse(BaseModel):
    """Paginated list of files — supports both cursor (infinite scroll) and offset (page table) modes."""
    items: list[FileResponse]
    total: int            # total records matching the current filters (for page-count calculation)
    limit: int            # page size applied
    offset: int           # offset applied (0 when cursor mode is used)
    has_more: bool        # whether another page exists after this one
    next_cursor: str | None = None  # last item id — pass as cursor= on next request for keyset pagination


class DownloadUrlResponse(BaseModel):
    """Presigned download URL."""
    url: str
    expires_at: datetime


class ConfirmUploadResponse(BaseModel):
    """Returned after the client confirms a completed upload."""
    id: str
    status: FileStatus


class DeleteResponse(BaseModel):
    """Returned after a successful soft delete."""
    id: str
    deleted: bool = True


class FileVersionResponse(BaseModel):
    """Metadata for a single file version snapshot."""
    id: str
    file_id: str
    version_number: int
    storage_key: str
    size_bytes: int
    content_type: str
    created_at: datetime


class FileVersionListResponse(BaseModel):
    """All version snapshots for a file, newest first."""
    items: list[FileVersionResponse]
    total: int


class RestoreVersionResponse(BaseModel):
    """Returned after a version is restored as the current file state."""
    file_id: str
    version_number: int  # the new current version number after restore


# ── Tags ────────────────────────────────────────────────────────────────────

class TagsReplaceRequest(BaseModel):
    """Replace the full tag list on a file."""
    tags: list[str]


class TagsAddRequest(BaseModel):
    """Append tags to a file (union — no duplicates)."""
    tags: list[str]


class TagsResponse(BaseModel):
    """Returned after a tag mutation."""
    id: str
    tags: list[str]


# ── Multipart upload ────────────────────────────────────────────────────────

class MultipartStartRequest(BaseModel):
    """Body for initiating a multipart upload."""
    filename: str
    content_type: str
    total_size_bytes: int
    folder_id: str | None = None
    tags: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class MultipartStartResponse(BaseModel):
    """Returned after multipart upload is initiated."""
    upload_id: str
    file_id: str


class MultipartPartUrlResponse(BaseModel):
    """Presigned URL for a single part upload."""
    upload_id: str
    part_number: int
    url: str
    expires_at: datetime


class MultipartPart(BaseModel):
    """A completed part descriptor sent by the client on complete."""
    part_number: int = Field(alias="PartNumber")
    etag: str = Field(alias="ETag")

    model_config = {"populate_by_name": True}


class MultipartCompleteRequest(BaseModel):
    """Body for completing a multipart upload."""
    parts: list[MultipartPart]


class MultipartCompleteResponse(BaseModel):
    """Returned after multipart upload is assembled."""
    file_id: str
    status: FileStatus


class MultipartAbortResponse(BaseModel):
    """Returned after a multipart upload is aborted."""
    upload_id: str
    aborted: bool = True


# ── Folders ─────────────────────────────────────────────────────────────────

class MoveFileRequest(BaseModel):
    """Move a file to a different folder (or to the root when folder_id is null)."""
    folder_id: str | None = None


class RenameFileRequest(BaseModel):
    """Rename a file."""
    filename: str

    @field_validator("filename")
    @classmethod
    def filename_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Filename must not be empty")
        return v
