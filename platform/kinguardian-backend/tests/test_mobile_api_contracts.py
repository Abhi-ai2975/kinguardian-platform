"""
Mobile API Contracts & Efficiency Test Suite:
Verifies mobile-tailored responses:
1. Single-roundtrip Aggregated Home (GET /families/{id}/home) avoiding 100 individual REST calls
2. Dynamic partial fields projection
3. Cursor-based pagination for chat messages and infinite-scroll feeds
4. Offset pagination, filtering, and sorting for care tasks
"""

import pytest
import uuid
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.security import create_access_token
from app.domains.family.application.services import FamilyService
from app.domains.family.infrastructure.repositories import (
    SQLAlchemyAppProfileRepository,
    SQLAlchemyFamilyRepository,
    SQLAlchemyConsentRepository
)
from app.domains.events.services import EventService
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_mobile_aggregated_home_and_partial_fields(db_session: AsyncSession):
    """
    Verifies GET /families/{id}/home delivers compact, aggregated state in 1 call,
    and supports ?fields=... partial projections.
    """
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    family_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    family_service = FamilyService(user_repo, family_repo, consent_repo, event_logger)

    now = datetime.now(timezone.utc)

    # 1. Setup Data
    coord = await family_service.get_or_create_profile(
        iam_subject_id="iam_coord_mobile_01",
        email="coord.mobile@kinguardian.com",
        display_name="Tara",
        timezone="America/Los_Angeles"
    )
    parent = await family_service.get_or_create_profile(
        iam_subject_id="iam_parent_mobile_01",
        email="parent.mobile@kinguardian.com",
        display_name="Mohan",
        timezone="Asia/Kolkata"
    )
    family = await family_service.create_care_circle(
        creator_id=coord.id,
        name="Mohan Care Circle",
        creator_role="coordinator"
    )
    await family_service.add_member_to_circle(
        requester_id=coord.id,
        care_circle_id=family.id,
        target_email="parent.mobile@kinguardian.com",
        role="parent"
    )
    subject = await family_service.add_care_subject(
        requester_id=coord.id,
        family_id=family.id,
        fhir_patient_id="fhir-pat-mohan-10",
        profile_id=parent.id,
        relationship_to_coordinator="father"
    )

    # Seed checkin, task, insight, appointment
    await family_service.submit_subject_checkin(
        requester_id=parent.id,
        subject_id=subject.id,
        feeling="good",
        notes="Went for morning walk."
    )
    await family_service.add_care_task(
        requester_id=coord.id,
        family_id=family.id,
        subject_id=subject.id,
        assigned_to_profile_id=coord.id,
        title="Order Blood Pressure cuff batteries",
        description="Check AA battery replacements",
        category="medication",
        priority="medium",
        due_at=now + timedelta(days=1)
    )
    await family_service.circle_repo.add_ai_insight(
        family_id=family.id,
        subject_id=subject.id,
        type="vital_trends",
        severity="low",
        title="Vitals Steady",
        summary="Blood pressure is well controlled.",
        observation="Consistent 7-day readings",
        recommendation="Continue daily routine",
        timeframe_start=now - timedelta(days=7),
        timeframe_end=now,
        confidence=0.95
    )

    token = create_access_token({"sub": "iam_coord_mobile_01", "email": "coord.mobile@kinguardian.com"})
    headers = {"Authorization": f"Bearer {token}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # A. Full Home payload
        res = await client.get(f"/api/v1/families/{family.id}/home", headers=headers)
        assert res.status_code == 200
        data = res.json()

        assert data["family_id"] == str(family.id)
        assert data["user_role"] == "coordinator"
        assert len(data["subjects"]) >= 1
        assert data["subjects"][0]["display_name"] == "Father"
        assert len(data["guardian_moments"]) >= 1
        assert len(data["medications_today"]) >= 1
        assert len(data["pending_tasks"]) >= 1

        # B. Partial Fields Projection (?fields=subjects,pending_tasks)
        partial_res = await client.get(
            f"/api/v1/families/{family.id}/home?fields=subjects,pending_tasks",
            headers=headers
        )
        assert partial_res.status_code == 200
        partial_data = partial_res.json()

        assert "subjects" in partial_data
        assert "pending_tasks" in partial_data
        assert "guardian_moments" not in partial_data
        assert "medications_today" not in partial_data


@pytest.mark.asyncio
async def test_mobile_cursor_pagination_messages(db_session: AsyncSession):
    """
    Verifies cursor-based pagination for high-volume chat messages.
    """
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    family_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    family_service = FamilyService(user_repo, family_repo, consent_repo, event_logger)

    coord = await family_service.get_or_create_profile(
        iam_subject_id="iam_coord_msg_01",
        email="coord.msg@kinguardian.com",
        display_name="Sunil"
    )
    family = await family_service.create_care_circle(creator_id=coord.id, name="Sunil Circle", creator_role="coordinator")
    conv = await family_service.create_family_conversation(requester_id=coord.id, family_id=family.id)

    # Seed 5 messages
    for i in range(5):
        await family_service.add_family_message(
            requester_id=coord.id,
            family_id=family.id,
            conversation_id=conv.id,
            message_type="text",
            body=f"Message index {i}"
        )

    token = create_access_token({"sub": "iam_coord_msg_01", "email": "coord.msg@kinguardian.com"})
    headers = {"Authorization": f"Bearer {token}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Page 1: limit 2
        res1 = await client.get(
            f"/api/v1/families/{family.id}/messages?conversation_id={conv.id}&limit=2&sort_order=desc",
            headers=headers
        )
        assert res1.status_code == 200
        page1 = res1.json()

        assert len(page1["items"]) == 2
        assert page1["has_more"] is True
        assert page1["next_cursor"] is not None

        # Page 2: with cursor
        cursor = page1["next_cursor"]
        res2 = await client.get(
            f"/api/v1/families/{family.id}/messages?conversation_id={conv.id}&cursor={cursor}&limit=2&sort_order=desc",
            headers=headers
        )
        assert res2.status_code == 200
        page2 = res2.json()
        assert len(page2["items"]) == 2


@pytest.mark.asyncio
async def test_mobile_offset_pagination_and_filtering_tasks(db_session: AsyncSession):
    """
    Verifies offset-based pagination, priority/status filtering, and sorting for care tasks.
    """
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    family_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    family_service = FamilyService(user_repo, family_repo, consent_repo, event_logger)

    now = datetime.now(timezone.utc)
    coord = await family_service.get_or_create_profile(
        iam_subject_id="iam_coord_task_01",
        email="coord.task@kinguardian.com",
        display_name="Pooja"
    )
    family = await family_service.create_care_circle(creator_id=coord.id, name="Pooja Circle", creator_role="coordinator")
    subject = await family_service.add_care_subject(
        requester_id=coord.id,
        family_id=family.id,
        fhir_patient_id="fhir-pat-pooja-subj",
        relationship_to_coordinator="mother"
    )

    # Seed tasks with different priorities and categories
    await family_service.add_care_task(
        requester_id=coord.id,
        family_id=family.id,
        subject_id=subject.id,
        assigned_to_profile_id=coord.id,
        title="Urgent BP check",
        description="Daily blood pressure reading",
        priority="urgent",
        category="medication",
        due_at=now + timedelta(days=1)
    )
    await family_service.add_care_task(
        requester_id=coord.id,
        family_id=family.id,
        subject_id=subject.id,
        assigned_to_profile_id=coord.id,
        title="Routine walk reminder",
        description="Evening park walk",
        priority="low",
        category="caregiver",
        due_at=now + timedelta(days=2)
    )
    await family_service.add_care_task(
        requester_id=coord.id,
        family_id=family.id,
        subject_id=subject.id,
        assigned_to_profile_id=coord.id,
        title="Lab appointment prep",
        description="Fast for 12 hours",
        priority="high",
        category="appointment",
        due_at=now + timedelta(hours=12)
    )

    token = create_access_token({"sub": "iam_coord_task_01", "email": "coord.task@kinguardian.com"})
    headers = {"Authorization": f"Bearer {token}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # A. Filter by priority=urgent
        res = await client.get(
            f"/api/v1/families/{family.id}/care-tasks?priority=urgent",
            headers=headers
        )
        assert res.status_code == 200
        data = res.json()
        assert len(data["items"]) == 1
        assert data["items"][0]["title"] == "Urgent BP check"

        # B. Pagination with sorting by priority desc
        res_paged = await client.get(
            f"/api/v1/families/{family.id}/care-tasks?sort_by=priority&sort_order=desc&page=1&per_page=2",
            headers=headers
        )
        assert res_paged.status_code == 200
        paged_data = res_paged.json()
        assert len(paged_data["items"]) == 2
        assert paged_data["total_items"] == 3
        assert paged_data["total_pages"] == 2
        assert paged_data["items"][0]["priority"] == "urgent"
