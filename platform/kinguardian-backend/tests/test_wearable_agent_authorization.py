"""
Wearable Agent Authorization Test Suite.

Verifies:
1. Every agent tool receives:
   - actor
   - family
   - subject
   - requested scope
2. The tool independently verifies authorization without relying on the LLM.
3. Specific user scenario:
   - Rahul is granted: `view_wearable_summary`
   - Rahul is NOT granted: `view_wearable_sleep` or `view_wearable_raw_metrics`
   - Rahul executes `get_wearable_summary` -> SUCCESS (200 / True)
   - Rahul executes `get_sleep_trend` -> AUTHORIZATION DENIED (False / 403)
   - Rahul executes `get_metric_history` -> AUTHORIZATION DENIED (False / 403)
"""

import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock

from app.domains.agent.tools import (
    ControlledToolRegistry,
    AgentToolContext,
    AgentToolResult
)
from app.domains.wearables.domain.consent_scopes import WearableConsentScope
from app.domains.wearables.gateway import MockWearableDataGateway


@pytest.fixture
def authorization_test_environment():
    family_repo = AsyncMock()
    family_id = uuid.uuid4()
    rahul_actor_id = uuid.uuid4()
    dad_subject_id = uuid.uuid4()
    dad_profile_id = uuid.uuid4()

    # Active family membership for Rahul
    membership = MagicMock()
    membership.status = "active"
    family_repo.get_member.return_value = membership

    # Dad as Care Subject
    care_subject = MagicMock()
    care_subject.id = dad_subject_id
    care_subject.profile_id = dad_profile_id
    care_subject.family_id = family_id
    family_repo.get_care_subject.return_value = care_subject

    # Consent Repository: Dad grants Rahul ONLY view_wearable_summary
    consent_repo = AsyncMock()
    consent = MagicMock()
    consent.status = "active"
    consent.expires_at = None
    consent.scope = {
        WearableConsentScope.VIEW_WEARABLE_SUMMARY.value: True,
        WearableConsentScope.VIEW_WEARABLE_SLEEP.value: False,
        WearableConsentScope.VIEW_WEARABLE_RAW_METRICS.value: False
    }
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

    return {
        "registry": registry,
        "family_id": family_id,
        "rahul_actor_id": rahul_actor_id,
        "dad_subject_id": dad_subject_id
    }


@pytest.mark.asyncio
async def test_tool_receives_actor_family_subject_scope_and_independently_authorizes(authorization_test_environment):
    """
    Verifies that every tool receives (actor, family, subject, requested_scope)
    and independently verifies authorization.
    """
    env = authorization_test_environment
    registry = env["registry"]

    # 1. Rahul executes get_wearable_summary with requested_scope='view_wearable_summary'
    context_summary = AgentToolContext(
        actor_id=env["rahul_actor_id"],
        family_id=env["family_id"],
        subject_id=env["dad_subject_id"],
        requested_scope=WearableConsentScope.VIEW_WEARABLE_SUMMARY.value
    )

    res_summary: AgentToolResult = await registry.execute_tool(
        "get_wearable_summary",
        {"subject_id": str(env["dad_subject_id"])},
        context_summary
    )

    # SUCCESS: Rahul has view_wearable_summary
    assert res_summary.success is True
    assert res_summary.data is not None
    assert "activity" in res_summary.data


@pytest.mark.asyncio
async def test_tool_independently_blocks_unauthorized_scope_without_llm_discretion(authorization_test_environment):
    """
    CRITICAL INVARIANT: The LLM does NOT decide access.
    Rahul attempting to access raw sleep or metric history is deterministically denied.
    """
    env = authorization_test_environment
    registry = env["registry"]

    # 2. Rahul attempts to call get_sleep_trend
    context_sleep = AgentToolContext(
        actor_id=env["rahul_actor_id"],
        family_id=env["family_id"],
        subject_id=env["dad_subject_id"],
        requested_scope=WearableConsentScope.VIEW_WEARABLE_SLEEP.value
    )

    res_sleep: AgentToolResult = await registry.execute_tool(
        "get_sleep_trend",
        {"subject_id": str(env["dad_subject_id"]), "window_days": 7},
        context_sleep
    )

    # BLOCKED DETERMINISTICALLY BY TOOL
    assert res_sleep.success is False
    assert "Authorization Denied" in res_sleep.error
    assert res_sleep.data is None

    # 3. Rahul attempts to call get_metric_history
    context_history = AgentToolContext(
        actor_id=env["rahul_actor_id"],
        family_id=env["family_id"],
        subject_id=env["dad_subject_id"],
        requested_scope=WearableConsentScope.VIEW_WEARABLE_RAW_METRICS.value
    )

    res_hist: AgentToolResult = await registry.execute_tool(
        "get_metric_history",
        {"subject_id": str(env["dad_subject_id"]), "metric_type": "steps"},
        context_history
    )

    # BLOCKED DETERMINISTICALLY BY TOOL
    assert res_hist.success is False
    assert "Authorization Denied" in res_hist.error
    assert res_hist.data is None
