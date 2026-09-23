"""
Pipeline Background Worker:
Picks up queued batch ingestion jobs and executes ETL stages asynchronously.
Ensures zero batch/ETL processing logic runs inside synchronous API handlers.
"""

import asyncio
from typing import Dict, Any, Optional
from app.core.logging import get_logger
from app.infrastructure.pipeline.engine import ETLPipelineEngine, BatchIngestionJob
from app.infrastructure.pipeline.connectors import (
    WearablesConnector,
    HealthPlatformsConnector,
    ImportedRecordsConnector,
    DocumentsConnector,
    LabFeedsConnector
)
from app.infrastructure.pipeline.stages import IConnector

logger = get_logger(__name__)


class PipelineWorker:
    """
    Asynchronous Worker executing bulk data ingestion jobs in the background.
    """

    def __init__(self, engine: ETLPipelineEngine):
        self.engine = engine
        self._running = False
        self._connectors: Dict[str, IConnector] = {
            "wearables": WearablesConnector(),
            "health_platforms": HealthPlatformsConnector(),
            "imported_records": ImportedRecordsConnector(),
            "documents": DocumentsConnector(),
            "lab_feeds": LabFeedsConnector()
        }

    def register_connector(self, source_type: str, connector: IConnector) -> None:
        self._connectors[source_type] = connector

    async def process_job_async(self, job_id: str) -> BatchIngestionJob:
        job = self.engine.get_job(job_id)
        if not job:
            raise ValueError(f"Job '{job_id}' not found.")

        connector = self._connectors.get(job.source_type)
        if not connector:
            job.status = "failed"
            job.errors.append(f"No connector registered for source type: '{job.source_type}'")
            return job

        return await self.engine.execute_pipeline(job_id=job_id, connector=connector)
