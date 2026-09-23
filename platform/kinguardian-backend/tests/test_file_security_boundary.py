"""
File Security Boundary Test Suite:
Verifies that:
1. Mobile clients NEVER receive raw/unrestricted object storage credentials.
2. All uploads & downloads MUST pass KinGuardian permission checks.
3. FileNest signed URLs have short TTLs and scoped HMAC signatures.
4. Unauthorized access, disallowed MIME types, and quarantined files are strictly rejected.
"""

import pytest
import uuid
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.documents.security_boundary import FileSecurityBoundary
from app.domains.family.infrastructure.models import (
    Family,
    FamilyMembership,
    CareSubject,
    AppProfile,
    HealthDocument
)


@pytest.mark.asyncio
async def test_signed_upload_url_generation_after_permission_check(db_session: AsyncSession):
    """
    Verifies that authorized member receives a temporary signed upload URL
    without exposing storage credentials.
    """
    parent = AppProfile(id=uuid.uuid4(), iam_subject_id=f"iam_{uuid.uuid4().hex}", email="parent.file@example.com")
    family = Family(id=uuid.uuid4(), name="File Family", primary_coordinator_profile_id=parent.id)
    mem = FamilyMembership(id=uuid.uuid4(), family_id=family.id, profile_id=parent.id, membership_role="parent")
    subject = CareSubject(id=uuid.uuid4(), family_id=family.id, profile_id=parent.id, fhir_patient_id="fhir-pat-file-01")

    db_session.add_all([parent, family, mem, subject])
    await db_session.commit()

    upload_info = await FileSecurityBoundary.authorize_and_generate_signed_upload(
        session=db_session,
        requester_id=parent.id,
        subject_id=subject.id,
        document_type="discharge_summary",
        filename="discharge.pdf",
        mime_type="application/pdf",
        expiry_seconds=900
    )

    assert upload_info["credentials_exposed"] is False
    assert upload_info["expires_in_seconds"] == 900
    assert "token=sig_" in upload_info["upload_url"]
    assert "expires=" in upload_info["upload_url"]
    assert upload_info["filenest_file_id"].startswith("filenest_")


@pytest.mark.asyncio
async def test_signed_download_url_generation_after_permission_check(db_session: AsyncSession):
    """
    Verifies that authorized member receives a temporary signed download URL.
    """
    coord = AppProfile(id=uuid.uuid4(), iam_subject_id=f"iam_{uuid.uuid4().hex}", email="coord.file@example.com")
    family = Family(id=uuid.uuid4(), name="File Family 2", primary_coordinator_profile_id=coord.id)
    mem = FamilyMembership(id=uuid.uuid4(), family_id=family.id, profile_id=coord.id, membership_role="coordinator")
    subject = CareSubject(id=uuid.uuid4(), family_id=family.id, profile_id=coord.id, fhir_patient_id="fhir-pat-file-02")
    doc = HealthDocument(
        id=uuid.uuid4(),
        family_id=family.id,
        subject_id=subject.id,
        filenest_file_id="filenest_valid_pdf_123",
        document_type="lab_report",
        source_profile_id=coord.id,
        status="active"
    )

    db_session.add_all([coord, family, mem, subject, doc])
    await db_session.commit()

    download_info = await FileSecurityBoundary.authorize_and_generate_signed_download(
        session=db_session,
        requester_id=coord.id,
        document_id=doc.id,
        expiry_seconds=900
    )

    assert download_info["credentials_exposed"] is False
    assert download_info["expires_in_seconds"] == 900
    assert "filenest_valid_pdf_123" in download_info["download_url"]
    assert "token=sig_" in download_info["download_url"]


@pytest.mark.asyncio
async def test_disallowed_mime_type_rejected(db_session: AsyncSession):
    """
    Verifies that executable or disallowed MIME types are rejected with HTTP 400.
    """
    parent = AppProfile(id=uuid.uuid4(), iam_subject_id=f"iam_{uuid.uuid4().hex}", email="parent.mime@example.com")
    family = Family(id=uuid.uuid4(), name="Mime Family", primary_coordinator_profile_id=parent.id)
    mem = FamilyMembership(id=uuid.uuid4(), family_id=family.id, profile_id=parent.id, membership_role="parent")
    subject = CareSubject(id=uuid.uuid4(), family_id=family.id, profile_id=parent.id, fhir_patient_id="fhir-pat-file-03")

    db_session.add_all([parent, family, mem, subject])
    await db_session.commit()

    with pytest.raises(HTTPException) as exc_info:
        await FileSecurityBoundary.authorize_and_generate_signed_upload(
            session=db_session,
            requester_id=parent.id,
            subject_id=subject.id,
            document_type="script",
            filename="trojan.exe",
            mime_type="application/x-msdownload"
        )
    assert exc_info.value.status_code == 400
    assert "Unsupported document MIME type" in exc_info.value.detail


@pytest.mark.asyncio
async def test_quarantined_document_download_blocked(db_session: AsyncSession):
    """
    Verifies that quarantined files cannot be downloaded even by authorized members.
    """
    coord = AppProfile(id=uuid.uuid4(), iam_subject_id=f"iam_{uuid.uuid4().hex}", email="coord.quar@example.com")
    family = Family(id=uuid.uuid4(), name="Quar Family", primary_coordinator_profile_id=coord.id)
    mem = FamilyMembership(id=uuid.uuid4(), family_id=family.id, profile_id=coord.id, membership_role="coordinator")
    subject = CareSubject(id=uuid.uuid4(), family_id=family.id, profile_id=coord.id, fhir_patient_id="fhir-pat-file-04")
    doc = HealthDocument(
        id=uuid.uuid4(),
        family_id=family.id,
        subject_id=subject.id,
        filenest_file_id="filenest_infected_pdf_456",
        document_type="lab_report",
        source_profile_id=coord.id,
        status="quarantined"
    )

    db_session.add_all([coord, family, mem, subject, doc])
    await db_session.commit()

    with pytest.raises(HTTPException) as exc_info:
        await FileSecurityBoundary.authorize_and_generate_signed_download(
            session=db_session,
            requester_id=coord.id,
            document_id=doc.id
        )
    assert exc_info.value.status_code == 403
    assert "quarantined" in exc_info.value.detail
