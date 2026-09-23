"""
Multi-Source Correlation Test Suite.

Verifies:
1. Cross-domain health signal correlation across:
   - Wearable activity & sleep
   - Medication adherence
   - Care-subject check-ins
   - Clinical appointments
   - Symptoms
   - Clinical observations
   - Caregiver reports
2. Exact user prompt example:
   - Activity: ↓
   - Sleep: ↓
   - Parent check-in: "Okay"
   - Medication adherence: "normal"
   -> Synthesized AI Narrative: "Dad's activity and sleep are lower than usual, but he reported feeling okay today."
3. MultiSourceCorrelationEngine & MultiSourceCorrelationStrategy integration with InsightEngine.
"""

import uuid
import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

from app.domains.insights.correlation import (
    MultiSourceHealthContext,
    MultiSourceCorrelationEngine,
    MultiSourceCorrelationResult
)
from app.domains.insights.strategies import MultiSourceCorrelationStrategy
from app.domains.insights.engine import InsightEngine
from app.domains.family.domain.interfaces import IFamilyRepository, IEventLogger
from app.domains.family.domain.entities import AIInsightEntity


def test_dads_activity_sleep_checkin_medication_correlation():
    """
    Exact prompt verification:
    Activity ↓
    Sleep ↓
    Parent check-in = "Okay"
    Medication adherence = normal

    Expected narrative:
    "Dad's activity and sleep are lower than usual, but he reported feeling okay today."
    """
    subject_id = uuid.uuid4()
    family_id = uuid.uuid4()

    ctx = MultiSourceHealthContext(
        subject_id=subject_id,
        family_id=family_id,
        subject_name="Dad",
        # Wearable data
        activity_steps_today=4520,
        activity_baseline_steps=6210,
        activity_trend="below",
        sleep_hours_today=5.2,
        sleep_baseline_hours=7.0,
        sleep_trend="below",
        # Check-in
        latest_checkin_status="Okay",
        latest_checkin_notes="Ramesh mentioned he had a quiet morning at home.",
        # Medication Adherence
        medication_adherence_status="normal",
        medications_taken_count=3,
        medications_scheduled_count=3,
        # Appointments & Symptoms
        upcoming_appointments=[{"doctor": "Dr. V. Rao", "specialty": "Cardiology"}],
        reported_symptoms=[]
    )

    result: MultiSourceCorrelationResult = MultiSourceCorrelationEngine.correlate(ctx)

    # 1. Verification of AI communication narrative
    assert result.narrative_summary == "Dad's activity and sleep are lower than usual, but he reported feeling okay today."

    # 2. Detailed observation & actions
    assert "medication adherence" in result.observation.lower()
    assert "positive self-report ('okay')" in result.observation.lower()
    assert result.severity == "attention"
    assert result.actions == [
        "Check in with Dad",
        "Review trends",
        "Contact caregiver"
    ]


@pytest.mark.asyncio
async def test_multi_source_correlation_strategy_in_insight_engine():
    """
    Verifies that MultiSourceCorrelationStrategy executes inside the InsightEngine
    and emits domain events with the synthesized multi-source narrative.
    """
    subject_id = uuid.uuid4()
    family_id = uuid.uuid4()

    observations = [
        # Wearable activity (5 days lower than baseline)
        {"code": "steps", "value": 4520, "baseline": 6210},
        {"code": "steps", "value": 4480, "baseline": 6210},
        {"code": "steps", "value": 4600, "baseline": 6210},
        # Wearable sleep (5.2 hours)
        {"code": "sleep_duration", "value": 5.2, "baseline": 7.0},
        {"code": "sleep_duration", "value": 5.1, "baseline": 7.0},
        # Medication adherence
        {"code": "medication_adherence", "value": "normal", "status": "normal"},
        # Parent checkin
        {"code": "parent_checkin", "value": "Okay", "response": "Okay"}
    ]

    family_repo = MagicMock(spec=IFamilyRepository)
    created_insights: list[AIInsightEntity] = []

    async def mock_add_ai_insight(**kwargs):
        insight = AIInsightEntity(
            id=uuid.uuid4(),
            family_id=kwargs["family_id"],
            subject_id=kwargs["subject_id"],
            type=kwargs["type"],
            severity=kwargs["severity"],
            title=kwargs["title"],
            summary=kwargs["summary"],
            observation=kwargs["observation"],
            recommendation=kwargs.get("recommendation"),
            timeframe_start=kwargs["timeframe_start"],
            timeframe_end=kwargs["timeframe_end"],
            confidence=kwargs["confidence"],
            status=kwargs["status"],
            generated_by=kwargs["generated_by"],
            baseline_comparison=kwargs.get("baseline_comparison"),
            actionability=kwargs.get("actionability"),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        created_insights.append(insight)
        return insight

    family_repo.add_ai_insight = AsyncMock(side_effect=mock_add_ai_insight)
    family_repo.add_ai_insight_source = AsyncMock()

    event_logger = MagicMock(spec=IEventLogger)
    logged_events: list[dict] = []

    async def mock_log_event(care_circle_id, event_type, payload, aggregate_type, aggregate_id):
        logged_events.append({
            "care_circle_id": care_circle_id,
            "event_type": event_type,
            "payload": payload,
            "aggregate_type": aggregate_type,
            "aggregate_id": aggregate_id
        })

    event_logger.log_event = AsyncMock(side_effect=mock_log_event)

    strategy = MultiSourceCorrelationStrategy()
    insight_engine = InsightEngine(
        family_repo=family_repo,
        event_logger=event_logger,
        strategies=[strategy]
    )

    insights = await insight_engine.analyze_and_generate_insights(
        subject_id=subject_id,
        family_id=family_id,
        observations=observations,
        timeframe_days=7
    )

    assert len(insights) == 1
    corr_insight = insights[0]
    assert corr_insight.summary == "Dad's activity and sleep are lower than usual, but he reported feeling okay today."
    assert "Activity & Sleep vs Daily Check-in" in corr_insight.title

    # Verify event emission
    assert len(logged_events) == 1
    assert logged_events[0]["payload"]["summary"] == "Dad's activity and sleep are lower than usual, but he reported feeling okay today."
