import uuid
from enum import Enum
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.core.logging import get_logger
from app.domains.events.audit import AuditService

logger = get_logger(__name__)


# ==========================================
# Retention Policy Models & Enums
# ==========================================

class RetentionCategory(str, Enum):
    AUDIT = "audit"
    DOCUMENT = "document"
    MESSAGE = "message"
    CLINICAL = "clinical"
    CONSENT = "consent"


class RetentionPolicySpec(BaseModel):
    category: RetentionCategory
    name: str
    retention_period_days: int
    allow_purge_after_retention: bool
    compliance_standard: str
    requires_audit_log_on_purge: bool = True
    storage_provider_alignment: Optional[str] = None


class LegalHoldRecord(BaseModel):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    target_type: str = Field(..., description="family | subject | document | conversation")
    target_id: uuid.UUID
    family_id: uuid.UUID
    placed_by_profile_id: uuid.UUID
    placed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    reason: str
    is_active: bool = True
    released_at: Optional[datetime] = None
    released_by_profile_id: Optional[uuid.UUID] = None
    release_reason: Optional[str] = None


class RetentionEvaluationResult(BaseModel):
    category: RetentionCategory
    record_age_days: int
    policy_retention_days: int
    is_retention_expired: bool
    is_legal_hold_active: bool
    can_purge: bool
    compliance_standard: str
    decision_rationale: str
    storage_alignment: Optional[str] = None


# ==========================================
# Explicit Enterprise Retention Policies
# ==========================================

EXPLICIT_RETENTION_POLICIES: Dict[RetentionCategory, RetentionPolicySpec] = {
    RetentionCategory.AUDIT: RetentionPolicySpec(
        category=RetentionCategory.AUDIT,
        name="HIPAA & SOC 2 Immutable Audit Retention",
        retention_period_days=2555,  # 7 Years (HIPAA Standard)
        allow_purge_after_retention=False,  # Immutable audit trail
        compliance_standard="HIPAA 45 CFR § 164.316(b)(2)(i) & SOC 2 Type II",
        requires_audit_log_on_purge=True
    ),
    RetentionCategory.DOCUMENT: RetentionPolicySpec(
        category=RetentionCategory.DOCUMENT,
        name="FileNest Compliant Health Document Retention",
        retention_period_days=2555,  # 7 Years
        allow_purge_after_retention=True,
        compliance_standard="FileNest Compliance & WORM Storage Standard",
        requires_audit_log_on_purge=True,
        storage_provider_alignment="FileNest"
    ),
    RetentionCategory.MESSAGE: RetentionPolicySpec(
        category=RetentionCategory.MESSAGE,
        name="Family Care Circle Message Retention",
        retention_period_days=1095,  # 3 Years
        allow_purge_after_retention=True,
        compliance_standard="DrGodly Family Communications Policy",
        requires_audit_log_on_purge=True
    ),
    RetentionCategory.CLINICAL: RetentionPolicySpec(
        category=RetentionCategory.CLINICAL,
        name="Clinical Observations & Medication History Retention",
        retention_period_days=3650,  # 10 Years
        allow_purge_after_retention=False,  # Permanent patient longitudinal health record
        compliance_standard="Medical Record Retention Regulations (10+ Years)",
        requires_audit_log_on_purge=True
    ),
    RetentionCategory.CONSENT: RetentionPolicySpec(
        category=RetentionCategory.CONSENT,
        name="Consent Grant & Revocation History Retention",
        retention_period_days=3650,  # 10 Years
        allow_purge_after_retention=False,  # Permanent consent provenance
        compliance_standard="HIPAA Notice of Privacy Practices & Legal Provenance",
        requires_audit_log_on_purge=True
    ),
}


# In-Memory Legal Hold Registry (Extensible to dedicated persistence)
_ACTIVE_LEGAL_HOLDS: Dict[uuid.UUID, LegalHoldRecord] = {}


