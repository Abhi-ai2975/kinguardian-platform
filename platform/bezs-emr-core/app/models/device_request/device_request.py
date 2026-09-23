from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    Sequence,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import FHIRBase as Base
from app.models.device_request.enums import (
    DeviceRequestCodeReferenceType,
    DeviceRequestInsuranceReferenceType,
    DeviceRequestIntent,
    DeviceRequestNoteAuthorReferenceType,
    DeviceRequestPerformerReferenceType,
    DeviceRequestPriority,
    DeviceRequestReasonReferenceType,
    DeviceRequestRelevantHistoryReferenceType,
    DeviceRequestRequesterType,
    DeviceRequestStatus,
    DeviceRequestSubjectType,
)
from app.models.enums import EncounterReferenceType

device_request_id_seq = Sequence("device_request_pub_seq", start=130000, increment=1, metadata=Base.metadata)


class DeviceRequestModel(Base):
    __tablename__ = "device_request"

    # Internal PK — never exposed
    id = Column(Integer, primary_key=True, autoincrement=True, index=True)

    # Public ID — used in all API responses and FHIR output
    device_request_id = Column(
        Integer,
        device_request_id_seq,
        server_default=device_request_id_seq.next_value(),
        unique=True,
        index=True,
        nullable=False,
    )

    user_id = Column(String, nullable=True, index=True)
    org_id = Column(String, nullable=True, index=True)

    # ── status (0..1 code) and intent (1..1 code) ─────────────────────────────

    status = Column(
        Enum(DeviceRequestStatus, name="dr_req_status"), nullable=True, index=True
    )
    intent = Column(
        Enum(DeviceRequestIntent, name="dr_req_intent"), nullable=False
    )
    priority = Column(
        Enum(DeviceRequestPriority, name="dr_req_priority"), nullable=True
    )

    # ── code[x] (1..1 — Reference(Device) | CodeableConcept) ─────────────────

    # codeReference — Reference(Device)
    code_reference_type = Column(
        Enum(DeviceRequestCodeReferenceType, name="dr_code_ref_type"),
        nullable=True,
    )
    code_reference_id = Column(Integer, nullable=True, index=True)
    code_reference_display = Column(String, nullable=True)

    # codeCodeableConcept
    code_concept_system = Column(String, nullable=True)
    code_concept_code = Column(String, nullable=True, index=True)
    code_concept_display = Column(String, nullable=True)
    code_concept_text = Column(String, nullable=True)

    # ── subject (1..1 Reference — Patient | Group | Location | Device) ────────

    subject_type = Column(
        Enum(DeviceRequestSubjectType, name="dr_req_subject_type"), nullable=True
    )
    subject_id = Column(Integer, nullable=True, index=True)
    subject_display = Column(String, nullable=True)

    # ── encounter (0..1 Reference(Encounter)) ─────────────────────────────────

    encounter_type = Column(
        Enum(EncounterReferenceType, name="encounter_reference_type", create_type=False),
        nullable=True,
    )
    encounter_id = Column(Integer, ForeignKey("encounter.id"), nullable=True, index=True)
    encounter_display = Column(String, nullable=True)

    # ── occurrence[x] (0..1 — dateTime | Period | Timing) ────────────────────

    occurrence_datetime = Column(DateTime(timezone=True), nullable=True)
    occurrence_period_start = Column(DateTime(timezone=True), nullable=True)
    occurrence_period_end = Column(DateTime(timezone=True), nullable=True)

    # occurrenceTiming — full Timing.repeat flattened
    occurrence_timing_code_system = Column(String, nullable=True)
    occurrence_timing_code_code = Column(String, nullable=True)
    occurrence_timing_code_display = Column(String, nullable=True)
    occurrence_timing_bounds_start = Column(DateTime(timezone=True), nullable=True)
    occurrence_timing_bounds_end = Column(DateTime(timezone=True), nullable=True)
    occurrence_timing_count = Column(Integer, nullable=True)
    occurrence_timing_count_max = Column(Integer, nullable=True)
    occurrence_timing_duration = Column(Float, nullable=True)
    occurrence_timing_duration_max = Column(Float, nullable=True)
    occurrence_timing_duration_unit = Column(String, nullable=True)  # s|min|h|d|wk|mo|a
    occurrence_timing_frequency = Column(Integer, nullable=True)
    occurrence_timing_frequency_max = Column(Integer, nullable=True)
    occurrence_timing_period = Column(Float, nullable=True)
    occurrence_timing_period_max = Column(Float, nullable=True)
    occurrence_timing_period_unit = Column(String, nullable=True)    # s|min|h|d|wk|mo|a
    occurrence_timing_day_of_week = Column(String, nullable=True)    # comma-separated: mon|tue|...
    occurrence_timing_time_of_day = Column(String, nullable=True)    # comma-separated HH:MM
    occurrence_timing_when = Column(String, nullable=True)           # comma-separated EventTiming codes
    occurrence_timing_offset = Column(Integer, nullable=True)        # minutes from event

    # ── authoredOn (0..1 dateTime) ────────────────────────────────────────────

    authored_on = Column(DateTime(timezone=True), nullable=True, index=True)

    # ── requester (0..1 Reference) ────────────────────────────────────────────

    requester_type = Column(
        Enum(DeviceRequestRequesterType, name="dr_req_requester_type"), nullable=True
    )
    requester_id = Column(Integer, nullable=True)
    requester_display = Column(String, nullable=True)

    # ── performerType (0..1 CodeableConcept) ─────────────────────────────────

    performer_type_system = Column(String, nullable=True)
    performer_type_code = Column(String, nullable=True)
    performer_type_display = Column(String, nullable=True)
    performer_type_text = Column(String, nullable=True)

    # ── performer (0..1 Reference) ────────────────────────────────────────────

    performer_reference_type = Column(
        Enum(DeviceRequestPerformerReferenceType, name="dr_req_performer_ref_type"),
        nullable=True,
    )
    performer_reference_id = Column(Integer, nullable=True)
    performer_reference_display = Column(String, nullable=True)

    # ── groupIdentifier (0..1 Identifier — full datatype) ────────────────────

    group_identifier_use = Column(String, nullable=True)
    group_identifier_type_system = Column(String, nullable=True)
    group_identifier_type_code = Column(String, nullable=True)
    group_identifier_type_display = Column(String, nullable=True)
    group_identifier_type_text = Column(String, nullable=True)
    group_identifier_system = Column(String, nullable=True)
    group_identifier_value = Column(String, nullable=True)
    group_identifier_period_start = Column(DateTime(timezone=True), nullable=True)
    group_identifier_period_end = Column(DateTime(timezone=True), nullable=True)
    group_identifier_assigner = Column(String, nullable=True)

    # ── instantiates (comma-separated — rarely queried individually) ──────────

    instantiates_canonical = Column(Text, nullable=True)
    instantiates_uri = Column(Text, nullable=True)

    # ── Audit ─────────────────────────────────────────────────────────────────

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String, nullable=True)
    updated_by = Column(String, nullable=True)

    # ── Relationships ─────────────────────────────────────────────────────────

    encounter = relationship("EncounterModel", foreign_keys=[encounter_id], lazy="selectin")

    identifiers = relationship(
        "DeviceRequestIdentifier",
        back_populates="device_request",
        cascade="all, delete-orphan",
    )
    based_on = relationship(
        "DeviceRequestBasedOn",
        back_populates="device_request",
        cascade="all, delete-orphan",
    )
    prior_requests = relationship(
        "DeviceRequestPriorRequest",
        back_populates="device_request",
        cascade="all, delete-orphan",
    )
    parameters = relationship(
        "DeviceRequestParameter",
        back_populates="device_request",
        cascade="all, delete-orphan",
    )
    reason_codes = relationship(
        "DeviceRequestReasonCode",
        back_populates="device_request",
        cascade="all, delete-orphan",
    )
    reason_references = relationship(
        "DeviceRequestReasonReference",
        back_populates="device_request",
        cascade="all, delete-orphan",
    )
    insurance = relationship(
        "DeviceRequestInsurance",
        back_populates="device_request",
        cascade="all, delete-orphan",
    )
    supporting_info = relationship(
        "DeviceRequestSupportingInfo",
        back_populates="device_request",
        cascade="all, delete-orphan",
    )
    notes = relationship(
        "DeviceRequestNote",
        back_populates="device_request",
        cascade="all, delete-orphan",
    )
    relevant_history = relationship(
        "DeviceRequestRelevantHistory",
        back_populates="device_request",
        cascade="all, delete-orphan",
    )


