import pytest
import uuid
from datetime import datetime, timezone, timedelta

from app.domains.family.domain.retention_policy import (
    DataRetentionService,
    RetentionCategory,
    RetentionPolicySpec,
    EXPLICIT_RETENTION_POLICIES
)


def test_explicit_retention_policy_specifications():
    """
    Verifies that all 5 explicit retention policies exist with documented standards
    and correct retention timeframes.
    """
    policies = DataRetentionService.list_policies()
    assert len(policies) == 5

    # 1. Audit Retention Policy
    audit_policy = DataRetentionService.get_policy(RetentionCategory.AUDIT)
    assert audit_policy.retention_period_days == 2555  # 7 Years
    assert audit_policy.allow_purge_after_retention is False
    assert "HIPAA" in audit_policy.compliance_standard

    # 2. Document Retention Policy (FileNest Aligned)
    doc_policy = DataRetentionService.get_policy(RetentionCategory.DOCUMENT)
    assert doc_policy.retention_period_days == 2555
    assert doc_policy.storage_provider_alignment == "FileNest"
    assert "FileNest" in doc_policy.compliance_standard

    # 3. Message Retention Policy
    msg_policy = DataRetentionService.get_policy(RetentionCategory.MESSAGE)
    assert msg_policy.retention_period_days == 1095  # 3 Years
    assert msg_policy.allow_purge_after_retention is True

    # 4. Clinical Retention Policy
    clinical_policy = DataRetentionService.get_policy(RetentionCategory.CLINICAL)
    assert clinical_policy.retention_period_days == 3650  # 10 Years
    assert clinical_policy.allow_purge_after_retention is False

    # 5. Consent Retention Policy
    consent_policy = DataRetentionService.get_policy(RetentionCategory.CONSENT)
    assert consent_policy.retention_period_days == 3650  # 10 Years
    assert consent_policy.allow_purge_after_retention is False


@pytest.mark.asyncio
async def test_retention_evaluation_unexpired_and_immutable(db_session):
    """
    Verifies that unexpired records and immutable records are correctly evaluated as non-purgeable.
    """
    doc_id = uuid.uuid4()
    family_id = uuid.uuid4()

    # Recent document (30 days old) -> Within retention window
    recent_created = datetime.now(timezone.utc) - timedelta(days=30)
    result = DataRetentionService.evaluate_retention(
        category=RetentionCategory.DOCUMENT,
        created_at=recent_created,
        target_type="document",
        target_id=doc_id,
        family_id=family_id
    )
    assert result.is_retention_expired is False
    assert result.can_purge is False
    assert result.storage_alignment == "FileNest"
    assert "within policy window" in result.decision_rationale

    # 8-year-old Audit record -> Expired but IMMUTABLE (cannot purge)
    old_audit_created = datetime.now(timezone.utc) - timedelta(days=3000)
    audit_res = DataRetentionService.evaluate_retention(
        category=RetentionCategory.AUDIT,
        created_at=old_audit_created,
        target_type="audit",
        target_id=uuid.uuid4(),
        family_id=family_id
    )
    assert audit_res.is_retention_expired is True
    assert audit_res.can_purge is False
    assert "permanent and immutable" in audit_res.decision_rationale


@pytest.mark.asyncio
async def test_legal_hold_blocks_purging_and_releases(db_session):
    """
    Verifies that placing an active legal hold strictly blocks purge for expired records,
    and releasing the hold restores normal evaluation.
    """
    doc_id = uuid.uuid4()
    family_id = uuid.uuid4()
    coordinator_id = uuid.uuid4()

    old_created = datetime.now(timezone.utc) - timedelta(days=2600)  # > 7 years

    # Before legal hold -> Expired document is eligible for FileNest WORM purge
    res_before = DataRetentionService.evaluate_retention(
        category=RetentionCategory.DOCUMENT,
        created_at=old_created,
        target_type="document",
        target_id=doc_id,
        family_id=family_id
    )
    assert res_before.is_retention_expired is True
    assert res_before.can_purge is True

    # 1. Place Legal Hold
    hold = await DataRetentionService.place_legal_hold(
        session=db_session,
        target_type="document",
        target_id=doc_id,
        family_id=family_id,
        placed_by_profile_id=coordinator_id,
        reason="Pending clinical litigation hold #LIT-8842"
    )
    assert hold.is_active is True
    assert DataRetentionService.is_under_legal_hold("document", doc_id) is True

    # 2. Evaluate with Legal Hold active -> STRICTLY BLOCKED
    res_held = DataRetentionService.evaluate_retention(
        category=RetentionCategory.DOCUMENT,
        created_at=old_created,
        target_type="document",
        target_id=doc_id,
        family_id=family_id
    )
    assert res_held.is_legal_hold_active is True
    assert res_held.can_purge is False
    assert "Purge blocked: Target is protected under active Legal Hold" in res_held.decision_rationale

    # 3. Release Legal Hold
    released = await DataRetentionService.release_legal_hold(
        session=db_session,
        hold_id=hold.id,
        released_by_profile_id=coordinator_id,
        family_id=family_id,
        release_reason="Litigation case concluded"
    )
    assert released.is_active is False
    assert DataRetentionService.is_under_legal_hold("document", doc_id) is False

    # 4. Evaluate after release -> Purge allowed again
    res_after = DataRetentionService.evaluate_retention(
        category=RetentionCategory.DOCUMENT,
        created_at=old_created,
        target_type="document",
        target_id=doc_id,
        family_id=family_id
    )
    assert res_after.is_legal_hold_active is False
    assert res_after.can_purge is True
