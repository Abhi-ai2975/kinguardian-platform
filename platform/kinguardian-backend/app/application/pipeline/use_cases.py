"""
Pipeline Application Use Cases:
- SubmitBatchIngestionUseCase
- GetBatchIngestionJobStatusUseCase
"""

import uuid
from typing import Dict, Any, Optional
from app.domains.family.application.services import FamilyService
from app.domains.family.domain.exceptions import FamilyAccessError
from app.infrastructure.pipeline.engine import ETLPipelineEngine, BatchIngestionJob


class SubmitBatchIngestionUseCase:
    """
    Asynchronous Batch Ingestion Submission:
    Accepts bulk data ingestion requests for Wearables, Health Platforms,
    Imported Records, Documents, and Lab Feeds.
    Guarantees that synchronous API handlers NEVER execute blocking ETL loops.
    Returns a 202 Accepted Job Receipt immediately.
    """

    def __init__(self, family_service: FamilyService, pipeline_engine: ETLPipelineEngine):
        self.family_service = family_service
        self.pipeline_engine = pipeline_engine

    async def execute(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        subject_id: uuid.UUID,
        source_type: str
    ) -> BatchIngestionJob:
        # Authorization & tenancy validation
        mem = await self.family_service.circle_repo.get_member(family_id, requester_id)
        if not mem:
            raise FamilyAccessError(f"User {requester_id} is not an authorized member of Family {family_id}.")

        subject = await self.family_service.circle_repo.get_care_subject(subject_id)
        if not subject or subject.family_id != family_id:
            raise FamilyAccessError(f"Subject {subject_id} not found in this Family group.")

        valid_sources = ["wearables", "health_platforms", "imported_records", "documents", "lab_feeds"]
        if source_type not in valid_sources:
            raise ValueError(f"Invalid data source type '{source_type}'. Allowed: {valid_sources}")

        # Create asynchronous job in queued status
        job = self.pipeline_engine.create_job(
            source_type=source_type,
            subject_id=subject_id,
            family_id=family_id
        )

        # Log ingestion queued event
        await self.family_service.event_logger.log_event(
            care_circle_id=family_id,
            event_type="batch_ingestion_queued",
            payload={
                "job_id": job.job_id,
                "source_type": source_type,
                "subject_id": str(subject_id),
                "queued_by": str(requester_id)
            }
        )
        return job


class GetBatchIngestionJobStatusUseCase:
    """Retrieves current processing progress and telemetry for a batch ingestion job."""
    def __init__(self, pipeline_engine: ETLPipelineEngine):
        self.pipeline_engine = pipeline_engine

    async def execute(self, job_id: str) -> Optional[BatchIngestionJob]:
        return self.pipeline_engine.get_job(job_id)