class DataRetentionService:
    """
    Data Retention & Legal Hold Service:
    - Enforces explicit, documented retention policies for Audit, Document, Message, Clinical, and Consent data.
    - Aligns document retention with FileNest compliance & WORM capabilities without inventing independent storage logic.
    - Provides Legal Hold overrides preventing any deletion or purging when active litigation or investigation holds exist.
    """

    @classmethod
    def get_policy(cls, category: RetentionCategory) -> RetentionPolicySpec:
        """Returns the explicit retention policy specification for a category."""
        return EXPLICIT_RETENTION_POLICIES[category]

    @classmethod
    def list_policies(cls) -> List[RetentionPolicySpec]:
        """Returns all registered retention policies."""
        return list(EXPLICIT_RETENTION_POLICIES.values())

    @classmethod
    async def place_legal_hold(
        cls,
        session: AsyncSession,
        target_type: str,
        target_id: uuid.UUID,
        family_id: uuid.UUID,
        placed_by_profile_id: uuid.UUID,
        reason: str
    ) -> LegalHoldRecord:
        """
        Places an active legal hold on a family, care subject, document, or conversation.
        Overrides any standard retention purge until explicitly released.
        """
        hold = LegalHoldRecord(
            id=uuid.uuid4(),
            target_type=target_type.strip().lower(),
            target_id=target_id,
            family_id=family_id,
            placed_by_profile_id=placed_by_profile_id,
            placed_at=datetime.now(timezone.utc),
            reason=reason,
            is_active=True
        )
        _ACTIVE_LEGAL_HOLDS[hold.id] = hold

        audit_svc = AuditService(session)
        await audit_svc.record_audit_event(
            actor=placed_by_profile_id,
            family=family_id,
            action="placed",
            resource="legal_hold",
            metadata={
                "hold_id": str(hold.id),
                "target_type": target_type,
                "target_id": str(target_id),
                "reason": reason
            }
        )
        logger.info(f"Legal Hold placed on {target_type}:{target_id} by {placed_by_profile_id}. Reason: '{reason}'")
        return hold

    @classmethod
    async def release_legal_hold(
        cls,
        session: AsyncSession,
        hold_id: uuid.UUID,
        released_by_profile_id: uuid.UUID,
        family_id: uuid.UUID,
        release_reason: str
    ) -> LegalHoldRecord:
        """
        Releases an existing legal hold.
        """
        hold = _ACTIVE_LEGAL_HOLDS.get(hold_id)
        if not hold or not hold.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Active legal hold '{hold_id}' not found."
            )

        hold.is_active = False
        hold.released_at = datetime.now(timezone.utc)
        hold.released_by_profile_id = released_by_profile_id
        hold.release_reason = release_reason

        audit_svc = AuditService(session)
        await audit_svc.record_audit_event(
            actor=released_by_profile_id,
            family=family_id,
            action="released",
            resource="legal_hold",
            metadata={
                "hold_id": str(hold_id),
                "target_type": hold.target_type,
                "target_id": str(hold.target_id),
                "release_reason": release_reason
            }
        )
        logger.info(f"Legal Hold {hold_id} released by {released_by_profile_id}. Reason: '{release_reason}'")
        return hold

    @classmethod
    def is_under_legal_hold(cls, target_type: str, target_id: uuid.UUID, family_id: Optional[uuid.UUID] = None) -> bool:
        """
        Checks if a specific target (or its parent family context) has an active legal hold.
        """
        norm_type = target_type.strip().lower()
        for hold in _ACTIVE_LEGAL_HOLDS.values():
            if hold.is_active:
                if hold.target_type == norm_type and hold.target_id == target_id:
                    return True
                # A legal hold on the entire family applies to all sub-resources
                if family_id and hold.target_type == "family" and hold.target_id == family_id:
                    return True
        return False

    @classmethod
    def evaluate_retention(
        cls,
        category: RetentionCategory,
        created_at: datetime,
        target_type: str,
        target_id: uuid.UUID,
        family_id: Optional[uuid.UUID] = None
    ) -> RetentionEvaluationResult:
        """
        Deterministically evaluates retention eligibility without hardcoded deletion logic.
        Respects:
        1. Active Legal Holds (Strict Purge Prevention)
        2. Immutability standards (Audit, Consent, Clinical)
        3. FileNest compliance standards for document storage
        """
        policy = cls.get_policy(category)
        now = datetime.now(timezone.utc)
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)

        age_days = (now - created_at).days
        is_expired = age_days >= policy.retention_period_days
        has_legal_hold = cls.is_under_legal_hold(target_type, target_id, family_id)

        if has_legal_hold:
            return RetentionEvaluationResult(
                category=category,
                record_age_days=age_days,
                policy_retention_days=policy.retention_period_days,
                is_retention_expired=is_expired,
                is_legal_hold_active=True,
                can_purge=False,
                compliance_standard=policy.compliance_standard,
                decision_rationale="Purge blocked: Target is protected under active Legal Hold.",
                storage_alignment=policy.storage_provider_alignment
            )

        if not policy.allow_purge_after_retention:
            return RetentionEvaluationResult(
                category=category,
                record_age_days=age_days,
                policy_retention_days=policy.retention_period_days,
                is_retention_expired=is_expired,
                is_legal_hold_active=False,
                can_purge=False,
                compliance_standard=policy.compliance_standard,
                decision_rationale=f"Purge forbidden: {category.value} records are permanent and immutable.",
                storage_alignment=policy.storage_provider_alignment
            )

        if not is_expired:
            return RetentionEvaluationResult(
                category=category,
                record_age_days=age_days,
                policy_retention_days=policy.retention_period_days,
                is_retention_expired=False,
                is_legal_hold_active=False,
                can_purge=False,
                compliance_standard=policy.compliance_standard,
                decision_rationale=f"Retention active: Record age ({age_days}d) is within policy window ({policy.retention_period_days}d).",
                storage_alignment=policy.storage_provider_alignment
            )

        # Expired and purgeable under policy (e.g. Messages or FileNest archived documents)
        return RetentionEvaluationResult(
            category=category,
            record_age_days=age_days,
            policy_retention_days=policy.retention_period_days,
            is_retention_expired=True,
            is_legal_hold_active=False,
            can_purge=True,
            compliance_standard=policy.compliance_standard,
            decision_rationale=f"Eligible for purge: Age ({age_days}d) exceeds policy retention ({policy.retention_period_days}d).",
            storage_alignment=policy.storage_provider_alignment
        )
