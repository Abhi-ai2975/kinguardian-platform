import pytest
import uuid
from datetime import datetime, timedelta
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.security import get_current_user
from app.domains.family.infrastructure.models import AppProfile
from app.domains.family.infrastructure.repositories import (
    SQLAlchemyAppProfileRepository,
    SQLAlchemyFamilyRepository,
    SQLAlchemyConsentRepository
)
from app.domains.events.services import EventService
from app.domains.family.application.services import FamilyService
from app.domains.agent.tools import (
    ControlledToolRegistry,
    AgentToolContext,
    GetParentSummaryTool,
    GetMedicationsTool,
    GetMedicationAdherenceTool,
    GetRecentVitalsTool,
    GetRecentLabsTool,
    GetAppointmentsTool,
    GetHealthTimelineTool,
    GetFamilyMembersTool,
    CreateCareTaskTool,
    SendFamilyMessageTool,
    PrepareAppointmentTool,
    CreateInsightTool
)


@pytest.mark.asyncio
async def test_controlled_tool_registry_and_independent_authorization(db_session):
    """
    Tests the Controlled Tool Registry and independent authorization enforcement on domain tools.
    Verifies that tools check permissions independently and enforce least privilege.
    """
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    family_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    family_svc = FamilyService(user_repo, family_repo, consent_repo, event_logger)

    # 1. Setup Profiles
    coordinator = await family_svc.get_or_create_profile(
        iam_subject_id="iam_coord_agent",
        email="coord_agent@kinguardian.com",
        display_name="Maya Coordinator",
        timezone="America/New_York"
    )
    parent = await family_svc.get_or_create_profile(
        iam_subject_id="iam_parent_agent",
        email="parent_agent@kinguardian.com",
        display_name="Arthur Pendelton",
        timezone="Asia/Kolkata"
    )
    stranger = await family_svc.get_or_create_profile(
        iam_subject_id="iam_stranger_agent",
        email="stranger_agent@kinguardian.com",
        display_name="Intruder",
        timezone="UTC"
    )

    family = await family_svc.create_care_circle(coordinator.id, "Pendelton Circle", "coordinator")
    await family_svc.add_member_to_circle(coordinator.id, family.id, parent.email, "parent")

    subject = await family_svc.add_care_subject(
        requester_id=coordinator.id,
        family_id=family.id,
        fhir_patient_id="fhir-pat-agent-1",
        profile_id=parent.id,
        relationship_to_coordinator="father"
    )

    # Seed data: Adherence, Checkin, Task, Appointment Coordination
    await family_svc.record_adherence_event(
        requester_id=parent.id,
        family_id=family.id,
        subject_id=subject.id,
        fhir_medication_request_id="rx-101",
        scheduled_at=datetime.now(),
        status="taken",
        source="parent"
    )
    await family_svc.submit_subject_checkin(
        requester_id=parent.id,
        subject_id=subject.id,
        feeling="good",
        notes="All vitals normal"
    )
    await family_svc.add_appointment_coordination(
        requester_id=coordinator.id,
        family_id=family.id,
        subject_id=subject.id,
        fhir_appointment_id="fhir-appt-401"
    )

    registry = ControlledToolRegistry(
        family_repo=family_repo,
        consent_repo=consent_repo,
        profile_repo=user_repo,
        event_logger=event_logger
    )

    # Verify all tools are registered
    all_tools = registry.list_all_tools()
    assert len(all_tools) >= 13
    tool_names = [t.name for t in all_tools]

    expected_tools = [
        "get_parent_summary",
        "get_medications",
        "get_medication_adherence",
        "get_recent_vitals",
        "get_recent_labs",
        "get_appointments",
        "get_health_timeline",
        "get_family_members",
        "create_care_task",
        "send_family_message",
        "prepare_appointment",
        "create_insight",
        "get_wearable_metrics"
    ]
    for expected in expected_tools:
        assert expected in tool_names


    # --- Scenario A: Non-member Stranger tries to execute tools -> DENIED ---
    stranger_ctx = AgentToolContext(
        actor_id=stranger.id,
        family_id=family.id,
        subject_id=subject.id
    )
    res_stranger = await registry.execute_tool("get_parent_summary", {}, stranger_ctx)
    assert res_stranger.success is False
    assert "Authorization Denied" in res_stranger.error

    # --- Scenario B: Coordinator with NO clinical consent tries sensitive tools ---
    coord_ctx = AgentToolContext(
        actor_id=coordinator.id,
        family_id=family.id,
        subject_id=subject.id
    )

    # 1. Family member roster (Family-wide -> Allowed)
    res_members = await registry.execute_tool("get_family_members", {}, coord_ctx)
    assert res_members.success is True
    assert len(res_members.data) == 2

    # 2. Parent summary (Allowed for active family member)
    res_summary = await registry.execute_tool("get_parent_summary", {}, coord_ctx)
    assert res_summary.success is True
    assert res_summary.data["display_name"] == "Arthur Pendelton"

    # 3. Medications (Sensitive -> DENIED without consent)
    res_meds = await registry.execute_tool("get_medications", {}, coord_ctx)
    assert res_meds.success is False
    assert "Authorization Denied" in res_meds.error

    # 4. Medication Adherence (Sensitive -> DENIED without consent)
    res_adh = await registry.execute_tool("get_medication_adherence", {}, coord_ctx)
    assert res_adh.success is False
    assert "Authorization Denied" in res_adh.error

    # --- Scenario C: Parent GRANTS consent for medications & adherence ---
    await family_svc.create_consent(
        requester_id=parent.id,
        family_id=family.id,
        subject_id=subject.id,
        grantee_id=coordinator.id,
        scope={"medications": True, "adherence": True, "appointments": True}
    )

    # Now adherence succeeds independently!
    res_adh_granted = await registry.execute_tool("get_medication_adherence", {}, coord_ctx)
    assert res_adh_granted.success is True
    assert res_adh_granted.data["taken_count"] == 1
    assert res_adh_granted.data["adherence_rate"] == 100.0

    # Appointments succeeds independently!
    res_appts = await registry.execute_tool("get_appointments", {}, coord_ctx)
    assert res_appts.success is True
    assert len(res_appts.data) == 1

    # Create Care Task succeeds!
    res_task = await registry.execute_tool("create_care_task", {"title": "Pick up cardiology prescription", "priority": "high"}, coord_ctx)
    assert res_task.success is True
    assert res_task.data["title"] == "Pick up cardiology prescription"

    # Send Family Message succeeds!
    res_msg = await registry.execute_tool("send_family_message", {"message": "Hello from Agent runtime!"}, coord_ctx)
    assert res_msg.success is True
    assert res_msg.data["body"] == "Hello from Agent runtime!"

    # Create Insight succeeds!
    res_ins = await registry.execute_tool("create_insight", {"title": "Strong Weekly Adherence", "summary": "100% adherence over last 7 days"}, coord_ctx)
    assert res_ins.success is True
    assert res_ins.data["title"] == "Strong Weekly Adherence"


