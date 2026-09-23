import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field
from sqlalchemy import select, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.domains.events.models import EventLog

logger = get_logger(__name__)


# ==========================================
# Application-Level Audit Event Model
# ==========================================

class AuditEventRecord(BaseModel):
    """
    Standardized Application-Level Audit Record.
    Conforms to enterprise multi-tenant observability and HIPAA audit compliance.
    """
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    actor: uuid.UUID = Field(..., description="ID of the user, agent, or service performing the action")
    family: uuid.UUID = Field(..., description="Care Circle / Family context ID")
    subject: Optional[uuid.UUID] = Field(None, description="Patient / Care Subject whose data is accessed or acted upon")
    action: str = Field(..., description="Action name e.g. granted, revoked, viewed, shared, confirmed, assigned, approved, rejected")
    resource: str = Field(..., description="Target resource e.g. consent, health.summary, document, medication, appointment, care.task, ai.insight, ai.action")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="UTC timestamp of the event")
    request_id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Traceable HTTP request ID or transaction ID")
    source: str = Field(default="web_app", description="Source client: web_app | mobile_ios | mobile_android | agent_runtime | background_worker")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Contextual properties e.g. IP, consent scope, diffs")

    @property
    def event_type(self) -> str:
        """Derived standard dot-notated event name e.g. 'consent.granted', 'health.summary.viewed'"""
        return f"{self.resource}.{self.action}"


# ==========================================
# Audit Service
# ==========================================

