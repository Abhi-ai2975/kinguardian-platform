"""
Wearable Data Retention Policy & Lifecycle Governance.

Enforces separate retention lifecycles across 4 distinct data tiers:
1. Raw Open Wearables Data:
   - Short rolling retention (e.g. 30–90 days max).
   - STRICT INVARIANT: Do NOT indefinitely duplicate raw wearable data.
2. KinGuardian Analytics Projections:
   - Materialized snapshots & daily rollups (e.g. 1–3 years for historical baseline comparison).
3. Derived Insights:
   - Guardian Moments, multi-source correlations, clinical recommendations (e.g. 5–7 years per health record regulations).
4. Audit Data:
   - Webhook logs, consent lifecycle audits, data quality reports (e.g. 6–7 years for statutory compliance).
"""

from enum import Enum
from typing import Dict, Any, Optional, List, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
import uuid


class DataRetentionCategory(str, Enum):
    RAW_OPEN_WEARABLES_DATA = "raw_open_wearables_data"      # High-frequency minute-by-minute telemetry
    ANALYTICS_PROJECTIONS = "analytics_projections"          # Daily metric snapshots & rollups
    DERIVED_INSIGHTS = "derived_insights"                    # Guardian Moments, anomalies, correlations
    AUDIT_DATA = "audit_data"                                # Non-PHI audit logs, consent trails, quality reports


class ExpiryAction(str, Enum):
    HARD_DELETE = "hard_delete"                              # Permanent purge
    DOWNSAMPLE_ARCHIVE = "downsample_archive"                # Compress / aggregate before dropping raw
    COLD_STORAGE_ARCHIVE = "cold_storage_archive"            # Encrypted compliance archive


@dataclass
class RetentionRule:
    """Configurable retention rule for a specific data category."""
    category: DataRetentionCategory
    retention_period_days: int
    expiry_action: ExpiryAction = ExpiryAction.HARD_DELETE
    is_indefinite: bool = False
    description: str = ""

    def __post_init__(self):
        # Strict Invariant: Raw wearable telemetry must NEVER have indefinite retention!
        if self.category == DataRetentionCategory.RAW_OPEN_WEARABLES_DATA and self.is_indefinite:
            raise ValueError(
                "Violation of Data Retention Governance: Raw Open Wearables data "
                "must NOT be stored indefinitely. Must define a finite rolling retention period (e.g., 30-90 days)."
            )


@dataclass
class DataRetentionPolicy:
    """
    Master retention governance specifying distinct retention durations
    and actions across all 4 data categories.
    """
    name: str = "Standard KinGuardian Healthcare Retention Policy"
    rules: Dict[DataRetentionCategory, RetentionRule] = field(default_factory=lambda: {
        # 1. Raw Open Wearables: 90 days rolling retention max (prevents DB bloat)
        DataRetentionCategory.RAW_OPEN_WEARABLES_DATA: RetentionRule(
            category=DataRetentionCategory.RAW_OPEN_WEARABLES_DATA,
            retention_period_days=90,
            expiry_action=ExpiryAction.HARD_DELETE,
            is_indefinite=False,
            description="High-frequency minute-by-minute telemetry purged after 90 days rolling window."
        ),
        # 2. KinGuardian Analytics Projections: 2 years (730 days) for multi-season baselines
        DataRetentionCategory.ANALYTICS_PROJECTIONS: RetentionRule(
            category=DataRetentionCategory.ANALYTICS_PROJECTIONS,
            retention_period_days=730,
            expiry_action=ExpiryAction.DOWNSAMPLE_ARCHIVE,
            is_indefinite=False,
            description="Materialized daily snapshots retained for 2 years for historical trend detection."
        ),
        # 3. Derived Insights: 7 years (2555 days) for clinical continuity
        DataRetentionCategory.DERIVED_INSIGHTS: RetentionRule(
            category=DataRetentionCategory.DERIVED_INSIGHTS,
            retention_period_days=2555,
            expiry_action=ExpiryAction.COLD_STORAGE_ARCHIVE,
            is_indefinite=False,
            description="Guardian Moments and caregiver insights preserved for 7 years per health records compliance."
        ),
        # 4. Audit Data: 7 years (2555 days) for statutory compliance
        DataRetentionCategory.AUDIT_DATA: RetentionRule(
            category=DataRetentionCategory.AUDIT_DATA,
            retention_period_days=2555,
            expiry_action=ExpiryAction.COLD_STORAGE_ARCHIVE,
            is_indefinite=False,
            description="Security, consent, and webhook audit trails retained for 7 years."
        )
    })

    def get_rule(self, category: DataRetentionCategory) -> RetentionRule:
        return self.rules[category]

    def set_rule(self, rule: RetentionRule) -> None:
        self.rules[rule.category] = rule

    def evaluate_retention_status(
        self,
        category: DataRetentionCategory,
        record_timestamp: datetime,
        reference_time: Optional[datetime] = None
    ) -> Tuple[bool, int, ExpiryAction, str]:
        """
        Evaluates whether a record has exceeded its retention period.
        Returns:
        (is_expired, age_in_days, action_to_take, explanation)
        """
        ref_dt = reference_time or datetime.now(timezone.utc)
        r_dt = record_timestamp if record_timestamp.tzinfo is not None else record_timestamp.replace(tzinfo=timezone.utc)

        rule = self.get_rule(category)
        if rule.is_indefinite:
            return (False, 0, rule.expiry_action, f"{category.value}: Indefinite retention enabled.")

        age_days = (ref_dt - r_dt).days
        is_expired = age_days > rule.retention_period_days

        if is_expired:
            explanation = (
                f"{category.value} record is {age_days} days old, exceeding retention limit of "
                f"{rule.retention_period_days} days. Action: {rule.expiry_action.value}."
            )
        else:
            explanation = (
                f"{category.value} record is {age_days} days old, within retention limit of "
                f"{rule.retention_period_days} days."
            )

        return (is_expired, age_days, rule.expiry_action, explanation)
