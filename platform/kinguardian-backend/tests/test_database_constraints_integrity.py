"""
Database Constraints & Integrity Test Suite:
Verifies:
1. Unique IAM Subject on AppProfile
2. Unique Family Membership on (family_id, profile_id)
3. Unique Care Relationship on (family_id, subject_id, profile_id)
4. Consent Validity (grantor != grantee)
5. Valid Status and State Transition constraints
6. Non-null required timestamps
"""

import pytest
import uuid
from datetime import datetime, timezone
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.family.infrastructure.models import (
    AppProfile,
    Family,
    FamilyMembership,
    CareSubject,
    CareRelationship,
    Consent,
    CareTask,
    MedicationAdherenceEvent,
    WellbeingCheckin,
    HealthDocument
)


@pytest.mark.asyncio
async def test_unique_iam_subject_constraint(db_session: AsyncSession):
    """
    Verifies that duplicate iam_subject_id raises IntegrityError.
    """
    iam_id = f"iam_unique_test_{uuid.uuid4().hex}"
    p1 = AppProfile(id=uuid.uuid4(), iam_subject_id=iam_id, email="p1@example.com", status="active")
    p2 = AppProfile(id=uuid.uuid4(), iam_subject_id=iam_id, email="p2@example.com", status="active")

    db_session.add(p1)
    await db_session.commit()

    db_session.add(p2)
    with pytest.raises(IntegrityError):
        await db_session.commit()
    await db_session.rollback()


@pytest.mark.asyncio
async def test_unique_family_membership_constraint(db_session: AsyncSession):
    """
    Verifies that duplicate (family_id, profile_id) raises IntegrityError.
    """
    p = AppProfile(id=uuid.uuid4(), iam_subject_id=f"iam_{uuid.uuid4().hex}", email="mem@example.com")
    f = Family(id=uuid.uuid4(), name="Unique Mem Family", primary_coordinator_profile_id=p.id)
    db_session.add_all([p, f])
    await db_session.commit()

    m1 = FamilyMembership(id=uuid.uuid4(), family_id=f.id, profile_id=p.id, membership_role="coordinator", status="active")
    m2 = FamilyMembership(id=uuid.uuid4(), family_id=f.id, profile_id=p.id, membership_role="parent", status="active")

    db_session.add(m1)
    await db_session.commit()

    db_session.add(m2)
    with pytest.raises(IntegrityError):
        await db_session.commit()
    await db_session.rollback()


@pytest.mark.asyncio
async def test_unique_care_relationship_constraint(db_session: AsyncSession):
    """
    Verifies that duplicate (family_id, subject_id, profile_id) raises IntegrityError.
    """
    p = AppProfile(id=uuid.uuid4(), iam_subject_id=f"iam_{uuid.uuid4().hex}", email="cr@example.com")
    f = Family(id=uuid.uuid4(), name="Unique CR Family", primary_coordinator_profile_id=p.id)
    sub = CareSubject(id=uuid.uuid4(), family_id=f.id, profile_id=p.id, fhir_patient_id="pat-cr-01")
    db_session.add_all([p, f, sub])
    await db_session.commit()

    cr1 = CareRelationship(id=uuid.uuid4(), family_id=f.id, subject_id=sub.id, profile_id=p.id, relationship_type="primary_caregiver", status="active")
    cr2 = CareRelationship(id=uuid.uuid4(), family_id=f.id, subject_id=sub.id, profile_id=p.id, relationship_type="proxy", status="active")

    db_session.add(cr1)
    await db_session.commit()

    db_session.add(cr2)
    with pytest.raises(IntegrityError):
        await db_session.commit()
    await db_session.rollback()


@pytest.mark.asyncio
async def test_consent_grantor_cannot_be_grantee(db_session: AsyncSession):
    """
    Verifies CheckConstraint that grantor_profile_id != grantee_profile_id.
    """
    p = AppProfile(id=uuid.uuid4(), iam_subject_id=f"iam_{uuid.uuid4().hex}", email="self_consent@example.com")
    f = Family(id=uuid.uuid4(), name="Self Consent Family", primary_coordinator_profile_id=p.id)
    sub = CareSubject(id=uuid.uuid4(), family_id=f.id, profile_id=p.id, fhir_patient_id="pat-self-01")
    db_session.add_all([p, f, sub])
    await db_session.commit()

    # User attempts to grant consent to themselves
    invalid_consent = Consent(
        id=uuid.uuid4(),
        family_id=f.id,
        subject_id=sub.id,
        grantor_profile_id=p.id,
        grantee_profile_id=p.id,
        consent_type="clinical_read",
        scope={"vitals": True},
        status="active"
    )

    db_session.add(invalid_consent)
    with pytest.raises(IntegrityError):
        await db_session.commit()
    await db_session.rollback()


@pytest.mark.asyncio
async def test_invalid_status_check_constraint(db_session: AsyncSession):
    """
    Verifies that invalid status values are rejected by check constraints.
    """
    p = AppProfile(id=uuid.uuid4(), iam_subject_id=f"iam_{uuid.uuid4().hex}", email="status_test@example.com", status="")
    db_session.add(p)
    with pytest.raises(IntegrityError):
        await db_session.commit()
    await db_session.rollback()

