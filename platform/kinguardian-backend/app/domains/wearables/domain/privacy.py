"""
Wearable Privacy & Granular Access Control Governance.

Enforces independent wearable data authorization separated from family membership:
- A general family membership does NOT grant blanket access to sensitive wearable telemetry.
- Permissions are evaluated on granular scopes (e.g. Health Summary vs Raw Sleep Data).

Example:
Rahul is a family member allowed to see:
  ✓ Health summary
but NOT:
  ✗ Raw sleep data

Authorization strictly enforces this boundary.
"""

from enum import Enum
from typing import Set, List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timezone
import uuid


class WearableDataScope(str, Enum):
    # Aggregated Summary Scopes
    HEALTH_SUMMARY = "health_summary"                # High-level daily score, Guardian moments, summary badges
    ACTIVITY_SUMMARY = "activity_summary"            # Daily total steps, active minutes, total distance
    SLEEP_SUMMARY = "sleep_summary"                  # Total sleep hours, sleep score
    HEART_RATE_SUMMARY = "heart_rate_summary"        # Resting HR average, daily min/max

    # High-Sensitivity Raw Telemetry Scopes
    RAW_ACTIVITY_DATA = "raw_activity_data"          # Minute-by-minute cadence, GPS track, accelerometer
    RAW_SLEEP_DATA = "raw_sleep_data"                # Continuous hypnogram, 30-sec sleep stage epochs, toss/turn
    RAW_HEART_RATE_DATA = "raw_heart_rate_data"      # Second-by-second beat-to-beat (RR/IBI) interval streams
    RAW_CLINICAL_VITALS = "raw_clinical_vitals"      # Raw continuous SpO2, ECG waveforms, skin temperature


@dataclass
class WearableAccessGrant:
    """
    Granular permission grant authorizing a specific user to view designated
    wearable data scopes for a care subject.
    """
    id: uuid.UUID = field(default_factory=uuid.uuid4)
    subject_id: uuid.UUID = field(default_factory=uuid.uuid4)
    grantee_profile_id: uuid.UUID = field(default_factory=uuid.uuid4)
    grantee_name: str = "Family Member"
    allowed_scopes: Set[WearableDataScope] = field(default_factory=set)
    is_revoked: bool = False
    granted_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: Optional[datetime] = None

    def has_scope(self, scope: WearableDataScope) -> bool:
        if self.is_revoked:
            return False
        if self.expires_at and datetime.now(timezone.utc) > self.expires_at:
            return False
        return scope in self.allowed_scopes


class WearablePrivacyAuthorizer:
    """
    Independent authorization engine enforcing granular wearable privacy scopes.
    """

    @classmethod
    def evaluate_access(
        cls,
        grantee_profile_id: uuid.UUID,
        subject_id: uuid.UUID,
        requested_scope: WearableDataScope,
        active_grants: List[WearableAccessGrant],
        is_family_member: bool = True
    ) -> Tuple[bool, str]:
        """
        Evaluates whether grantee is authorized to access requested_scope.
        STRICT RULE: Family membership alone does not grant access to sensitive raw data.
        """
        if not is_family_member:
            return (
                False,
                f"Access Denied: User is not an active member of the care circle for subject {subject_id}."
            )

        # Find matching grant for grantee and subject
        grant = next(
            (g for g in active_grants if g.grantee_profile_id == grantee_profile_id and g.subject_id == subject_id),
            None
        )

        if not grant:
            return (
                False,
                f"Access Denied: No wearable data sharing permissions have been configured for user {grantee_profile_id}."
            )

        if grant.is_revoked:
            return (
                False,
                f"Access Denied: Wearable data permissions for user {grant.grantee_name} have been revoked."
            )

        if grant.has_scope(requested_scope):
            return (
                True,
                f"Access Granted: User {grant.grantee_name} is authorized for scope '{requested_scope.value}'."
            )

        # Differentiated scope explanation
        if requested_scope == WearableDataScope.RAW_SLEEP_DATA and WearableDataScope.HEALTH_SUMMARY in grant.allowed_scopes:
            return (
                False,
                f"Access Denied: {grant.grantee_name} is allowed to see health summary, but NOT raw sleep data."
            )

        if requested_scope == WearableDataScope.RAW_HEART_RATE_DATA and WearableDataScope.HEALTH_SUMMARY in grant.allowed_scopes:
            return (
                False,
                f"Access Denied: {grant.grantee_name} is allowed to see health summary, but NOT raw heart rate data."
            )

        return (
            False,
            f"Access Denied: {grant.grantee_name} does not have permission for scope '{requested_scope.value}'."
        )
