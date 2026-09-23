"""
Wearable Guardian Moments Test Suite.

Verifies:
1. Exact prompt format and presentation:
   - Title: "Dad's activity has been below his usual level for 5 days."
   - Average: 4,520 steps/day
   - 30-day baseline: 6,210 steps/day
   - Actions:
     - Check in with Dad
     - Review trends
     - Contact caregiver
2. Invariant: Do not automatically interpret decreased activity as illness.
3. Integration with ActivityTrendStrategy and WearableGuardianMoment entity.
"""

import uuid
import pytest
from datetime import datetime, timezone

from app.domains.wearables.domain.entities import WearableGuardianMoment
from app.domains.insights.strategies import ActivityTrendStrategy, TrendAnalysisResult


def test_wearable_guardian_moment_entity_structure():
    """
    Verifies the structured WearableGuardianMoment data model.
    """
    subject_id = uuid.uuid4()
    family_id = uuid.uuid4()

    moment = WearableGuardianMoment(
        id=uuid.uuid4(),
        subject_id=subject_id,
        family_id=family_id,
        title="Dad's activity has been below his usual level for 5 days.",
        summary=(
            "Dad's activity has been below his usual level for 5 days.\n\n"
            "Average:\n4,520 steps/day\n\n"
            "30-day baseline:\n6,210 steps/day"
        ),
        current_average=4520.0,
        current_average_label="4,520 steps/day",
        baseline_value=6210.0,
        baseline_label="30-day baseline: 6,210 steps/day",
        actions=[
            "Check in with Dad",
            "Review trends",
            "Contact caregiver"
        ],
        timeframe_days=5,
        metric_name="steps",
        unit="steps/day"
    )

    d = moment.to_dict()
    assert d["type"] == "guardian_moment"
    assert d["title"] == "Dad's activity has been below his usual level for 5 days."
    assert d["average"] == "4,520 steps/day"
    assert d["baseline"] == "30-day baseline: 6,210 steps/day"
    assert d["actions"] == [
        "Check in with Dad",
        "Review trends",
        "Contact caregiver"
    ]
    assert d["timeframe_days"] == 5


@pytest.mark.asyncio
async def test_activity_trend_strategy_generates_guardian_moment():
    """
    Verifies that ActivityTrendStrategy generates the exact Guardian Moment with actions
    and adheres to the non-diagnostic invariant (not assuming illness).
    """
    subject_id = uuid.uuid4()
    family_id = uuid.uuid4()

    # 5 days of 4,520 steps/day against 6,210 baseline
    observations = [
        {"code": "steps", "value": 4520, "baseline": 6210, "date": "2026-08-23"},
        {"code": "steps", "value": 4520, "baseline": 6210, "date": "2026-08-24"},
        {"code": "steps", "value": 4520, "baseline": 6210, "date": "2026-08-25"},
        {"code": "steps", "value": 4520, "baseline": 6210, "date": "2026-08-26"},
        {"code": "steps", "value": 4520, "baseline": 6210, "date": "2026-08-27"},
    ]

    strategy = ActivityTrendStrategy()
    result: TrendAnalysisResult | None = await strategy.analyze(
        subject_id=subject_id,
        family_id=family_id,
        observations=observations,
        timeframe_days=5
    )

    assert result is not None
    assert result.detected is True
    assert result.type == "guardian_moment"

    # Title verification
    assert result.title == "Dad's activity has been below his usual level for 5 days."

    # Summary and baseline comparison verification
    assert "4,520 steps/day" in result.summary
    assert "6,210 steps/day" in result.summary
    assert result.baseline_comparison == "30-day baseline: 6,210 steps/day"

    # Actions list verification
    assert result.actions == [
        "Check in with Dad",
        "Review trends",
        "Contact caregiver"
    ]

    # Non-diagnostic invariant check (Must NOT declare Dad is sick or diseased)
    obs_text = result.observation.lower()
    assert "not be automatically interpreted as illness" in obs_text
    assert "infection" not in obs_text
    assert "heart failure" not in obs_text
    assert "disease" not in obs_text
