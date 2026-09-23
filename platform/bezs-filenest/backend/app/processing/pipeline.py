"""
app.processing.pipeline — PipelineExecutor: coordinates all processing stages.

Receives a (file_id, organization_id, project_id) triple from ProcessingWorker,
loads the file and project config, downloads bytes from storage, runs each stage
in sequence, and writes the final status + outbox event in a single DB transaction.

Stage selection based on project_configs flags:
  virus_scan_enabled = True  → VirusScanStage runs first
  MimeValidationStage        → always runs
  ClassificationStage        → always runs last

Outcomes:
  All stages pass             → status=ready,       emit file.ready
  VirusScanStage finds virus  → status=quarantined, emit file.quarantined
  Any stage fails (mismatch)  → status=failed,      emit file.processing_failed
  Unhandled exception         → status=failed,      emit file.processing_failed

Usage:
    from app.processing.pipeline import PipelineExecutor
    executor = PipelineExecutor()
    await executor.run(file_id, organization_id, project_id)
"""
import json
from datetime import UTC, datetime

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.logging import get_logger
from app.core.messaging import TransactionalOutboxPublisher
from app.processing.stages.classification import ClassificationStage
from app.processing.stages.mime_validation import MimeValidationStage
from app.processing.stages.virus_scan import VirusScanStage
from app.errors import NotFoundError
from app.repositories.file import FileRepository
from app.repositories.project_config import ProjectConfigRepository
from app.repositories.storage_config import StorageConfigRepository
from app.storage.resolver import storage_resolver

logger = get_logger(__name__)


class PipelineExecutor:
    """
    Runs the processing pipeline for a single file.

    Each call opens its own DB session so it can run concurrently from the
    ProcessingWorker semaphore pool without sharing session state.
    """

    async def run(self, file_id: str, organization_id: str, project_id: str) -> None:
        """
        Execute all applicable stages for a file and persist the outcome.

        Args:
            file_id:         UUID of the file to process.
            organization_id: Owning organisation for tenant-scoped queries.
            project_id:      Project containing the file and its config.

        Raises:
            Nothing — all exceptions are caught and result in status=failed.
        """
        try:
            await self._execute(file_id, organization_id, project_id)
        except Exception as exc:
            logger.error(
                "pipeline.unhandled_error",
                file_id=file_id,
                organization_id=organization_id,
                project_id=project_id,
                error=str(exc),
            )
            await self._mark_failed(
                file_id, organization_id, project_id, reason=str(exc)
            )

    async def _execute(
        self, file_id: str, organization_id: str, project_id: str
    ) -> None:
        async with AsyncSessionLocal() as session:
            repo = FileRepository(session)
            config_repo = ProjectConfigRepository(session)
            outbox = TransactionalOutboxPublisher(session)

            file = await repo.get(file_id, organization_id, project_id)

            # Skip if a concurrent pipeline already completed this file.
            # This guards against duplicate delivery when the recovery function
            # re-queues a file whose NATS message was also still in the stream.
            if file.status != "processing":
                logger.info(
                    "pipeline.skip_already_processed",
                    file_id=file_id,
                    status=file.status,
                )
                return

            config = await config_repo.get_for_project(project_id, organization_id)

            # Resolve storage provider the same way FileService does — read the
            # project's StorageConfig so we hit the correct bucket (managed or BYOB).
            # Fall back to the platform default only if no StorageConfig exists yet.
            storage_config_repo = StorageConfigRepository(session)
            try:
                storage_cfg = await storage_config_repo.get_for_project(
                    project_id, organization_id
                )
                provider = storage_resolver.build_provider(storage_cfg)
            except NotFoundError:
                provider = await storage_resolver.get_provider(project_id)

            content = await provider.download_bytes(file.storage_key)

            # Build stage list — ClassificationStage always last
            stages = []
            if config.virus_scan_enabled:
                stages.append(VirusScanStage(
                    host=settings.clamav_host,
                    port=settings.clamav_port,
                    timeout=settings.clamav_timeout,
                ))
            stages.append(MimeValidationStage())
            stages.append(ClassificationStage())

            category: str | None = None
            quarantined = False
            failed_reason: str | None = None

            for stage in stages:
                result = await stage.run(file.filename, file.content_type, content)

                if result.category is not None:
                    category = result.category

                if not result.passed:
                    if stage.name == "virus_scan":
                        quarantined = True
                    else:
                        failed_reason = result.reason
                    break  # stop pipeline on first failure

            # Persist outcome
            now = datetime.now(UTC)
            if quarantined:
                file.status = "quarantined"
                file.updated_at = now
                if category:
                    file.category = category
                await outbox.publish(
                    f"filenest.{organization_id}.{project_id}.file.quarantined",
                    {
                        "file_id": file.id,
                        "filename": file.filename,
                        "storage_key": file.storage_key,
                        "reason": failed_reason,
                    },
                    organization_id=organization_id,
                    project_id=project_id,
                )
                logger.warning(
                    "pipeline.quarantined",
                    file_id=file_id,
                    organization_id=organization_id,
                    project_id=project_id,
                )
            elif failed_reason is not None:
                file.status = "failed"
                file.updated_at = now
                if category:
                    file.category = category
                await outbox.publish(
                    f"filenest.{organization_id}.{project_id}.file.processing_failed",
                    {
                        "file_id": file.id,
                        "filename": file.filename,
                        "reason": failed_reason,
                    },
                    organization_id=organization_id,
                    project_id=project_id,
                )
                logger.warning(
                    "pipeline.failed",
                    file_id=file_id,
                    organization_id=organization_id,
                    project_id=project_id,
                    reason=failed_reason,
                )
            else:
                file.status = "ready"
                file.updated_at = now
                if category:
                    file.category = category
                await outbox.publish(
                    f"filenest.{organization_id}.{project_id}.file.ready",
                    {
                        "file_id": file.id,
                        "filename": file.filename,
                        "storage_key": file.storage_key,
                        "category": category,
                    },
                    organization_id=organization_id,
                    project_id=project_id,
                )
                logger.info(
                    "pipeline.ready",
                    file_id=file_id,
                    organization_id=organization_id,
                    project_id=project_id,
                    category=category,
                )

            await session.commit()

    async def _mark_failed(
        self, file_id: str, organization_id: str, project_id: str, reason: str
    ) -> None:
        """Persist status=failed + outbox event when an unhandled exception occurs."""
        try:
            async with AsyncSessionLocal() as session:
                repo = FileRepository(session)
                outbox = TransactionalOutboxPublisher(session)
                file = await repo.get(file_id, organization_id, project_id)
                file.status = "failed"
                file.updated_at = datetime.now(UTC)
                await outbox.publish(
                    f"filenest.{organization_id}.{project_id}.file.processing_failed",
                    {"file_id": file_id, "reason": reason},
                    organization_id=organization_id,
                    project_id=project_id,
                )
                await session.commit()
        except Exception as exc:
            logger.error(
                "pipeline.mark_failed_error",
                file_id=file_id,
                error=str(exc),
            )
