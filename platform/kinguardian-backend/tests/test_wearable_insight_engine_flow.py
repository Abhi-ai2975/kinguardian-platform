"""
Wearable Insight Engine Pipeline Test Suite.

Verifies the unified architectural flow:
Open Wearables
      ↓
Normalized wearable data (WearableMetricNormalizer)
      ↓
Trend/Baseline Engine (ActivityTrendStrategy, SleepTrendStrategy, WearableCardiovascularTrendStrategy)
      ↓
KinGuardian Insight Engine (InsightEngine)
      ↓
AI explanation (observation, recommendation, baseline_comparison)
      ↓
Guardian Moment (type="guardian_moment", domain event)
"""

import pytest
import uuid
from datetime import datetime, timezone, timedelta

from unittest.mock import AsyncMock, MagicMock
from app.domains.wearables.domain.normalizer import WearableMetricNormalizer
from app.domains.insights.engine import InsightEngine
from app.domains.family.domain.interfaces import IFamilyRepository, IEventLogger
from app.domains.family.domain.entities import AIInsightEntity



@pytest.mark.asyncio
async def test_wearable_data_feeds_insight_engine_to_guardian_moment():
    """
    Verifies full lifecycle:
    Open Wearables raw telemetry -> Normalization -> Trend Engine -> Insight Engine -> Guardian Moment
    """
    subject_id = uuid.uuid4()
    family_id = uuid.uuid4()

    # 1. Step 1: Raw Open Wearables data stream (e.g. 5 days of decreasing step count for Ramesh)
    raw_wearable_stream = [
        {"provider": "Garmin", "metric": "steps", "value": 1800, "measured_at": "2026-08-23", "device": "Garmin Venu 3"},
        {"provider": "Garmin", "metric": "steps", "value": 2100, "measured_at": "2026-08-24", "device": "Garmin Venu 3"},
        {"provider": "Garmin", "metric": "steps", "value": 1950, "measured_at": "2026-08-25", "device": "Garmin Venu 3"},
        {"provider": "Garmin", "metric": "steps", "value": 1600, "measured_at": "2026-08-26", "device": "Garmin Venu 3"},
        {"provider": "Garmin", "metric": "steps", "value": 1450, "measured_at": "2026-08-27", "device": "Garmin Venu 3"},
    ]

    # 2. Step 2: Normalize into KinGuardian WearableMetric domain representations
    normalized_metrics = WearableMetricNormalizer.normalize_batch(
        subject_id=subject_id,
        raw_measurements=raw_wearable_stream,
        local_timezone="Asia/Kolkata"
    )
    assert len(normalized_metrics) == 5
    for m in normalized_metrics:
        assert m.unit == "count"
        assert m.measured_at_utc.tzinfo == timezone.utc

    # 3. Step 3 & 4: Feed directly into the existing KinGuardian Insight Engine (NO separate AI engine)
    family_repo = MagicMock(spec=IFamilyRepository)
    created_insights_store: list[AIInsightEntity] = []

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

        created_insights_store.append(insight)
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

    insight_engine = InsightEngine(family_repo=family_repo, event_logger=event_logger)

    insights = await insight_engine.process_wearable_metrics(
        subject_id=subject_id,
        family_id=family_id,
        metrics=normalized_metrics,
        timeframe_days=7
    )

    # 4. Step 5 & 6: Verify AI Explanation & Guardian Moment Generation
    assert len(insights) >= 1
    guardian_moment = insights[0]
    assert guardian_moment.type == "guardian_moment"
    assert guardian_moment.severity == "warning"
    assert "activity has been below" in guardian_moment.title.lower()


    # AI Explanation attributes
    assert guardian_moment.observation is not None
    assert guardian_moment.recommendation is not None
    assert guardian_moment.baseline_comparison is not None
    assert guardian_moment.confidence >= 0.90

    # 5. Verify Domain Event Emission (Decoupled trigger for coordinator notification)
    assert len(logged_events) >= 1
    event = logged_events[0]
    assert event["event_type"] == "guardian_moment_created"
    assert event["payload"]["title"] == guardian_moment.title
    assert event["payload"]["severity"] == "warning"

