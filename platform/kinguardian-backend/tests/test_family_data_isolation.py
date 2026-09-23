"""
Family Data Isolation Test Suite:
Critical Multi-Tenancy Invariant:
A user in Family A must never retrieve:
1. Family B subjects
2. Family B messages / conversations
3. Family B documents
4. Family B insights
5. Family B care tasks

Authorization must be enforced server-side.
Never rely exclusively on WHERE family_id = ... from client input.
"""

import pytest
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.family.infrastructure.models import (
    AppProfile,
    Family,
    FamilyMembership,
    CareSubject,
    CareTask,
    HealthDocument,
    AIInsight,
    FamilyConversation,
    FamilyMessage
)
from app.domains.family.infrastructure.repositories import (
    SQLAlchemyAppProfileRepository,
    SQLAlchemyFamilyRepository,
    SQLAlchemyConsentRepository
)
from app.domains.events.services import EventService
from app.domains.family.application.services import FamilyService
from app.domains.family.domain.exceptions import FamilyAccessError


@pytest.mark.asyncio
async def test_family_data_isolation_all_five_domains(db_session: AsyncSession):
    """
    Tests complete server-side multi-tenancy isolation between Family A and Family B:
    - User A (Family A) cannot access Family B Subjects
    - User A (Family A) cannot access Family B Messages / Conversations
    - User A (Family A) cannot access Family B Documents
    - User A (Family A) cannot access Family B AI Insights
    - User A (Family A) cannot access Family B Care Tasks
    """
    now = datetime.now(timezone.utc)

    # 1. Setup Profiles
    user_a = AppProfile(id=uuid.uuid4(), iam_subject_id="iam_user_a_iso", display_name="User A", email="usera@test.com", timezone="Europe/London")
    user_b = AppProfile(id=uuid.uuid4(), iam_subject_id="iam_user_b_iso", display_name="User B", email="userb@test.com", timezone="Asia/Kolkata")
    db_session.add_all([user_a, user_b])
    await db_session.flush()

    # 2. Setup Families
    family_a = Family(id=uuid.uuid4(), name="Family Circle A", primary_coordinator_profile_id=user_a.id)
    family_b = Family(id=uuid.uuid4(), name="Family Circle B", primary_coordinator_profile_id=user_b.id)
    db_session.add_all([family_a, family_b])
    await db_session.flush()

    # Memberships
    m_a = FamilyMembership(id=uuid.uuid4(), family_id=family_a.id, profile_id=user_a.id, membership_role="coordinator")
    m_b = FamilyMembership(id=uuid.uuid4(), family_id=family_b.id, profile_id=user_b.id, membership_role="coordinator")
    db_session.add_all([m_a, m_b])

    # 3. Create Entities in Family B
    # 3.1 Subject in Family B
    subject_b = CareSubject(id=uuid.uuid4(), family_id=family_b.id, profile_id=user_b.id, fhir_patient_id="pat-b-999")
    # 3.2 Care Task in Family B
    task_b = CareTask(
        id=uuid.uuid4(),
        family_id=family_b.id,
        subject_id=subject_b.id,
        created_by_profile_id=user_b.id,
        assigned_to_profile_id=user_b.id,
        title="Family B Doctor Consultation",
        category="appointment",
        status="pending",
        due_at=now + timedelta(days=1)
    )

    # 3.3 Document in Family B
    doc_b = HealthDocument(
        id=uuid.uuid4(),
        family_id=family_b.id,
        subject_id=subject_b.id,
        filenest_file_id="filenest_secret_b_doc",
        document_type="discharge_summary",
        source_profile_id=user_b.id,
        status="active"
    )
    # 3.4 AI Insight in Family B
    insight_b = AIInsight(
        id=uuid.uuid4(),
        family_id=family_b.id,
        subject_id=subject_b.id,
        type="vitals_trend",
        severity="warning",
        title="Family B Elevated Heart Rate Trend",
        summary="Resting HR elevated above baseline in Family B.",
        observation="Observed persistent resting tachycardia.",
        status="active",
        confidence=0.94,
        timeframe_start=now - timedelta(days=7),
        timeframe_end=now
    )

    # 3.5 Conversation & Message in Family B
    conv_b = FamilyConversation(id=uuid.uuid4(), family_id=family_b.id, subject_id=subject_b.id)
    db_session.add_all([subject_b, task_b, doc_b, insight_b, conv_b])
    await db_session.flush()

    msg_b = FamilyMessage(
        id=uuid.uuid4(),
        conversation_id=conv_b.id,
        sender_profile_id=user_b.id,
        message_type="text",
        body="Confidential family discussion about medication in Family B."
    )
    db_session.add(msg_b)
    await db_session.commit()

    # Repositories & Service
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    family_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_service = EventService(db_session)
    service = FamilyService(user_repo, family_repo, consent_repo, event_service)

    # =========================================================================
    # Domain 1: Family B Subjects Isolation
    # =========================================================================
    # User A listing subjects in Family B -> FamilyAccessError
    with pytest.raises(FamilyAccessError) as exc_subj_list:
        await service.list_care_subjects(requester_id=user_a.id, family_id=family_b.id)
    assert "not a member" in str(exc_subj_list.value).lower()

    # User A requesting specific Subject B detail -> FamilyAccessError
    with pytest.raises(FamilyAccessError) as exc_subj_get:
        await service.get_care_subject(requester_id=user_a.id, subject_id=subject_b.id)
    assert "not authorized" in str(exc_subj_get.value).lower() or "not found" in str(exc_subj_get.value).lower()

    # =========================================================================
    # Domain 2: Family B Messages Isolation
    # =========================================================================
    # User A attempting to list conversations in Family B -> FamilyAccessError
    with pytest.raises(FamilyAccessError):
        await service.list_family_conversations(requester_id=user_a.id, family_id=family_b.id)

    # User A attempting to retrieve messages from Family B conversation (even if pretending family_id=family_a) -> FamilyAccessError
    with pytest.raises(FamilyAccessError):
        await service.list_family_messages(requester_id=user_a.id, family_id=family_a.id, conversation_id=conv_b.id)

    # =========================================================================
    # Domain 3: Family B Documents Isolation
    # =========================================================================
    # User A listing documents in Family B -> FamilyAccessError
    with pytest.raises(FamilyAccessError):
        await service.list_health_documents(requester_id=user_a.id, family_id=family_b.id, subject_id=subject_b.id)

    # User A attempting to get Document B detail directly by ID -> FamilyAccessError
    with pytest.raises(FamilyAccessError):
        await service.get_document_detail(requester_id=user_a.id, document_id=doc_b.id)

    # User A attempting to generate signed download URL for Document B -> FamilyAccessError
    with pytest.raises(FamilyAccessError):
        await service.get_secure_document_download_url(requester_id=user_a.id, document_id=doc_b.id)

    # =========================================================================
    # Domain 4: Family B AI Insights Isolation
    # =========================================================================
    # User A listing AI insights for Subject B -> FamilyAccessError
    with pytest.raises(FamilyAccessError):
        await service.list_subject_insights(requester_id=user_a.id, subject_id=subject_b.id)

    # User A attempting to get Insight B directly by ID -> FamilyAccessError
    with pytest.raises(FamilyAccessError):
        await service.get_insight_by_id(requester_id=user_a.id, insight_id=insight_b.id)

    # =========================================================================
    # Domain 5: Family B Care Tasks Isolation
    # =========================================================================
    # User A listing care tasks in Family B -> FamilyAccessError
    with pytest.raises(FamilyAccessError):
        await service.list_care_tasks(requester_id=user_a.id, family_id=family_b.id)

    # User A attempting to get Task B directly by ID -> FamilyAccessError
    with pytest.raises(FamilyAccessError):
        await service.get_care_task(requester_id=user_a.id, task_id=task_b.id)
