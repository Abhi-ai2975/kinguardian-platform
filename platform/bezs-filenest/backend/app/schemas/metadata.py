"""
app.schemas.metadata — Pydantic request/response models for metadata schemas and file metadata.

MetadataSchema DTOs handle the versioned JSON Schema definitions for a project.
Metadata DTOs handle per-file metadata updates (replace and merge).

Usage:
    from app.schemas.metadata import MetadataSchemaResponse, MetadataUpdateRequest
"""
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class MetadataSchemaCreateRequest(BaseModel):
    """
    Define a new metadata schema for the project.

    schema must be a valid JSON Schema object (draft-07 or later).
    Submitting a new schema deactivates all previous versions atomically.
    """
    schema: dict[str, Any] = Field(..., description="JSON Schema definition")


class MetadataSchemaResponse(BaseModel):
    """A single metadata schema version."""
    id: str
    project_id: str
    organization_id: str
    version: int
    schema: dict[str, Any]
    is_active: bool
    created_at: datetime


class MetadataSchemaListResponse(BaseModel):
    """All schema versions for a project, newest first."""
    items: list[MetadataSchemaResponse]
    total: int


class MetadataUpdateRequest(BaseModel):
    """
    Replace the entire metadata object on a file.

    The provided object overwrites all existing metadata keys.
    Validated against the active schema when enforce_schema = True.
    """
    metadata: dict[str, Any]


class MetadataMergeRequest(BaseModel):
    """
    Merge specific keys into the file's existing metadata.

    Only the keys in the provided object are updated; all other existing
    keys are preserved. The merged result is validated against the active
    schema when enforce_schema = True.
    """
    metadata: dict[str, Any]


class MetadataResponse(BaseModel):
    """Returned after a metadata mutation."""
    id: str
    metadata: dict[str, Any]
