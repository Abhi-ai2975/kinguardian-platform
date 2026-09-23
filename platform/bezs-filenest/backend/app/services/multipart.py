"""
app.services.multipart — Business logic for multipart file uploads.

Coordinates with UploadSessionRepository (DB), FileRepository (DB),
ProjectConfigRepository (feature flags), TransactionalOutboxPublisher (events),
and StorageResolver (storage backend).

Flow:
  1. start()       → validate max_file_size_bytes, create File + UploadSession rows,
                     call provider.create_multipart_upload(), return upload_id + file_id
  2. part_url()    → call provider.generate_presigned_part_url(), return presigned URL
  3. complete()    → call provider.complete_multipart_upload(), update File + UploadSession,
                     apply confirm_upload logic (pipeline gate, versioning)
  4. abort()       → call provider.abort_multipart_upload(), mark File failed + session aborted

Usage:
    svc = MultipartUploadService(session=session, ...)
    result = await svc.start(req)
"""
import json
from datetime import UTC, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import TenantContext
from app.auth.signed_url_policy import resolve_ttl
from app.core.messaging import TransactionalOutboxPublisher
from app.repositories.file import FileRepository
from app.repositories.file_version import FileVersionRepository
from app.repositories.project_config import ProjectConfigRepository
from app.repositories.storage_config import StorageConfigRepository
from app.repositories.upload_session import UploadSessionRepository
from app.services.upload_validation import validate_upload_request
from app.errors import NotFoundError, ValidationError
from app.schemas.file import (
    MultipartAbortResponse,
    MultipartCompleteRequest,
    MultipartCompleteResponse,
    MultipartPartUrlResponse,
    MultipartStartRequest,
    MultipartStartResponse,
)
from app.storage.resolver import storage_resolver


def _storage_key(organization_id: str, project_id: str, file_id: str) -> str:
    return f"{organization_id}/{project_id}/{file_id}"


