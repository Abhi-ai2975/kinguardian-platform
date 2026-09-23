"""
Phase 5 — Family Domain Comprehensive Test Suite.

Validates:
1. Family creation (with primary coordinator and domain event generation)
2. Membership management (roles: coordinator, caregiver, parent, family_member)
3. Family relationships (peer relationships between family members)
4. Care relationships (caregiver/coordinator linked to care subject with access levels)
5. Profile linkage (care subjects linked to AppProfile and FHIR Patient ID)
6. Permission evaluation (RBAC matrix + dynamic consent scopes)
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
from app.domains.family.application.permissions import (
    PermissionVerifier,
    CAP_VIEW_MEDICATIONS,
    CAP_ASSIGN_CARE_TASKS,
    CAP_CONFIRM_ADHERENCE,
    CAP_VIEW_HEALTH_SUMMARY
)


@pytest.fixture
def family_service(db_session):
    return FamilyService(
        user_repo=SQLAlchemyAppProfileRepository(db_session),
        circle_repo=SQLAlchemyFamilyRepository(db_session),
        consent_repo=SQLAlchemyConsentRepository(db_session),
        event_logger=EventService(db_session)
    )


@pytest.mark.asyncio
async def test_family_creation_and_membership(family_service, db_session):
    """
    1. Family Creation & 2. Membership:
    Verifies that creating a family creates the group and adds creator as coordinator.
    """
    coordinator = await family_service.get_or_create_profile(
        iam_subject_id=f"iam_{uuid.uuid4()}",
        email=f"coord_{uuid.uuid4().hex[:6]}@kinguardian.com",
        display_name="Anjali Coordinator",
        timezone="Europe/London"
    )

    family = await family_service.create_care_circle(
        creator_id=coordinator.id,
        name="Anjali's Family Circle",
        creator_role="coordinator"
    )

    assert family is not None
    assert family.name == "Anjali's Family Circle"
    assert family.primary_coordinator_profile_id == coordinator.id

    # Verify coordinator membership
    members = await family_service.list_family_members(coordinator.id, family.id)
    assert len(members) >= 1
    assert any(m.profile_id == coordinator.id and m.membership_role == "coordinator" for m in members)

    # Add sibling member
    sibling_email = f"sibling_{uuid.uuid4().hex[:6]}@kinguardian.com"
    sibling_member = await family_service.add_member_to_circle(
        requester_id=coordinator.id,
        care_circle_id=family.id,
        target_email=sibling_email,
        role="family_member"
    )
    assert sibling_member.membership_role == "family_member"

    # Verify both members exist
    updated_members = await family_service.list_family_members(coordinator.id, family.id)
    assert len(updated_members) == 2


@pytest.mark.asyncio
async def test_family_relationships(family_service, db_session):
    """
    3. Family Relationships:
    Verifies creating relationships between family members (e.g. Daughter -> Father, Sibling -> Sibling).
    """
    p1 = await family_service.get_or_create_profile(
        iam_subject_id=f"iam_{uuid.uuid4()}",
        email=f"p1_{uuid.uuid4().hex[:6]}@kinguardian.com",
        display_name="Anjali"
    )
    p2 = await family_service.get_or_create_profile(
        iam_subject_id=f"iam_{uuid.uuid4()}",
        email=f"p2_{uuid.uuid4().hex[:6]}@kinguardian.com",
        display_name="Rahul"
    )
    family = await family_service.create_care_circle(
        creator_id=p1.id,
        name="Kin Family",
        creator_role="coordinator"
    )

    rel = await family_service.circle_repo.add_relationship(
        family_id=family.id,
        from_profile_id=p1.id,
        to_profile_id=p2.id,
        relationship_type="sibling"
    )
    assert rel.relationship_type == "sibling"
    assert rel.from_profile_id == p1.id
    assert rel.to_profile_id == p2.id


@pytest.mark.asyncio
async def test_care_relationships_and_profile_linkage(family_service, db_session):
    """
    4. Care Relationships & 5. Profile Linkage:
    Verifies creating care subjects (with FHIR patient linkage), linking to profiles,
    and creating care relationships with access levels.
    """
    coordinator = await family_service.get_or_create_profile(
        iam_subject_id=f"iam_{uuid.uuid4()}",
        email=f"coord2_{uuid.uuid4().hex[:6]}@kinguardian.com",
        display_name="Coordinator"
    )
    parent_profile = await family_service.get_or_create_profile(
        iam_subject_id=f"iam_{uuid.uuid4()}",
        email=f"parent_{uuid.uuid4().hex[:6]}@kinguardian.com",
        display_name="Ramesh Parent",
        timezone="Asia/Kolkata"
    )
    family = await family_service.create_care_circle(
        creator_id=coordinator.id,
        name="Care Family",
        creator_role="coordinator"
    )

    # Add Care Subject with FHIR Patient ID linkage
    subject = await family_service.circle_repo.add_care_subject(
        family_id=family.id,
        fhir_patient_id="fhir-pat-ramesh-001",
        relationship_to_coordinator="father",
        profile_id=parent_profile.id,
        city="Chennai",
        country_code="IN",
        timezone="Asia/Kolkata"
    )
    assert subject.fhir_patient_id == "fhir-pat-ramesh-001"
    assert subject.profile_id == parent_profile.id
    assert subject.relationship_to_coordinator == "father"

    # Add Caregiver Care Relationship with "standard" access
    caregiver = await family_service.get_or_create_profile(
        iam_subject_id=f"iam_{uuid.uuid4()}",
        email=f"caregiver_{uuid.uuid4().hex[:6]}@kinguardian.com",
        display_name="Priya Nurse"
    )
    care_rel = await family_service.circle_repo.add_care_relationship(
        family_id=family.id,
        subject_id=subject.id,
        profile_id=caregiver.id,
        relationship_type="primary_nurse",
        access_level="standard"
    )
    assert care_rel.subject_id == subject.id
    assert care_rel.profile_id == caregiver.id
    assert care_rel.access_level == "standard"


@pytest.mark.asyncio
async def test_permission_and_consent_evaluation(family_service, db_session):
    """
    6. Permissions & Dynamic Consent:
    Verifies that capabilities and active consent grants are evaluated correctly.
    """
    coordinator = await family_service.get_or_create_profile(
        iam_subject_id=f"iam_{uuid.uuid4()}",
        email=f"coord3_{uuid.uuid4().hex[:6]}@kinguardian.com",
        display_name="Coordinator"
    )
    parent_profile = await family_service.get_or_create_profile(
        iam_subject_id=f"iam_{uuid.uuid4()}",
        email=f"parent3_{uuid.uuid4().hex[:6]}@kinguardian.com",
        display_name="Lakshmi Parent"
    )
    family = await family_service.create_care_circle(
        creator_id=coordinator.id,
        name="Consent Family",
        creator_role="coordinator"
    )

    subject = await family_service.circle_repo.add_care_subject(
        family_id=family.id,
        fhir_patient_id="fhir-pat-lakshmi-002",
        profile_id=parent_profile.id
    )

    # Grant explicit consent from Parent to Coordinator for full health data
    consent = await family_service.consent_repo.create_or_update_consent(
        family_id=family.id,
        subject_id=subject.id,
        grantor_profile_id=parent_profile.id,
        grantee_profile_id=coordinator.id,
        consent_type="health_data_access",
        scope={"medications": True, "vitals": True, "documents": True},
        expires_at=datetime.now(timezone.utc) + timedelta(days=365)
    )
    assert consent.status == "active"
    assert consent.grantee_profile_id == coordinator.id


    # Evaluate permissions
    verifier = PermissionVerifier(db_session)
    user_caps = await verifier.get_user_capabilities(
        profile_id=coordinator.id,
        family_id=family.id,
        subject_id=subject.id
    )
    assert CAP_VIEW_MEDICATIONS in user_caps
    assert CAP_ASSIGN_CARE_TASKS in user_caps
    assert CAP_VIEW_HEALTH_SUMMARY in user_caps
