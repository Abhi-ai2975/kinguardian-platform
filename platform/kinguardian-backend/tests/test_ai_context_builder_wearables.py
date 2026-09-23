"""
AI Context Builder Wearables Relevance & Data Minimization Test Suite.

Verifies:
1. When user asks: "How active has Dad been this month?"
   - Included: activity, steps, baseline, trend, device/source, parent_summary
   - Excluded / NOT included:
     * unrelated medical records (medications, labs, recent_observations)
     * unrelated family members
     * private documents
     * unnecessary raw time-series data
2. Data minimization engine precision (infer_dimensions_from_query).
3. AIScopedContextPayload prompt serialization adhering strictly to privacy boundary.
"""

import uuid
import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

from app.domains.agent.context_builder import (
    AIContextBuilder,
    infer_dimensions_from_query,
    AIScopedContextPayload
)
from app.domains.wearables.schemas import (
    WearableActivitySummary,
    WearableSleepSummary,
    WearableRecoverySummary
)



def test_infer_dimensions_for_activity_query():
    """
    Verifies that 'How active has Dad been this month?' infers ONLY wearables and parent_summary.
    """
    query = "How active has Dad been this month?"
    inferred = infer_dimensions_from_query(query)

    # Must include
    assert "wearables" in inferred
    assert "parent_summary" in inferred

    # Must NOT include unrelated clinical dimensions
    assert "medications" not in inferred
    assert "labs" not in inferred
    assert "documents" not in inferred
    assert "appointments" not in inferred
    assert "recent_observations" not in inferred
    assert "family_profile" not in inferred


@pytest.mark.asyncio
async def test_ai_context_builder_builds_scoped_wearable_context_for_activity():
    """
    Verifies build_scoped_context for 'How active has Dad been this month?'
    ensuring only activity, steps, baseline, trend, and device/source are populated.
    """
    subject_id = uuid.uuid4()
    family_id = uuid.uuid4()
    requester_id = uuid.uuid4()

    session = MagicMock()
    builder = AIContextBuilder(session=session)

    # 1. Mock Family & Member
    mock_family = MagicMock()
    mock_family.id = family_id
    mock_family.name = "Ramesh Family"
    mock_family.family_name = "Ramesh Family"
    mock_family.primary_coordinator_profile_id = requester_id
    builder.family_repo.get_by_id = AsyncMock(return_value=mock_family)
    builder.family_repo.list_members = AsyncMock(return_value=[MagicMock(id=uuid.uuid4())])


    mock_membership = MagicMock()
    mock_membership.status = "active"
    mock_membership.membership_role = "coordinator"
    mock_membership.role = "coordinator"
    builder.family_repo.get_member = AsyncMock(return_value=mock_membership)


    mock_requester_profile = MagicMock()
    mock_requester_profile.id = requester_id
    mock_requester_profile.display_name = "Anjali"
    mock_requester_profile.timezone = "Europe/London"
    mock_requester_profile.email = "anjali@example.com"
    builder.profile_repo.get_by_id = AsyncMock(return_value=mock_requester_profile)

    # 2. Mock Subject & Consent
    mock_subject = MagicMock()
    mock_subject.id = subject_id
    mock_subject.family_id = family_id
    mock_subject.profile_id = uuid.uuid4()
    mock_subject.relationship_to_coordinator = "Father"
    mock_subject.city = "Chennai"
    mock_subject.country_code = "IN"
    mock_subject.timezone = "Asia/Kolkata"
    mock_subject.fhir_patient_id = "pat_ramesh_001"
    mock_subject.status = "active"
    builder.family_repo.get_care_subject = AsyncMock(return_value=mock_subject)
    builder.family_repo.list_care_subjects = AsyncMock(return_value=[mock_subject])

    # Consent grant includes wearables
    mock_consent = MagicMock()
    mock_consent.scope = {"wearables": True, "vitals": True, "medications": True, "documents": True}
    mock_consent.status = "active"
    mock_consent.expires_at = None
    builder.consent_repo.get_effective_consent = AsyncMock(return_value=mock_consent)
    builder.consent_repo.get_consent = AsyncMock(return_value=mock_consent)



    # 3. Mock Wearables Gateway (30 days of data averaging ~4,520 steps vs 6,210 baseline)
    mock_activities = [
        WearableActivitySummary(
            date=f"2026-08-{i:02d}",
            steps=4520 if i < 30 else 4500,
            active_duration_minutes=42,
            distance_meters=3400.0,
            calories_burned_kcal=320.0,
            source_provider="Garmin Venu 3"
        )
        for i in range(1, 31)
    ]

    # Set historical baseline to 6,210
    for idx in range(10):
        mock_activities[idx].steps = 6210

    builder.wearable_gateway.get_activity_summaries = AsyncMock(return_value=mock_activities)
    builder.wearable_gateway.get_sleep_summaries = AsyncMock(return_value=[])
    builder.wearable_gateway.get_recovery_summaries = AsyncMock(return_value=[])

    # 4. Build Scoped Context with user query
    user_query = "How active has Dad been this month?"
    context_payload: AIScopedContextPayload = await builder.build_scoped_context(
        requester_id=requester_id,
        family_id=family_id,
        subject_ids=[subject_id],
        user_query=user_query
    )

    # Verification: Exactly 1 subject (Dad), no other family members
    assert len(context_payload.subjects) == 1
    subject_ctx = context_payload.subjects[0]
    assert subject_ctx.subject_id == subject_id
    assert subject_ctx.relationship == "Father"

    # Verification: Included Data Dimensions
    assert subject_ctx.wearables is not None
    wearable_info = subject_ctx.wearables
    assert "activity" in wearable_info
    assert "steps" in wearable_info
    assert "baseline" in wearable_info
    assert "trend" in wearable_info
    assert "device_source" in wearable_info
    assert wearable_info["device_source"] == "Garmin Venu 3"
    assert wearable_info["baseline"]["window_days"] == 30

    # Verification: Excluded Data Dimensions (Data Minimization)
    assert subject_ctx.medications is None
    assert subject_ctx.labs is None
    assert subject_ctx.documents is None
    assert subject_ctx.appointments is None
    assert subject_ctx.recent_observations is None

    # Prompt rendering verification
    prompt_text = context_payload.to_prompt_context()
    assert "Wearable Telemetry & Activity" in prompt_text
    assert "Garmin Venu 3" in prompt_text
    assert "Activity (Steps)" in prompt_text
    assert "Active Medications" not in prompt_text
    assert "Diagnostic Lab Results" not in prompt_text
    assert "Health Documents" not in prompt_text
