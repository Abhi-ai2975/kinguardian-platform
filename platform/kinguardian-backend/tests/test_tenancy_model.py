import pytest
import uuid
from fastapi import HTTPException

from app.domains.family.infrastructure.models import (
    PlatformOrganization,
    Family,
    FamilyMembership,
    CareSubject,
    AppProfile
)
from app.domains.family.infrastructure.repositories import (
    SQLAlchemyAppProfileRepository,
    SQLAlchemyFamilyRepository,
    SQLAlchemyConsentRepository
)
from app.domains.events.services import EventService
from app.domains.family.application.services import FamilyService
from app.domains.family.application.tenancy import TenancyService


@pytest.mark.asyncio
async def test_platform_organization_hierarchy(db_session):
    """
    Verifies the complete tenancy model:
    Platform Organization -> Families -> Family Members -> Care Subjects
    """
    # 1. Platform Organization
    org = PlatformOrganization(
        id=uuid.uuid4(),
        name="Apollo Health Network",
        slug="apollo-health",
        status="active"
    )
    db_session.add(org)
    await db_session.flush()

    user_repo = SQLAlchemyAppProfileRepository(db_session)
    family_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    family_svc = FamilyService(user_repo, family_repo, consent_repo, event_logger)

    coordinator = await family_svc.get_or_create_profile(
        iam_subject_id="iam_coord_tenancy",
        email="coord_tenancy@kinguardian.com",
        display_name="Maya Coordinator"
    )
    parent = await family_svc.get_or_create_profile(
        iam_subject_id="iam_parent_tenancy",
        email="parent_tenancy@kinguardian.com",
        display_name="Senior Parent"
    )

    # 2. Family linked to Organization
    family = await family_svc.create_care_circle(coordinator.id, "Kalyan Family", "coordinator")
    family_db = await db_session.get(Family, family.id)
    family_db.organization_id = org.id
    await db_session.flush()

    assert family_db.organization_id == org.id

    # 3. Family Members
    await family_svc.add_member_to_circle(coordinator.id, family.id, parent.email, "parent")

    # 4. Care Subjects
    subject = await family_svc.add_care_subject(
        requester_id=coordinator.id,
        family_id=family.id,
        fhir_patient_id="fhir-pat-tenancy-01",
        profile_id=parent.id,
        relationship_to_coordinator="father"
    )
    assert subject.family_id == family.id


@pytest.mark.asyncio
async def test_derive_family_from_identity_never_rely_on_client_family_id(db_session):
    """
    Verifies that allowed families are derived from authenticated identity,
    and client-supplied unauthorized family_id is rejected with 403 Forbidden.
    """
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    family_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    family_svc = FamilyService(user_repo, family_repo, consent_repo, event_logger)

    # User A in Family A
    user_a = await family_svc.get_or_create_profile(
        iam_subject_id="iam_user_a",
        email="user_a@kinguardian.com",
        display_name="User A"
    )
    family_a = await family_svc.create_care_circle(user_a.id, "Family A", "coordinator")

    # User B in Family B
    user_b = await family_svc.get_or_create_profile(
        iam_subject_id="iam_user_b",
        email="user_b@kinguardian.com",
        display_name="User B"
    )
    family_b = await family_svc.create_care_circle(user_b.id, "Family B", "coordinator")

    tenancy_svc = TenancyService(db_session)

    # 1. User A automatically resolves Family A when client_family_id is None
    resolved_a = await tenancy_svc.resolve_family_for_user(user_id=user_a.id, client_family_id=None)
    assert resolved_a.id == family_a.id

    # 2. User A successfully specifies their own family_a.id
    resolved_explicit = await tenancy_svc.resolve_family_for_user(user_id=user_a.id, client_family_id=family_a.id)
    assert resolved_explicit.id == family_a.id

    # 3. User A attempts to pass Family B's family_id -> REJECTED (403 Forbidden)
    with pytest.raises(HTTPException) as exc:
        await tenancy_svc.resolve_family_for_user(user_id=user_a.id, client_family_id=family_b.id)
    assert exc.value.status_code == 403
    assert "Access denied" in exc.value.detail


@pytest.mark.asyncio
async def test_subject_access_derivation_without_client_family_id(db_session):
    """
    Verifies that subject access derives the family directly from CareSubject and verifies membership.
    """
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    family_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    family_svc = FamilyService(user_repo, family_repo, consent_repo, event_logger)

    user_a = await family_svc.get_or_create_profile(
        iam_subject_id="iam_user_subj_a",
        email="user_subj_a@kinguardian.com",
        display_name="User Subj A"
    )
    family_a = await family_svc.create_care_circle(user_a.id, "Family Subj A", "coordinator")

    subject_a = await family_svc.add_care_subject(
        requester_id=user_a.id,
        family_id=family_a.id,
        fhir_patient_id="fhir-subj-a",
        relationship_to_coordinator="mother"
    )

    user_b = await family_svc.get_or_create_profile(
        iam_subject_id="iam_user_subj_b",
        email="user_subj_b@kinguardian.com",
        display_name="User Subj B"
    )
    family_b = await family_svc.create_care_circle(user_b.id, "Family Subj B", "coordinator")

    tenancy_svc = TenancyService(db_session)

    # 1. User A accesses subject_a -> Derived smoothly
    fam, subj = await tenancy_svc.resolve_subject_access(user_id=user_a.id, subject_id=subject_a.id)
    assert fam.id == family_a.id
    assert subj.id == subject_a.id

    # 2. User B tries to access subject_a -> REJECTED (403 Forbidden)
    with pytest.raises(HTTPException) as exc:
        await tenancy_svc.resolve_subject_access(user_id=user_b.id, subject_id=subject_a.id)
    assert exc.value.status_code == 403
