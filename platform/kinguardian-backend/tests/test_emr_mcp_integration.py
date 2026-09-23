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
from app.domains.agent.mcp.server import (
    KinGuardianEMRMCPBridge,
    MCPToolCallRequest,
    FORBIDDEN_RAW_DB_TOOLS
)


@pytest.mark.asyncio
async def test_mcp_raw_db_operations_strictly_blocked(db_session):
    """
    Verifies that raw database execution tools (e.g. execute_sql, run_query) are
    strictly blocked by the MCP bridge and never exposed to the agent.
    """
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    family_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    family_svc = FamilyService(user_repo, family_repo, consent_repo, event_logger)

    coord = await family_svc.get_or_create_profile(
        iam_subject_id="iam_coord_mcp",
        email="coord_mcp@kinguardian.com",
        display_name="Sarah MCP",
        timezone="America/New_York"
    )
    family = await family_svc.create_care_circle(coord.id, "MCP Circle", "coordinator")

    bridge = KinGuardianEMRMCPBridge(
        family_repo=family_repo,
        consent_repo=consent_repo,
        profile_repo=user_repo,
        event_logger=event_logger
    )

    # 1. Verify registered MCP tools DO NOT include any raw DB tools
    definitions = bridge.get_tool_definitions()
    tool_names = [t.name for t in definitions]
    for bad_tool in FORBIDDEN_RAW_DB_TOOLS:
        assert bad_tool not in tool_names

    # 2. Attempt to execute execute_sql -> MUST BE REJECTED
    bad_call = MCPToolCallRequest(
        name="execute_sql",
        arguments={"query": "SELECT * FROM users"},
        family_id=family.id
    )
    res = await bridge.execute_mcp_tool(coord.id, bad_call)
    assert res.success is False
    assert res.is_error is True
    assert "Security Policy Violation" in res.error
    assert "strictly forbidden" in res.error

    # 3. Attempt other variations (e.g. raw_query, run_sql)
    for bad_tool in ["run_sql", "raw_query", "db_exec"]:
        res_bad = await bridge.execute_mcp_tool(coord.id, MCPToolCallRequest(name=bad_tool, family_id=family.id))
        assert res_bad.success is False
        assert res_bad.is_error is True


@pytest.mark.asyncio
async def test_mcp_business_safe_tools_and_rest_endpoints(db_session):
    """
    Verifies execution of business-safe MCP tools (e.g. get_parent_health_summary) via REST API.
    """
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    family_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    family_svc = FamilyService(user_repo, family_repo, consent_repo, event_logger)

    coord = await family_svc.get_or_create_profile(
        iam_subject_id="iam_coord_mcp_rest",
        email="coord_mcp_rest@kinguardian.com",
        display_name="Dr. Lisa Coordinator",
        timezone="America/Los_Angeles"
    )
    parent = await family_svc.get_or_create_profile(
        iam_subject_id="iam_parent_mcp_rest",
        email="parent_mcp_rest@kinguardian.com",
        display_name="George Senior",
        timezone="Asia/Kolkata"
    )
    family = await family_svc.create_care_circle(coord.id, "George Care Group", "coordinator")
    await family_svc.add_member_to_circle(coord.id, family.id, parent.email, "parent")

    subject = await family_svc.add_care_subject(
        requester_id=coord.id,
        family_id=family.id,
        fhir_patient_id="fhir-pat-mcp-99",
        profile_id=parent.id,
        relationship_to_coordinator="father"
    )

    # Seed data
    await family_svc.record_adherence_event(
        requester_id=parent.id,
        family_id=family.id,
        subject_id=subject.id,
        fhir_medication_request_id="rx-mcp-1",
        scheduled_at=datetime.now(),
        status="taken",
        source="parent"
    )
    await family_svc.add_care_task(
        requester_id=coord.id,
        family_id=family.id,
        subject_id=subject.id,
        assigned_to_profile_id=coord.id,
        title="Check post-meal blood sugar",
        description="Daily monitoring",
        category="medication",
        priority="high",
        due_at=datetime.now() + timedelta(days=1)
    )

    # Grant consent for coordinator
    await family_svc.create_consent(
        requester_id=parent.id,
        family_id=family.id,
        subject_id=subject.id,
        grantee_id=coord.id,
        scope={"vitals": True, "medications": True, "adherence": True}
    )

    app_profile = await db_session.get(AppProfile, coord.id)
    app.dependency_overrides[get_current_user] = lambda: app_profile

    transport = ASGITransport(app=app)
    try:
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # 1. POST /api/v1/mcp/tools/list (Lists business-safe MCP tools)
            res_list = await client.post("/api/v1/mcp/tools/list")
            assert res_list.status_code == 200
            tools = res_list.json()
            tool_names = [t["name"] for t in tools]
            assert "get_parent_health_summary" in tool_names
            assert "get_emr_patient_vitals" in tool_names
            assert "execute_sql" not in tool_names

            # 2. POST /api/v1/mcp/tools/call (Call get_parent_health_summary)
            res_call = await client.post(
                "/api/v1/mcp/tools/call",
                json={
                    "name": "get_parent_health_summary",
                    "family_id": str(family.id),
                    "subject_id": str(subject.id),
                    "arguments": {"subject_id": str(subject.id)}
                }
            )
            assert res_call.status_code == 200
            data_call = res_call.json()
            assert data_call["success"] is True
            assert data_call["is_error"] is False
            assert len(data_call["content"]) >= 1

            # 3. Call forbidden tool via REST -> Rejected with Security Policy Violation
            res_bad = await client.post(
                "/api/v1/mcp/tools/call",
                json={
                    "name": "execute_sql",
                    "family_id": str(family.id),
                    "arguments": {"query": "DROP TABLE users;"}
                }
            )
            assert res_bad.status_code == 200
            data_bad = res_bad.json()
            assert data_bad["success"] is False
            assert data_bad["is_error"] is True
            assert "Security Policy Violation" in data_bad["error"]
    finally:
        app.dependency_overrides.clear()
