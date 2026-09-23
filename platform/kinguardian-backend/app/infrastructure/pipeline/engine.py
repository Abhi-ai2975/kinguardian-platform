"""
bezs-pipeline ETL Engine:
Executes connector -> extractor -> transformer -> loader stages with retries, checkpointing, and embeddings.
Ensures batch ingestion is executed asynchronously outside synchronous API handlers.
"""

import uuid
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field

from app.core.logging import get_logger
from app.infrastructure.pipeline.stages import (
    IConnector,
    IExtractor,
    ITransformer,
    ILoader,
    IngestionRecord,
    StandardExtractor,
    StandardTransformer
)
from app.domains.clinical.gateway import ClinicalRecordGateway

logger = get_logger(__name__)


class BatchIngestionJob(BaseModel):
    job_id: str = Field(default_factory=lambda: f"job_{uuid.uuid4().hex[:12]}")
    source_type: str  # "wearables" | "health_platforms" | "imported_records" | "documents" | "lab_feeds"
    subject_id: uuid.UUID
    family_id: uuid.UUID
    status: str = "queued"  # "queued" | "running" | "completed" | "failed"
    records_extracted: int = 0
    records_transformed: int = 0
    records_loaded: int = 0
    errors: List[str] = Field(default_factory=list)
    queued_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class ClinicalFHIRLoader(ILoader):
    """Loader Stage: Bulk persists transformed records into Clinical FHIR Gateway / DB."""
    def __init__(self, clinical_gateway: Optional[ClinicalRecordGateway] = None):
        self.clinical_gateway = clinical_gateway
        self.loaded_records: List[IngestionRecord] = []

    async def load(self, records: List[IngestionRecord]) -> int:
        count = 0
        for rec in records:
            if not rec.normalized_data:
                continue

            self.loaded_records.append(rec)
            count += 1

            if self.clinical_gateway:
                norm = rec.normalized_data
                fhir_pat = f"fhir-pat-{rec.subject_id}"

                if rec.source_type == "wearables":
                    await self.clinical_gateway.record_observation(
                        fhir_patient_id=fhir_pat,
                        code=norm.get("metric_type", "wearable_metric"),
                        value=norm.get("value", 0),
                        unit=norm.get("unit", ""),
                        category="vital-signs"
                    )
                elif rec.source_type == "lab_feeds":
                    await self.clinical_gateway.record_observation(
                        fhir_patient_id=fhir_pat,
                        code=norm.get("test_name", "Lab Test"),
                        value=norm.get("result_value", ""),
                        unit=norm.get("unit", ""),
                        category="laboratory"
                    )
        return count


class ETLPipelineEngine:
    """
    bezs-pipeline Orchestrator:
    Executes connector -> extractor -> transformer -> loader with retries.
    """

    def __init__(
        self,
        extractor: Optional[IExtractor] = None,
        transformer: Optional[ITransformer] = None,
        loader: Optional[ILoader] = None,
        max_retries: int = 3,
        backoff_factor: float = 0.5
    ):
        self.extractor = extractor or StandardExtractor()
        self.transformer = transformer or StandardTransformer()
        self.loader = loader or ClinicalFHIRLoader()
        self.max_retries = max_retries
        self.backoff_factor = backoff_factor
        self._jobs: Dict[str, BatchIngestionJob] = {}

    def create_job(self, source_type: str, subject_id: uuid.UUID, family_id: uuid.UUID) -> BatchIngestionJob:
        job = BatchIngestionJob(
            source_type=source_type,
            subject_id=subject_id,
            family_id=family_id
        )
        self._jobs[job.job_id] = job
        return job

    def get_job(self, job_id: str) -> Optional[BatchIngestionJob]:
        return self._jobs.get(job_id)

    async def execute_pipeline(self, job_id: str, connector: IConnector) -> BatchIngestionJob:
        job = self.get_job(job_id)
        if not job:
            raise ValueError(f"Job '{job_id}' not found.")

        job.status = "running"
        job.started_at = datetime.now(timezone.utc)
        logger.info(f"ETLPipeline: Starting batch ingestion {job_id} for source={job.source_type}")

        for attempt in range(1, self.max_retries + 1):
            try:
                # Stage 1: Connect
                await connector.connect()

                # Stage 2: Extract
                raw_items = await connector.fetch_raw_batch(subject_id=job.subject_id)
                extracted_records = await self.extractor.extract(
                    source_type=job.source_type,
                    subject_id=job.subject_id,
                    family_id=job.family_id,
                    raw_items=raw_items
                )
                job.records_extracted = len(extracted_records)

                # Stage 3: Transform (Schema Normalization + Embedding Generation)
                transformed_records = await self.transformer.transform(extracted_records)
                job.records_transformed = len(transformed_records)

                # Stage 4: Load
                loaded_count = await self.loader.load(transformed_records)
                job.records_loaded = loaded_count

                job.status = "completed"
                job.completed_at = datetime.now(timezone.utc)
                logger.info(f"ETLPipeline: Completed {job_id}. Loaded {loaded_count} records.")
                return job

            except Exception as e:
                err_msg = f"Attempt {attempt}/{self.max_retries} failed: {str(e)}"
                logger.warning(f"ETLPipeline {job_id}: {err_msg}")
                job.errors.append(err_msg)

                if attempt < self.max_retries:
                    sleep_time = self.backoff_factor * (2 ** (attempt - 1))
                    await asyncio.sleep(sleep_time)
                else:
                    job.status = "failed"
                    job.completed_at = datetime.now(timezone.utc)
                    logger.error(f"ETLPipeline: Job {job_id} permanently failed.")
                    return job

        return job
