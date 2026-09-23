"""
Wearable Data Retention Policy & Lifecycle Governance Test Suite.

Verifies:
1. Separate retention definitions for:
   - raw Open Wearables data
   - KinGuardian analytics projections
   - derived insights
   - audit data
2. Strict Invariant: Do not indefinitely duplicate raw wearable data (disallows indefinite raw retention).
3. Record expiry evaluation and lifecycle actions.
"""

from datetime import datetime, timezone, timedelta
import pytest

from app.domains.wearables.domain.retention_policy import (
    DataRetentionCategory,
    ExpiryAction,
    RetentionRule,
    DataRetentionPolicy
)


def test_four_separate_retention_categories_defined():
    """
    Verifies that all 4 required retention categories are configured with appropriate
    retention windows and actions.
    """
    policy = DataRetentionPolicy()

    # 1. Raw Open Wearables Data (90 days, hard delete)
    raw_rule = policy.get_rule(DataRetentionCategory.RAW_OPEN_WEARABLES_DATA)
    assert raw_rule.retention_period_days == 90
    assert raw_rule.expiry_action == ExpiryAction.HARD_DELETE
    assert raw_rule.is_indefinite is False

    # 2. KinGuardian Analytics Projections (730 days / 2 yrs, downsample archive)
    proj_rule = policy.get_rule(DataRetentionCategory.ANALYTICS_PROJECTIONS)
    assert proj_rule.retention_period_days == 730
    assert proj_rule.expiry_action == ExpiryAction.DOWNSAMPLE_ARCHIVE
    assert proj_rule.is_indefinite is False

    # 3. Derived Insights (2555 days / 7 yrs, cold storage archive)
    insight_rule = policy.get_rule(DataRetentionCategory.DERIVED_INSIGHTS)
    assert insight_rule.retention_period_days == 2555
    assert insight_rule.expiry_action == ExpiryAction.COLD_STORAGE_ARCHIVE

    # 4. Audit Data (2555 days / 7 yrs, cold storage archive)
    audit_rule = policy.get_rule(DataRetentionCategory.AUDIT_DATA)
    assert audit_rule.retention_period_days == 2555
    assert audit_rule.expiry_action == ExpiryAction.COLD_STORAGE_ARCHIVE


def test_strict_invariant_rejects_indefinite_raw_wearable_retention():
    """
    CRITICAL INVARIANT TEST:
    Do NOT indefinitely duplicate raw wearable data.
    Attempting to set is_indefinite=True on RAW_OPEN_WEARABLES_DATA must raise ValueError.
    """
    with pytest.raises(ValueError, match="must NOT be stored indefinitely"):
        RetentionRule(
            category=DataRetentionCategory.RAW_OPEN_WEARABLES_DATA,
            retention_period_days=0,
            is_indefinite=True
        )


def test_raw_data_retention_expiry_evaluation():
    """
    Verifies that raw data older than 90 days triggers expiry for purge,
    while fresh raw data (< 90 days) is kept.
    """
    now = datetime(2026, 8, 27, 12, 0, 0, tzinfo=timezone.utc)
    policy = DataRetentionPolicy()

    # Raw telemetry from 95 days ago -> Expired (Action: HARD_DELETE)
    ts_old = now - timedelta(days=95)
    is_expired, age, action, exp = policy.evaluate_retention_status(
        category=DataRetentionCategory.RAW_OPEN_WEARABLES_DATA,
        record_timestamp=ts_old,
        reference_time=now
    )
    assert is_expired is True
    assert age == 95
    assert action == ExpiryAction.HARD_DELETE
    assert "exceeding retention limit" in exp

    # Raw telemetry from 20 days ago -> Valid
    ts_fresh = now - timedelta(days=20)
    is_expired_fresh, age_fresh, _, exp_fresh = policy.evaluate_retention_status(
        category=DataRetentionCategory.RAW_OPEN_WEARABLES_DATA,
        record_timestamp=ts_fresh,
        reference_time=now
    )
    assert is_expired_fresh is False
    assert age_fresh == 20
    assert "within retention limit" in exp_fresh


def test_analytics_projection_retention_downsampling():
    """
    Verifies analytics projections (e.g. 800 days old) trigger DOWNSAMPLE_ARCHIVE.
    """
    now = datetime(2026, 8, 27, 12, 0, 0, tzinfo=timezone.utc)
    policy = DataRetentionPolicy()

    ts_projection = now - timedelta(days=800)
    is_expired, age, action, _ = policy.evaluate_retention_status(
        category=DataRetentionCategory.ANALYTICS_PROJECTIONS,
        record_timestamp=ts_projection,
        reference_time=now
    )
    assert is_expired is True
    assert age == 800
    assert action == ExpiryAction.DOWNSAMPLE_ARCHIVE
