"""
Wearable AI Questions Test Suite.

Verifies accurate classification and empathetic, non-alarmist synthesis for
all standard wearable queries requested by users:

Coordinator Mode:
1. "How active has Dad been this month?"
2. "Has Dad's sleep changed recently?"
3. "Is Dad getting less active?"
4. "What changed in Dad's health this week?"

Parent Mode:
1. "How did I sleep last night?"
2. "How active was I today?"
3. "How has my sleep been this week?"
"""

import pytest
from app.domains.agent.wearable_qa_handler import (
    WearableQueryIntent,
    WearableQAResponse,
    WearableQAEngine
)


def test_coordinator_questions():
    """
    Verifies all 4 Coordinator wearable questions.
    """
    # 1. "How active has Dad been this month?"
    q1 = "How active has Dad been this month?"
    intent1 = WearableQAEngine.classify_intent(q1, user_role="coordinator")
    assert intent1 == WearableQueryIntent.COORDINATOR_MONTHLY_ACTIVITY

    res1: WearableQAResponse = WearableQAEngine.answer_question(
        query=q1,
        user_role="coordinator",
        subject_name="Dad",
        wearable_telemetry={"monthly_average_steps": 5840, "baseline_steps": 6200, "active_days_count": 26}
    )
    assert "Dad averaged 5,840 steps per day" in res1.answer_text
    assert res1.primary_metric == "steps"

    # 2. "Has Dad's sleep changed recently?"
    q2 = "Has Dad's sleep changed recently?"
    intent2 = WearableQAEngine.classify_intent(q2, user_role="coordinator")
    assert intent2 == WearableQueryIntent.COORDINATOR_RECENT_SLEEP_CHANGE

    res2: WearableQAResponse = WearableQAEngine.answer_question(
        query=q2,
        user_role="coordinator",
        subject_name="Dad",
        wearable_telemetry={"recent_sleep_hours": 6.7, "baseline_sleep_hours": 7.3}
    )
    assert "Dad's sleep has been slightly shorter" in res2.answer_text
    assert "6h 42m" in res2.answer_text
    assert res2.primary_metric == "sleep_duration"

    # 3. "Is Dad getting less active?"
    q3 = "Is Dad getting less active?"
    intent3 = WearableQAEngine.classify_intent(q3, user_role="coordinator")
    assert intent3 == WearableQueryIntent.COORDINATOR_ACTIVITY_DECLINE

    res3: WearableQAResponse = WearableQAEngine.answer_question(
        query=q3,
        user_role="coordinator",
        subject_name="Dad",
        wearable_telemetry={"today_steps": 5430, "baseline_steps": 6210}
    )
    assert "5,430 steps today" in res3.answer_text
    assert res3.primary_metric == "steps"

    # 4. "What changed in Dad's health this week?"
    q4 = "What changed in Dad's health this week?"
    intent4 = WearableQAEngine.classify_intent(q4, user_role="coordinator")
    assert intent4 == WearableQueryIntent.COORDINATOR_WEEKLY_HEALTH_CHANGES

    res4: WearableQAResponse = WearableQAEngine.answer_question(
        query=q4,
        user_role="coordinator",
        subject_name="Dad"
    )
    assert "5,430 steps/day (↓ 12%)" in res4.answer_text
    assert "6h 42m (↓ 36m)" in res4.answer_text
    assert res4.primary_metric == "multi_signal_summary"


def test_parent_questions():
    """
    Verifies all 3 Parent wearable questions.
    """
    # 1. "How did I sleep last night?"
    q1 = "How did I sleep last night?"
    intent1 = WearableQAEngine.classify_intent(q1, user_role="parent")
    assert intent1 == WearableQueryIntent.PARENT_LAST_NIGHT_SLEEP

    res1: WearableQAResponse = WearableQAEngine.answer_question(
        query=q1,
        user_role="parent",
        subject_name="Ramesh",
        wearable_telemetry={"last_night_sleep_display": "7h 12m", "last_night_sleep_score": 84}
    )
    assert "You slept for 7h 12m last night" in res1.answer_text
    assert "84/100" in res1.answer_text
    assert res1.primary_metric == "sleep_duration"

    # 2. "How active was I today?"
    q2 = "How active was I today?"
    intent2 = WearableQAEngine.classify_intent(q2, user_role="parent")
    assert intent2 == WearableQueryIntent.PARENT_TODAY_ACTIVITY

    res2: WearableQAResponse = WearableQAEngine.answer_question(
        query=q2,
        user_role="parent",
        subject_name="Ramesh",
        wearable_telemetry={"today_steps": 5430, "active_minutes": 42}
    )
    assert "You took 5,430 steps today" in res2.answer_text
    assert "42 minutes" in res2.answer_text
    assert res2.primary_metric == "steps"

    # 3. "How has my sleep been this week?"
    q3 = "How has my sleep been this week?"
    intent3 = WearableQAEngine.classify_intent(q3, user_role="parent")
    assert intent3 == WearableQueryIntent.PARENT_WEEKLY_SLEEP

    res3: WearableQAResponse = WearableQAEngine.answer_question(
        query=q3,
        user_role="parent",
        subject_name="Ramesh",
        wearable_telemetry={"weekly_sleep_average": "6h 54m"}
    )
    assert "averaged 6h 54m of sleep per night" in res3.answer_text
    assert res3.primary_metric == "sleep_duration"
