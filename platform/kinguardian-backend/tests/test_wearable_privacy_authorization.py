"""
Wearable Privacy & Granular Access Control Test Suite.

Verifies:
1. Wearable permissions are evaluated independently from general family membership.
2. Example scenario:
   Rahul is allowed to see:
     ✓ health summary
   but NOT:
     ✗ raw sleep data
3. Authorization engine strictly enforces differentiated scope boundaries.
"""

import uuid
from datetime import datetime, timezone
import pytest

from app.domains.wearables.domain.privacy import (
    WearableDataScope,
    WearableAccessGrant,
    WearablePrivacyAuthorizer
)


def test_rahul_health_summary_allowed_but_raw_sleep_denied():
    """
    Scenario directly from user request:
    Rahul (family member) has been granted permission to view 'health_summary',
    but NOT 'raw_sleep_data'.

    Authorization enforcement:
    1. Rahul requests HEALTH_SUMMARY -> GRANTED (True)
    2. Rahul requests RAW_SLEEP_DATA -> DENIED (False, "Rahul is allowed to see health summary, but NOT raw sleep data.")
    """
    subject_id = uuid.uuid4()
    rahul_profile_id = uuid.uuid4()

    # Configure Rahul's granular grant
    rahul_grant = WearableAccessGrant(
        id=uuid.uuid4(),
        subject_id=subject_id,
        grantee_profile_id=rahul_profile_id,
        grantee_name="Rahul",
        allowed_scopes={
            WearableDataScope.HEALTH_SUMMARY,
            WearableDataScope.ACTIVITY_SUMMARY
        },
        is_revoked=False
    )

    grants = [rahul_grant]

    # 1. Evaluate Health Summary (Allowed)
    is_auth_summary, msg_summary = WearablePrivacyAuthorizer.evaluate_access(
        grantee_profile_id=rahul_profile_id,
        subject_id=subject_id,
        requested_scope=WearableDataScope.HEALTH_SUMMARY,
        active_grants=grants,
        is_family_member=True
    )
    assert is_auth_summary is True
    assert "Access Granted" in msg_summary

    # 2. Evaluate Raw Sleep Data (Denied)
    is_auth_sleep, msg_sleep = WearablePrivacyAuthorizer.evaluate_access(
        grantee_profile_id=rahul_profile_id,
        subject_id=subject_id,
        requested_scope=WearableDataScope.RAW_SLEEP_DATA,
        active_grants=grants,
        is_family_member=True
    )
    assert is_auth_sleep is False
    assert "Access Denied" in msg_sleep
    assert "Rahul is allowed to see health summary, but NOT raw sleep data" in msg_sleep


def test_family_membership_alone_is_insufficient():
    """
    Verifies that being a family member does not grant access if no wearable grant exists.
    """
    subject_id = uuid.uuid4()
    unauthorized_member_id = uuid.uuid4()

    is_auth, msg = WearablePrivacyAuthorizer.evaluate_access(
        grantee_profile_id=unauthorized_member_id,
        subject_id=subject_id,
        requested_scope=WearableDataScope.HEALTH_SUMMARY,
        active_grants=[],  # No grants configured
        is_family_member=True
    )

    assert is_auth is False
    assert "No wearable data sharing permissions have been configured" in msg


def test_revoked_grant_denies_all_scopes():
    """
    Verifies that revoking a grant immediately revokes access even if previously granted.
    """
    subject_id = uuid.uuid4()
    user_id = uuid.uuid4()

    revoked_grant = WearableAccessGrant(
        id=uuid.uuid4(),
        subject_id=subject_id,
        grantee_profile_id=user_id,
        grantee_name="Priya",
        allowed_scopes={WearableDataScope.HEALTH_SUMMARY, WearableDataScope.RAW_SLEEP_DATA},
        is_revoked=True
    )

    is_auth, msg = WearablePrivacyAuthorizer.evaluate_access(
        grantee_profile_id=user_id,
        subject_id=subject_id,
        requested_scope=WearableDataScope.HEALTH_SUMMARY,
        active_grants=[revoked_grant],
        is_family_member=True
    )

    assert is_auth is False
    assert "have been revoked" in msg
