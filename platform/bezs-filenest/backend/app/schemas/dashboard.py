"""
app.schemas.dashboard — Pydantic response models for the dashboard endpoint.

Returns aggregated statistics for an organisation in a single call:
  - Four headline stat counters
  - Daily upload counts for the last 30 days (bar chart)
  - Cumulative storage growth for the last 30 days (area chart)
  - File status distribution (donut chart)
  - Ten most-recent files across all projects (recent-activity list)

Usage:
    from app.schemas.dashboard import DashboardResponse
"""
from pydantic import BaseModel


class DashboardStats(BaseModel):
    """Headline counters shown in the stat-card row."""

    total_files: int
    total_storage_bytes: int
    files_uploaded_30d: int
    active_projects: int


class UploadsByDay(BaseModel):
    """Daily upload count entry — one row per calendar day that had at least one upload."""

    date: str
    count: int


class StorageByDay(BaseModel):
    """Cumulative storage byte total per calendar day (running sum up to that day)."""

    date: str
    bytes: int


class StatusCount(BaseModel):
    """File count broken down by lifecycle status."""

    status: str
    count: int


class RecentFile(BaseModel):
    """Compact file representation for the recent-activity list."""

    id: str
    filename: str
    project_id: str
    project_name: str
    status: str
    size_bytes: int
    created_at: str


class DashboardResponse(BaseModel):
    """Full dashboard payload — all data needed to render the dashboard page."""

    stats: DashboardStats
    uploads_by_day: list[UploadsByDay]
    storage_by_day: list[StorageByDay]
    status_distribution: list[StatusCount]
    recent_files: list[RecentFile]
