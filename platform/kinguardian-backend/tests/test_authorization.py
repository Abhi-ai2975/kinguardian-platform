import uuid
from datetime import datetime, timezone, timedelta
import pytest
from fastapi import HTTPException
from app.domains.family.application.authorization_service import AuthorizationService
from app.domains.family.application.services import FamilyService
from app.domains.family.application.permissions import (
    CAP_VIEW_BASIC,
    CAP_VIEW_VITALS,
    CAP_VIEW_MEDICATIONS,
    CAP_MANAGE_CARE_TASKS,
    CAP_UPLOAD_DOCUMENTS
)
from app.domains.family.infrastructure.repositories import (
    SQLAlchemyAppProfileRepository,
    SQLAlchemyFamilyRepository,
    SQLAlchemyConsentRepository
)
from app.domains.events.services import EventService


@pytest.mark.asyncio
async def test_authorization_service_comprehensive_policies(db_session):
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    family_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    family_svc = FamilyService(user_repo, family_repo, consent_repo, event_logger)
    
    auth_svc = AuthorizationService(db_session)
    
    # 1. Setup Profiles
    parent = await family_svc.get_or_create_profile(
        iam_subject_id="iam_parent_auth",
        email="parent_auth@kinguardian.com",
        display_name="Parent Auth",
        timezone="Asia/Kolkata"
    )
    coordinator = await family_svc.get_or_create_profile(
        iam_subject_id="iam_coord_auth",
        email="coord_auth@kinguardian.com",
        display_name="Coordinator Auth",
        timezone="America/New_York"
    )
    caregiver = await family_svc.get_or_create_profile(
        iam_subject_id="iam_cg_auth",
        email="caregiver_auth@kinguardian.com",
        display_name="Caregiver Auth",
        timezone="Asia/Kolkata"
    )
    stranger = await family_svc.get_or_create_profile(
        iam_subject_id="iam_stranger_auth",
        email="stranger_auth@kinguardian.com",
        display_name="Stranger Auth",
        timezone="UTC"
    )
    
    # 2. Setup Family & Memberships
    family = await family_svc.create_care_circle(parent.id, "Auth Test Family", "parent")
    await family_svc.add_member_to_circle(parent.id, family.id, coordinator.email, "coordinator")
    await family_svc.add_member_to_circle(parent.id, family.id, caregiver.email, "caregiver")
    
    # 3. Setup Care Subject
    subject = await family_svc.add_care_subject(
        requester_id=parent.id,
        family_id=family.id,
        fhir_patient_id="fhir-pat-auth-1",
        profile_id=parent.id,
        relationship_to_coordinator="father"
    )
    
    # --- TEST 1: Default Deny ---
    # Stranger is not in the family -> Denied
    assert await auth_svc.can_view_subject(stranger.id, subject.id, family.id) is False
    assert await auth_svc.can(stranger.id, CAP_VIEW_VITALS, subject) is False
    
    # --- TEST 2: Self-Access / Resource Ownership ---
    # Parent viewing their own subject record -> True
    assert await auth_svc.can_view_subject(parent.id, subject.id, family.id) is True
    assert await auth_svc.can(parent.id, CAP_VIEW_VITALS, subject) is True
    
    # --- TEST 3: Family Membership & Basic View ---
    # Coordinator in family can view subject basics
    assert await auth_svc.can_view_subject(coordinator.id, subject.id, family.id) is True
    assert await auth_svc.can(coordinator.id, CAP_MANAGE_CARE_TASKS, subject) is True
    
    # Caregiver can view subject basics
    assert await auth_svc.can_view_subject(caregiver.id, subject.id, family.id) is True
    
    # --- TEST 4: Clinical Consent Policy (Vitals & Medications) ---
    # Before consent: Coordinator querying vitals -> False (no consent record yet)
    assert await auth_svc.can(coordinator.id, CAP_VIEW_VITALS, subject) is False
    
    # Grant consent for vitals (active, no expiry)
    await family_svc.set_consent(
        grantor_id=parent.id,
        family_id=family.id,
        subject_id=subject.id,
        grantee_email=coordinator.email,
        scope={"vitals": True, "medications": False},
        status="active"
    )
    
    # After consent: Coordinator can view vitals, but NOT medications
    assert await auth_svc.can(coordinator.id, CAP_VIEW_VITALS, subject) is True
    assert await auth_svc.can(coordinator.id, CAP_VIEW_MEDICATIONS, subject) is False
    
    # --- TEST 5: Consent Revocation & Scope ---
    # Revoke vitals consent
    await family_svc.set_consent(
        grantor_id=parent.id,
        family_id=family.id,
        subject_id=subject.id,
        grantee_email=coordinator.email,
        scope={"vitals": False},
        status="revoked"
    )
    assert await auth_svc.can(coordinator.id, CAP_VIEW_VITALS, subject) is False
    
    # --- TEST 6: Care Relationship Access Levels ---
    # Add explicit care relationship for caregiver with "standard" access level
    await family_svc.add_care_relationship(
        requester_id=parent.id,
        family_id=family.id,
        subject_id=subject.id,
        profile_id=caregiver.id,
        relationship_type="professional_nurse",
        access_level="standard"
    )
    assert await auth_svc.can(caregiver.id, CAP_MANAGE_CARE_TASKS, subject) is True
    
    # --- TEST 7: assert_can Helper ---
    # Permitted call succeeds
    await auth_svc.assert_can(parent.id, CAP_VIEW_BASIC, subject)
    
    # Denied call raises HTTPException(403)
    with pytest.raises(HTTPException) as exc_info:
        await auth_svc.assert_can(stranger.id, CAP_VIEW_BASIC, subject)
    assert exc_info.value.status_code == 403
