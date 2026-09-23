"""
bezs-pipeline Integration Test Suite:
Verifies bulk / ETL data ingestion across 5 future data sources:
1. wearables
2. health platforms
3. imported health records
4. documents
5. lab feeds

Verifies Connector -> Extractor -> Transformer -> Loader stages,
retries, embeddings, and strictly asynchronous decoupled execution.
"""

import pytest
import uuid
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.clinical.gateway import MockClinicalRecordGateway
from app.domains.family.application.services import FamilyService
from app.domains.family.infrastructure.repositories import (
    SQLAlchemyAppProfileRepository,
    SQLAlchemyFamilyRepository,
    SQLAlchemyConsentRepository
)
from app.domains.events.services import EventService
from app.infrastructure.pipeline.engine import ETLPipelineEngine, ClinicalFHIRLoader
from app.infrastructure.pipeline.connectors import (
    WearablesConnector,
    HealthPlatformsConnector,
    ImportedRecordsConnector,
    DocumentsConnector,
    LabFeedsConnector
)
from app.workers.pipeline_worker import PipelineWorker
from app.application.pipeline.use_cases import (
    SubmitBatchIngestionUseCase,
    GetBatchIngestionJobStatusUseCase
)


@pytest.mark.asyncio
async def test_pipeline_integration_all_data_sources_and_stages(db_session: AsyncSession):
    """
    Verifies full ETL execution across all 5 data sources with embeddings and clinical loading.
    """
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    family_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    family_service = FamilyService(user_repo, family_repo, consent_repo, event_logger)

    clinical_gateway = MockClinicalRecordGateway()
    loader = ClinicalFHIRLoader(clinical_gateway=clinical_gateway)
    engine = ETLPipelineEngine(loader=loader)
    worker = PipelineWorker(engine)

    submit_uc = SubmitBatchIngestionUseCase(family_service, engine)
    status_uc = GetBatchIngestionJobStatusUseCase(engine)

    # 1. Setup Profiles
    coord = await family_service.get_or_create_profile(
        iam_subject_id="iam_coord_etl_01",
        email="coord.etl@kinguardian.com",
        display_name="Karan",
        timezone="Asia/Kolkata"
    )
    parent = await family_service.get_or_create_profile(
        iam_subject_id="iam_parent_etl_01",
        email="parent.etl@kinguardian.com",
        display_name="Vijay",
        timezone="Asia/Kolkata"
    )
    family = await family_service.create_care_circle(
        creator_id=coord.id,
        name="Vijay Family Care Circle",
        creator_role="coordinator"
    )
    await family_service.add_member_to_circle(
        requester_id=coord.id,
        care_circle_id=family.id,
        target_email="parent.etl@kinguardian.com",
        role="parent"
    )
    subject = await family_service.add_care_subject(
        requester_id=coord.id,
        family_id=family.id,
        fhir_patient_id="fhir-pat-vijay-200",
        profile_id=parent.id,
        relationship_to_coordinator="father"
    )

    sources = [
        "wearables",
        "health_platforms",
        "imported_records",
        "documents",
        "lab_feeds"
    ]

    for source in sources:
        # Step A: Synchronous API submission returns immediately with status="queued" (202 Accepted)
        job = await submit_uc.execute(
            requester_id=coord.id,
            family_id=family.id,
            subject_id=subject.id,
            source_type=source
        )
        assert job.status == "queued"
        assert job.records_loaded == 0
        assert job.job_id is not None

        # Step B: Background worker executes ETL stages asynchronously
        completed_job = await worker.process_job_async(job.job_id)
        assert completed_job.status == "completed"
        assert completed_job.records_extracted >= 1
        assert completed_job.records_transformed == completed_job.records_extracted
        assert completed_job.records_loaded == completed_job.records_transformed
        assert completed_job.completed_at is not None

        # Step C: Status check reflects completed state
        retrieved_job = await status_uc.execute(job.job_id)
        assert retrieved_job.status == "completed"

    # Verify loaded records in loader store
    assert len(loader.loaded_records) >= 10
    for rec in loader.loaded_records:
        assert rec.embedding_vector is not None
        assert len(rec.embedding_vector) == 16
        assert rec.checksum is not None


@pytest.mark.asyncio
async def test_pipeline_retry_and_resilience(db_session: AsyncSession):
    """
    Verifies retry logic with backoff when transient upstream connector errors occur.
    """
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    family_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    family_service = FamilyService(user_repo, family_repo, consent_repo, event_logger)

    engine = ETLPipelineEngine(max_retries=2, backoff_factor=0.01)

    # Flaky connector that fails once then succeeds
    class FlakyConnector:
        def __init__(self):
            self.attempts = 0

        async def connect(self):
            self.attempts += 1
            if self.attempts == 1:
                raise ConnectionError("Transient network timeout to wearable upstream")
            return True

        async def fetch_raw_batch(self, subject_id, cursor=None, limit=100):
            return [{"type": "spo2", "value": 99.0, "unit": "%"}]

    flaky_conn = FlakyConnector()
    job = engine.create_job(source_type="wearables", subject_id=uuid.uuid4(), family_id=uuid.uuid4())

    result = await engine.execute_pipeline(job.job_id, flaky_conn)
    assert result.status == "completed"
    assert result.records_loaded == 1
    assert len(result.errors) == 1  # 1 transient error logged
