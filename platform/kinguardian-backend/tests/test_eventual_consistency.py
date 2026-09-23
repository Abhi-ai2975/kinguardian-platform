import pytest
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy import select

from app.domains.family.infrastructure.models import (
    AppProfile,
    Family,
    CareSubject,
    CareTask,
    MedicationAdherenceEvent,
    WellbeingCheckin,
    Consent
)
from app.domains.family.application.consistency import (
    ConsistencyModel,
    ConsistencyClassifier,
    SynchronousWriteService
)


def test_consistency_classification_matrix():
    """
    Verifies that system operations are correctly partitioned into:
    1. Strong Immediate Synchronous Writes (user-triggered clinical and operational state)
    2. Eventual Asynchronous Consistency (background insights, notifications, analytics, trends)
    """
    # 1. Strong Immediate Consistency
    assert ConsistencyClassifier.get_consistency_model("medication_confirmation") == ConsistencyModel.STRONG_SYNCHRONOUS
    assert ConsistencyClassifier.get_consistency_model("wellbeing_checkin") == ConsistencyModel.STRONG_SYNCHRONOUS
    assert ConsistencyClassifier.get_consistency_model("care_task_completion") == ConsistencyModel.STRONG_SYNCHRONOUS
    assert ConsistencyClassifier.get_consistency_model("consent_grant") == ConsistencyModel.STRONG_SYNCHRONOUS
    assert ConsistencyClassifier.get_consistency_model("consent_revoke") == ConsistencyModel.STRONG_SYNCHRONOUS

    # 2. Eventual Consistency
    assert ConsistencyClassifier.get_consistency_model("ai_insight_generation") == ConsistencyModel.EVENTUAL_ASYNCHRONOUS
    assert ConsistencyClassifier.get_consistency_model("notification_delivery") == ConsistencyModel.EVENTUAL_ASYNCHRONOUS
    assert ConsistencyClassifier.get_consistency_model("trend_calculation") == ConsistencyModel.EVENTUAL_ASYNCHRONOUS
    assert ConsistencyClassifier.get_consistency_model("search_indexing") == ConsistencyModel.EVENTUAL_ASYNCHRONOUS
    assert ConsistencyClassifier.get_consistency_model("analytics_telemetry") == ConsistencyModel.EVENTUAL_ASYNCHRONOUS


@pytest.mark.asyncio
async def test_immediate_deterministic_medication_and_checkin_writes(db_session):
    """
    Verifies that user-triggered writes return deterministic results immediately
    with strict read-your-own-writes guarantees.
    """
    service = SynchronousWriteService(db_session)

    # Setup base entities
    profile = AppProfile(id=uuid.uuid4(), iam_subject_id=f"iam_{uuid.uuid4().hex}", email="ramesh@example.com", display_name="Ramesh")
    family = Family(id=uuid.uuid4(), name="Sharma Circle", primary_coordinator_profile_id=profile.id)
    subject = CareSubject(id=uuid.uuid4(), family_id=family.id, fhir_patient_id=f"p_{uuid.uuid4().hex[:6]}")
    db_session.add_all([profile, family, subject])
    await db_session.commit()

    # 1. Immediate Medication Confirmation
    adh_id = uuid.uuid4()
    med_res = await service.confirm_medication_immediately(
        adherence_id=adh_id,
        subject_id=subject.id,
        actor_id=profile.id,
        scheduled_at=datetime.now(timezone.utc)
    )
    assert med_res["status"] == "taken"
    assert med_res["consistency"] == "strong_synchronous"

    # Immediately query database -> Guaranteed committed state
    stmt_med = select(MedicationAdherenceEvent).where(MedicationAdherenceEvent.id == adh_id)
    db_med = (await db_session.execute(stmt_med)).scalars().first()
    assert db_med.status == "taken"
    assert db_med.confirmed_at is not None

    # 2. Immediate Wellbeing Check-in
    chk_id = uuid.uuid4()
    chk_res = await service.submit_checkin_immediately(
        checkin_id=chk_id,
        family_id=family.id,
        subject_id=subject.id,
        actor_id=profile.id,
        feeling="good",
        notes="Slept 8 hours"
    )
    assert chk_res["feeling"] == "good"
    assert chk_res["consistency"] == "strong_synchronous"

    stmt_chk = select(WellbeingCheckin).where(WellbeingCheckin.id == chk_id)
    db_chk = (await db_session.execute(stmt_chk)).scalars().first()
    assert db_chk.feeling == "good"


@pytest.mark.asyncio
async def test_immediate_deterministic_care_task_and_consent_writes(db_session):
    """
    Verifies that care-task completion and consent grant/revoke return deterministic results immediately.
    """
    service = SynchronousWriteService(db_session)

    # Setup base entities
    parent = AppProfile(id=uuid.uuid4(), iam_subject_id=f"iam_{uuid.uuid4().hex}", email="parent@example.com", display_name="Parent")
    coord = AppProfile(id=uuid.uuid4(), iam_subject_id=f"iam_{uuid.uuid4().hex}", email="coord@example.com", display_name="Coordinator")
    family = Family(id=uuid.uuid4(), name="Sharma Circle", primary_coordinator_profile_id=coord.id)
    subject = CareSubject(id=uuid.uuid4(), family_id=family.id, fhir_patient_id=f"p_{uuid.uuid4().hex[:6]}")
    task = CareTask(
        id=uuid.uuid4(),
        family_id=family.id,
        subject_id=subject.id,
        created_by_profile_id=coord.id,
        assigned_to_profile_id=parent.id,
        title="Check Blood Sugar",
        category="check_in",
        due_at=datetime.now(timezone.utc),
        status="pending"
    )


    db_session.add_all([parent, coord, family, subject, task])
    await db_session.commit()


    # 1. Immediate Care-Task Completion
    task_res = await service.complete_care_task_immediately(task_id=task.id, actor_id=parent.id)
    assert task_res["status"] == "completed"
    assert task_res["consistency"] == "strong_synchronous"

    # 2. Immediate Consent Grant & Revoke
    consent_id = uuid.uuid4()
    scope = {"vitals": True, "medications": True}

    # Grant
    grant_res = await service.update_consent_immediately(
        consent_id=consent_id,
        family_id=family.id,
        subject_id=subject.id,
        grantor_id=parent.id,
        grantee_id=coord.id,
        action="grant",
        scope=scope
    )
    assert grant_res["status"] == "active"
    assert grant_res["version"] == 1

    # Revoke
    revoke_res = await service.update_consent_immediately(
        consent_id=consent_id,
        family_id=family.id,
        subject_id=subject.id,
        grantor_id=parent.id,
        grantee_id=coord.id,
        action="revoke",
        scope=scope
    )
    assert revoke_res["status"] == "revoked"
    assert revoke_res["version"] == 2
