"""
app.services.file — Business logic for file management and file versioning.

All file business rules live here. Coordinates with FileRepository (DB),
FileVersionRepository (DB), ProjectConfigRepository (per-project feature flags),
TransactionalOutboxPublisher (events), and StorageResolver (storage backend).

confirm_upload flow (Phase 2):
  - virus_scan_enabled = true  → status=processing, emit file.uploaded
    (ProcessingWorker picks this up and runs stages)
  - virus_scan_enabled = false → status=ready, emit file.ready directly
  - versioning_enabled = true  → also creates a FileVersion row and bumps
    file.version_count (happens regardless of scan flag)

project_id always comes from the URL path parameter, not the token. The router
validates that a project-scoped token's project_id matches the URL before
constructing this service.

Usage:
    svc = FileService(session=session, repo=repo, version_repo=version_repo,
                      config_repo=config_repo, outbox=outbox, ctx=ctx,
                      project_id=project_id)
    result = await svc.init_upload(request_body)
"""
import asyncio
import json
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import TenantContext
from app.core.messaging import TransactionalOutboxPublisher
from app.auth.signed_url_policy import resolve_ttl
from app.repositories.file import FileRepository
from app.repositories.file_version import FileVersionRepository
from app.repositories.project_config import ProjectConfigRepository
from app.repositories.storage_config import StorageConfigRepository
from app.services.upload_validation import validate_upload_request
from app.errors import FileTooLargeError, NotFoundError, ValidationError

from app.schemas.file import (
    ConfirmUploadResponse,
    DeleteResponse,
    DownloadUrlResponse,
    FileListResponse,
    FileResponse,
    FileVersionListResponse,
    FileVersionResponse,
    MoveFileRequest,
    RenameFileRequest,
    RestoreVersionResponse,
    TagsResponse,
    UploadInitRequest,
    UploadInitResponse,
)
from app.storage.resolver import storage_resolver


def _storage_key(organization_id: str, project_id: str, file_id: str) -> str:
    """Build the object storage key: org/project/file_id."""
    return f"{organization_id}/{project_id}/{file_id}"


def _mime_allowed(content_type: str, allowed: list[str]) -> bool:
    """Return True if content_type matches any pattern in allowed.

    Supports wildcard subtypes: 'image/*' matches 'image/jpeg', 'image/png', etc.
    Exact matches are also supported: 'application/pdf' matches 'application/pdf'.
    """
    ct = content_type.lower()
    for pattern in allowed:
        p = pattern.strip().lower()
        if p == "*/*":
            return True
        if p == ct:
            return True
        if p.endswith("/*"):
            if ct.startswith(p[:-1]):
                return True
    return False