class MultipartUploadService:
    """
    Orchestrates multipart upload operations for a single request.

    Args:
        session:        Active DB session (owns commit/rollback).
        file_repo:      FileRepository for file CRUD.
        version_repo:   FileVersionRepository for versioning on complete.
        session_repo:   UploadSessionRepository for tracking in-progress uploads.
        config_repo:    ProjectConfigRepository for feature flag lookups.
        outbox:         TransactionalOutboxPublisher for event enqueuing.
        ctx:            Resolved caller identity.
        project_id:     Project UUID from the URL path parameter.
    """

    def __init__(
        self,
        session: AsyncSession,
        file_repo: FileRepository,
        version_repo: FileVersionRepository,
        session_repo: UploadSessionRepository,
        config_repo: ProjectConfigRepository,
        storage_config_repo: StorageConfigRepository,
        outbox: TransactionalOutboxPublisher,
        ctx: TenantContext,
        project_id: str,
    ) -> None:
        self._session = session
        self._ctx = ctx
        self._project_id = project_id
        self._file_repo = file_repo
        self._version_repo = version_repo
        self._session_repo = session_repo
        self._config_repo = config_repo
        self._storage_config_repo = storage_config_repo
        self._outbox = outbox

    async def _get_provider(self):
        """
        Resolve the storage provider for this project from storage_configs.

        Falls back to the platform default only if no StorageConfig row exists.
        """
        try:
            storage_cfg = await self._storage_config_repo.get_for_project(
                self._project_id, self._ctx.organization_id
            )
            return storage_resolver.build_provider(storage_cfg)
        except NotFoundError:
            return await storage_resolver.get_provider(self._project_id)

    async def start(self, req: MultipartStartRequest) -> MultipartStartResponse:
        """
        Initiate a multipart upload.

        Validates total_size_bytes against project_configs.max_file_size_bytes,
        creates the File and UploadSession rows, and calls the storage provider
        to create the multipart upload.

        Raises:
            FileTooLargeError: If total_size_bytes exceeds the project limit.
            ValidationError:   If concurrent in-flight uploads exceed max_files_per_request.
        """
        config = await self._config_repo.get_for_project(
            self._project_id, self._ctx.organization_id
        )
        validate_upload_request(
            config,
            filename=req.filename,
            content_type=req.content_type,
            size_bytes=req.total_size_bytes,
        )
        if config.max_files_per_request:
            in_flight = await self._file_repo.count_in_flight(
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

        file_record = await self._file_repo.create(
            organization_id=self._ctx.organization_id,
            project_id=self._project_id,
            filename=req.filename,
            content_type=req.content_type,
            size_bytes=req.total_size_bytes,
            folder_id=req.folder_id,
            tags=list(dict.fromkeys(req.tags)),
            metadata_json=json.dumps(req.metadata),
            status="pending",
        )

        key = _storage_key(self._ctx.organization_id, self._project_id, file_record.id)
        file_record.storage_key = key

        provider = await self._get_provider()
        provider_upload_id = await provider.create_multipart_upload(key, req.content_type)

        upload_session = await self._session_repo.create(
            organization_id=self._ctx.organization_id,
            project_id=self._project_id,
            file_id=file_record.id,
            s3_upload_id=provider_upload_id,
            filename=req.filename,
            content_type=req.content_type,
            total_size_bytes=req.total_size_bytes,
        )

        await self._session.commit()
        return MultipartStartResponse(upload_id=upload_session.id, file_id=file_record.id)

    async def part_url(
        self, upload_id: str, part_number: int, *, caller_ttl: int | None = None
    ) -> MultipartPartUrlResponse:
        """
        Generate a presigned URL for uploading a single part directly to storage.

        Args:
            upload_id:   Our UploadSession UUID (not the provider's upload ID).
            part_number: 1-based part index (S3 requires 1–10000).
            caller_ttl:  Caller-requested TTL. Overridden by config when
                         require_signed_urls is True.
        """
        upload_session = await self._session_repo.get(
            upload_id, self._ctx.organization_id
        )
        file_record = await self._file_repo.get(
            upload_session.file_id, self._ctx.organization_id, self._project_id
        )
        config = await self._config_repo.get_for_project(
            self._project_id, self._ctx.organization_id
        )
        ttl = resolve_ttl(config, caller_ttl)
        provider = await self._get_provider()
        url = await provider.generate_presigned_part_url(
            file_record.storage_key,
            upload_session.s3_upload_id,
            part_number,
            expires_in=ttl,
        )
        return MultipartPartUrlResponse(
            upload_id=upload_id,
            part_number=part_number,
            url=url,
            expires_at=datetime.now(UTC) + timedelta(seconds=ttl),
        )

    async def complete(
        self, upload_id: str, req: MultipartCompleteRequest
    ) -> MultipartCompleteResponse:
        """
        Assemble all parts into the final object and apply the confirm_upload logic.

        After storage assembly:
          - If versioning_enabled → create FileVersion snapshot
          - If virus_scan_enabled → status=processing, emit file.uploaded
          - Else                  → status=ready, emit file.ready
        """
        upload_session = await self._session_repo.get(
            upload_id, self._ctx.organization_id
        )
        file_record = await self._file_repo.get(
            upload_session.file_id, self._ctx.organization_id, self._project_id
        )
        config = await self._config_repo.get_for_project(
            self._project_id, self._ctx.organization_id
        )

        provider = await self._get_provider()
        parts = [
            {"PartNumber": p.part_number, "ETag": p.etag}
            for p in req.parts
        ]
        await provider.complete_multipart_upload(file_record.storage_key, upload_session.s3_upload_id, parts)

        await self._session_repo.mark_completed(upload_id, len(req.parts))

        if config.versioning_enabled:
            file_record.version_count = (file_record.version_count or 0) + 1
            await self._version_repo.create(
                file_id=file_record.id,
                organization_id=self._ctx.organization_id,
                project_id=self._project_id,
                version_number=file_record.version_count,
                storage_key=file_record.storage_key,
                size_bytes=file_record.size_bytes,
                content_type=file_record.content_type,
            )

        if config.virus_scan_enabled:
            file_record.status = "processing"
            file_record.updated_at = datetime.now(UTC)
            await self._outbox.publish(
                f"filenest.{self._ctx.organization_id}.{self._project_id}.file.uploaded",
                {
                    "file_id": file_record.id,
                    "filename": file_record.filename,
                    "storage_key": file_record.storage_key,
                    "content_type": file_record.content_type,
                    "size_bytes": file_record.size_bytes,
                },
                organization_id=self._ctx.organization_id,
                project_id=self._project_id,
            )
        else:
            file_record.status = "ready"
            file_record.updated_at = datetime.now(UTC)
            await self._outbox.publish(
                f"filenest.{self._ctx.organization_id}.{self._project_id}.file.ready",
                {
                    "file_id": file_record.id,
                    "filename": file_record.filename,
                    "storage_key": file_record.storage_key,
                },
                organization_id=self._ctx.organization_id,
                project_id=self._project_id,
            )

        await self._session.commit()
        return MultipartCompleteResponse(file_id=file_record.id, status=file_record.status)

    async def abort(self, upload_id: str) -> MultipartAbortResponse:
        """
        Abort an in-progress multipart upload.

        Instructs the storage provider to discard all uploaded parts, marks the
        UploadSession aborted, and sets the File status to failed.
        """
        upload_session = await self._session_repo.get(
            upload_id, self._ctx.organization_id
        )
        file_record = await self._file_repo.get(
            upload_session.file_id, self._ctx.organization_id, self._project_id
        )

        provider = await self._get_provider()
        await provider.abort_multipart_upload(file_record.storage_key, upload_session.s3_upload_id)

        await self._session_repo.mark_aborted(upload_id)
        file_record.status = "failed"
        file_record.updated_at = datetime.now(UTC)

        await self._session.commit()
        return MultipartAbortResponse(upload_id=upload_id)
