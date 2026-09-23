"""
Subject Timeline API Test Suite:
Verifies GET /subjects/{id}/timeline with:
- Cursor-based pagination (limit, cursor, next_cursor)
- Filtering by type (checkin, medication, care_task, insight, document, appointment)
- Filtering by date range (from, to)
- Authorization and multi-tenancy access control
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
async def test_subject_timeline_cursor_pagination_and_filters(db_session: AsyncSession):
    """
    Verifies cursor-based pagination and filtering on GET /subjects/{id}/timeline.
    """
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    family_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    family_service = FamilyService(user_repo, family_repo, consent_repo, event_logger)

    now = datetime.now(timezone.utc)

    # 1. Setup Data
    coord = await family_service.get_or_create_profile(
        iam_subject_id="iam_coord_timeline_01",
        email="coord.timeline@kinguardian.com",
        display_name="Kavita",
        timezone="America/New_York"
    )
    parent = await family_service.get_or_create_profile(
        iam_subject_id="iam_parent_timeline_01",
        email="parent.timeline@kinguardian.com",
        display_name="Ramesh",
        timezone="Asia/Kolkata"
    )
    family = await family_service.create_care_circle(
        creator_id=coord.id,
        name="Ramesh Care Circle",
        creator_role="coordinator"
    )
    await family_service.add_member_to_circle(
        requester_id=coord.id,
        care_circle_id=family.id,
        target_email="parent.timeline@kinguardian.com",
        role="parent"
    )
    subject = await family_service.add_care_subject(
        requester_id=coord.id,
        family_id=family.id,
        fhir_patient_id="fhir-pat-ramesh-100",
        profile_id=parent.id,
        relationship_to_coordinator="father"
    )

    # 2. Seed Timeline Events with different timestamps
    # Event 1: Check-in (T - 3 hours)
    t1 = now - timedelta(hours=3)
    await family_service.circle_repo.add_checkin(
        family_id=family.id,
        subject_id=subject.id,
        submitted_by_profile_id=parent.id,
        feeling="good",
        notes="Morning yoga completed.",
        voice_file_id=None,
        severity="low",
        submitted_at=t1
    )

    # Event 2: Care Task (T - 2 hours)
    t2 = now - timedelta(hours=2)
    await family_service.add_care_task(
        requester_id=coord.id,
        family_id=family.id,
        subject_id=subject.id,
        assigned_to_profile_id=coord.id,
        title="Check blood sugar before lunch",
        description="Fasting target 100 mg/dL",
        category="medication",
        priority="high",
        due_at=now + timedelta(hours=2)
    )

    # Event 3: AI Insight (T - 1 hour)
    t3 = now - timedelta(hours=1)
    await family_service.circle_repo.add_ai_insight(
        family_id=family.id,
        subject_id=subject.id,
        type="vital_trends",
        severity="low",
        title="Glucose Stabilized",
        summary="7-day morning fasting readings normal.",
        observation="Values within 90-110 mg/dL",
        recommendation="Maintain current dietary habits",
        timeframe_start=now - timedelta(days=7),
        timeframe_end=now,
        confidence=0.96
    )

    # Event 4: Document uploaded (T - 30 minutes)
    t4 = now - timedelta(minutes=30)
    await family_service.circle_repo.add_health_document(
        family_id=family.id,
        subject_id=subject.id,
        source_profile_id=coord.id,
        filenest_file_id="fn_file_timeline_rx",
        document_type="prescription",
        status="ready",
        ai_processing_status="completed",
        extraction_status="completed"
    )


    token = create_access_token({"sub": "iam_coord_timeline_01", "email": "coord.timeline@kinguardian.com"})
    headers = {"Authorization": f"Bearer {token}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # A. Fetch Page 1 with limit=2 (Cursor Pagination)
        res1 = await client.get(f"/api/v1/subjects/{subject.id}/timeline?limit=2", headers=headers)
        assert res1.status_code == 200
        page1 = res1.json()

        assert len(page1["items"]) == 2
        assert page1["next_cursor"] is not None

        # B. Fetch Page 2 with cursor
        cursor = page1["next_cursor"]
        res2 = await client.get(f"/api/v1/subjects/{subject.id}/timeline?cursor={cursor}&limit=2", headers=headers)
        assert res2.status_code == 200
        page2 = res2.json()

        assert len(page2["items"]) >= 1

        # C. Filter by type=checkin
        res_checkin = await client.get(f"/api/v1/subjects/{subject.id}/timeline?type=checkin", headers=headers)
        assert res_checkin.status_code == 200
        checkin_data = res_checkin.json()
        assert len(checkin_data["items"]) == 1
        assert checkin_data["items"][0]["event_type"] == "wellbeing_checkin"
        assert "Morning yoga" in checkin_data["items"][0]["summary"]

        # D. Filter by type=care_task
        res_task = await client.get(f"/api/v1/subjects/{subject.id}/timeline?type=care_task", headers=headers)
        assert res_task.status_code == 200
        task_data = res_task.json()
        assert len(task_data["items"]) == 1
        assert "blood sugar" in task_data["items"][0]["title"].lower()

        # E. Filter by Date Range (from / to)
        from_str = (now - timedelta(hours=4)).isoformat()
        to_str = (now - timedelta(hours=2, minutes=30)).isoformat()
        res_range = await client.get(
            f"/api/v1/subjects/{subject.id}/timeline?from={from_str}&to={to_str}",
            headers=headers
        )
        assert res_range.status_code == 200
        range_data = res_range.json()
        assert len(range_data["items"]) == 1
        assert range_data["items"][0]["event_type"] == "wellbeing_checkin"

        # F. Access control: Unauthorized stranger receives 403
        stranger_token = create_access_token({"sub": "iam_stranger_tl", "email": "stranger.tl@kinguardian.com"})
        res_stranger = await client.get(
            f"/api/v1/subjects/{subject.id}/timeline",
            headers={"Authorization": f"Bearer {stranger_token}"}
        )
        assert res_stranger.status_code == 403
