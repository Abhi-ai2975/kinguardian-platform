"""
Document Security Test Suite:
1. Use FileNest (WORM compliant file storage IDs).
2. Validate file ownership & tenancy (cross-subject/cross-family upload rejected).
3. Check MIME/type (PDF, JPEG, PNG allowed; executables/scripts rejected).
4. Avoid direct public URLs.
5. Use temporary signed access (short expiry TTL).
6. Enforce authorization before download/view.
7. Maintain immutable audit events for every upload and access.
"""

import pytest
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.domains.family.infrastructure.models import (
    AppProfile,
    Family,
    FamilyMembership,
    CareSubject,
    HealthDocument
)
from app.domains.events.models import EventLog
from app.domains.family.infrastructure.repositories import (
    SQLAlchemyAppProfileRepository,
    SQLAlchemyFamilyRepository,
    SQLAlchemyConsentRepository
)
from app.domains.events.services import EventService
from app.domains.family.application.services import FamilyService
from app.domains.family.domain.exceptions import FamilyAccessError


@pytest.mark.asyncio
async def test_document_security_full_lifecycle(db_session: AsyncSession):
    """
    Verifies complete document security lifecycle:
    FileNest usage, ownership checks, MIME validation, temporary signed access,
    authorization enforcement, and audit event emission.
    """
    now = datetime.now(timezone.utc)

    # 1. Setup Profiles & Family Circles
    coordinator = AppProfile(id=uuid.uuid4(), iam_subject_id="iam_coord_docsec", display_name="Coordinator", email="coord@docsec.com", timezone="Europe/London")
    parent = AppProfile(id=uuid.uuid4(), iam_subject_id="iam_parent_docsec", display_name="Parent", email="parent@docsec.com", timezone="Asia/Kolkata")
    outsider = AppProfile(id=uuid.uuid4(), iam_subject_id="iam_out_docsec", display_name="Outsider", email="out@docsec.com", timezone="America/New_York")
    family = Family(id=uuid.uuid4(), name="DocSec Family", primary_coordinator_profile_id=coordinator.id)

    db_session.add_all([coordinator, parent, outsider, family])
    await db_session.flush()

    m_coord = FamilyMembership(id=uuid.uuid4(), family_id=family.id, profile_id=coordinator.id, membership_role="coordinator")
    m_parent = FamilyMembership(id=uuid.uuid4(), family_id=family.id, profile_id=parent.id, membership_role="parent")
    subject = CareSubject(id=uuid.uuid4(), family_id=family.id, profile_id=parent.id, fhir_patient_id="synth-pat-docsec")
    db_session.add_all([m_coord, m_parent, subject])
    await db_session.commit()

    # Repositories & Service
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    family_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_service = EventService(db_session)
    service = FamilyService(user_repo, family_repo, consent_repo, event_service)

    # ==========================================
    # 1. MIME Type Validation
    # ==========================================
    # Allowed MIME types (PDF, PNG, JPEG) -> Succeed
    init_res = await service.initiate_subject_document_upload(
        requester_id=parent.id,
        subject_id=subject.id,
        document_type="discharge_summary",
        filename="discharge_report_2026.pdf",
        mime_type="application/pdf"
    )
    assert init_res is not None
    assert "filenest_" in init_res["filenest_file_id"]
    assert init_res["upload_url"].startswith(f"{settings.FILENEST_URL}/api/v1/files/upload/")

    # Disallowed MIME type (e.g. application/x-msdos-program, text/html) -> Raised ValueError
    with pytest.raises(ValueError) as exc_mime:
        await service.initiate_subject_document_upload(
            requester_id=parent.id,
            subject_id=subject.id,
            document_type="lab_report",
            filename="malicious_payload.exe",
            mime_type="application/x-msdownload"
        )
    assert "Unsupported document MIME type" in str(exc_mime.value)

    # ==========================================
    # 2. File Ownership & Tenancy Validation
    # ==========================================
    # Outsider trying to initiate upload for Subject in another family -> FamilyAccessError
    with pytest.raises(FamilyAccessError) as exc_owner:
        await service.initiate_subject_document_upload(
            requester_id=outsider.id,
            subject_id=subject.id,
            document_type="lab_report",
            filename="lab.pdf",
            mime_type="application/pdf"
        )
    assert "not authorized" in str(exc_owner.value).lower()

    # ==========================================
    # 3. Temporary Signed Access & Public URL Avoidance
    # ==========================================
    doc_id = init_res["document_id"]
    download_info = await service.get_secure_document_download_url(
        requester_id=coordinator.id,
        document_id=doc_id,
        expiry_seconds=900
    )
    assert download_info is not None
    assert download_info["expires_in_seconds"] == 900
    # Avoids raw direct public bucket/S3 URLs
    assert "token=sig_" in download_info["download_url"]
    assert "expires=" in download_info["download_url"]

    # ==========================================
    # 4. Enforce Authorization Before Download / View
    # ==========================================
    # Outsider trying to request signed download URL -> FamilyAccessError
    with pytest.raises(FamilyAccessError):
        await service.get_secure_document_download_url(
            requester_id=outsider.id,
            document_id=doc_id
        )

    # ==========================================
    # 5. Maintain Audit Events in event_logs
    # ==========================================
    events = (await db_session.execute(
        select(EventLog).where(
            EventLog.family_id == family.id,
            EventLog.event_type.in_(["document_upload_initiated", "document_download_url_generated"])
        )
    )).scalars().all()
    assert len(events) >= 2
    event_types = {e.event_type for e in events}
    assert "document_upload_initiated" in event_types
    assert "document_download_url_generated" in event_types
