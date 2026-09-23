import uuid
from datetime import datetime, timezone
from typing import Optional, Set
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.core.logging import get_logger
from app.domains.family.infrastructure.models import (
    CareSubject,
    CareTask,
    HealthDocument,
    MonitoringPreference,
    Consent
)
from app.domains.events.audit import AuditService

logger = get_logger(__name__)


class ImmutabilityViolationError(HTTPException):
    """
    Raised when an attempt is made to physically delete or silently erase
    strictly immutable entities (clinical references, audit records, consent history, or event history).
    """
    def __init__(self, entity_name: str, message: Optional[str] = None):
        detail = message or (
            f"Compliance & Retention Violation: Physical or silent deletion of '{entity_name}' is strictly forbidden. "
            f"Audit records, consent history, clinical references, and event logs are permanent and immutable."
        )
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


class RetentionPolicyService:
    """
    Data Retention & Soft Deletion Policy Service:
    - Soft deletion is used ONLY where there is a meaningful business reason (e.g. archiving documents, deactivating care subjects).
    - NEVER silently deletes:
        1. Clinical references (e.g. medication adherence events, FHIR links)
        2. Audit records (event_logs, audit trail)
        3. Consent history (all grant/revocation records)
        4. Event history (domain event outbox)
    - Complies with HIPAA 7-year audit retention and medical record retention requirements.
    """

    IMMUTABLE_ENTITIES: Set[str] = {
        "event_logs",
        "audit_events",
        "medication_adherence_events",
        "consents",
        "consent_history",
        "clinical_observations",
        "fhir_references",
        "outbox_events"
    }

    SOFT_DELETABLE_ENTITIES: Set[str] = {
        "care_subjects",
        "care_tasks",
        "health_documents",
        "monitoring_preferences",
        "family_memberships"
    }

    @classmethod
    def assert_deletion_permitted(cls, entity_name: str) -> None:
        """
        Guarantees that immutable compliance records are never deleted.
        """
        normalized = entity_name.strip().lower()
        if normalized in cls.IMMUTABLE_ENTITIES:
            logger.error(f"Immutability violation attempted on '{entity_name}'.")
            raise ImmutabilityViolationError(entity_name)

    @classmethod
    async def soft_delete_care_subject(
        cls,
        session: AsyncSession,
        subject_id: uuid.UUID,
        actor_id: uuid.UUID,
        family_id: uuid.UUID,
        reason: Optional[str] = None
    ) -> CareSubject:
        """
        Soft deletes a Care Subject (deactivates from active roster while preserving historical care data).
        """
        subject = await session.get(CareSubject, subject_id)
        if not subject:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Care subject not found")

        subject.status = "inactive"
        subject.deleted_at = datetime.now(timezone.utc)
        await session.flush()

        audit_svc = AuditService(session)
        await audit_svc.record_audit_event(
            actor=actor_id,
            family=family_id,
            subject=subject_id,
            action="deactivated",
            resource="care_subject",
            metadata={"reason": reason or "User requested subject deactivation"}
        )
        return subject

    @classmethod
    async def soft_delete_care_task(
        cls,
        session: AsyncSession,
        task_id: uuid.UUID,
        actor_id: uuid.UUID,
        family_id: uuid.UUID,
        reason: Optional[str] = None
    ) -> CareTask:
        """
        Soft deletes a Care Task (sets status to 'cancelled' with timestamp).
        """
        task = await session.get(CareTask, task_id)
        if not task:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Care task not found")

        task.status = "cancelled"
        task.deleted_at = datetime.now(timezone.utc)
        await session.flush()

        audit_svc = AuditService(session)
        await audit_svc.record_audit_event(
            actor=actor_id,
            family=family_id,
            subject=task.subject_id,
            action="cancelled",
            resource="care.task",
            metadata={"task_id": str(task_id), "reason": reason or "Task cancelled"}
        )
        return task

    @classmethod
    async def soft_delete_health_document(
        cls,
        session: AsyncSession,
        document_id: uuid.UUID,
        actor_id: uuid.UUID,
        family_id: uuid.UUID,
        reason: Optional[str] = None
    ) -> HealthDocument:
        """
        Soft deletes a Health Document (sets status to 'archived', preserving extraction records and audit trails).
        """
        doc = await session.get(HealthDocument, document_id)
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Health document not found")

        doc.status = "archived"
        doc.deleted_at = datetime.now(timezone.utc)
        await session.flush()

        audit_svc = AuditService(session)
        await audit_svc.record_audit_event(
            actor=actor_id,
            family=family_id,
            subject=doc.subject_id,
            action="archived",
            resource="document",
            metadata={"document_id": str(document_id), "reason": reason or "Document archived"}
        )
        return doc

    @classmethod
    async def revoke_consent_immutably(
        cls,
        session: AsyncSession,
        consent_id: uuid.UUID,
        actor_id: uuid.UUID,
        family_id: uuid.UUID,
        reason: Optional[str] = None
    ) -> Consent:
        """
        Immutably revokes consent without ever physically deleting the consent record.
        Maintains complete grant and revocation history.
        """
        consent = await session.get(Consent, consent_id)
        if not consent:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Consent record not found")

        consent.status = "revoked"
        consent.revoked_at = datetime.now(timezone.utc)
        await session.flush()

        audit_svc = AuditService(session)
        await audit_svc.log_consent_revoked(
            actor=actor_id,
            family=family_id,
            subject=consent.subject_id,
            consent_id=consent_id,
            reason=reason or "Patient/grantor revoked consent"
        )
        return consent
