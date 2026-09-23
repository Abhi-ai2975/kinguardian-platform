import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from scripts.seed_development_data import (
    seed_development_data,
    FAMILY_ID,
    ANJALI_ID,
    RAMESH_ID,
    LAKSHMI_ID,
    RAHUL_ID,
    PRIYA_ID,
    RAMESH_SUBJECT_ID,
    LAKSHMI_SUBJECT_ID,
)
from app.domains.family.infrastructure.models import (
    AppProfile,
    Family,
    FamilyMembership,
    CareSubject,
    CareRelationship,
    CareTask,
    MedicationAdherenceEvent,
    WellbeingCheckin,
    AIInsight,
    Notification,
    AppointmentCoordination,
    Consent,
)


@pytest.mark.asyncio
async def test_development_seed_data_integrity(db_session: AsyncSession):
    """
    Verifies that seed_development_data creates the exact requested development seed
    with all cross-border profiles, relationships, permissions, check-ins, tasks,
    medication adherence projections, appointments, insights, and notifications.
    """
    summary = await seed_development_data(db_session)

    assert summary["family"] == "Anjali's Family"
    assert summary["coordinator"] == "Anjali (London)"
    assert len(summary["parents"]) == 2
    assert summary["care_relationships_count"] == 6
    assert summary["consents_count"] == 6
    assert summary["checkins_count"] == 2
    assert summary["care_tasks_count"] == 2
    assert summary["adherence_projections_count"] == 2
    assert summary["appointments_count"] == 2
    assert summary["insights_count"] == 2
    assert summary["notifications_count"] == 2

    # 1. Verify Profiles & Timezones
    anjali = (await db_session.execute(select(AppProfile).where(AppProfile.id == ANJALI_ID))).scalar_one()
    assert anjali.display_name == "Anjali"
    assert anjali.city == "London"
    assert anjali.timezone == "Europe/London"

    ramesh = (await db_session.execute(select(AppProfile).where(AppProfile.id == RAMESH_ID))).scalar_one()
    assert ramesh.display_name == "Ramesh"
    assert ramesh.city == "Chennai"
    assert ramesh.timezone == "Asia/Kolkata"

    lakshmi = (await db_session.execute(select(AppProfile).where(AppProfile.id == LAKSHMI_ID))).scalar_one()
    assert lakshmi.display_name == "Lakshmi"
    assert lakshmi.city == "Chennai"
    assert lakshmi.timezone == "Asia/Kolkata"

    rahul = (await db_session.execute(select(AppProfile).where(AppProfile.id == RAHUL_ID))).scalar_one()
    assert rahul.display_name == "Rahul"
    assert rahul.city == "Dubai"
    assert rahul.timezone == "Asia/Dubai"

    priya = (await db_session.execute(select(AppProfile).where(AppProfile.id == PRIYA_ID))).scalar_one()
    assert priya.display_name == "Priya"
    assert priya.city == "Bengaluru"
    assert priya.timezone == "Asia/Kolkata"

    # 2. Verify Family & Memberships
    family = (await db_session.execute(select(Family).where(Family.id == FAMILY_ID))).scalar_one()
    assert family.name == "Anjali's Family"
    assert family.primary_coordinator_profile_id == ANJALI_ID

    members = (await db_session.execute(select(FamilyMembership).where(FamilyMembership.family_id == FAMILY_ID))).scalars().all()
    assert len(members) == 5

    # 3. Verify Care Subjects & Care Relationships
    subjects = (await db_session.execute(select(CareSubject).where(CareSubject.family_id == FAMILY_ID))).scalars().all()
    assert len(subjects) == 2

    relationships = (await db_session.execute(select(CareRelationship).where(CareRelationship.family_id == FAMILY_ID))).scalars().all()
    assert len(relationships) == 6

    # 4. Verify Consents & Permissions
    consents = (await db_session.execute(select(Consent).where(Consent.family_id == FAMILY_ID))).scalars().all()
    assert len(consents) == 6
    for c in consents:
        assert c.status == "active"
        assert isinstance(c.scope, dict)

    # 5. Verify Check-ins
    checkins = (await db_session.execute(select(WellbeingCheckin).where(WellbeingCheckin.family_id == FAMILY_ID))).scalars().all()
    assert len(checkins) == 2
    feelings = {chk.feeling for chk in checkins}
    assert "good" in feelings or "great" in feelings

    # 6. Verify Care Tasks
    tasks = (await db_session.execute(select(CareTask).where(CareTask.family_id == FAMILY_ID))).scalars().all()
    assert len(tasks) == 2

    # 7. Verify Medication Adherence Projections
    adherences = (await db_session.execute(select(MedicationAdherenceEvent))).scalars().all()
    assert len(adherences) == 2
    for adh in adherences:
        assert adh.status == "taken"

    # 8. Verify Appointments
    appts = (await db_session.execute(select(AppointmentCoordination).where(AppointmentCoordination.family_id == FAMILY_ID))).scalars().all()
    assert len(appts) == 2

    # 9. Verify Insights & Notifications
    insights = (await db_session.execute(select(AIInsight).where(AIInsight.family_id == FAMILY_ID))).scalars().all()
    assert len(insights) == 2

    notifs = (await db_session.execute(select(Notification).where(Notification.family_id == FAMILY_ID))).scalars().all()
    assert len(notifs) == 2
