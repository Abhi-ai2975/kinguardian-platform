"""app.schemas.project — Pydantic request/response models for projects."""
import re
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator
from fastapi import Query


def _slugify(name: str) -> str:
    slug = name.lower().strip()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"[\s_-]+", "-", slug)
    return slug.strip("-")[:100]


class CreateProjectRequest(BaseModel):
    """Body for creating a new project."""

    name: str = Field(..., min_length=1, max_length=255)
    slug: str | None = Field(default=None, description="Auto-derived from name if omitted.")
    description: str | None = None
    storage_mode: Literal["managed", "byob"] = "managed"
    storage_provider: Literal["s3", "azure_blob", "gcs", "minio", "r2", "rustfs"] = "s3"

    @field_validator("slug", mode="before")
    @classmethod
    def validate_slug(cls, v: str | None, info) -> str:
        if v is None:
            name = info.data.get("name", "")
            return _slugify(name)
        slug = v.lower().strip()
        if not re.match(r"^[a-z0-9][a-z0-9-]{0,98}[a-z0-9]$|^[a-z0-9]$", slug):
            raise ValueError("Slug must be lowercase alphanumeric with hyphens, 1–100 chars")
        return slug


class UpdateProjectRequest(BaseModel):
    """Body for updating mutable project fields. All fields are optional."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    versioning_enabled: bool | None = None
    ocr_enabled: bool | None = None


class ProjectResponse(BaseModel):
    """Full project representation."""

    id: str
    organization_id: str
    name: str
    slug: str
    description: str | None
    storage_mode: str
    storage_provider: str
    versioning_enabled: bool
    ocr_enabled: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime


class ProjectListParams:
    """
    Query parameters for GET /v1/projects.

    Used as a FastAPI Depends() so all fields are read from the query string.
    Sortable columns are whitelisted to prevent SQL injection via ORDER BY.
    """

    SORTABLE = {"name", "created_at", "storage_provider", "storage_mode"}

    def __init__(
        self,
        page: int = Query(default=1, ge=1, description="Page number (1-based)"),
        page_size: int = Query(default=20, ge=1, le=100, description="Rows per page"),
        sort_by: str = Query(default="created_at", description="Column to sort by"),
        sort_dir: Literal["asc", "desc"] = Query(default="desc", description="Sort direction"),
        search: str | None = Query(default=None, description="Substring match on name or slug"),
        storage_provider: str | None = Query(default=None, description="Filter by provider"),
        storage_mode: Literal["managed", "byob"] | None = Query(default=None, description="Filter by mode"),
    ) -> None:
        self.page = page
        self.page_size = page_size
        # Fallback to created_at if caller sends an unknown column
        self.sort_by = sort_by if sort_by in self.SORTABLE else "created_at"
        self.sort_dir = sort_dir
        self.search = search.strip() if search else None
        self.storage_provider = storage_provider
        self.storage_mode = storage_mode

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size


class ProjectListResponse(BaseModel):
    """Paginated list of projects with server-side page metadata."""

    items: list[ProjectResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