class AuditService:
    """
    Enterprise Application-Level Audit Service:
    Records immutable audit entries for all health-data accesses, consent modifications,
    medication confirmations, AI governance decisions, and circle membership mutations.
    Emits structured telemetry for integration with bezs-observability.
    """

    def __init__(self, session: AsyncSession):
        self.session = session

    async def record_audit_event(
        self,
        actor: uuid.UUID,
        family: uuid.UUID,
        action: str,
        resource: str,
        subject: Optional[uuid.UUID] = None,
        request_id: Optional[str] = None,
        source: str = "web_app",
        metadata: Optional[Dict[str, Any]] = None,
        event_type_override: Optional[str] = None
    ) -> AuditEventRecord:
        """
        Records a fully populated application-level audit event into the immutable event store.
        """
        utc_now = datetime.now(timezone.utc)
        req_id = request_id or str(uuid.uuid4())
        meta = metadata or {}
        event_name = event_type_override or f"{resource}.{action}"

        record = AuditEventRecord(
            id=uuid.uuid4(),
            actor=actor,
            family=family,
            subject=subject,
            action=action,
            resource=resource,
            timestamp=utc_now,
            request_id=req_id,
            source=source,
            metadata=meta
        )

        payload_dict = {
            "actor": str(actor),
            "family": str(family),
            "subject": str(subject) if subject else None,
            "action": action,
            "resource": resource,
            "request_id": req_id,
            "source": source,
            "metadata": meta
        }

        db_entry = EventLog(
            id=record.id,
            family_id=family,
            event_type=event_name,
            aggregate_type=resource,
            aggregate_id=str(subject) if subject else str(family),
            actor_profile_id=actor,
            payload=payload_dict,
            utc_timestamp=utc_now
        )
        self.session.add(db_entry)
        await self.session.flush()

        # Structured audit log output for bezs-observability telemetry ingestion
        logger.info(
            f"Audit event recorded: '{event_name}'",
            extra={
                "audit": True,
                "event_type": event_name,
                "actor": str(actor),
                "family": str(family),
                "subject": str(subject) if subject else None,
                "action": action,
                "resource": resource,
                "request_id": req_id,
                "source": source,
                "timestamp_utc": utc_now.isoformat()
            }
        )

        return record

    # ==========================================
    # Explicit Domain Audit Helpers
    # ==========================================

    async def log_consent_granted(
        self,
        actor: uuid.UUID,
        family: uuid.UUID,
        subject: uuid.UUID,
        consent_id: uuid.UUID,
        scopes: List[str],
        request_id: Optional[str] = None,
        source: str = "mobile_app"
    ) -> AuditEventRecord:
        return await self.record_audit_event(
            actor=actor,
            family=family,
            subject=subject,
            action="granted",
            resource="consent",
            request_id=request_id,
            source=source,
            metadata={"consent_id": str(consent_id), "scopes": scopes}
        )

    async def log_consent_revoked(
        self,
        actor: uuid.UUID,
        family: uuid.UUID,
        subject: uuid.UUID,
        consent_id: uuid.UUID,
        reason: Optional[str] = None,
        request_id: Optional[str] = None,
        source: str = "mobile_app"
    ) -> AuditEventRecord:
        return await self.record_audit_event(
            actor=actor,
            family=family,
            subject=subject,
            action="revoked",
            resource="consent",
            request_id=request_id,
            source=source,
            metadata={"consent_id": str(consent_id), "reason": reason}
        )

    async def log_health_summary_viewed(
        self,
        actor: uuid.UUID,
        family: uuid.UUID,
        subject: uuid.UUID,
        summary_type: str = "full",
        request_id: Optional[str] = None,
        source: str = "mobile_app"
    ) -> AuditEventRecord:
        return await self.record_audit_event(
            actor=actor,
            family=family,
            subject=subject,
            action="viewed",
            resource="health.summary",
            request_id=request_id,
            source=source,
            metadata={"summary_type": summary_type}
        )

    async def log_document_viewed(
        self,
        actor: uuid.UUID,
        family: uuid.UUID,
        subject: uuid.UUID,
        document_id: uuid.UUID,
        request_id: Optional[str] = None,
        source: str = "mobile_app"
    ) -> AuditEventRecord:
        return await self.record_audit_event(
            actor=actor,
            family=family,
            subject=subject,
            action="viewed",
            resource="document",
            request_id=request_id,
            source=source,
            metadata={"document_id": str(document_id)}
        )

    async def log_document_shared(
        self,
        actor: uuid.UUID,
        family: uuid.UUID,
        subject: uuid.UUID,
        document_id: uuid.UUID,
        recipient_email: str,
        request_id: Optional[str] = None,
        source: str = "mobile_app"
    ) -> AuditEventRecord:
        return await self.record_audit_event(
            actor=actor,
            family=family,
            subject=subject,
            action="shared",
            resource="document",
            request_id=request_id,
            source=source,
            metadata={"document_id": str(document_id), "recipient_email": recipient_email}
        )

    async def log_medication_confirmed(
        self,
        actor: uuid.UUID,
        family: uuid.UUID,
        subject: uuid.UUID,
        adherence_id: uuid.UUID,
        medication_name: str,
        status: str = "taken",
        request_id: Optional[str] = None,
        source: str = "mobile_app"
    ) -> AuditEventRecord:
        return await self.record_audit_event(
            actor=actor,
            family=family,
            subject=subject,
            action="confirmed",
            resource="medication",
            request_id=request_id,
            source=source,
            metadata={"adherence_id": str(adherence_id), "medication_name": medication_name, "status": status}
        )

    async def log_appointment_summary_shared(
        self,
        actor: uuid.UUID,
        family: uuid.UUID,
        subject: uuid.UUID,
        appointment_id: str,
        shared_with_email: str,
        request_id: Optional[str] = None,
        source: str = "mobile_app"
    ) -> AuditEventRecord:
        return await self.record_audit_event(
            actor=actor,
            family=family,
            subject=subject,
            action="shared",
            resource="appointment.summary",
            request_id=request_id,
            source=source,
            metadata={"appointment_id": appointment_id, "shared_with": shared_with_email}
        )

    async def log_family_member_added(
        self,
        actor: uuid.UUID,
        family: uuid.UUID,
        member_profile_id: uuid.UUID,
        role: str,
        request_id: Optional[str] = None,
        source: str = "mobile_app"
    ) -> AuditEventRecord:
        return await self.record_audit_event(
            actor=actor,
            family=family,
            action="added",
            resource="family.member",
            request_id=request_id,
            source=source,
            metadata={"member_profile_id": str(member_profile_id), "role": role}
        )

    async def log_care_task_assigned(
        self,
        actor: uuid.UUID,
        family: uuid.UUID,
        task_id: uuid.UUID,
        assignee_profile_id: uuid.UUID,
        subject: Optional[uuid.UUID] = None,
        request_id: Optional[str] = None,
        source: str = "mobile_app"
    ) -> AuditEventRecord:
        return await self.record_audit_event(
            actor=actor,
            family=family,
            subject=subject,
            action="assigned",
            resource="care.task",
            request_id=request_id,
            source=source,
            metadata={"task_id": str(task_id), "assignee_profile_id": str(assignee_profile_id)}
        )

    async def log_ai_insight_viewed(
        self,
        actor: uuid.UUID,
        family: uuid.UUID,
        subject: uuid.UUID,
        insight_id: uuid.UUID,
        request_id: Optional[str] = None,
        source: str = "mobile_app"
    ) -> AuditEventRecord:
        return await self.record_audit_event(
            actor=actor,
            family=family,
            subject=subject,
            action="viewed",
            resource="ai.insight",
            request_id=request_id,
            source=source,
            metadata={"insight_id": str(insight_id)}
        )

    async def log_ai_action_approved(
        self,
        actor: uuid.UUID,
        family: uuid.UUID,
        subject: uuid.UUID,
        action_id: uuid.UUID,
        action_type: str,
        request_id: Optional[str] = None,
        source: str = "mobile_app"
    ) -> AuditEventRecord:
        return await self.record_audit_event(
            actor=actor,
            family=family,
            subject=subject,
            action="approved",
            resource="ai.action",
            request_id=request_id,
            source=source,
            metadata={"action_id": str(action_id), "action_type": action_type}
        )

    async def log_ai_action_rejected(
        self,
        actor: uuid.UUID,
        family: uuid.UUID,
        subject: uuid.UUID,
        action_id: uuid.UUID,
        reason: Optional[str] = None,
        request_id: Optional[str] = None,
        source: str = "mobile_app"
    ) -> AuditEventRecord:
        return await self.record_audit_event(
            actor=actor,
            family=family,
            subject=subject,
            action="rejected",
            resource="ai.action",
            request_id=request_id,
            source=source,
            metadata={"action_id": str(action_id), "reason": reason}
        )

    # ==========================================
    # Query & Retrieval for Audit Trails
    # ==========================================

    async def list_audit_events(
        self,
        family_id: uuid.UUID,
        subject_id: Optional[uuid.UUID] = None,
        event_type: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[AuditEventRecord]:
        """
        Retrieves audit trail entries for a family or subject with optional event filtering.
        """
        conditions = [EventLog.family_id == family_id]
        if event_type:
            conditions.append(EventLog.event_type == event_type)

        stmt = (
            select(EventLog)
            .where(and_(*conditions))
            .order_by(desc(EventLog.utc_timestamp))
            .offset(offset)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        entries = result.scalars().all()

        records: List[AuditEventRecord] = []
        for e in entries:
            p = e.payload if isinstance(e.payload, dict) else {}
            subj_val = p.get("subject") or (uuid.UUID(e.aggregate_id) if e.aggregate_id and len(e.aggregate_id) == 36 else None)
            subj_uuid = uuid.UUID(str(subj_val)) if subj_val else None

            if subject_id and subj_uuid != subject_id:
                continue

            records.append(
                AuditEventRecord(
                    id=e.id,
                    actor=e.actor_profile_id or uuid.uuid4(),
                    family=e.family_id or family_id,
                    subject=subj_uuid,
                    action=p.get("action", e.event_type.split(".")[-1] if "." in e.event_type else "occurred"),
                    resource=p.get("resource", e.aggregate_type or e.event_type.split(".")[0]),
                    timestamp=e.utc_timestamp,
                    request_id=p.get("request_id", str(uuid.uuid4())),
                    source=p.get("source", "system"),
                    metadata=p.get("metadata", {})
                )
            )

        return records
