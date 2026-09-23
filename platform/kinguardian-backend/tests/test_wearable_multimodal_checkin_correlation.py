"""
Multimodal Wearable + Parent Check-in Correlation Test Suite.

Verifies:
1. Multimodal correlation between objective wearable metrics and subjective parent check-in responses.
2. Exact user scenario:
   Wearable: activity lower than baseline
   Parent: "Feeling okay"
   KinGuardian: No urgent signal. Continue monitoring.
3. Invariant: Produces a contextual insight rather than a medical diagnosis.
"""

import uuid
import pytest

from app.domains.wearables.domain.multimodal_checkin_correlation import (
    MultimodalCorrelationAssessment,
    MultimodalWearableCheckinCorrelator
)


def test_wearable_activity_lower_plus_parent_feeling_okay_produces_contextual_insight():
    """
    Scenario directly from user request:
    Wearable: activity lower than baseline
    Parent: "Feeling okay"
    KinGuardian: No urgent signal. Continue monitoring.
    Guarantee: Contextual insight, NOT a medical diagnosis.
    """
    subject_id = uuid.uuid4()

    assessment: MultimodalCorrelationAssessment = MultimodalWearableCheckinCorrelator.correlate(
        subject_id=subject_id,
        subject_name="Dad",
        activity_lower_than_baseline=True,
        parent_checkin_text="Feeling okay",
        steps_today=5430,
        baseline_steps=6210
    )

    # 1. Verification of Non-Urgent Signal
    assert assessment.is_urgent is False

    # 2. Verification of Contextual Action (Continue monitoring)
    assert assessment.recommended_action == "Continue monitoring."
    assert "No urgent signal. Continue monitoring." in assessment.narrative

    # 3. Verification of Contextual Insight vs Medical Diagnosis
    assert assessment.is_diagnosis is False
    assert assessment.insight_type == "contextual_insight"
    assert assessment.wearable_finding == "activity lower than baseline"
    assert assessment.parent_checkin_status == "Feeling okay"
    assert "activity is lower than usual, but reported feeling okay" in assessment.headline


def test_positive_checkin_variations_suppress_alarmism():
    """
    Verifies that variations like 'doing well', 'feeling good', 'fine' similarly yield
    non-alarmist contextual monitoring insights.
    """
    subject_id = uuid.uuid4()

    for phrase in ["Doing well", "Feeling good", "Fine", "ok"]:
        res = MultimodalWearableCheckinCorrelator.correlate(
            subject_id=subject_id,
            subject_name="Dad",
            activity_lower_than_baseline=True,
            parent_checkin_text=phrase
        )
        assert res.is_urgent is False
        assert res.is_diagnosis is False
        assert res.recommended_action == "Continue monitoring."
