"""
Comprehensive Authorization Test Matrix:
Verifies backend RBAC & capability enforcement across all roles:
Coordinator, Parent, Caregiver, Family Member, Observer.
Ensures security never relies solely on frontend UI hiding.
"""

import pytest
import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.family.infrastructure.models import (
    AppProfile,
    Family,
    FamilyMembership,
    CareSubject,
    CareRelationship,
    Consent,
    FamilyConversation
)
from app.domains.family.application.permissions import (
    PermissionVerifier,
    CAP_VIEW_HEALTH_SUMMARY,
    CAP_VIEW_MEDICATIONS,
    CAP_CONFIRM_ADHERENCE,
    CAP_ASSIGN_CARE_TASKS
)


@pytest.mark.asyncio
async def test_authorization_matrix_all_roles_and_capabilities(db_session: AsyncSession):
    """
    Tests the complete Authorization Matrix:
    - View health summary: Coordinator (✓), Parent (✓ own), Caregiver (configurable)
    - View medications: Coordinator (✓), Parent (✓ own), Caregiver (configurable)
    - Change medication definition: Coordinator (restricted/✗), Parent (✗), Caregiver (✗)
    - Confirm adherence: Coordinator (✓), Parent (✓ own), Caregiver (configurable/✓)
    - View private messages: Participant (✓), Non-participant (✗)
    - Assign care task: Coordinator (✓), Parent (✗), Caregiver (✗)
    - Revoke consent: Grantor (✓ own), Coordinator (✓), Caregiver (✗)
    """
    now = datetime.now(timezone.utc)

    # 1. Setup Profiles for All Roles
    coord = AppProfile(id=uuid.uuid4(), iam_subject_id="iam_coord_mat", display_name="Coordinator", email="coord@test.com", timezone="Europe/London")
    parent = AppProfile(id=uuid.uuid4(), iam_subject_id="iam_parent_mat", display_name="Parent", email="parent@test.com", timezone="Asia/Kolkata")
    caregiver = AppProfile(id=uuid.uuid4(), iam_subject_id="iam_cg_mat", display_name="Caregiver", email="cg@test.com", timezone="Asia/Kolkata")
    observer = AppProfile(id=uuid.uuid4(), iam_subject_id="iam_obs_mat", display_name="Observer", email="obs@test.com", timezone="Asia/Dubai")

    family = Family(id=uuid.uuid4(), name="Auth Matrix Family", primary_coordinator_profile_id=coord.id)
    db_session.add_all([coord, parent, caregiver, observer, family])
    await db_session.flush()

    # Memberships
    m_coord = FamilyMembership(id=uuid.uuid4(), family_id=family.id, profile_id=coord.id, membership_role="coordinator")
    m_parent = FamilyMembership(id=uuid.uuid4(), family_id=family.id, profile_id=parent.id, membership_role="parent")
    m_cg = FamilyMembership(id=uuid.uuid4(), family_id=family.id, profile_id=caregiver.id, membership_role="caregiver")
    m_obs = FamilyMembership(id=uuid.uuid4(), family_id=family.id, profile_id=observer.id, membership_role="observer")
    db_session.add_all([m_coord, m_parent, m_cg, m_obs])

    # Care Subject (Parent)
    subject = CareSubject(id=uuid.uuid4(), family_id=family.id, profile_id=parent.id, fhir_patient_id="synth-pat-mat-001")
    db_session.add(subject)

    # Care Relationships
    cr_coord = CareRelationship(
        id=uuid.uuid4(),
        family_id=family.id,
        subject_id=subject.id,
        profile_id=coord.id,
        relationship_type="primary_coordinator",
        access_level="full",
        status="active"
    )
    cr_cg = CareRelationship(
        id=uuid.uuid4(),
        family_id=family.id,
        subject_id=subject.id,
        profile_id=caregiver.id,
        relationship_type="assigned_caregiver",
        access_level="standard",
        status="active"
    )
    db_session.add_all([cr_coord, cr_cg])


    # Consent created by Parent
    consent = Consent(
        id=uuid.uuid4(),
        family_id=family.id,
        subject_id=subject.id,
        grantor_profile_id=parent.id,
        grantee_profile_id=coord.id,
        consent_type="data_access",
        scope={"vitals": True, "medications": True},
        status="active"
    )
    db_session.add(consent)

    # Private Conversation for subject
    conv = FamilyConversation(
        id=uuid.uuid4(),
        family_id=family.id,
        subject_id=subject.id
    )
    db_session.add(conv)
    await db_session.commit()


    verifier = PermissionVerifier(db_session)

    # ==========================================
    # Capability 1: View Health Summary
    # Coordinator: Yes, Parent: Yes (own), Caregiver: Configurable (Yes when active), Observer: Basic only
    # ==========================================
    assert await verifier.can_view_health_summary(coord.id, subject.id, family.id) is True
    assert await verifier.can_view_health_summary(parent.id, subject.id, family.id) is True
    assert await verifier.can_view_health_summary(caregiver.id, subject.id, family.id) is True

    # ==========================================
    # Capability 2: View Medications
    # Coordinator: Yes, Parent: Yes (own), Caregiver: Configurable (Yes), Observer: No
    # ==========================================
    assert await verifier.can_view_medications(coord.id, subject.id, family.id) is True
    assert await verifier.can_view_medications(parent.id, subject.id, family.id) is True
    assert await verifier.can_view_medications(caregiver.id, subject.id, family.id) is True
    assert await verifier.can_view_medications(observer.id, subject.id, family.id) is False

    # ==========================================
    # Capability 3: Change Medication Definition
    # Coordinator: Restricted (No), Parent: No, Caregiver: No
    # ==========================================
    assert await verifier.can_change_medication_definition(coord.id, subject.id, family.id) is False
    assert await verifier.can_change_medication_definition(parent.id, subject.id, family.id) is False
    assert await verifier.can_change_medication_definition(caregiver.id, subject.id, family.id) is False

    # ==========================================
    # Capability 4: Confirm Adherence
    # Coordinator: Yes, Parent: Yes (own), Caregiver: Configurable (Yes), Observer: No
    # ==========================================
    assert await verifier.can_confirm_adherence(coord.id, subject.id, family.id) is True
    assert await verifier.can_confirm_adherence(parent.id, subject.id, family.id) is True
    assert await verifier.can_confirm_adherence(caregiver.id, subject.id, family.id) is True
    assert await verifier.can_confirm_adherence(observer.id, subject.id, family.id) is False

    # ==========================================
    # Capability 5: View Private Messages
    # Participants: Yes (Coord, Parent); Non-participant: No (Caregiver, Observer)
    # ==========================================
    assert await verifier.can_view_private_messages(coord.id, conv.id, family.id) is True
    assert await verifier.can_view_private_messages(parent.id, conv.id, family.id) is True
    assert await verifier.can_view_private_messages(caregiver.id, conv.id, family.id) is False
    assert await verifier.can_view_private_messages(observer.id, conv.id, family.id) is False

    # ==========================================
    # Capability 6: Assign Care Task
    # Coordinator: Yes; Parent: No; Caregiver: No; Observer: No
    # ==========================================
    assert await verifier.can_assign_care_task(coord.id, family.id) is True
    assert await verifier.can_assign_care_task(parent.id, family.id) is False
    assert await verifier.can_assign_care_task(caregiver.id, family.id) is False
    assert await verifier.can_assign_care_task(observer.id, family.id) is False

    # ==========================================
    # Capability 7: Revoke Consent
    # Grantor Parent: Yes (own); Coordinator: Yes; Caregiver: No; Observer: No
    # ==========================================
    assert await verifier.can_revoke_consent(parent.id, consent.id, family.id) is True
    assert await verifier.can_revoke_consent(coord.id, consent.id, family.id) is True
    assert await verifier.can_revoke_consent(caregiver.id, consent.id, family.id) is False
    assert await verifier.can_revoke_consent(observer.id, consent.id, family.id) is False