class FileService:
    """
    Orchestrates file operations for a single request.

    project_id is explicit (from the URL path) rather than read from ctx so that
    org-level tokens can operate on any project within the org.

    Args:
        session:      Active DB session (owns commit/rollback).
        repo:         FileRepository for file CRUD.
        version_repo: FileVersionRepository for version history.
        config_repo:  ProjectConfigRepository for feature flag lookups.
        outbox:       TransactionalOutboxPublisher for event enqueuing.
        ctx:          Resolved caller identity.
        project_id:   Project UUID from the URL path parameter.
    """

    def __init__(
        self,
        session: AsyncSession,
        repo: FileRepository,
        version_repo: FileVersionRepository,
        config_repo: ProjectConfigRepository,
        storage_config_repo: StorageConfigRepository,
        outbox: TransactionalOutboxPublisher,
        ctx: TenantContext,
        project_id: str,
    ) -> None:
        self._session = session
        self._ctx = ctx
        self._project_id = project_id
        self._repo = repo
        self._version_repo = version_repo
        self._config_repo = config_repo
        self._storage_config_repo = storage_config_repo
        self._outbox = outbox

    async def _get_provider(self):
        """
        Resolve the storage provider for this project.

        Loads the project's StorageConfig from the database and builds the
        correct provider (managed or BYOB, correct bucket). Falls back to the
        platform default only if no StorageConfig row exists yet.
        """
        try:
            storage_cfg = await self._storage_config_repo.get_for_project(
                self._project_id, self._ctx.organization_id
            )
            return storage_resolver.build_provider(storage_cfg)
        except NotFoundError:
            return await storage_resolver.get_provider(self._project_id)

    async def init_upload(self, req: UploadInitRequest) -> UploadInitResponse:
        """
        Create a file record and return a presigned PUT URL.

        Validates the declared filename, content_type, and size_bytes against
        project_configs before issuing the URL. The client PUTs bytes directly
        to storage — bytes never route through this service. Call confirm_upload
        after the PUT succeeds.

        Raises:
            FileTooLargeError: size_bytes exceeds max_file_size_bytes.
            ValidationError:   content_type or extension not in allowed lists, or
                               concurrent in-flight uploads exceed max_files_per_request.
        """
        config = await self._config_repo.get_for_project(
            self._project_id, self._ctx.organization_id
        )

        # Resolve effective folder, metadata, and constraints.
        # When the caller is an upload token, the token's server-set values take
        # precedence over whatever the browser sends — the browser cannot override them.
        effective_folder_id = req.folder_id
        effective_metadata: dict = req.metadata or {}
        effective_tags: list[str] = list(req.tags)

        if self._ctx.actor_id.startswith("upload_token:"):
            # Token folder always overrides the request's folder_id.
            if self._ctx.upload_token_folder_id is not None:
                effective_folder_id = self._ctx.upload_token_folder_id

            # Merge: token metadata wins over browser metadata on key conflicts.
            if self._ctx.upload_token_default_metadata:
                effective_metadata = {**effective_metadata, **self._ctx.upload_token_default_metadata}

            # Merge tags: combine browser tags with token tags, deduplicating.
            if self._ctx.upload_token_default_tags:
                effective_tags = list(dict.fromkeys([*effective_tags, *self._ctx.upload_token_default_tags]))

            # Token max_size is the ceiling — checked before project-level validation.
            if self._ctx.upload_token_max_size is not None and req.size_bytes > self._ctx.upload_token_max_size:
                raise FileTooLargeError(
                    f"File size {req.size_bytes:,} bytes exceeds the upload token limit "
                    f"of {self._ctx.upload_token_max_size:,} bytes",
                    detail={
                        "size_bytes": req.size_bytes,
                        "max_size": self._ctx.upload_token_max_size,
                    },
                )

            # Token allowed_mime_types allowlist — enforced on top of project config.
            if self._ctx.upload_token_allowed_mime_types:
                token_types = self._ctx.upload_token_allowed_mime_types
                if "*/*" not in token_types and not _mime_allowed(req.content_type, token_types):
                    raise ValidationError(
                        f"Content type '{req.content_type}' is not permitted by the upload token",
                        detail={
                            "content_type": req.content_type,
                            "allowed_mime_types": token_types,
                        },
                    )

        validate_upload_request(
            config,
            filename=req.filename,
            content_type=req.content_type,
            size_bytes=req.size_bytes,
        )
        if config.max_files_per_request:
            in_flight = await self._repo.count_in_flight(
                self._ctx.organization_id, self._project_id
            )
            if in_flight >= config.max_files_per_request:
                raise ValidationError(
                    f"Too many concurrent uploads ({in_flight}). "
                    f"Project limit is {config.max_files_per_request} simultaneous upload(s).",
                    detail={
                        "in_flight": in_flight,
                        "max_files_per_request": config.max_files_per_request,
                    },
                )

        record = await self._repo.create(
            organization_id=self._ctx.organization_id,
            project_id=self._project_id,
            filename=req.filename,
            content_type=req.content_type,
            size_bytes=req.size_bytes,
            folder_id=effective_folder_id,
            tags=list(dict.fromkeys(effective_tags)),
            metadata_json=json.dumps(effective_metadata),
            owner_user_id=self._ctx.owner_user_id,
            owner_org_id=self._ctx.owner_org_id,
        )

        key = _storage_key(self._ctx.organization_id, self._project_id, record.id)
        record.storage_key = key

        provider = await self._get_provider()
        ttl = resolve_ttl(config)
        upload_url = await provider.generate_presigned_upload_url(
            key, req.content_type, req.size_bytes, expires_in=ttl,
        )
        expires_at = datetime.now(UTC) + timedelta(seconds=ttl)

        await self._outbox.publish(
            f"filenest.{self._ctx.organization_id}.{self._project_id}.file.upload.initiated",
            {"file_id": record.id, "filename": req.filename, "size_bytes": req.size_bytes},
            organization_id=self._ctx.organization_id,
            project_id=self._project_id,
        )

        await self._session.commit()

        return UploadInitResponse(
            file_id=record.id, upload_url=upload_url, expires_at=expires_at,
        )

    async def confirm_upload(self, file_id: str) -> ConfirmUploadResponse:
        """
        Transition a file out of the pending state after the client PUT completes.

        Reads project_configs flags to decide behaviour:
          virus_scan_enabled = True  → status=processing, emits file.uploaded so
                                       ProcessingWorker runs virus scan / MIME validation.
          virus_scan_enabled = False → status=ready, emits file.ready directly.
          versioning_enabled = True  → creates a FileVersion snapshot and bumps
                                       file.version_count (always, regardless of scan flag).

        All writes happen in the same transaction.
        """
        record = await self._repo.get(file_id, self._ctx.organization_id, self._project_id)

        config = await self._config_repo.get_for_project(
            self._project_id, self._ctx.organization_id
        )

        if config.versioning_enabled and record.storage_key:
            record.version_count = (record.version_count or 0) + 1
            await self._version_repo.create(
                file_id=record.id,
                organization_id=self._ctx.organization_id,
                project_id=self._project_id,
                version_number=record.version_count,
                storage_key=record.storage_key,
                size_bytes=record.size_bytes,
                content_type=record.content_type,
            )

        if config.virus_scan_enabled:
            record = await self._repo.update_status(file_id, "processing")
            await self._outbox.publish(
                f"filenest.{self._ctx.organization_id}.{self._project_id}.file.uploaded",
                {
                    "file_id": record.id,
                    "filename": record.filename,
                    "storage_key": record.storage_key,
                    "content_type": record.content_type,
                    "size_bytes": record.size_bytes,
                },
                organization_id=self._ctx.organization_id,
                project_id=self._project_id,
            )
        else:
            record = await self._repo.update_status(file_id, "ready")
            await self._outbox.publish(
                f"filenest.{self._ctx.organization_id}.{self._project_id}.file.ready",
                {
                    "file_id": record.id,
                    "filename": record.filename,
                    "storage_key": record.storage_key,
                },
                organization_id=self._ctx.organization_id,
                project_id=self._project_id,
            )

        await self._session.commit()
        return ConfirmUploadResponse(id=record.id, status=record.status)

    async def list_versions(self, file_id: str) -> FileVersionListResponse:
        """
        List all version snapshots for a file, newest first.

        Returns an empty list when versioning was never enabled for this file.
        """
        await self._repo.get(file_id, self._ctx.organization_id, self._project_id)
        versions = await self._version_repo.list(
            file_id, self._ctx.organization_id, self._project_id
        )
        items = [self._to_version_response(v) for v in versions]
        return FileVersionListResponse(items=items, total=len(items))

    async def get_version_download_url(
        self, file_id: str, version_id: str, *, caller_ttl: int | None = None
    ) -> DownloadUrlResponse:
        """
        Generate a presigned download URL for a specific version's bytes.

        The version's own storage_key is used so the URL points to the
        exact bytes from when that version was created.

        Args:
            caller_ttl: Caller-requested TTL. Overridden by config when
                        require_signed_urls is True.
        """
        await self._repo.get(file_id, self._ctx.organization_id, self._project_id)
        version = await self._version_repo.get(
            version_id, file_id, self._ctx.organization_id
        )
        config = await self._config_repo.get_for_project(
            self._project_id, self._ctx.organization_id
        )
        ttl = resolve_ttl(config, caller_ttl)
        provider = await self._get_provider()
        url = await provider.generate_presigned_download_url(
            version.storage_key, expires_in=ttl
        )
        return DownloadUrlResponse(
            url=url, expires_at=datetime.now(UTC) + timedelta(seconds=ttl)
        )

    async def restore_version(self, file_id: str, version_id: str) -> RestoreVersionResponse:
        """
        Restore a past version as the current file state.

        Updates the file record's storage_key, size_bytes, and content_type to
        match the chosen version, then creates a new FileVersion row so the
        restore itself is captured in the history. Emits file.restored.

        Returns:
            RestoreVersionResponse with the new version_number after restore.
        """
        record = await self._repo.get(file_id, self._ctx.organization_id, self._project_id)
        version = await self._version_repo.get(
            version_id, file_id, self._ctx.organization_id
        )

        now = datetime.now(UTC)
        record.storage_key = version.storage_key
        record.size_bytes = version.size_bytes
        record.content_type = version.content_type
        record.status = "ready"
        record.updated_at = now
        record.version_count = (record.version_count or 0) + 1

        await self._version_repo.create(
            file_id=record.id,
            organization_id=self._ctx.organization_id,
            project_id=self._project_id,
            version_number=record.version_count,
            storage_key=version.storage_key,
            size_bytes=version.size_bytes,
            content_type=version.content_type,
        )

        await self._outbox.publish(
            f"filenest.{self._ctx.organization_id}.{self._project_id}.file.restored",
            {
                "file_id": record.id,
                "restored_from_version": version.version_number,
                "new_version_number": record.version_count,
                "storage_key": version.storage_key,
            },
            organization_id=self._ctx.organization_id,
            project_id=self._project_id,
        )

        await self._session.commit()
        return RestoreVersionResponse(
            file_id=record.id, version_number=record.version_count
        )

    async def get_file(self, file_id: str) -> FileResponse:
        """Return the full metadata record for a single file."""
        record = await self._repo.get(file_id, self._ctx.organization_id, self._project_id)
        return self._to_response(record)

    async def get_download_url(self, file_id: str, *, caller_ttl: int | None = None) -> DownloadUrlResponse:
        """
        Generate a presigned download URL for a file.

        Args:
            caller_ttl: Caller-requested TTL. Overridden by config when
                        require_signed_urls is True.
        """
        record = await self._repo.get(file_id, self._ctx.organization_id, self._project_id)
        config = await self._config_repo.get_for_project(
            self._project_id, self._ctx.organization_id
        )
        ttl = resolve_ttl(config, caller_ttl)
        provider = await self._get_provider()
        url = await provider.generate_presigned_download_url(
            record.storage_key, filename=record.filename, expires_in=ttl,
        )
        return DownloadUrlResponse(url=url, expires_at=datetime.now(UTC) + timedelta(seconds=ttl))

    async def delete_file(self, file_id: str) -> DeleteResponse:
        """Soft-delete a file. Bytes are removed from storage via background event."""
        record = await self._repo.soft_delete(file_id, self._ctx.organization_id, self._project_id)

        await self._outbox.publish(
            f"filenest.{self._ctx.organization_id}.{self._project_id}.file.deleted",
            {"file_id": record.id, "storage_key": record.storage_key, "filename": record.filename},
            organization_id=self._ctx.organization_id,
            project_id=self._project_id,
        )

        await self._session.commit()
        return DeleteResponse(id=record.id)

    async def list_files(
        self,
        *,
        folder_id: str | None = None,
        q: str | None = None,
        tags: list[str] | None = None,
        category: str | None = None,
        status: str | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        size_min: int | None = None,
        size_max: int | None = None,
        metadata_filter: dict[str, Any] | None = None,
        limit: int = 50,
        offset: int = 0,
        cursor: str | None = None,
    ) -> FileListResponse:
        """
        Return a paginated, filtered list of files in the current project.

        Runs two queries: one COUNT(*) for the total and one SELECT for the page.
        Supports cursor (infinite scroll) and offset (page table) modes — see
        FileRepository.list() for pagination semantics.
        """
        filter_kwargs: dict[str, Any] = dict(
            folder_id=folder_id, q=q, tags=tags, category=category,
            status=status, date_from=date_from, date_to=date_to,
            size_min=size_min, size_max=size_max, metadata_filter=metadata_filter,
        )
        total, records = await asyncio.gather(
            self._repo.count(self._ctx.organization_id, self._project_id, **filter_kwargs),
            self._repo.list(
                self._ctx.organization_id, self._project_id,
                **filter_kwargs, limit=limit, offset=offset, cursor=cursor,
            ),
        )
        items = [self._to_response(r) for r in records]
        has_more = len(items) == limit and (offset + limit) < total if not cursor else len(items) == limit
        return FileListResponse(
            items=items,
            total=total,
            limit=limit,
            offset=offset if not cursor else 0,
            has_more=has_more,
            next_cursor=items[-1].id if items and has_more else None,
        )

    async def set_tags(self, file_id: str, tags: list[str]) -> TagsResponse:
        """Replace the full tag list on a file."""
        record = await self._repo.set_tags(
            file_id, self._ctx.organization_id, self._project_id, tags
        )
        await self._session.commit()
        return TagsResponse(id=record.id, tags=record.tags or [])

    async def add_tags(self, file_id: str, tags: list[str]) -> TagsResponse:
        """Append tags not already present on the file (union, no duplicates)."""
        record = await self._repo.add_tags(
            file_id, self._ctx.organization_id, self._project_id, tags
        )
        await self._session.commit()
        return TagsResponse(id=record.id, tags=record.tags or [])

    async def rename_file(self, file_id: str, req: RenameFileRequest) -> FileResponse:
        """
        Rename a file's display filename.

        Args:
            file_id: The file to rename.
            req:     RenameFileRequest with the new filename.

        Raises:
            NotFoundError: If the file does not exist.
        """
        record = await self._repo.rename_file(
            file_id, self._ctx.organization_id, self._project_id, req.filename
        )
        await self._session.commit()
        return self._to_response(record)

    async def move_file(self, file_id: str, req: MoveFileRequest) -> FileResponse:
        """
        Move a file to a different folder or to the root.

        Args:
            file_id: The file to move.
            req:     MoveFileRequest with the target folder_id (None = root).

        Raises:
            NotFoundError: If the file does not exist.
        """
        record = await self._repo.move_file(
            file_id, self._ctx.organization_id, self._project_id, req.folder_id
        )
        await self._session.commit()
        return self._to_response(record)

    def _to_response(self, record) -> FileResponse:
        return FileResponse(
            id=record.id,
            organization_id=record.organization_id,
            project_id=record.project_id,
            filename=record.filename,
            content_type=record.content_type,
            size_bytes=record.size_bytes,
            status=record.status,
            storage_key=record.storage_key or "",
            folder_id=record.folder_id,
            category=record.category,
            version_count=record.version_count or 0,
            tags=record.tags or [],
            metadata=json.loads(record.metadata_json or "{}"),
            created_at=record.created_at,
            updated_at=record.updated_at,
        )

    def _to_version_response(self, version) -> FileVersionResponse:
        return FileVersionResponse(
            id=version.id,
            file_id=version.file_id,
            version_number=version.version_number,
            storage_key=version.storage_key,
            size_bytes=version.size_bytes,
            content_type=version.content_type,
            created_at=version.created_at,
        )
