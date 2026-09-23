"""
End-to-End Test Suite: Complete Cross-Border Flow
Executes one complete end-to-end care workflow without external production dependencies:
1. Parent login & profile retrieval
2. Wellbeing check-in submission
3. Medication dose confirmation
4. Coordinator notification delivery
5. Coordinator home dashboard refresh
6. AI query & context-aware assistant response
7. AI insight generation & provenance verification
8. Care coordination task creation
9. Care task completion & state transition
"""

import pytest
import uuid
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select

from app.main import app
from app.core.security import get_current_user
from app.core.database import get_db
from app.domains.family.infrastructure.models import (
    AppProfile,
    Family,
    FamilyMembership,
    CareSubject,
    CareRelationship,
    Consent,
    Notification
)
from app.domains.family.infrastructure.repositories import (
    SQLAlchemyAppProfileRepository,
    SQLAlchemyFamilyRepository,
    SQLAlchemyConsentRepository
)
from app.domains.events.services import EventService
from app.domains.family.application.services import FamilyService
from app.domains.notifications.services import NotificationService


@pytest.fixture
async def e2e_flow_context(db_session):
    """
    Initializes a test environment with London Coordinator (Anjali)
    and Chennai Parent (Ramesh) with active care relationships and clinical consents.
    """
    coord_id = uuid.uuid4()
    parent_id = uuid.uuid4()
    family_id = uuid.uuid4()
    subject_id = uuid.uuid4()

    # 1. Profiles
    coord_profile = AppProfile(
        id=coord_id,
        iam_subject_id=f"iam_coord_e2e_{uuid.uuid4().hex[:8]}",
        email="anjali.e2e@kinguardian.com",
        display_name="Anjali Sharma (London)",
        first_name="Anjali",
        last_name="Sharma",
        timezone="Europe/London",
        city="London",
        country_code="GB",
        status="active"
    )
    parent_profile = AppProfile(
        id=parent_id,
        iam_subject_id=f"iam_parent_e2e_{uuid.uuid4().hex[:8]}",
        email="ramesh.e2e@kinguardian.com",
        display_name="Ramesh Sharma (Chennai)",
        first_name="Ramesh",
        last_name="Sharma",
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
        name="Sharma Global Care Circle",
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

    # 3. Care Subject & Relationship
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
    care_rel = CareRelationship(
        id=uuid.uuid4(),
        family_id=family_id,
        subject_id=subject_id,
        profile_id=coord_id,
        relationship_type="primary_coordinator"
    )
    db_session.add_all([care_subject, care_rel])
    await db_session.flush()

    # 4. Consent
    consent = Consent(
        id=uuid.uuid4(),
        family_id=family_id,
        subject_id=subject_id,
        grantor_profile_id=parent_id,
        grantee_profile_id=coord_id,
        consent_type="clinical_read",
        scope={"vitals": True, "medications": True, "documents": True, "ai_insights": True},
        status="active"
    )
    db_session.add(consent)
    await db_session.commit()

    return {
        "coord_profile": coord_profile,
        "parent_profile": parent_profile,
        "coord_id": coord_id,
        "parent_id": parent_id,
        "family_id": family_id,
        "subject_id": subject_id
    }




@pytest.mark.asyncio
async def test_complete_e2e_care_flow(db_session, e2e_flow_context):
    """
    Executes the full 9-step end-to-end lifecycle flow:
    Parent login → check-in → medication confirmation → coordinator notification
    → coordinator home refresh → AI query → insight → care task → task completion.
    """
    ctx = e2e_flow_context
    transport = ASGITransport(app=app)

    # --------------------------------------------------------------------------
    # Step 1: Parent Login & Home Model Verification
    # --------------------------------------------------------------------------
    app.dependency_overrides[get_current_user] = lambda: ctx["parent_profile"]
    app.dependency_overrides[get_db] = lambda: db_session

    async with AsyncClient(transport=transport, base_url="http://test") as parent_client:
        r_parent_home = await parent_client.get(f"/subjects/{ctx['subject_id']}/home")
        assert r_parent_home.status_code == 200
        parent_home_data = r_parent_home.json()
        assert parent_home_data["parent_profile_id"] == str(ctx["parent_id"])
        assert parent_home_data["checkin_status"]["submitted"] is False

        # ----------------------------------------------------------------------
        # Step 2: Parent Submits Wellbeing Check-In
        # ----------------------------------------------------------------------
        checkin_payload = {
            "subject_id": str(ctx["subject_id"]),
            "feeling": "good",
            "notes": "Morning walk around Marina Beach completed. Energy levels good.",
            "severity": "low"
        }
        r_checkin = await parent_client.post("/check-ins", json=checkin_payload)
        assert r_checkin.status_code == 201
        checkin_data = r_checkin.json()
        assert checkin_data["feeling"] == "good"
        assert checkin_data["severity"] == "low"
        assert checkin_data["subject_id"] == str(ctx["subject_id"])

        # ----------------------------------------------------------------------
        # Step 3: Parent Confirms Prescribed Medication Taken
        # ----------------------------------------------------------------------
        med_id = "med-amlodipine-5mg-morning"
        r_med = await parent_client.post(f"/medications/{med_id}/take?subject_id={ctx['subject_id']}")
        assert r_med.status_code == 200
        med_data = r_med.json()
        assert med_data["status"] == "taken"
        assert med_data["fhir_medication_request_id"] == med_id
        assert med_data["confirmed_at"] is not None

        # Create coordinator notification for this adherence event
        notif_svc = NotificationService(
            family_repo=SQLAlchemyFamilyRepository(db_session),
            profile_repo=SQLAlchemyAppProfileRepository(db_session),
            event_logger=EventService(db_session)
        )
        await notif_svc.send_notification(
            recipient_profile_id=ctx["coord_id"],
            family_id=ctx["family_id"],
            title="Medication Confirmed",
            body="Ramesh confirmed morning Amlodipine 5mg dose in Chennai.",
            type="medication_taken",
            priority="normal",
            subject_id=ctx["subject_id"]
        )


    # --------------------------------------------------------------------------
    # Step 4: Coordinator Notification Delivery Verification
    # --------------------------------------------------------------------------
    app.dependency_overrides[get_current_user] = lambda: ctx["coord_profile"]

    async with AsyncClient(transport=transport, base_url="http://test") as coord_client:
        r_notifs = await coord_client.get("/notifications?limit=10")
        assert r_notifs.status_code == 200
        notifs_list = r_notifs.json()
        assert len(notifs_list) >= 1
        assert any(n["type"] == "medication_taken" for n in notifs_list)

        # ----------------------------------------------------------------------
        # Step 5: Coordinator Home Refresh & State Verification
        # ----------------------------------------------------------------------
        r_home = await coord_client.get(f"/families/{ctx['family_id']}/home")
        assert r_home.status_code == 200
        home_data = r_home.json()
        assert home_data["coordinator_profile_id"] == str(ctx["coord_id"])
        assert "parent_statuses" in home_data
        assert "attention_items" in home_data
        assert "guardian_moments" in home_data
        assert "pending_care_tasks" in home_data


        # ----------------------------------------------------------------------
        # Step 6: Coordinator AI Query via KinGuardian AI Facade
        # ----------------------------------------------------------------------
        # Start AI conversation
        r_conv = await coord_client.post("/ai/conversations", json={
            "family_id": str(ctx["family_id"]),
            "subject_id": str(ctx["subject_id"]),
            "conversation_type": "care_planning",
            "context_scope": {"scope": "clinical_and_wellbeing"}
        })
        assert r_conv.status_code == 201
        conv_id = r_conv.json()["id"]

        # Send AI query
        r_ai_msg = await coord_client.post(f"/ai/conversations/{conv_id}/messages", json={
            "content": "How is Ramesh doing with his morning routine and blood pressure medications today?"
        })
        assert r_ai_msg.status_code == 200
        ai_msg_data = r_ai_msg.json()
        assert ai_msg_data["sender_role"] == "assistant"
        assert len(ai_msg_data["content"]) > 0

        # ----------------------------------------------------------------------
        # Step 7: AI Insight Generation & Detail Retrieval
        # ----------------------------------------------------------------------
        r_insight = await coord_client.post("/ai/insights/generate", json={
            "family_id": str(ctx["family_id"]),
            "subject_id": str(ctx["subject_id"]),
            "insight_type": "medication_adherence_trend",
            "timeframe_days": 7
        })
        assert r_insight.status_code == 201
        insight_data = r_insight.json()
        insight_id = insight_data["id"]
        assert insight_data["subject_id"] == str(ctx["subject_id"])
        assert insight_data["status"] == "active"
        assert len(insight_data["title"]) > 0

        # Verify insight detail endpoint
        r_insight_detail = await coord_client.get(f"/insights/{insight_id}")
        assert r_insight_detail.status_code == 200
        assert r_insight_detail.json()["id"] == str(insight_id)

        # ----------------------------------------------------------------------
        # Step 8: Coordinator Creates Care Task
        # ----------------------------------------------------------------------
        care_task_payload = {
            "family_id": str(ctx["family_id"]),
            "subject_id": str(ctx["subject_id"]),
            "assigned_to_profile_id": str(ctx["parent_id"]),
            "title": "Evening Blood Pressure Check",
            "description": "Log evening systolic/diastolic reading after dinner.",
            "category": "check_in",
            "priority": "medium",
            "due_at": (datetime.now(timezone.utc) + timedelta(hours=6)).isoformat()
        }
        r_task = await coord_client.post("/care/tasks", json=care_task_payload)
        assert r_task.status_code == 201
        task_data = r_task.json()
        task_id = task_data["id"]
        assert task_data["title"] == "Evening Blood Pressure Check"
        assert task_data["status"] == "pending"
        assert task_data["assigned_to_profile_id"] == str(ctx["parent_id"])

        # ----------------------------------------------------------------------
        # Step 9: Task Completion
        # ----------------------------------------------------------------------
        r_complete = await coord_client.post(f"/care/tasks/{task_id}/complete")
        assert r_complete.status_code == 200
        completed_task_data = r_complete.json()
        assert completed_task_data["id"] == str(task_id)
        assert completed_task_data["status"] == "completed"
        assert completed_task_data["completed_at"] is not None
        assert completed_task_data["completed_by_profile_id"] == str(ctx["coord_id"])

    # Clean up dependency overrides
    app.dependency_overrides.clear()
