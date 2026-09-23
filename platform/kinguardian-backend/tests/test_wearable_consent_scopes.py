"""
Wearable Consent Scopes & Unbundled Granular Authorization Test Suite.

Verifies:
1. All 6 distinct wearable consent scopes:
   - view_wearable_summary
   - view_wearable_activity
   - view_wearable_sleep
   - view_wearable_heart_rate
   - view_wearable_raw_metrics
   - manage_wearable_connections
2. Strict Invariant: Do not bundle all wearable permissions into one scope.
3. Independent authorization and permission enforcement per scope.
"""

import pytest

from app.domains.wearables.domain.consent_scopes import (
    WearableConsentScope,
    ScopeSensitivityLevel,
    ConsentScopeDefinition,
    WEARABLE_CONSENT_SCOPE_REGISTRY,
    ConsentScopeAuthorizer
)


def test_all_six_consent_scopes_defined_and_unbundled():
    """
    Verifies that all 6 required consent scopes are defined in the enum and registry.
    """
    expected_scopes = {
        "view_wearable_summary",
        "view_wearable_activity",
        "view_wearable_sleep",
        "view_wearable_heart_rate",
        "view_wearable_raw_metrics",
        "manage_wearable_connections"
    }

    actual_scopes = {s.value for s in WearableConsentScope}
    assert expected_scopes == actual_scopes

    for scope in WearableConsentScope:
        assert scope in WEARABLE_CONSENT_SCOPE_REGISTRY
        defn = WEARABLE_CONSENT_SCOPE_REGISTRY[scope]
        assert defn.name == scope.value
        assert len(defn.label) > 0
        assert len(defn.description) > 0
        assert len(defn.disclosed_data_types) > 0


def test_strict_unbundled_authorization_summary_does_not_grant_raw():
    """
    CRITICAL PRIVACY INVARIANT:
    Permissions are NOT bundled into a single scope.
    A user granted 'view_wearable_summary' is:
    - ALLOWED: view_wearable_summary
    - DENIED: view_wearable_sleep
    - DENIED: view_wearable_raw_metrics
    - DENIED: manage_wearable_connections
    """
    user_granted_scopes = {"view_wearable_summary"}

    # 1. Summary -> Allowed
    is_auth_sum, msg_sum = ConsentScopeAuthorizer.is_scope_granted(
        granted_scopes=user_granted_scopes,
        required_scope=WearableConsentScope.VIEW_WEARABLE_SUMMARY
    )
    assert is_auth_sum is True
    assert "Authorized" in msg_sum

    # 2. Sleep -> Denied
    is_auth_sleep, msg_sleep = ConsentScopeAuthorizer.is_scope_granted(
        granted_scopes=user_granted_scopes,
        required_scope=WearableConsentScope.VIEW_WEARABLE_SLEEP
    )
    assert is_auth_sleep is False
    assert "Access Denied" in msg_sleep
    assert "view_wearable_sleep" in msg_sleep

    # 3. Raw Metrics -> Denied
    is_auth_raw, msg_raw = ConsentScopeAuthorizer.is_scope_granted(
        granted_scopes=user_granted_scopes,
        required_scope=WearableConsentScope.VIEW_WEARABLE_RAW_METRICS
    )
    assert is_auth_raw is False
    assert "Access Denied" in msg_raw
    assert "view_wearable_raw_metrics" in msg_raw

    # 4. Manage Connections -> Denied
    is_auth_manage, msg_manage = ConsentScopeAuthorizer.is_scope_granted(
        granted_scopes=user_granted_scopes,
        required_scope=WearableConsentScope.MANAGE_WEARABLE_CONNECTIONS
    )
    assert is_auth_manage is False
    assert "Access Denied" in msg_manage


def test_activity_and_heart_rate_specific_authorization():
    """
    Verifies that a user granted 'view_wearable_activity' and 'view_wearable_heart_rate'
    can view activity and pulse, but cannot manage connections or read raw streams.
    """
    granted = {"view_wearable_activity", "view_wearable_heart_rate"}

    # Activity -> Allowed
    ok_act, _ = ConsentScopeAuthorizer.is_scope_granted(granted, WearableConsentScope.VIEW_WEARABLE_ACTIVITY)
    assert ok_act is True

    # Heart Rate -> Allowed
    ok_hr, _ = ConsentScopeAuthorizer.is_scope_granted(granted, WearableConsentScope.VIEW_WEARABLE_HEART_RATE)
    assert ok_hr is True

    # Sleep -> Denied
    ok_sleep, _ = ConsentScopeAuthorizer.is_scope_granted(granted, WearableConsentScope.VIEW_WEARABLE_SLEEP)
    assert ok_sleep is False

    # Manage Connections -> Denied
    ok_manage, _ = ConsentScopeAuthorizer.is_scope_granted(granted, WearableConsentScope.MANAGE_WEARABLE_CONNECTIONS)
    assert ok_manage is False


def test_get_all_scope_definitions_for_ui_disclosures():
    """
    Verifies that all 6 scopes return complete user-facing disclosure dictionaries.
    """
    definitions = ConsentScopeAuthorizer.get_all_scope_definitions()
    assert len(definitions) == 6

    scope_names = {d["scope"] for d in definitions}
    assert "view_wearable_summary" in scope_names
    assert "view_wearable_activity" in scope_names
    assert "view_wearable_sleep" in scope_names
    assert "view_wearable_heart_rate" in scope_names
    assert "view_wearable_raw_metrics" in scope_names
    assert "manage_wearable_connections" in scope_names
