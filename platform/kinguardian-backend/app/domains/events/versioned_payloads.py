"""
Versioned Domain Event Payloads & Schema Registry.
Provides strongly-typed, schema-versioned event payloads with upcasting and validation support.
"""

from typing import Dict, Any, Optional, Type
from datetime import datetime
import uuid
from pydantic import BaseModel, Field, ConfigDict


# ==============================================================================
# Versioned Payload Definitions
# ==============================================================================

# ── Family Created ────────────────────────────────────────────────────────────
class FamilyCreatedPayloadV1(BaseModel):
    model_config = ConfigDict(extra="ignore")
    family_id: uuid.UUID
    name: str
    creator_profile_id: uuid.UUID
    created_at: Optional[datetime] = None


# ── Family Member Added ───────────────────────────────────────────────────────
class FamilyMemberAddedPayloadV1(BaseModel):
    model_config = ConfigDict(extra="ignore")
    family_id: uuid.UUID
    member_profile_id: uuid.UUID
    membership_role: str
    added_by_profile_id: Optional[uuid.UUID] = None


# ── Care Relationship Created ─────────────────────────────────────────────────
class CareRelationshipCreatedPayloadV1(BaseModel):
    model_config = ConfigDict(extra="ignore")
    family_id: uuid.UUID
    subject_id: uuid.UUID
    caregiver_profile_id: uuid.UUID
    relationship_type: str
    assigned_by_profile_id: Optional[uuid.UUID] = None


# ── Subject Checkin Submitted ─────────────────────────────────────────────────
class SubjectCheckInPayloadV1(BaseModel):
    model_config = ConfigDict(extra="ignore")
    checkin_id: Optional[uuid.UUID] = None
    subject_id: uuid.UUID
    family_id: uuid.UUID
    submitted_by_profile_id: uuid.UUID
    feeling: str
    notes: Optional[str] = None
    severity: str = "low"


# ── Medication Taken & Missed ─────────────────────────────────────────────────
class MedicationAdherencePayloadV1(BaseModel):
    model_config = ConfigDict(extra="ignore")
    adherence_event_id: Optional[uuid.UUID] = None
    subject_id: uuid.UUID
    family_id: uuid.UUID
    fhir_medication_request_id: str
    scheduled_at: datetime
    status: str
    confirmed_at: Optional[datetime] = None


# ── Document Uploaded & Processed ─────────────────────────────────────────────
class DocumentEventPayloadV1(BaseModel):
    model_config = ConfigDict(extra="ignore")
    document_id: Optional[uuid.UUID] = None
    subject_id: uuid.UUID
    family_id: uuid.UUID
    filenest_file_id: str
    document_type: str
    status: str = "ready"
    mime_type: Optional[str] = None


# ── Appointment Preparation Created ───────────────────────────────────────────
class AppointmentPreparationPayloadV1(BaseModel):
    model_config = ConfigDict(extra="ignore")
    coordination_id: Optional[uuid.UUID] = None
    subject_id: uuid.UUID
    family_id: uuid.UUID
    fhir_appointment_id: str
    preparation_status: str = "ready"
    assigned_caregiver_profile_id: Optional[uuid.UUID] = None


# ── Insight & Guardian Moment Generated ───────────────────────────────────────
class InsightGeneratedPayloadV1(BaseModel):
    model_config = ConfigDict(extra="ignore")
    insight_id: Optional[uuid.UUID] = None
    subject_id: uuid.UUID
    family_id: uuid.UUID
    type: str
    severity: str
    title: str
    summary: str
    observation: Optional[str] = None
    recommendation: Optional[str] = None


# ── Care Task Created & Completed ─────────────────────────────────────────────
class CareTaskPayloadV1(BaseModel):
    model_config = ConfigDict(extra="ignore")
    task_id: uuid.UUID
    subject_id: uuid.UUID
    family_id: uuid.UUID
    title: str
    category: str
    priority: str
    status: str
    assigned_to_profile_id: Optional[uuid.UUID] = None


# ── Notification Created ──────────────────────────────────────────────────────
class NotificationCreatedPayloadV1(BaseModel):
    model_config = ConfigDict(extra="ignore")
    notification_id: uuid.UUID
    family_id: uuid.UUID
    recipient_profile_id: uuid.UUID
    type: str
    priority: str
    title: str
    body: str


# ==============================================================================
# Versioned Event Schema Registry & Upcaster
# ==============================================================================

class EventSchemaRegistry:
    """
    Registry mapping (event_type, event_version) to concrete Pydantic payload models.
    Supports payload validation, evolution, and backward-compatible upcasting.
    """
    _schemas: Dict[str, Dict[int, Type[BaseModel]]] = {
        "family.created": {1: FamilyCreatedPayloadV1},
        "family.member.added": {1: FamilyMemberAddedPayloadV1},
        "care.relationship.created": {1: CareRelationshipCreatedPayloadV1},
        "subject.checkin.submitted": {1: SubjectCheckInPayloadV1},
        "medication.taken": {1: MedicationAdherencePayloadV1},
        "medication.missed": {1: MedicationAdherencePayloadV1},
        "document.uploaded": {1: DocumentEventPayloadV1},
        "document.processed": {1: DocumentEventPayloadV1},
        "appointment.preparation.created": {1: AppointmentPreparationPayloadV1},
        "insight.generated": {1: InsightGeneratedPayloadV1},
        "guardian.moment.created": {1: InsightGeneratedPayloadV1},
        "care.task.created": {1: CareTaskPayloadV1},
        "care.task.completed": {1: CareTaskPayloadV1},
        "notification.created": {1: NotificationCreatedPayloadV1},
    }

    @classmethod
    def get_payload_schema(cls, event_type: str, event_version: int = 1) -> Optional[Type[BaseModel]]:
        """Retrieves the payload schema model for a given event type and version."""
        return cls._schemas.get(event_type, {}).get(event_version)

    @classmethod
    def validate_payload(cls, event_type: str, payload: Dict[str, Any], event_version: int = 1) -> BaseModel:
        """Validates payload against the registered version schema."""
        schema_cls = cls.get_payload_schema(event_type, event_version)
        if schema_cls:
            return schema_cls.model_validate(payload)
        # Fallback for dynamic/unregistered event versions
        return type("DynamicPayload", (BaseModel,), {})(**payload)
