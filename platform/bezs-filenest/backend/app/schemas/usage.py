"""
app.schemas.usage — Pydantic response schemas for the usage endpoint.

UsageResponse aggregates org-level headline counters and a per-project
storage/file breakdown in a single call so the console usage page can
render without additional round-trips.

Usage:
    from app.schemas.usage import UsageResponse
"""
from pydantic import BaseModel


class UsageStats(BaseModel):
    """Org-level headline counters."""

    total_files: int
    total_storage_bytes: int
    active_projects: int
    files_uploaded_30d: int


class ProjectUsageItem(BaseModel):
    """Storage and file count for a single project."""

    project_id: str
    name: str
    storage_bytes: int
    file_count: int


class UsageResponse(BaseModel):
    """Full usage payload: org stats + per-project breakdown."""

    stats: UsageStats
    projects: list[ProjectUsageItem]
