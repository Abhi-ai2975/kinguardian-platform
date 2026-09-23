"""
Mock Wearable Data Gateway & Scenario Engine Test Suite.

Verifies:
1. Default Seeds for Dad (Ramesh in Chennai):
   - Steps: 5,840 steps/day
   - Sleep: 7h 12m (432 mins)
   - Resting Heart Rate: 64 bpm
2. Default Seeds for Mom (Kaveri / Sunita in Chennai):
   - Steps: 4,200 steps/day
   - Sleep: 7h 45m (465 mins)
   - Heart Rate: 68 bpm resting HR
3. Scenario Engine Dynamic Telemetry Manipulation:
   - `set_subject_activity`
   - `set_subject_sleep`
   - `set_subject_heart_rate`
   - `apply_scenario_drop`
"""

import pytest
from app.domains.wearables.gateway import MockWearableDataGateway


@pytest.mark.asyncio
async def test_mock_gateway_dad_seeds():
    """
    Verifies default seeded metrics for Dad (steps, sleep, resting heart rate).
    """
    gateway = MockWearableDataGateway()
    dad_user_id = "kinguardian_subject_dad_01"

    activities = await gateway.get_daily_activity(dad_user_id, "2026-08-01", "2026-08-27")
    sleeps = await gateway.get_sleep(dad_user_id, "2026-08-01", "2026-08-27")
    recoveries = await gateway.get_heart_rate(dad_user_id, "2026-08-01", "2026-08-27")

    assert len(activities) > 0
    assert activities[0].steps == 5840
    assert activities[0].source_provider == "garmin"

    assert len(sleeps) > 0
    assert sleeps[0].total_sleep_minutes == 440  # 7h 20m
    assert sleeps[0].sleep_score == 84


    assert len(recoveries) > 0
    assert recoveries[0].resting_heart_rate_bpm == 64
    assert recoveries[0].hrv_ms == 48.5



@pytest.mark.asyncio
async def test_mock_gateway_mom_seeds():
    """
    Verifies default seeded metrics for Mom (steps, sleep, heart rate).
    """
    gateway = MockWearableDataGateway()
    mom_user_id = "kinguardian_subject_mom_01"

    activities = await gateway.get_daily_activity(mom_user_id, "2026-08-01", "2026-08-27")
    sleeps = await gateway.get_sleep(mom_user_id, "2026-08-01", "2026-08-27")
    recoveries = await gateway.get_heart_rate(mom_user_id, "2026-08-01", "2026-08-27")

    assert len(activities) > 0
    assert activities[0].steps == 4200
    assert activities[0].source_provider == "apple_health"

    assert len(sleeps) > 0
    assert sleeps[0].total_sleep_minutes == 465  # 7h 45m
    assert sleeps[0].sleep_score == 88

    assert len(recoveries) > 0
    assert recoveries[0].resting_heart_rate_bpm == 68
    assert recoveries[0].hrv_ms == 52.0


@pytest.mark.asyncio
async def test_scenario_engine_dynamic_wearable_mutation():
    """
    Verifies that the scenario engine can dynamically alter wearable metrics on the fly.
    """
    gateway = MockWearableDataGateway()
    subject_user_id = "kinguardian_subject_dad_01"

    # 1. Modify steps
    gateway.set_subject_activity(subject_user_id, steps=3200, active_minutes=25)
    activities = await gateway.get_daily_activity(subject_user_id, "2026-08-01", "2026-08-27")
    assert activities[0].steps == 3200
    assert activities[0].active_duration_minutes == 25

    # 2. Modify sleep
    gateway.set_subject_sleep(subject_user_id, total_sleep_minutes=360, sleep_score=70)
    sleeps = await gateway.get_sleep(subject_user_id, "2026-08-01", "2026-08-27")
    assert sleeps[0].total_sleep_minutes == 360  # 6h
    assert sleeps[0].sleep_score == 70

    # 3. Modify resting heart rate
    gateway.set_subject_heart_rate(subject_user_id, resting_heart_rate_bpm=78, hrv_ms=36.0)
    recoveries = await gateway.get_heart_rate(subject_user_id, "2026-08-01", "2026-08-27")
    assert recoveries[0].resting_heart_rate_bpm == 78
    assert recoveries[0].hrv_ms == 36.0

    # 4. Apply simulated percentage drop
    gateway.apply_scenario_drop(subject_user_id, metric="steps", percentage_drop=50.0)
    activities_after_drop = await gateway.get_daily_activity(subject_user_id, "2026-08-01", "2026-08-27")
    assert activities_after_drop[0].steps == 1600  # 50% of 3200
