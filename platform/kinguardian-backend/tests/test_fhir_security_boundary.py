"""
FHIR Security Boundary Test Suite:
Verifies that:
1. Mobile clients NEVER call FHIR server directly.
2. All clinical requests MUST pass through KinGuardian API -> Authorization -> FHIR Adapter -> FHIR Service.
3. Requests lacking membership or explicit consent are strictly rejected (HTTP 403 Forbidden).
"""

import pytest
import uuid
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.clinical.security_boundary import FHIRSecurityBoundary

from app.domains.family.infrastructure.models import (
    Family,
    FamilyMembership,
    CareSubject,
    AppProfile,
    Consent
)


@pytest.mark.asyncio
async def test_fhir_security_boundary_authorized_flow(db_session: AsyncSession):
    """
    Verifies that an authorized caregiver with active consent passes through
    the KinGuardian Security Boundary and resolves the internal FHIR patient identifier.
    """
    # 1. Setup Parent & Coordinator in DB
    parent = AppProfile(
        id=uuid.uuid4(),
        iam_subject_id=f"iam_{uuid.uuid4().hex}",
        email="parent.fhir@example.com",
        display_name="Kishore"
    )
    coord = AppProfile(
        id=uuid.uuid4(),
        iam_subject_id=f"iam_{uuid.uuid4().hex}",
        email="coord.fhir@example.com",
        display_name="Meera"
    )
    family = Family(id=uuid.uuid4(), name="Kishore Family", primary_coordinator_profile_id=coord.id)
    
    mem_parent = FamilyMembership(id=uuid.uuid4(), family_id=family.id, profile_id=parent.id, membership_role="parent")
    mem_coord = FamilyMembership(id=uuid.uuid4(), family_id=family.id, profile_id=coord.id, membership_role="coordinator")
    
    subject = CareSubject(
        id=uuid.uuid4(),
        family_id=family.id,
        profile_id=parent.id,
        fhir_patient_id="fhir-pat-secure-101",
        relationship_to_coordinator="father"
    )
    
    consent = Consent(
        id=uuid.uuid4(),
        family_id=family.id,
        subject_id=subject.id,
        grantor_profile_id=parent.id,
        grantee_profile_id=coord.id,
        consent_type="clinical_read",
        scope={"vitals": True, "medications": True},
        status="active"
    )

    db_session.add_all([parent, coord, family, mem_parent, mem_coord, subject, consent])
    await db_session.commit()

    # 2. Authorize FHIR access via KinGuardian boundary
    auth_result = await FHIRSecurityBoundary.authorize_fhir_access(
        session=db_session,
        requester_id=coord.id,
        subject_id=subject.id,
        required_capability="vitals",
        family_id=family.id
    )

    assert auth_result["authorized"] is True
    assert auth_result["fhir_patient_id"] == "fhir-pat-secure-101"
    assert auth_result["authorized_capability"] == "vitals"


@pytest.mark.asyncio
async def test_fhir_security_boundary_rejects_unauthorized_non_member(db_session: AsyncSession):
    """
    Verifies that a mobile user attempting to bypass or access a subject outside
    their family membership is rejected with HTTP 403 Forbidden.
    """
    parent = AppProfile(id=uuid.uuid4(), iam_subject_id=f"iam_{uuid.uuid4().hex}", email="parent.sec@example.com")
    intruder = AppProfile(id=uuid.uuid4(), iam_subject_id=f"iam_{uuid.uuid4().hex}", email="intruder@example.com")
    family = Family(id=uuid.uuid4(), name="Sec Family", primary_coordinator_profile_id=parent.id)
    mem_parent = FamilyMembership(id=uuid.uuid4(), family_id=family.id, profile_id=parent.id, membership_role="parent")
    subject = CareSubject(id=uuid.uuid4(), family_id=family.id, profile_id=parent.id, fhir_patient_id="fhir-pat-sec-102")

    db_session.add_all([parent, intruder, family, mem_parent, subject])
    await db_session.commit()

    with pytest.raises(HTTPException) as exc_info:
        await FHIRSecurityBoundary.authorize_fhir_access(
            session=db_session,
            requester_id=intruder.id,
            subject_id=subject.id,
            required_capability="vitals",
            family_id=family.id
        )
    assert exc_info.value.status_code == 403
    assert "Not authorized" in exc_info.value.detail


@pytest.mark.asyncio
async def test_fhir_security_boundary_rejects_revoked_consent(db_session: AsyncSession):
    """
    Verifies that when a caregiver's consent is revoked, clinical FHIR access is denied.
    """
    parent = AppProfile(id=uuid.uuid4(), iam_subject_id=f"iam_{uuid.uuid4().hex}", email="parent.rev@example.com")
    member = AppProfile(id=uuid.uuid4(), iam_subject_id=f"iam_{uuid.uuid4().hex}", email="member.rev@example.com")
    family = Family(id=uuid.uuid4(), name="Rev Family", primary_coordinator_profile_id=parent.id)
    
    mem_parent = FamilyMembership(id=uuid.uuid4(), family_id=family.id, profile_id=parent.id, membership_role="parent")
    mem_other = FamilyMembership(id=uuid.uuid4(), family_id=family.id, profile_id=member.id, membership_role="viewer")
    
    subject = CareSubject(id=uuid.uuid4(), family_id=family.id, profile_id=parent.id, fhir_patient_id="fhir-pat-rev-103")
    
    # Revoked consent
    consent = Consent(
        id=uuid.uuid4(),
        family_id=family.id,
        subject_id=subject.id,
        grantor_profile_id=parent.id,
        grantee_profile_id=member.id,
        consent_type="clinical_read",
        scope={"vitals": True},
        status="revoked"
    )

    db_session.add_all([parent, member, family, mem_parent, mem_other, subject, consent])
    await db_session.commit()

    with pytest.raises(HTTPException) as exc_info:
        await FHIRSecurityBoundary.authorize_fhir_access(
            session=db_session,
            requester_id=member.id,
            subject_id=subject.id,
            required_capability="vitals",
            family_id=family.id
        )
    assert exc_info.value.status_code == 403
    assert "Consent not granted" in exc_info.value.detail
