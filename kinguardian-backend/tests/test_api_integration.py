"""Route-level integration tests for the mobile-facing KinGuardian API contract."""
import uuid
import httpx
import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from app.db import Base, get_session
from app.main import app
from app.models import AuditLog, CareSubject, Membership, OutboxEvent, Profile


@pytest_asyncio.fixture
async def api_client():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    async def override_session():
        async with sessions() as session:
            yield session

    app.dependency_overrides[get_session] = override_session
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        yield client, sessions
    app.dependency_overrides.clear()
    await engine.dispose()


@pytest_asyncio.fixture
async def family_context(api_client):
    client, sessions = api_client
    coordinator_headers = {"X-Actor-Subject": "coordinator", "X-Actor-Timezone": "America/Toronto"}
    response = await client.post("/api/v1/families", json={"name": "Sharma family", "home_timezone": "Asia/Kolkata"}, headers=coordinator_headers)
    assert response.status_code == 201
    family_id = uuid.UUID(response.json()["id"])
    async with sessions() as session:
        coordinator = (await session.execute(select(Profile).where(Profile.identity_subject == "coordinator"))).scalar_one()
        parent = Profile(identity_subject="parent", display_name="Parent", timezone="Asia/Kolkata")
        session.add(parent)
        await session.flush()
        session.add(Membership(family_id=family_id, profile_id=parent.id, role="parent"))
        subject = CareSubject(family_id=family_id, profile_id=parent.id, preferred_timezone="Asia/Kolkata")
        session.add(subject)
        await session.commit()
    return {"client": client, "sessions": sessions, "family_id": str(family_id), "subject_id": str(subject.id), "coordinator": coordinator_headers, "parent": {"X-Actor-Subject": "parent"}, "parent_id": str(parent.id)}


@pytest.mark.asyncio
async def test_db_health_route_connects_to_database(api_client):
    client, _ = api_client
    response = await client.get("/api/v1/db/health")
    assert response.status_code == 200
    assert response.json()["status"] == "connected"


@pytest.mark.asyncio
async def test_post_checkins_persists_auditable_parent_checkin(family_context):
    ctx = family_context
    response = await ctx["client"].post("/api/v1/check-ins", headers=ctx["parent"], json={"family_id": ctx["family_id"], "subject_id": ctx["subject_id"], "occurred_at": "2026-08-24T09:00:00+05:30", "mood": "well", "severity": "normal"})
    assert response.status_code == 201
    assert response.json()["subject_id"] == ctx["subject_id"]
    async with ctx["sessions"]() as session:
        assert (await session.execute(select(AuditLog).where(AuditLog.action == "care.checkin_recorded.v1"))).scalar_one()
        assert (await session.execute(select(OutboxEvent).where(OutboxEvent.event_type == "care.checkin_recorded.v1"))).scalar_one()


@pytest.mark.asyncio
async def test_post_medication_take_records_adherence_not_a_medication_change(family_context):
    ctx = family_context
    response = await ctx["client"].post("/api/v1/medications/fhir-med-123/take", headers=ctx["parent"], json={"family_id": ctx["family_id"], "subject_id": ctx["subject_id"], "taken_at": "2026-08-24T09:30:00+05:30"})
    assert response.status_code == 201
    assert response.json()["medication_ref"] == "fhir-med-123"


@pytest.mark.asyncio
async def test_post_care_tasks_is_timezone_safe_and_authorized(family_context):
    ctx = family_context
    response = await ctx["client"].post("/api/v1/care/tasks", headers=ctx["coordinator"], json={"family_id": ctx["family_id"], "subject_id": ctx["subject_id"], "assigned_to": ctx["parent_id"], "title": "Book cardiology follow-up", "due_at": "2026-08-25T10:00:00+05:30"})
    assert response.status_code == 201
    assert response.json()["status"] == "open"


@pytest.mark.asyncio
async def test_post_documents_stores_filenest_reference_only(family_context):
    ctx = family_context
    response = await ctx["client"].post("/api/v1/documents", headers=ctx["coordinator"], json={"family_id": ctx["family_id"], "subject_id": ctx["subject_id"], "filenest_file_id": "file_abc", "classification": "lab-report"})
    assert response.status_code == 201
    assert response.json()["filenest_file_id"] == "file_abc"


@pytest.mark.asyncio
async def test_post_ai_conversation_message_is_scoped_to_family(family_context):
    ctx = family_context
    created = await ctx["client"].post(f"/api/v1/families/{ctx['family_id']}/conversations?subject_id={ctx['subject_id']}", headers=ctx["coordinator"])
    assert created.status_code == 201
    response = await ctx["client"].post(f"/api/v1/ai/conversations/{created.json()['id']}/messages", headers=ctx["parent"], json={"body": "Please summarize tomorrow's care tasks."})
    assert response.status_code == 201
    assert response.json()["body"].startswith("Please summarize")


@pytest.mark.asyncio
async def test_family_and_subject_home_projections(family_context):
    ctx = family_context
    family_home = await ctx["client"].get(f"/api/v1/families/{ctx['family_id']}/home", headers=ctx["coordinator"])
    subject_home = await ctx["client"].get(f"/api/v1/subjects/{ctx['subject_id']}/home", headers=ctx["parent"])
    assert family_home.status_code == 200
    assert family_home.json()["subjects"][0]["id"] == ctx["subject_id"]
    assert subject_home.status_code == 200
    assert subject_home.json()["subject"]["id"] == ctx["subject_id"]


@pytest.mark.asyncio
async def test_subject_timeline_requires_authorization_and_returns_projection(family_context):
    ctx = family_context
    unauthenticated = await ctx["client"].get(f"/api/v1/subjects/{ctx['subject_id']}/timeline")
    allowed = await ctx["client"].get(f"/api/v1/subjects/{ctx['subject_id']}/timeline", headers=ctx["parent"])
    assert unauthenticated.status_code == 401
    assert allowed.status_code == 200
    assert allowed.json()["subject_id"] == ctx["subject_id"]

