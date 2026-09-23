"""
AI Source Transparency Test Suite.

Verifies:
1. Single-source wearable attribution:
   Based on:
   Garmin
   Aug 1–22
   21 days of activity data

2. Multi-source cross-domain attribution:
   Based on:
   Garmin activity
   Apple Health sleep
   Medication records
   Parent check-ins

3. Integration with WearableGuardianMoment, MultiSourceCorrelationResult, and ActivityTrendStrategy.
"""

import uuid
import pytest

from app.domains.insights.transparency import (
    AISourceTransparency,
    SourceAttributionItem
)
from app.domains.wearables.domain.entities import WearableGuardianMoment
from app.domains.insights.correlation import (
    MultiSourceHealthContext,
    MultiSourceCorrelationEngine,
    MultiSourceCorrelationResult
)
from app.domains.insights.strategies import ActivityTrendStrategy


def test_single_source_transparency_formatting():
    """
    Verifies single-source attribution format:
    Based on:
    Garmin
    Aug 1–22
    21 days of activity data
    """
    transparency = AISourceTransparency.create_single_source(
        provider="Garmin",
        category="activity",
        date_range="Aug 1–22",
        data_summary="21 days of activity data"
    )

    expected_text = (
        "Based on:\n"
        "Garmin\n"
        "Aug 1–22\n"
        "21 days of activity data"
    )
    assert transparency.format_display_text() == expected_text

    d = transparency.to_dict()
    assert d["source_count"] == 1
    assert d["formatted_text"] == expected_text
    assert d["sources"][0]["provider"] == "Garmin"
    assert d["sources"][0]["date_range"] == "Aug 1–22"


def test_multi_source_transparency_formatting():
    """
    Verifies multi-source attribution format:
    Based on:
    Garmin activity
    Apple Health sleep
    Medication records
    Parent check-ins
    """
    sources = [
        SourceAttributionItem(provider_or_system="Garmin", category="activity"),
        SourceAttributionItem(provider_or_system="Apple Health", category="sleep"),
        SourceAttributionItem(provider_or_system="Medication records", category="medications"),
        SourceAttributionItem(provider_or_system="Parent check-ins", category="checkins")
    ]

    transparency = AISourceTransparency.create_multi_source(sources)

    expected_text = (
        "Based on:\n"
        "Garmin activity\n"
        "Apple Health sleep\n"
        "Medication records\n"
        "Parent check-ins"
    )
    assert transparency.format_display_text() == expected_text

    d = transparency.to_dict()
    assert d["source_count"] == 4
    assert d["formatted_text"] == expected_text
    labels = [s["display_label"] for s in d["sources"]]
    assert labels == [
        "Garmin activity",
        "Apple Health sleep",
        "Medication records",
        "Parent check-ins"
    ]


def test_wearable_guardian_moment_includes_source_transparency():
    """
    Verifies WearableGuardianMoment entity holds and serializes source transparency.
    """
    moment = WearableGuardianMoment(
        id=uuid.uuid4(),
        subject_id=uuid.uuid4(),
        family_id=uuid.uuid4(),
        title="Dad's activity has been below his usual level for 5 days.",
        summary="Dad's activity has been below his usual level for 5 days.\n\nAverage:\n4,520 steps/day\n\n30-day baseline:\n6,210 steps/day",
        current_average=4520.0,
        current_average_label="4,520 steps/day",
        baseline_value=6210.0,
        baseline_label="30-day baseline: 6,210 steps/day",
        actions=["Check in with Dad", "Review trends", "Contact caregiver"],
        timeframe_days=5,
        based_on_text="Based on:\nGarmin\nAug 1–22\n21 days of activity data",
        source_transparency={"provider": "Garmin", "days": 21}
    )

    d = moment.to_dict()
    assert d["based_on"] == "Based on:\nGarmin\nAug 1–22\n21 days of activity data"
    assert d["source_transparency"] == {"provider": "Garmin", "days": 21}


def test_multi_source_correlation_engine_generates_transparency():
    """
    Verifies MultiSourceCorrelationEngine automatically populates based_on_text and source_transparency.
    """
    ctx = MultiSourceHealthContext(
        subject_id=uuid.uuid4(),
        family_id=uuid.uuid4(),
        subject_name="Dad",
        activity_steps_today=4520,
        activity_baseline_steps=6210,
        activity_trend="below",
        sleep_hours_today=5.2,
        sleep_baseline_hours=7.0,
        sleep_trend="below",
        medication_adherence_status="normal",
        latest_checkin_status="Okay"
    )

    res = MultiSourceCorrelationEngine.correlate(ctx)
    assert res.based_on_text is not None
    assert "Garmin activity" in res.based_on_text
    assert "Apple Health sleep" in res.based_on_text
    assert "Medication records" in res.based_on_text
    assert "Parent check-ins" in res.based_on_text


@pytest.mark.asyncio
async def test_activity_trend_strategy_attaches_single_source_transparency():
    """
    Verifies ActivityTrendStrategy attaches single-source transparency.
    """
    strategy = ActivityTrendStrategy()
    observations = [
        {"code": "steps", "value": 4500, "baseline": 6210},
        {"code": "steps", "value": 4450, "baseline": 6210},
        {"code": "steps", "value": 4520, "baseline": 6210},
        {"code": "steps", "value": 4480, "baseline": 6210},
        {"code": "steps", "value": 4510, "baseline": 6210}
    ]

    result = await strategy.analyze(
        subject_id=uuid.uuid4(),
        family_id=uuid.uuid4(),
        observations=observations,
        timeframe_days=5
    )

    assert result is not None
    assert result.based_on is not None
    assert "Based on:\nGarmin\nAug 1–22\n5 days of activity data" in result.based_on
    assert result.source_transparency is not None
    assert result.source_transparency["source_count"] == 1
