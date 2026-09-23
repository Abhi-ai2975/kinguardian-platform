"""
API Integration Test Suite:
Comprehensive HTTP integration tests for core platform endpoints:
1. POST /check-ins
2. POST /medications/{id}/take
3. POST /care/tasks
4. POST /documents
5. POST /ai/conversations/{id}/messages
6. GET /families/{id}/home
7. GET /subjects/{id}/home
8. GET /subjects/{id}/timeline
"""

import pytest
import uuid
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.security import get_current_user
from app.core.database import get_db
from app.domains.family.infrastructure.models import (
    AppProfile,
    Family,
    FamilyMembership,
    CareSubject,
    Consent
)
from app.domains.family.infrastructure.repositories import (
    SQLAlchemyAppProfileRepository,
    SQLAlchemyFamilyRepository,
    SQLAlchemyConsentRepository
)
from app.domains.events.services import EventService
from app.domains.family.application.services import FamilyService


@pytest.fixture
async def api_test_context(db_session):
    """
    Initializes a test fixture with Coordinator (Anjali), Parent (Ramesh),
    Care Subject record, and active consents.
    """
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    family_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    family_svc = FamilyService(user_repo, family_repo, consent_repo, event_logger)

    coord_id = uuid.uuid4()
    parent_id = uuid.uuid4()
    family_id = uuid.uuid4()
    subject_id = uuid.uuid4()

    # 1. Profiles
    coord_profile = AppProfile(
        id=coord_id,
        iam_subject_id=f"iam_coord_api_{uuid.uuid4().hex[:8]}",
        email="anjali.api@kinguardian.com",
        display_name="Anjali Sharma",
        timezone="Europe/London",
        city="London",
        country_code="GB",
        status="active"
    )
    parent_profile = AppProfile(
        id=parent_id,
        iam_subject_id=f"iam_parent_api_{uuid.uuid4().hex[:8]}",
        email="ramesh.api@kinguardian.com",
        display_name="Ramesh Sharma",
        timezone="Asia/Kolkata",
        city="Chennai",
        country_code="IN",
        status="active"
    )
    db_session.add_all([coord_profile, parent_profile])
    await db_session.flush()

    # 2. Family & Memberships
    family = Family(
        id=family_id,
        name="Sharma Family API Integration",
        primary_coordinator_profile_id=coord_id
    )
    db_session.add(family)
    await db_session.flush()

    m_coord = FamilyMembership(
        id=uuid.uuid4(),
        family_id=family_id,
        profile_id=coord_id,
        membership_role="primary_coordinator",
        status="active"
    )
    m_parent = FamilyMembership(
        id=uuid.uuid4(),
        family_id=family_id,
        profile_id=parent_id,
        membership_role="parent",
        status="active"
    )
    db_session.add_all([m_coord, m_parent])

    # 3. Care Subject
    care_subject = CareSubject(
        id=subject_id,
        family_id=family_id,
        profile_id=parent_id,
        fhir_patient_id=f"fhir-pat-{uuid.uuid4().hex[:6]}",
        relationship_to_coordinator="father",
        city="Chennai",
        country_code="IN",
        timezone="Asia/Kolkata",
        status="active"
    )
    db_session.add(care_subject)
    await db_session.flush()

    # 4. Consent
    consent = Consent(
        id=uuid.uuid4(),
        family_id=family_id,
        subject_id=subject_id,
        grantor_profile_id=parent_id,
        grantee_profile_id=coord_id,
        consent_type="clinical_read",
        scope={"vitals": True, "medications": True, "documents": True},
        status="active"
    )
    db_session.add(consent)
    await db_session.commit()

    return {
        "coord_profile": coord_profile,
        "parent_profile": parent_profile,
        "family_id": family_id,
        "subject_id": subject_id,
        "coord_id": coord_id,
        "parent_id": parent_id
    }