# ── Sub-resource tables ────────────────────────────────────────────────────────


class DeviceRequestIdentifier(Base):
    """identifier[] — external business identifiers for this request."""

    __tablename__ = "device_request_identifier"

    id = Column(Integer, primary_key=True, autoincrement=True)
    device_request_id = Column(
        Integer, ForeignKey("device_request.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    use = Column(String, nullable=True)
    type_system = Column(String, nullable=True)
    type_code = Column(String, nullable=True)
    type_display = Column(String, nullable=True)
    type_text = Column(String, nullable=True)
    system = Column(String, nullable=True)
    value = Column(String, nullable=False)
    period_start = Column(DateTime(timezone=True), nullable=True)
    period_end = Column(DateTime(timezone=True), nullable=True)
    assigner = Column(String, nullable=True)

    device_request = relationship("DeviceRequestModel", back_populates="identifiers")


class DeviceRequestBasedOn(Base):
    """basedOn[] — Reference(Any) requests this device request fulfils."""

    __tablename__ = "device_request_based_on"

    id = Column(Integer, primary_key=True, autoincrement=True)
    device_request_id = Column(
        Integer, ForeignKey("device_request.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    # Open reference — any FHIR resource type allowed
    reference_type = Column(String, nullable=True)
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    device_request = relationship("DeviceRequestModel", back_populates="based_on")


class DeviceRequestPriorRequest(Base):
    """priorRequest[] — Reference(Any) requests this device request replaces."""

    __tablename__ = "device_request_prior_request"

    id = Column(Integer, primary_key=True, autoincrement=True)
    device_request_id = Column(
        Integer, ForeignKey("device_request.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    # Open reference — any FHIR resource type allowed
    reference_type = Column(String, nullable=True)
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    device_request = relationship("DeviceRequestModel", back_populates="prior_requests")


class DeviceRequestParameter(Base):
    """parameter[] BackboneElement — specific device configuration details."""

    __tablename__ = "device_request_parameter"

    id = Column(Integer, primary_key=True, autoincrement=True)
    device_request_id = Column(
        Integer, ForeignKey("device_request.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    # code (0..1 CodeableConcept)
    code_system = Column(String, nullable=True)
    code_code = Column(String, nullable=True)
    code_display = Column(String, nullable=True)
    code_text = Column(String, nullable=True)

    # value[x] (0..1 — CodeableConcept | Quantity | Range | boolean)
    value_concept_system = Column(String, nullable=True)
    value_concept_code = Column(String, nullable=True)
    value_concept_display = Column(String, nullable=True)
    value_concept_text = Column(String, nullable=True)

    value_quantity_value = Column(Float, nullable=True)
    value_quantity_unit = Column(String, nullable=True)
    value_quantity_system = Column(String, nullable=True)
    value_quantity_code = Column(String, nullable=True)

    value_range_low_value = Column(Float, nullable=True)
    value_range_low_unit = Column(String, nullable=True)
    value_range_high_value = Column(Float, nullable=True)
    value_range_high_unit = Column(String, nullable=True)

    value_boolean = Column(Boolean, nullable=True)

    device_request = relationship("DeviceRequestModel", back_populates="parameters")


class DeviceRequestReasonCode(Base):
    """reasonCode[] — CodeableConcept coded reason for the device request."""

    __tablename__ = "device_request_reason_code"

    id = Column(Integer, primary_key=True, autoincrement=True)
    device_request_id = Column(
        Integer, ForeignKey("device_request.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    device_request = relationship("DeviceRequestModel", back_populates="reason_codes")


class DeviceRequestReasonReference(Base):
    """reasonReference[] — Reference(Condition|Observation|DiagnosticReport|DocumentReference)."""

    __tablename__ = "device_request_reason_reference"

    id = Column(Integer, primary_key=True, autoincrement=True)
    device_request_id = Column(
        Integer, ForeignKey("device_request.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(DeviceRequestReasonReferenceType, name="dr_reason_ref_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    device_request = relationship("DeviceRequestModel", back_populates="reason_references")


class DeviceRequestInsurance(Base):
    """insurance[] — Reference(Coverage|ClaimResponse) associated insurance coverage."""

    __tablename__ = "device_request_insurance"

    id = Column(Integer, primary_key=True, autoincrement=True)
    device_request_id = Column(
        Integer, ForeignKey("device_request.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(DeviceRequestInsuranceReferenceType, name="dr_insurance_ref_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    device_request = relationship("DeviceRequestModel", back_populates="insurance")


class DeviceRequestSupportingInfo(Base):
    """supportingInfo[] — Reference(Any) additional clinical context."""

    __tablename__ = "device_request_supporting_info"

    id = Column(Integer, primary_key=True, autoincrement=True)
    device_request_id = Column(
        Integer, ForeignKey("device_request.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    # Open reference — any FHIR resource type allowed
    reference_type = Column(String, nullable=True)
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    device_request = relationship("DeviceRequestModel", back_populates="supporting_info")


class DeviceRequestNote(Base):
    """note[] — Annotation notes or comments about the device request."""

    __tablename__ = "device_request_note"

    id = Column(Integer, primary_key=True, autoincrement=True)
    device_request_id = Column(
        Integer, ForeignKey("device_request.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    # text (1..1 markdown)
    text = Column(Text, nullable=False)

    # time (0..1 dateTime)
    time = Column(DateTime(timezone=True), nullable=True)

    # author[x] — string | Reference(Practitioner|Patient|RelatedPerson|Organization)
    author_string = Column(String, nullable=True)
    author_reference_type = Column(
        Enum(DeviceRequestNoteAuthorReferenceType, name="dr_note_author_ref_type"),
        nullable=True,
    )
    author_reference_id = Column(Integer, nullable=True)
    author_reference_display = Column(String, nullable=True)

    device_request = relationship("DeviceRequestModel", back_populates="notes")


class DeviceRequestRelevantHistory(Base):
    """relevantHistory[] — Reference(Provenance) request provenance records."""

    __tablename__ = "device_request_relevant_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    device_request_id = Column(
        Integer, ForeignKey("device_request.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(DeviceRequestRelevantHistoryReferenceType, name="dr_relevant_history_ref_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    device_request = relationship("DeviceRequestModel", back_populates="relevant_history")
