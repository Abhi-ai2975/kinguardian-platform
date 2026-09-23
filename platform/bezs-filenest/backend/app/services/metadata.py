"""
app.services.metadata — Business logic for metadata schemas and file metadata.

Coordinates MetadataSchemaRepository (schema versioning), FileRepository (metadata
writes), and ProjectConfigRepository (enforce_schema flag).

Schema lifecycle:
  - POST /metadata-schemas creates a new version and atomically deactivates all prior ones.
  - GET  /metadata-schemas lists all versions newest-first.
  - The active schema is enforced on metadata writes when enforce_schema = True.

Metadata write lifecycle:
  - PUT  /files/{id}/metadata  → replaces the entire metadata object.
  - PATCH /files/{id}/metadata → merges provided keys into the existing metadata.
  Both validate the result against the active schema when enforce_schema = True.

Usage:
    svc = MetadataService(session=session, file_repo=..., schema_repo=...,
                          config_repo=..., ctx=ctx, project_id=project_id)
    result = await svc.create_schema(req)
"""
import json

import jsonschema
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import TenantContext
from app.errors import ValidationError
from app.models.metadata_schema import MetadataSchema
from app.repositories.file import FileRepository
from app.repositories.metadata_schema import MetadataSchemaRepository
from app.repositories.project_config import ProjectConfigRepository
from app.schemas.metadata import (
    MetadataMergeRequest,
    MetadataResponse,
    MetadataSchemaCreateRequest,
    MetadataSchemaListResponse,
    MetadataSchemaResponse,
    MetadataUpdateRequest,
)


class MetadataService:
    """
    Orchestrates metadata schema management and per-file metadata updates.

    Args:
        session:      Active DB session (owns commit/rollback).
        file_repo:    FileRepository for metadata column writes.
        schema_repo:  MetadataSchemaRepository for schema versioning.
        config_repo:  ProjectConfigRepository for enforce_schema flag.
        ctx:          Resolved caller identity.
        project_id:   Project UUID from the URL path parameter.
    """

    def __init__(
        self,
        session: AsyncSession,
        file_repo: FileRepository,
        schema_repo: MetadataSchemaRepository,
        config_repo: ProjectConfigRepository,
        ctx: TenantContext,
        project_id: str,
    ) -> None:
        self._session = session
        self._ctx = ctx
        self._project_id = project_id
        self._file_repo = file_repo
        self._schema_repo = schema_repo
        self._config_repo = config_repo

    async def create_schema(
        self, req: MetadataSchemaCreateRequest
    ) -> MetadataSchemaResponse:
        """
        Define a new metadata schema for the project.

        Deactivates all previous schema versions atomically in the same
        transaction, then creates the new version.

        Returns:
            The newly created schema record.
        """
        next_version = await self._schema_repo.get_max_version(
            self._project_id, self._ctx.organization_id
        ) + 1
        await self._schema_repo.deactivate_all(
            self._project_id, self._ctx.organization_id
        )
        record = await self._schema_repo.create(
            project_id=self._project_id,
            organization_id=self._ctx.organization_id,
            version=next_version,
            schema_json=json.dumps(req.schema),
        )
        await self._session.commit()
        return self._to_schema_response(record)

    async def list_schemas(self) -> MetadataSchemaListResponse:
        """
        List all schema versions for the project, newest first.
        """
        records = await self._schema_repo.list(
            self._project_id, self._ctx.organization_id
        )
        items = [self._to_schema_response(r) for r in records]
        return MetadataSchemaListResponse(items=items, total=len(items))

    async def update_metadata(
        self, file_id: str, req: MetadataUpdateRequest
    ) -> MetadataResponse:
        """
        Replace the entire metadata object on a file.

        Validates the new metadata against the active schema when
        enforce_schema = True on the project config.

        Raises:
            ValidationError: If enforce_schema is on and validation fails.
            NotFoundError:   If the file does not exist.
        """
        await self._validate_if_required(req.metadata)
        record = await self._file_repo.update_metadata(
            file_id, self._ctx.organization_id, self._project_id, req.metadata
        )
        await self._session.commit()
        return MetadataResponse(
            id=record.id, metadata=json.loads(record.metadata_json)
        )

    async def merge_metadata(
        self, file_id: str, req: MetadataMergeRequest
    ) -> MetadataResponse:
        """
        Merge specific keys into the file's existing metadata.

        Loads the current metadata first, merges the provided keys, then
        validates the merged result against the active schema when
        enforce_schema = True.

        Raises:
            ValidationError: If enforce_schema is on and the merged result fails validation.
            NotFoundError:   If the file does not exist.
        """
        # Load current metadata to build the merged object for validation
        file_record = await self._file_repo.get(
            file_id, self._ctx.organization_id, self._project_id
        )
        current = json.loads(file_record.metadata_json or "{}")
        merged = {**current, **req.metadata}
        await self._validate_if_required(merged)

        record = await self._file_repo.merge_metadata(
            file_id, self._ctx.organization_id, self._project_id, req.metadata
        )
        await self._session.commit()
        return MetadataResponse(
            id=record.id, metadata=json.loads(record.metadata_json)
        )

    async def _validate_if_required(self, metadata: dict) -> None:
        """
        Validate metadata against the active schema when enforce_schema is on.

        No-op when enforce_schema = False or no active schema exists.

        Raises:
            ValidationError: schema validation fails.
        """
        config = await self._config_repo.get_for_project(
            self._project_id, self._ctx.organization_id
        )
        if not config.enforce_schema:
            return
        active_schema = await self._schema_repo.get_active(
            self._project_id, self._ctx.organization_id
        )
        if active_schema is None:
            return
        try:
            jsonschema.validate(
                instance=metadata,
                schema=json.loads(active_schema.schema_json),
            )
        except jsonschema.ValidationError as exc:
            raise ValidationError(
                f"Metadata validation failed: {exc.message}",
                detail={"path": list(exc.absolute_path), "schema_version": active_schema.version},
            )

    def _to_schema_response(self, record: MetadataSchema) -> MetadataSchemaResponse:
        return MetadataSchemaResponse(
            id=record.id,
            project_id=record.project_id,
            organization_id=record.organization_id,
            version=record.version,
            schema=json.loads(record.schema_json),
            is_active=record.is_active,
            created_at=record.created_at,
        )