@pytest.mark.asyncio
async def test_api_post_checkins(db_session, api_test_context):
    """
    Test 1: POST /check-ins and POST /api/v1/check-ins
    Verifies that wellbeing check-ins are logged with severity, feelings, and timestamps.
    """
    ctx = api_test_context
    app.dependency_overrides[get_current_user] = lambda: ctx["parent_profile"]
    app.dependency_overrides[get_db] = lambda: db_session

    transport = ASGITransport(app=app)
    try:
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            payload = {
                "subject_id": str(ctx["subject_id"]),
                "feeling": "good",
                "notes": "Morning walk completed. Blood pressure felt very normal.",
                "severity": "low"
            }
            # Direct endpoint
            resp = await client.post("/check-ins", json=payload)
            assert resp.status_code == 201
            data = resp.json()
            assert data["feeling"] == "good"
            assert data["severity"] == "low"
            assert data["subject_id"] == str(ctx["subject_id"])
            assert "submitted_at" in data

            # Also verify /api/v1 prefix
            payload_v1 = {
                "subject_id": str(ctx["subject_id"]),
                "feeling": "okay",
                "notes": "Afternoon rested.",
                "severity": "low"
            }
            resp_v1 = await client.post("/api/v1/check-ins", json=payload_v1)
            assert resp_v1.status_code == 201
            assert resp_v1.json()["feeling"] == "okay"
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_api_post_medications_take(db_session, api_test_context):
    """
    Test 2: POST /medications/{id}/take and POST /api/v1/medications/{id}/take
    Verifies that a dose taken event is recorded and returns AdherenceEventResponse.
    """
    ctx = api_test_context
    app.dependency_overrides[get_current_user] = lambda: ctx["parent_profile"]
    app.dependency_overrides[get_db] = lambda: db_session

    transport = ASGITransport(app=app)
    try:
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            med_id = "med-amlodipine-5mg-morning"
            resp = await client.post(f"/medications/{med_id}/take?subject_id={ctx['subject_id']}")
            assert resp.status_code == 200
            data = resp.json()
            assert data["status"] == "taken"
            assert data["subject_id"] == str(ctx["subject_id"])
            assert data["fhir_medication_request_id"] == med_id
            assert data["confirmed_at"] is not None

            # Also verify via /api/v1 prefix
            med_id_2 = "med-metformin-500mg-night"
            resp_v1 = await client.post(f"/api/v1/medications/{med_id_2}/take?subject_id={ctx['subject_id']}")
            assert resp_v1.status_code == 200
            assert resp_v1.json()["status"] == "taken"
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_api_post_care_tasks(db_session, api_test_context):
    """
    Test 3: POST /care/tasks and POST /api/v1/care/tasks
    Verifies creation of a care coordination task.
    """
    ctx = api_test_context
    app.dependency_overrides[get_current_user] = lambda: ctx["coord_profile"]
    app.dependency_overrides[get_db] = lambda: db_session

    transport = ASGITransport(app=app)
    try:
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            task_payload = {
                "family_id": str(ctx["family_id"]),
                "subject_id": str(ctx["subject_id"]),
                "title": "Verify Dad's Blood Sugar Levels after Dinner",
                "description": "Ensure glucometer reading is logged in the diary.",
                "category": "check_in",
                "priority": "high",
                "due_at": (datetime.now(timezone.utc) + timedelta(hours=4)).isoformat()
            }
            resp = await client.post("/care/tasks", json=task_payload)
            assert resp.status_code == 201
            data = resp.json()
            assert data["title"] == "Verify Dad's Blood Sugar Levels after Dinner"
            assert data["priority"] == "high"
            assert data["status"] == "pending"
            assert data["subject_id"] == str(ctx["subject_id"])

            # Also verify via /api/v1 prefix
            task_payload_v1 = {
                "family_id": str(ctx["family_id"]),
                "subject_id": str(ctx["subject_id"]),
                "title": "Schedule Routine Cardiology Follow-up",
                "category": "appointment",
                "priority": "medium",
                "due_at": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
            }
            resp_v1 = await client.post("/api/v1/care/tasks", json=task_payload_v1)
            assert resp_v1.status_code == 201
            assert resp_v1.json()["title"] == "Schedule Routine Cardiology Follow-up"

    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_api_post_documents(db_session, api_test_context):
    """
    Test 4: POST /documents and POST /api/v1/documents
    Verifies initiating secure document metadata and FileNest upload URL generation.
    """
    ctx = api_test_context
    app.dependency_overrides[get_current_user] = lambda: ctx["coord_profile"]
    app.dependency_overrides[get_db] = lambda: db_session

    transport = ASGITransport(app=app)
    try:
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            doc_payload = {
                "subject_id": str(ctx["subject_id"]),
                "document_type": "lab_report",
                "filename": "lipid_panel_chennai.pdf",
                "mime_type": "application/pdf",
                "file_size_bytes": 204800
            }
            resp = await client.post("/documents", json=doc_payload)
            assert resp.status_code == 201
            data = resp.json()
            assert data["document_type"] == "lab_report"
            assert data["subject_id"] == str(ctx["subject_id"])
            assert "filenest_file_id" in data
            assert "upload_url" in data
            assert data["upload_method"] == "POST"

            # Also verify via /api/v1 prefix
            doc_payload_v1 = {
                "subject_id": str(ctx["subject_id"]),
                "document_type": "prescription",
                "filename": "dr_rao_prescription.jpg",
                "mime_type": "image/jpeg"
            }
            resp_v1 = await client.post("/api/v1/documents", json=doc_payload_v1)
            assert resp_v1.status_code == 201
            assert resp_v1.json()["document_type"] == "prescription"
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_api_post_ai_conversations_messages(db_session, api_test_context):
    """
    Test 5: POST /ai/conversations/{id}/messages and POST /api/v1/ai/conversations/{id}/messages
    Verifies creating an AI session and sending messages through the KinGuardian AI Facade.
    """
    ctx = api_test_context
    app.dependency_overrides[get_current_user] = lambda: ctx["coord_profile"]
    app.dependency_overrides[get_db] = lambda: db_session

    transport = ASGITransport(app=app)
    try:
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # 1. Start AI Conversation
            conv_payload = {
                "family_id": str(ctx["family_id"]),
                "subject_id": str(ctx["subject_id"]),
                "conversation_type": "health_qa",
                "context_scope": {"scope": "clinical_and_wearables"}
            }
            conv_resp = await client.post("/ai/conversations", json=conv_payload)
            assert conv_resp.status_code == 201
            conv_id = conv_resp.json()["id"]

            # 2. Send message
            msg_payload = {
                "content": "What is Dad's recent blood pressure trend and should we be worried about his morning dizziness?"
            }
            msg_resp = await client.post(f"/ai/conversations/{conv_id}/messages", json=msg_payload)
            assert msg_resp.status_code == 200
            data = msg_resp.json()
            assert data["conversation_id"] == conv_id
            assert data["sender_role"] == "assistant"
            assert len(data["content"]) > 0

            # Also verify via /api/v1 prefix
            msg_payload_v1 = {
                "content": "Suggest preparation points for tomorrow's cardiology appointment."
            }
            msg_resp_v1 = await client.post(f"/api/v1/ai/conversations/{conv_id}/messages", json=msg_payload_v1)
            assert msg_resp_v1.status_code == 200
            assert msg_resp_v1.json()["sender_role"] == "assistant"
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_api_get_families_home(db_session, api_test_context):
    """
    Test 6: GET /families/{id}/home and GET /api/v1/families/{id}/home
    Verifies the aggregated Coordinator Home response.
    """
    ctx = api_test_context
    app.dependency_overrides[get_current_user] = lambda: ctx["coord_profile"]
    app.dependency_overrides[get_db] = lambda: db_session

    transport = ASGITransport(app=app)
    try:
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get(f"/families/{ctx['family_id']}/home")
            assert resp.status_code == 200
            data = resp.json()
            assert "parent_statuses" in data or "family_id" in data
            assert str(data.get("coordinator_profile_id", ctx["coord_id"])) == str(ctx["coord_id"])

            # Also verify via /api/v1 prefix
            resp_v1 = await client.get(f"/api/v1/families/{ctx['family_id']}/home")
            assert resp_v1.status_code == 200
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_api_get_subjects_home(db_session, api_test_context):
    """
    Test 7: GET /subjects/{id}/home and GET /api/v1/subjects/{id}/home
    Verifies the compact Parent Home read model.
    """
    ctx = api_test_context
    app.dependency_overrides[get_current_user] = lambda: ctx["parent_profile"]
    app.dependency_overrides[get_db] = lambda: db_session

    transport = ASGITransport(app=app)
    try:
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get(f"/subjects/{ctx['subject_id']}/home")
            assert resp.status_code == 200
            data = resp.json()
            assert data["parent_profile_id"] == str(ctx["parent_id"])
            assert "today_medications" in data
            assert "reminders" in data
            assert "family_messages" in data

            # Also verify via /api/v1 prefix
            resp_v1 = await client.get(f"/api/v1/subjects/{ctx['subject_id']}/home")
            assert resp_v1.status_code == 200
            assert resp_v1.json()["parent_profile_id"] == str(ctx["parent_id"])
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_api_get_subjects_timeline(db_session, api_test_context):
    """
    Test 8: GET /subjects/{id}/timeline and GET /api/v1/subjects/{id}/timeline
    Verifies the paginated care subject timeline endpoint.
    """
    ctx = api_test_context
    app.dependency_overrides[get_current_user] = lambda: ctx["coord_profile"]
    app.dependency_overrides[get_db] = lambda: db_session

    transport = ASGITransport(app=app)
    try:
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # 1. Post a check-in to ensure timeline has events
            user_repo = SQLAlchemyAppProfileRepository(db_session)
            family_repo = SQLAlchemyFamilyRepository(db_session)
            consent_repo = SQLAlchemyConsentRepository(db_session)
            event_logger = EventService(db_session)
            family_svc = FamilyService(user_repo, family_repo, consent_repo, event_logger)

            await family_svc.submit_subject_checkin(
                requester_id=ctx["parent_id"],
                subject_id=ctx["subject_id"],
                feeling="good",
                notes="Morning yoga completed."
            )

            # 2. Fetch timeline
            resp = await client.get(f"/subjects/{ctx['subject_id']}/timeline?limit=10")
            assert resp.status_code == 200
            data = resp.json()
            assert "items" in data
            assert len(data["items"]) >= 1
            assert any(item["event_type"] in ["wellbeing_checkin", "checkin"] or item["category"] == "checkin" for item in data["items"])

            # Also verify via /api/v1 prefix
            resp_v1 = await client.get(f"/api/v1/subjects/{ctx['subject_id']}/timeline?limit=5")
            assert resp_v1.status_code == 200
            assert len(resp_v1.json()["items"]) >= 1
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_api_integration_full_end_to_end_journey(db_session, api_test_context):
    """
    Comprehensive multi-step end-to-end user workflow:
    1. Parent submits Check-in (POST /check-ins)
    2. Parent takes Medication (POST /medications/{id}/take)
    3. Coordinator creates Care Task (POST /care/tasks)
    4. Parent uploads Health Document (POST /documents)
    5. Coordinator engages AI Assistant (POST /ai/conversations/{id}/messages)
    6. Verify Coordinator Home (GET /families/{id}/home)
    7. Verify Parent Home (GET /subjects/{id}/home)
    8. Verify Subject Timeline (GET /subjects/{id}/timeline)
    """
    ctx = api_test_context
    transport = ASGITransport(app=app)

    try:
        # Step 1, 2, 3: As Parent
        app.dependency_overrides[get_current_user] = lambda: ctx["parent_profile"]
        app.dependency_overrides[get_db] = lambda: db_session

        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # 1. Submit check-in
            r_checkin = await client.post("/check-ins", json={
                "subject_id": str(ctx["subject_id"]),
                "feeling": "good",
                "notes": "Feeling energetic today after walking.",
                "severity": "low"
            })
            assert r_checkin.status_code == 201

            # 2. Take medication
            r_med = await client.post(f"/medications/med-telmisartan-40mg/take?subject_id={ctx['subject_id']}")
            assert r_med.status_code == 200

            # 3. Upload document
            r_doc = await client.post("/documents", json={
                "subject_id": str(ctx["subject_id"]),
                "document_type": "lab_report",
                "filename": "hba1c_latest.pdf"
            })
            assert r_doc.status_code == 201

        # Step 4, 5, 6, 7: As Coordinator
        app.dependency_overrides[get_current_user] = lambda: ctx["coord_profile"]

        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # 4. Create care task
            r_task = await client.post("/care/tasks", json={
                "family_id": str(ctx["family_id"]),
                "subject_id": str(ctx["subject_id"]),
                "title": "Review latest lab report with Dr. Arvind",
                "priority": "medium",
                "category": "appointment",
                "due_at": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
            })
            assert r_task.status_code == 201


            # 5. Start AI session & ask query
            r_conv = await client.post("/ai/conversations", json={
                "family_id": str(ctx["family_id"]),
                "subject_id": str(ctx["subject_id"]),
                "conversation_type": "care_planning"
            })
            assert r_conv.status_code == 201
            conv_id = r_conv.json()["id"]

            r_msg = await client.post(f"/ai/conversations/{conv_id}/messages", json={
                "content": "Summarize today's checkin and adherence for Dad."
            })
            assert r_msg.status_code == 200
            assert len(r_msg.json()["content"]) > 0

            # 6. Coordinator Home
            r_home = await client.get(f"/families/{ctx['family_id']}/home")
            assert r_home.status_code == 200

            # 7. Timeline
            r_timeline = await client.get(f"/subjects/{ctx['subject_id']}/timeline")
            assert r_timeline.status_code == 200
            assert len(r_timeline.json()["items"]) >= 2

        # Step 8: Parent Home
        app.dependency_overrides[get_current_user] = lambda: ctx["parent_profile"]
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            r_parent_home = await client.get(f"/subjects/{ctx['subject_id']}/home")
            assert r_parent_home.status_code == 200
            assert r_parent_home.json()["checkin_status"]["submitted"] is True

    finally:
        app.dependency_overrides.clear()

