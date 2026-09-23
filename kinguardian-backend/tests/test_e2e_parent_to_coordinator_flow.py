"""End-to-end family-care workflow using in-process mock outbound adapters."""
import uuid
import httpx
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from app.adapters import MockAIAdapter, MockNotificationAdapter
from app.db import Base, get_session
from app.main import app
from app.models import CareSubject, Membership, Profile


@pytest.mark.asyncio
async def test_parent_to_coordinator_care_workflow_without_production_integrations():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    async def override_session():
        async with sessions() as session:
            yield session

    notifier, ai = MockNotificationAdapter(), MockAIAdapter()
    app.dependency_overrides[get_session] = override_session
    app.state.notification_adapter, app.state.ai_adapter = notifier, ai
    headers = {"X-Actor-Subject": "coordinator"}
    try:
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            # Coordinator bootstrap; parent login is represented by a separately authenticated IAM subject.
            family = await client.post("/api/v1/families", headers=headers, json={"name": "Iyer family", "home_timezone": "Asia/Kolkata"})
            assert family.status_code == 201
            family_id = uuid.UUID(family.json()["id"])
            async with sessions() as session:
                parent = Profile(identity_subject="parent", display_name="Lakshmi", timezone="Asia/Kolkata")
                session.add(parent)
                await session.flush()
                session.add(Membership(family_id=family_id, profile_id=parent.id, role="parent"))
                subject = CareSubject(family_id=family_id, profile_id=parent.id, preferred_timezone="Asia/Kolkata")
                session.add(subject)
                await session.commit()
            parent_headers = {"X-Actor-Subject": "parent"}
            payload = {"family_id": str(family_id), "subject_id": str(subject.id)}

            # Parent login -> check-in -> medication confirmation -> coordinator notification.
            assert (await client.post("/api/v1/check-ins", headers=parent_headers, json={**payload, "occurred_at": "2026-08-24T08:00:00+05:30", "mood": "tired", "severity": "watch"})).status_code == 201
            assert (await client.post("/api/v1/medications/fhir-med-1/take", headers=parent_headers, json={**payload, "taken_at": "2026-08-24T08:30:00+05:30"})).status_code == 201
            notifications = await client.get(f"/api/v1/families/{family_id}/notifications", headers=headers)
            assert set(item["event_type"] for item in notifications.json()) == {"medication.taken_recorded.v1", "care.checkin_recorded.v1"}
            assert len(notifier.deliveries) == 2

            # Coordinator home refresh exposes the authorized care projection.
            home = await client.get(f"/api/v1/families/{family_id}/home", headers=headers)
            assert home.status_code == 200
            assert home.json()["recent_checkins"][0]["severity"] == "watch"

            # AI query creates a persisted insight via the mock AI adapter.
            conversation = await client.post(f"/api/v1/families/{family_id}/conversations?subject_id={subject.id}", headers=headers)
            answer = await client.post(f"/api/v1/ai/conversations/{conversation.json()['id']}/messages", headers=headers, json={"body": "What should I follow up on?"})
            assert answer.status_code == 201
            insight_summary = answer.json()["insight"]["summary"]
            # Accept either the mock format or the detailed care insight format
            assert insight_summary.startswith("Mock care insight") or "care records" in insight_summary.lower()

            # Coordinator creates care work; parent completes only their assigned task.
            task = await client.post("/api/v1/care/tasks", headers=headers, json={**payload, "assigned_to": str(parent.id), "title": "Arrange a clinic follow-up", "due_at": "2026-08-25T10:00:00+05:30"})
            assert task.status_code == 201
            completed = await client.post(f"/api/v1/care/tasks/{task.json()['id']}/complete", headers=parent_headers, json={"completed_at": "2026-08-24T10:00:00+05:30"})
            assert completed.status_code == 200
            assert completed.json()["status"] == "completed"
    finally:
        app.dependency_overrides.clear()
        await engine.dispose()
