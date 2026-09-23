"""
Wearable Agent Tools Test Suite.

Verifies:
1. Registration and execution of all 7 wearable domain tools in ControlledToolRegistry:
   - get_wearable_connections
   - get_wearable_summary
   - get_activity_trend
   - get_sleep_trend
   - get_heart_rate_trend
   - get_metric_history
   - get_wearable_sync_status
2. Strict Security Invariant:
   - raw_database_query is NOT exposed.
   - Unrestricted Open Wearables access is prohibited.
"""

import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock

from app.domains.agent.tools import (
    ControlledToolRegistry,
    AgentToolContext,
    AgentToolResult
)
from app.domains.wearables.gateway import MockWearableDataGateway


@pytest.fixture
def mock_dependencies():
    family_repo = AsyncMock()
    # Mock active membership
    membership = MagicMock()
    membership.status = "active"
    family_repo.get_member.return_value = membership

    dad_profile_id = uuid.uuid4()
    care_subject = MagicMock()
    care_subject.profile_id = dad_profile_id
    care_subject.family_id = uuid.uuid4()
    family_repo.get_care_subject.return_value = care_subject

    consent_repo = AsyncMock()
    consent = MagicMock()
    consent.status = "active"
    consent.expires_at = None
    consent.scope = {"wearables": True}
    consent_repo.get_consent.return_value = consent

    profile_repo = AsyncMock()
    event_logger = AsyncMock()
    wearable_gateway = MockWearableDataGateway()

    registry = ControlledToolRegistry(
        family_repo=family_repo,
        consent_repo=consent_repo,
        profile_repo=profile_repo,
        event_logger=event_logger,
        wearable_gateway=wearable_gateway
    )

    return registry, care_subject



def test_strict_security_invariant_prohibits_raw_database_query(mock_dependencies):
    """
    CRITICAL SECURITY INVARIANT:
    Do not expose raw_database_query or unrestricted Open Wearables access.
    """
    registry, _ = mock_dependencies

    all_tool_names = [tool.name for tool in registry.list_all_tools()]

    # Assert raw database query and raw endpoints are NOT in registry
    assert "raw_database_query" not in all_tool_names
    assert "unrestricted_open_wearables" not in all_tool_names
    assert "raw_sql" not in all_tool_names


@pytest.mark.asyncio
async def test_all_seven_wearable_tools_registered_and_executable(mock_dependencies):
    """
    Verifies that all 7 required wearable tools exist and execute successfully.
    """
    registry, care_subject = mock_dependencies
    actor_id = uuid.uuid4()
    family_id = care_subject.family_id
    subject_id = uuid.uuid4()

    context = AgentToolContext(
        actor_id=actor_id,
        family_id=family_id,
        subject_id=subject_id
    )


    # 1. get_wearable_connections
    res_conns = await registry.execute_tool(
        "get_wearable_connections",
        {"subject_id": str(subject_id)},
        context
    )
    assert res_conns.success is True
    assert "connections" in res_conns.data

    # 2. get_wearable_summary
    res_sum = await registry.execute_tool(
        "get_wearable_summary",
        {"subject_id": str(subject_id)},
        context
    )
    assert res_sum.success is True
    assert "activity" in res_sum.data
    assert "sleep" in res_sum.data

    # 3. get_activity_trend
    res_act = await registry.execute_tool(
        "get_activity_trend",
        {"subject_id": str(subject_id), "window_days": 7},
        context
    )
    assert res_act.success is True
    assert "current_average_steps" in res_act.data
    assert "baseline_steps" in res_act.data

    # 4. get_sleep_trend
    res_slp = await registry.execute_tool(
        "get_sleep_trend",
        {"subject_id": str(subject_id), "window_days": 7},
        context
    )
    assert res_slp.success is True
    assert "current_average_hours" in res_slp.data

    # 5. get_heart_rate_trend
    res_hr = await registry.execute_tool(
        "get_heart_rate_trend",
        {"subject_id": str(subject_id), "window_days": 7},
        context
    )
    assert res_hr.success is True
    assert "resting_heart_rate_bpm" in res_hr.data

    # 6. get_metric_history
    res_hist = await registry.execute_tool(
        "get_metric_history",
        {"subject_id": str(subject_id), "metric_type": "steps", "days": 7},
        context
    )
    assert res_hist.success is True
    assert len(res_hist.data["records"]) == 7

    # 7. get_wearable_sync_status
    res_sync = await registry.execute_tool(
        "get_wearable_sync_status",
        {"subject_id": str(subject_id)},
        context
    )
    assert res_sync.success is True
    assert res_sync.data["is_health_event"] is False
    assert "not a health event" in res_sync.data["safety_notice"].lower()