@pytest.mark.asyncio
async def test_agent_tools_rest_endpoints(db_session):
    """
    Verifies agent tool listing and execution via REST API endpoints.
    """
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    family_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    family_svc = FamilyService(user_repo, family_repo, consent_repo, event_logger)

    coord = await family_svc.get_or_create_profile(
        iam_subject_id="iam_coord_rest_agent",
        email="coord_rest_agent@kinguardian.com",
        display_name="Maya REST",
        timezone="America/New_York"
    )
    parent = await family_svc.get_or_create_profile(
        iam_subject_id="iam_parent_rest_agent",
        email="parent_rest_agent@kinguardian.com",
        display_name="Arthur REST",
        timezone="Asia/Kolkata"
    )
    family = await family_svc.create_care_circle(coord.id, "REST Circle", "coordinator")
    await family_svc.add_member_to_circle(coord.id, family.id, parent.email, "parent")

    subject = await family_svc.add_care_subject(
        requester_id=coord.id,
        family_id=family.id,
        fhir_patient_id="fhir-pat-rest-1",
        profile_id=parent.id,
        relationship_to_coordinator="father"
    )

    app_profile = await db_session.get(AppProfile, coord.id)
    app.dependency_overrides[get_current_user] = lambda: app_profile

    transport = ASGITransport(app=app)
    try:
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # 1. GET /api/v1/agent/tools (Lists available tools for coordinator)
            res_tools = await client.get(f"/api/v1/agent/tools?family_id={family.id}&subject_id={subject.id}")
            assert res_tools.status_code == 200
            tools_list = res_tools.json()
            assert len(tools_list) >= 4
            tool_names = [t["name"] for t in tools_list]
            assert "get_parent_summary" in tool_names
            assert "get_family_members" in tool_names

            # 2. POST /api/v1/agent/tools/execute (Execute get_parent_summary)
            res_exec = await client.post(
                "/api/v1/agent/tools/execute",
                json={
                    "tool_name": "get_parent_summary",
                    "family_id": str(family.id),
                    "subject_id": str(subject.id)
                }
            )
            assert res_exec.status_code == 200
            data_exec = res_exec.json()
            assert data_exec["success"] is True
            assert data_exec["data"]["display_name"] == "Arthur REST"

            # 3. POST /api/v1/agent/query (Query bezs-agent runtime)
            res_query = await client.post(
                "/api/v1/agent/query",
                json={
                    "query": "How is my father doing with his daily medications?",
                    "parent_id": str(subject.id),
                    "family_id": str(family.id)
                }
            )
            assert res_query.status_code == 200
            data_query = res_query.json()
            assert "response" in data_query
            assert "session_id" in data_query
    finally:
        app.dependency_overrides.clear()
