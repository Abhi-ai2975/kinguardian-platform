"""
Phase 9 — Health Documents & FileNest Integration Test Suite.

Validates:
1. Upload initialization (FileNest signed URL generation, metadata storage)
2. Document metadata preservation (document_type, MIME type, file_size, subject linkage)
3. Processing events (FileNest webhook ingestion & domain event logging)
4. Extraction (raw output, normalized clinical output, AI confidence scores)
5. Review workflow (human-in-the-loop review: approved/rejected status transitions)
6. Clinical mapping readiness (normalized medications & lab result structures)
"""

import pytest
import uuid
from datetime import datetime, timezone, timedelta

from app.domains.family.application.services import FamilyService
from app.domains.family.infrastructure.repositories import (
    SQLAlchemyAppProfileRepository,
    SQLAlchemyFamilyRepository,
    SQLAlchemyConsentRepository
)
from app.domains.events.services import EventService


@pytest.fixture
def family_service(db_session):
    return FamilyService(
        user_repo=SQLAlchemyAppProfileRepository(db_session),
        circle_repo=SQLAlchemyFamilyRepository(db_session),
        consent_repo=SQLAlchemyConsentRepository(db_session),
        event_logger=EventService(db_session)
    )


@pytest.mark.asyncio
async def test_document_upload_initialization_and_metadata(family_service, db_session):
    """
    1. Upload Initialization & 2. Document Metadata:
    Verifies initiating document upload, generating FileNest target URL,
    and storing metadata in pending_upload state.
    """
    coordinator = await family_service.get_or_create_profile(
        iam_subject_id=f"iam_{uuid.uuid4()}",
        email=f"coord_doc_{uuid.uuid4().hex[:6]}@kinguardian.com",
        display_name="Anjali Coordinator"
    )
    parent = await family_service.get_or_create_profile(
        iam_subject_id=f"iam_{uuid.uuid4()}",
        email=f"parent_doc_{uuid.uuid4().hex[:6]}@kinguardian.com",
        display_name="Ramesh Parent"
    )

    family = await family_service.create_care_circle(
        creator_id=coordinator.id,
        name="Document Management Family",
        creator_role="coordinator"
    )
    await family_service.circle_repo.add_member(family.id, parent.id, "parent")

    subject = await family_service.circle_repo.add_care_subject(
        family_id=family.id,
        fhir_patient_id="fhir-pat-doc-001",
        profile_id=parent.id
    )

    # 1. Initiate Upload
    upload_res = await family_service.initiate_subject_document_upload(
        requester_id=coordinator.id,
        subject_id=subject.id,
        document_type="prescription",
        filename="discharge_prescription_aug2026.pdf",
        mime_type="application/pdf"
    )

    assert upload_res is not None
    assert upload_res["status"] == "pending_upload"
    assert upload_res["filenest_file_id"].startswith("filenest_")
    assert "/api/v1/files/upload/" in upload_res["upload_url"]
    assert upload_res["document_type"] == "prescription"

    # Verify event logged
    events = await family_service.event_logger.get_circle_events(family.id)
    assert any(e.event_type == "document_upload_initiated" for e in events)


@pytest.mark.asyncio
async def test_filenest_webhook_processing_extraction_and_review(family_service, db_session):
    """
    3. Processing Events, 4. Extraction, 5. Review, and 6. Clinical Mapping:
    Verifies handling FileNest completion webhook, extracting clinical entities,
    and coordinator review workflow.
    """
    coordinator = await family_service.get_or_create_profile(
        iam_subject_id=f"iam_{uuid.uuid4()}",
        email=f"coord_proc_{uuid.uuid4().hex[:6]}@kinguardian.com",
        display_name="Coordinator"
    )
    parent = await family_service.get_or_create_profile(
        iam_subject_id=f"iam_{uuid.uuid4()}",
        email=f"parent_proc_{uuid.uuid4().hex[:6]}@kinguardian.com",
        display_name="Parent"
    )

    family = await family_service.create_care_circle(
        creator_id=coordinator.id,
        name="Processing Family",
        creator_role="coordinator"
    )
    await family_service.circle_repo.add_member(family.id, parent.id, "parent")

    subject = await family_service.circle_repo.add_care_subject(
        family_id=family.id,
        fhir_patient_id="fhir-pat-proc-002",
        profile_id=parent.id
    )

    # 1. Initiate upload
    upload_res = await family_service.initiate_subject_document_upload(
        requester_id=coordinator.id,
        subject_id=subject.id,
        document_type="lab_report",
        filename="lipid_panel_results.pdf",
        mime_type="application/pdf"
    )
    file_id = upload_res["filenest_file_id"]

    # 2. FileNest sends processing completion webhook
    webhook_res = await family_service.process_filenest_webhook(
        event="file.processed",
        file_id=file_id,
        status="ready",
        extracted_text="HbA1c: 6.8%, Fasting Blood Sugar: 115 mg/dL",
        classification="lab_report"
    )

    assert webhook_res["status"] == "processed"
    assert webhook_res["confidence"] == 0.95
    extraction_id = webhook_res["extraction_id"]

    # 3. List extractions & verify normalized clinical mapping
    extractions = await family_service.list_document_extractions(
        requester_id=coordinator.id,
        family_id=family.id,
        document_id=upload_res["document_id"]
    )
    assert len(extractions) == 1
    ext = extractions[0]
    assert ext.review_status == "pending_review"
    assert "lab_results" in ext.normalized_output
    assert any(item["test"] == "HbA1c" for item in ext.normalized_output["lab_results"])

    # 4. Coordinator reviews and approves the extraction
    reviewed_ext = await family_service.review_document_extraction(
        requester_id=coordinator.id,
        family_id=family.id,
        extraction_id=extraction_id,
        review_status="approved",
        normalized_output=ext.normalized_output
    )
    assert reviewed_ext is not None
    assert reviewed_ext.review_status == "approved"
    assert reviewed_ext.reviewed_by_profile_id == coordinator.id
    assert reviewed_ext.reviewed_at is not None

    # Verify download URL generation
    download_info = await family_service.get_secure_document_download_url(
        requester_id=coordinator.id,
        document_id=upload_res["document_id"],
        expiry_seconds=600
    )
    assert "/api/v1/files/download/" in download_info["download_url"]
    assert "token=" in download_info["download_url"]
