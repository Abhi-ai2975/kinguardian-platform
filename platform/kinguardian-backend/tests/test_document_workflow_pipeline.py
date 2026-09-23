"""
Document Workflow Pipeline Test Suite:
Verifies asynchronous event-driven document processing integrating:
Upload
 ↓
FileNest (WORM storage & checksums)
 ↓
Scan/validation (MIME check, security scan)
 ↓
Document event (health_document_uploaded)
 ↓
Extraction job (background OCR / entity parser)
 ↓
AI processing (structured candidate entity extraction)
 ↓
Extracted candidate data (pending_review state)
 ↓
Review (human coordinator / clinician approval)
 ↓
Optional clinical write (FHIR R4 MedicationStatement & Observation writeback)
"""

import pytest
import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.adapters.mock_filenest import MockFileStorageGateway
from app.domains.clinical.gateway import MockClinicalRecordGateway
from app.domains.family.application.services import FamilyService
from app.domains.family.infrastructure.repositories import (
    SQLAlchemyAppProfileRepository,
    SQLAlchemyFamilyRepository,
    SQLAlchemyConsentRepository
)
from app.domains.events.services import EventService
from app.domain.documents.state_machine import HealthDocumentState
from app.application.documents.workflow import DocumentProcessingWorkflow
from app.application.documents.use_cases import (
    IngestDocumentAsyncUseCase,
    ApproveAndSyncClinicalRecordUseCase
)


@pytest.mark.asyncio
async def test_document_workflow_asynchronous_pipeline_with_clinical_write(db_session: AsyncSession):
    """
    Tests the complete event-driven document workflow lifecycle including optional clinical EMR writes.
    """
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    family_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    family_service = FamilyService(user_repo, family_repo, consent_repo, event_logger)

    filenest_gateway = MockFileStorageGateway()
    clinical_gateway = MockClinicalRecordGateway()

    workflow = DocumentProcessingWorkflow(
        family_service=family_service,
        filenest_gateway=filenest_gateway,
        clinical_gateway=clinical_gateway
    )
    ingest_uc = IngestDocumentAsyncUseCase(workflow)
    approve_and_sync_uc = ApproveAndSyncClinicalRecordUseCase(workflow)

    # 1. Setup Profiles & Care Circle
    coord = await family_service.get_or_create_profile(
        iam_subject_id="iam_coord_doc_01",
        email="coord.doc@kinguardian.com",
        display_name="Rohan",
        timezone="America/Los_Angeles"
    )
    parent = await family_service.get_or_create_profile(
        iam_subject_id="iam_parent_doc_01",
        email="parent.doc@kinguardian.com",
        display_name="Suresh",
        timezone="Asia/Kolkata"
    )
    family = await family_service.create_care_circle(
        creator_id=coord.id,
        name="Suresh Family Group",
        creator_role="coordinator"
    )
    await family_service.add_member_to_circle(
        requester_id=coord.id,
        care_circle_id=family.id,
        target_email="parent.doc@kinguardian.com",
        role="parent"
    )
    subject = await family_service.add_care_subject(
        requester_id=coord.id,
        family_id=family.id,
        fhir_patient_id="fhir-pat-suresh-101",
        profile_id=parent.id,
        relationship_to_coordinator="father"
    )

    # ==========================================
    # Step 1, 2, 3 & 4: Upload -> FileNest -> Scan/Validation -> Document Event
    # ==========================================
    sample_pdf_bytes = b"%PDF-1.4 Mock Prescription Content for Suresh: Metformin 500mg BID and Atorvastatin 20mg QHS"
    filename = "prescription_august_2026.pdf"

    doc = await ingest_uc.execute(
        requester_id=coord.id,
        family_id=family.id,
        subject_id=subject.id,
        file_bytes=sample_pdf_bytes,
        filename=filename,
        document_type="prescription",
        mime_type="application/pdf"
    )
    assert doc.id is not None
    assert doc.filenest_file_id is not None
    assert doc.status == HealthDocumentState.UPLOADING.value

    # Verify FileNest holds the file with SHA256 integrity
    filenest_meta = await filenest_gateway.get_metadata(doc.filenest_file_id)
    assert filenest_meta is not None
    assert filenest_meta["size_bytes"] == len(sample_pdf_bytes)

    # ==========================================
    # Step 5, 6 & 7: Extraction Job -> AI Processing -> Extracted Candidate Data
    # ==========================================
    extraction = await workflow.handle_filenest_event_and_extract(
        filenest_file_id=doc.filenest_file_id,
        scan_status="clean",
        extracted_text="Rx: Metformin 500mg twice daily; Atorvastatin 20mg once daily at bedtime",
        classification="prescription"
    )
    assert extraction.id is not None
    assert extraction.review_status == "pending_review"
    assert extraction.normalized_output is not None

    candidates = extraction.normalized_output.get("candidate_medications", [])
    assert len(candidates) >= 2
    assert any(c["name"] == "Metformin" for c in candidates)
    assert any(c["name"] == "Atorvastatin" for c in candidates)

    # Verify Document state transitioned to 'ready' for human review
    updated_doc = await family_service.circle_repo.get_health_document(doc.id)
    assert updated_doc.status == HealthDocumentState.READY.value

    # ==========================================
    # Step 8 & 9: Human Review -> Optional Clinical Write
    # ==========================================
    # Coordinator reviews candidate entities, corrects a dosage instruction, and approves
    approved_candidate_data = {
        "candidate_medications": [
            {"name": "Metformin", "dosage": "500mg twice daily with meals", "frequency": "twice daily"},
            {"name": "Atorvastatin", "dosage": "20mg once daily at bedtime", "frequency": "nightly"}
        ],
        "reviewer_notes": "Reviewed and verified against physical prescription label."
    }

    review_result = await approve_and_sync_uc.execute(
        reviewer_id=coord.id,
        family_id=family.id,
        extraction_id=extraction.id,
        approved_data=approved_candidate_data,
        write_to_clinical_record=True
    )
    assert review_result["status"] == "approved"
    assert review_result["clinical_synced"] is True
    assert review_result["clinical_resources_created"] == 2

    # Verify clinical write into FHIR R4 EMR gateway
    clinical_meds = await clinical_gateway.get_medications(subject.fhir_patient_id)
    assert len(clinical_meds) >= 2
    assert any(m["medication_name"] == "Metformin" for m in clinical_meds)
    assert any(m["medication_name"] == "Atorvastatin" for m in clinical_meds)

    # Verify document state is now 'reviewed'
    final_doc = await family_service.circle_repo.get_health_document(doc.id)
    assert final_doc.status == HealthDocumentState.REVIEWED.value
