import pytest
from app.domains.family.infrastructure.models import (
    Family,
    FamilyMembership,
    CareRelationship,
    CareTask,
    MedicationAdherenceEvent,
    WellbeingCheckin,
    AIInsight,
    Notification,
    FamilyMessage
)
from app.domains.events.models import OutboxEvent


def test_database_actual_access_pattern_indexes():
    """
    Verifies that all required access pattern indexes and composite indexes
    exist with the correct columns on the SQLAlchemy metadata.
    """
    # 1. families(primary_coordinator_profile_id)
    family_indexes = {idx.name: [c.name for c in idx.columns] for idx in Family.__table__.indexes}
    assert any("primary_coordinator_profile_id" in cols for cols in family_indexes.values())

    # 2. family_memberships(family_id, profile_id)
    membership_indexes = {idx.name: [c.name for c in idx.columns] for idx in FamilyMembership.__table__.indexes}
    assert any(cols == ["family_id", "profile_id"] for cols in membership_indexes.values())

    # 3. care_relationships(subject_id, profile_id) and (family_id, subject_id)
    care_rel_indexes = {idx.name: [c.name for c in idx.columns] for idx in CareRelationship.__table__.indexes}
    assert any(cols == ["subject_id", "profile_id"] for cols in care_rel_indexes.values())
    assert any(cols == ["family_id", "subject_id"] for cols in care_rel_indexes.values())

    # 4. wellbeing_checkins(subject_id, submitted_at DESC)
    checkin_indexes = {idx.name: [c.name if hasattr(c, 'name') else str(c) for c in idx.expressions] for idx in WellbeingCheckin.__table__.indexes}
    assert any("subject_id" in exprs[0] and "submitted_at" in exprs[1] for exprs in checkin_indexes.values() if len(exprs) >= 2)

    # 5. medication_adherence_events(subject_id, scheduled_at DESC)
    adherence_indexes = {idx.name: [c.name if hasattr(c, 'name') else str(c) for c in idx.expressions] for idx in MedicationAdherenceEvent.__table__.indexes}
    assert any("subject_id" in exprs[0] and "scheduled_at" in exprs[1] for exprs in adherence_indexes.values() if len(exprs) >= 2)

    # 6. care_tasks(family_id, status, due_at)
    task_indexes = {idx.name: [c.name for c in idx.columns] for idx in CareTask.__table__.indexes}
    assert any(cols == ["family_id", "status", "due_at"] for cols in task_indexes.values())

    # 7. notifications(recipient_profile_id, read_at, created_at DESC)
    notif_indexes = {idx.name: [c.name if hasattr(c, 'name') else str(c) for c in idx.expressions] for idx in Notification.__table__.indexes}
    assert any("recipient_profile_id" in exprs[0] and "read_at" in exprs[1] and "created_at" in exprs[2] for exprs in notif_indexes.values() if len(exprs) >= 3)

    # 8. ai_insights(subject_id, created_at DESC)
    insight_indexes = {idx.name: [c.name if hasattr(c, 'name') else str(c) for c in idx.expressions] for idx in AIInsight.__table__.indexes}
    assert any("subject_id" in exprs[0] and "created_at" in exprs[1] for exprs in insight_indexes.values() if len(exprs) >= 2)

    # 9. family_messages(conversation_id, created_at)
    msg_indexes = {idx.name: [c.name for c in idx.columns] for idx in FamilyMessage.__table__.indexes}
    assert any(cols == ["conversation_id", "created_at"] for cols in msg_indexes.values())

    # 10. outbox_events(status, available_at)
    outbox_indexes = {idx.name: [c.name for c in idx.columns] for idx in OutboxEvent.__table__.indexes}
    assert any(cols == ["status", "available_at"] for cols in outbox_indexes.values())
