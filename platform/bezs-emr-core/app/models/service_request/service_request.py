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
from app.models.service_request.enums import (
    ServiceRequestBasedOnReferenceType,
    ServiceRequestInsuranceReferenceType,
    ServiceRequestIntent,
    ServiceRequestLocationReferenceType,
    ServiceRequestNoteAuthorReferenceType,
    ServiceRequestPerformerReferenceType,
    ServiceRequestPriority,
    ServiceRequestReasonReferenceType,
    ServiceRequestRelevantHistoryReferenceType,
    ServiceRequestReplacesReferenceType,
    ServiceRequestRequesterType,
    ServiceRequestSpecimenReferenceType,
    ServiceRequestStatus,
    ServiceRequestSubjectType,
)
from app.models.enums import EncounterReferenceType

service_request_id_seq = Sequence("service_request_pub_seq", start=80000, increment=1, metadata=Base.metadata)


class ServiceRequestModel(Base):
    __tablename__ = "service_request"

    # Internal PK — never exposed
    id = Column(Integer, primary_key=True, autoincrement=True, index=True)

    # Public ID — used in all API responses and FHIR output
    service_request_id = Column(
        Integer,
        service_request_id_seq,
        server_default=service_request_id_seq.next_value(),
        unique=True,
        index=True,
        nullable=False,
    )

    user_id = Column(String, nullable=True, index=True)
    org_id = Column(String, nullable=True, index=True)

    # ── Required fields ────────────────────────────────────────────────────────

    status = Column(Enum(ServiceRequestStatus, name="sr_status"), nullable=False, index=True)
    intent = Column(Enum(ServiceRequestIntent, name="sr_intent"), nullable=False)

    # ── Classification ─────────────────────────────────────────────────────────

    priority = Column(Enum(ServiceRequestPriority, name="sr_priority"), nullable=True)
    do_not_perform = Column(Boolean, nullable=True)

    # ── What is requested — code (CodeableConcept flat) ───────────────────────

    code_system = Column(String, nullable=True)
    code_code = Column(String, nullable=True, index=True)
    code_display = Column(String, nullable=True)
    code_text = Column(String, nullable=True)

    # ── Subject — Reference(Patient | Group | Location | Device) ──────────────

    subject_type = Column(
        Enum(ServiceRequestSubjectType, name="sr_subject_type"), nullable=True
    )
    subject_id = Column(Integer, nullable=True, index=True)
    subject_display = Column(String, nullable=True)

    # ── Encounter — Reference(Encounter) ──────────────────────────────────────

    encounter_type = Column(
        Enum(EncounterReferenceType, name="encounter_reference_type", create_type=False),
        nullable=True,
    )
    encounter_id = Column(Integer, ForeignKey("encounter.id"), nullable=True, index=True)
    encounter_display = Column(String, nullable=True)

    # ── Occurrence[x] — dateTime | Period | Timing ────────────────────────────
    # Store all three variants; mapper uses whichever is non-null.

    occurrence_datetime = Column(DateTime(timezone=True), nullable=True)
    occurrence_period_start = Column(DateTime(timezone=True), nullable=True)
    occurrence_period_end = Column(DateTime(timezone=True), nullable=True)

    # Timing is complex; we flatten the repeat bounds only.
    occurrence_timing_frequency = Column(Integer, nullable=True)   # repeat.frequency
    occurrence_timing_period = Column(Float, nullable=True)        # repeat.period
    occurrence_timing_period_unit = Column(String, nullable=True)  # repeat.periodUnit (s|min|h|d|wk|mo|a)
    occurrence_timing_bounds_start = Column(DateTime(timezone=True), nullable=True)
    occurrence_timing_bounds_end = Column(DateTime(timezone=True), nullable=True)

    # ── asNeeded[x] — boolean | CodeableConcept ───────────────────────────────

    as_needed_boolean = Column(Boolean, nullable=True)
    as_needed_system = Column(String, nullable=True)
    as_needed_code = Column(String, nullable=True)
    as_needed_display = Column(String, nullable=True)
    as_needed_text = Column(String, nullable=True)

    # ── Authored / Requester ──────────────────────────────────────────────────

    authored_on = Column(DateTime(timezone=True), nullable=True, index=True)

    requester_type = Column(
        Enum(ServiceRequestRequesterType, name="sr_requester_type"), nullable=True
    )
    requester_id = Column(Integer, nullable=True)
    requester_display = Column(String, nullable=True)

    # ── performerType — CodeableConcept (type of performer wanted) ────────────

    performer_type_system = Column(String, nullable=True)
    performer_type_code = Column(String, nullable=True)
    performer_type_display = Column(String, nullable=True)
    performer_type_text = Column(String, nullable=True)

    # ── Quantity[x] — Quantity | Ratio | Range ────────────────────────────────
    # All three variants stored; mapper uses whichever is non-null.

    # Quantity
    quantity_value = Column(Float, nullable=True)
    quantity_unit = Column(String, nullable=True)
    quantity_system = Column(String, nullable=True)
    quantity_code = Column(String, nullable=True)

    # Ratio
    quantity_ratio_numerator_value = Column(Float, nullable=True)
    quantity_ratio_numerator_unit = Column(String, nullable=True)
    quantity_ratio_denominator_value = Column(Float, nullable=True)
    quantity_ratio_denominator_unit = Column(String, nullable=True)

    # Range
    quantity_range_low_value = Column(Float, nullable=True)
    quantity_range_low_unit = Column(String, nullable=True)
    quantity_range_high_value = Column(Float, nullable=True)
    quantity_range_high_unit = Column(String, nullable=True)

    # ── Requisition identifier (full Identifier datatype) ─────────────────────

    requisition_use = Column(String, nullable=True)
    requisition_type_system = Column(String, nullable=True)
    requisition_type_code = Column(String, nullable=True)
    requisition_type_display = Column(String, nullable=True)
    requisition_type_text = Column(String, nullable=True)
    requisition_system = Column(String, nullable=True)
    requisition_value = Column(String, nullable=True)
    requisition_period_start = Column(DateTime(timezone=True), nullable=True)
    requisition_period_end = Column(DateTime(timezone=True), nullable=True)
    requisition_assigner = Column(String, nullable=True)

    # ── instantiates ─────────────────────────────────────────────────────────
    # Stored as comma-separated strings (rarely queried individually).

    instantiates_canonical = Column(Text, nullable=True)
    instantiates_uri = Column(Text, nullable=True)

    # ── patientInstruction ────────────────────────────────────────────────────

    patient_instruction = Column(Text, nullable=True)

    # ── Audit ─────────────────────────────────────────────────────────────────

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String, nullable=True)
    updated_by = Column(String, nullable=True)

    # ── Relationships ─────────────────────────────────────────────────────────

    encounter = relationship("EncounterModel", foreign_keys=[encounter_id], lazy="selectin")

    identifiers = relationship(
        "ServiceRequestIdentifier",
        back_populates="service_request",
        cascade="all, delete-orphan",
    )
    categories = relationship(
        "ServiceRequestCategory",
        back_populates="service_request",
        cascade="all, delete-orphan",
    )
    order_details = relationship(
        "ServiceRequestOrderDetail",
        back_populates="service_request",
        cascade="all, delete-orphan",
    )
    performers = relationship(
        "ServiceRequestPerformer",
        back_populates="service_request",
        cascade="all, delete-orphan",
    )
    location_codes = relationship(
        "ServiceRequestLocationCode",
        back_populates="service_request",
        cascade="all, delete-orphan",
    )
    location_references = relationship(
        "ServiceRequestLocationReference",
        back_populates="service_request",
        cascade="all, delete-orphan",
    )
    reason_codes = relationship(
        "ServiceRequestReasonCode",
        back_populates="service_request",
        cascade="all, delete-orphan",
    )
    reason_references = relationship(
        "ServiceRequestReasonReference",
        back_populates="service_request",
        cascade="all, delete-orphan",
    )
    insurance = relationship(
        "ServiceRequestInsurance",
        back_populates="service_request",
        cascade="all, delete-orphan",
    )
    supporting_info = relationship(
        "ServiceRequestSupportingInfo",
        back_populates="service_request",
        cascade="all, delete-orphan",
    )
    specimens = relationship(
        "ServiceRequestSpecimen",
        back_populates="service_request",
        cascade="all, delete-orphan",
    )
    body_sites = relationship(
        "ServiceRequestBodySite",
        back_populates="service_request",
        cascade="all, delete-orphan",
    )
    notes = relationship(
        "ServiceRequestNote",
        back_populates="service_request",
        cascade="all, delete-orphan",
    )
    relevant_history = relationship(
        "ServiceRequestRelevantHistory",
        back_populates="service_request",
        cascade="all, delete-orphan",
    )
    based_on = relationship(
        "ServiceRequestBasedOn",
        back_populates="service_request",
        cascade="all, delete-orphan",
    )
    replaces = relationship(
        "ServiceRequestReplaces",
        back_populates="service_request",
        cascade="all, delete-orphan",
    )


# ── Sub-resource tables ────────────────────────────────────────────────────────


class ServiceRequestIdentifier(Base):
    """Business identifiers assigned to this ServiceRequest."""

    __tablename__ = "service_request_identifier"

    id = Column(Integer, primary_key=True, autoincrement=True)
    service_request_id = Column(
        Integer, ForeignKey("service_request.id"), nullable=False, index=True
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

    service_request = relationship("ServiceRequestModel", back_populates="identifiers")


class ServiceRequestCategory(Base):
    """category[] — classifies the service being requested (e.g. laboratory, imaging)."""

    __tablename__ = "service_request_category"

    id = Column(Integer, primary_key=True, autoincrement=True)
    service_request_id = Column(
        Integer, ForeignKey("service_request.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    service_request = relationship("ServiceRequestModel", back_populates="categories")


class ServiceRequestOrderDetail(Base):
    """orderDetail[] — additional instructions about how the service is to be performed."""

    __tablename__ = "service_request_order_detail"

    id = Column(Integer, primary_key=True, autoincrement=True)
    service_request_id = Column(
        Integer, ForeignKey("service_request.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    service_request = relationship("ServiceRequestModel", back_populates="order_details")


class ServiceRequestPerformer(Base):
    """performer[] — who is requested to perform the service."""

    __tablename__ = "service_request_performer"

    id = Column(Integer, primary_key=True, autoincrement=True)
    service_request_id = Column(
        Integer, ForeignKey("service_request.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(ServiceRequestPerformerReferenceType, name="sr_performer_ref_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    service_request = relationship("ServiceRequestModel", back_populates="performers")


class ServiceRequestLocationCode(Base):
    """locationCode[] — where the requested service should happen (coded)."""

    __tablename__ = "service_request_location_code"

    id = Column(Integer, primary_key=True, autoincrement=True)
    service_request_id = Column(
        Integer, ForeignKey("service_request.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    service_request = relationship("ServiceRequestModel", back_populates="location_codes")


class ServiceRequestLocationReference(Base):
    """locationReference[] — where the requested service should happen (reference to Location)."""

    __tablename__ = "service_request_location_reference"

    id = Column(Integer, primary_key=True, autoincrement=True)
    service_request_id = Column(
        Integer, ForeignKey("service_request.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(ServiceRequestLocationReferenceType, name="sr_location_ref_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    service_request = relationship("ServiceRequestModel", back_populates="location_references")


class ServiceRequestReasonCode(Base):
    """reasonCode[] — coded explanation of why the service is requested."""

    __tablename__ = "service_request_reason_code"

    id = Column(Integer, primary_key=True, autoincrement=True)
    service_request_id = Column(
        Integer, ForeignKey("service_request.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    service_request = relationship("ServiceRequestModel", back_populates="reason_codes")


class ServiceRequestReasonReference(Base):
    """reasonReference[] — clinical record providing context for why the service is ordered."""

    __tablename__ = "service_request_reason_reference"

    id = Column(Integer, primary_key=True, autoincrement=True)
    service_request_id = Column(
        Integer, ForeignKey("service_request.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(ServiceRequestReasonReferenceType, name="sr_reason_ref_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    service_request = relationship("ServiceRequestModel", back_populates="reason_references")


class ServiceRequestInsurance(Base):
    """insurance[] — Coverage or ClaimResponse that may cover this service."""

    __tablename__ = "service_request_insurance"

    id = Column(Integer, primary_key=True, autoincrement=True)
    service_request_id = Column(
        Integer, ForeignKey("service_request.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(ServiceRequestInsuranceReferenceType, name="sr_insurance_ref_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    service_request = relationship("ServiceRequestModel", back_populates="insurance")


class ServiceRequestSupportingInfo(Base):
    """supportingInfo[] — additional clinical information relevant to the service request."""

    __tablename__ = "service_request_supporting_info"

    id = Column(Integer, primary_key=True, autoincrement=True)
    service_request_id = Column(
        Integer, ForeignKey("service_request.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    # Open reference — any FHIR resource type allowed
    reference_type = Column(String, nullable=True)
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    service_request = relationship("ServiceRequestModel", back_populates="supporting_info")


class ServiceRequestSpecimen(Base):
    """specimen[] — specimens to be used by the laboratory procedure."""

    __tablename__ = "service_request_specimen"

    id = Column(Integer, primary_key=True, autoincrement=True)
    service_request_id = Column(
        Integer, ForeignKey("service_request.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(ServiceRequestSpecimenReferenceType, name="sr_specimen_ref_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    service_request = relationship("ServiceRequestModel", back_populates="specimens")


class ServiceRequestBodySite(Base):
    """bodySite[] — anatomical location where the procedure should be performed."""

    __tablename__ = "service_request_body_site"

    id = Column(Integer, primary_key=True, autoincrement=True)
    service_request_id = Column(
        Integer, ForeignKey("service_request.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    service_request = relationship("ServiceRequestModel", back_populates="body_sites")


class ServiceRequestNote(Base):
    """note[] — Annotation comments about the service request."""

    __tablename__ = "service_request_note"

    id = Column(Integer, primary_key=True, autoincrement=True)
    service_request_id = Column(
        Integer, ForeignKey("service_request.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    text = Column(Text, nullable=False)
    time = Column(DateTime(timezone=True), nullable=True)

    # author[x] — string | Reference(Practitioner|Patient|RelatedPerson|Organization)
    author_string = Column(String, nullable=True)
    author_reference_type = Column(
        Enum(ServiceRequestNoteAuthorReferenceType, name="sr_note_author_ref_type"),
        nullable=True,
    )
    author_reference_id = Column(Integer, nullable=True)
    author_reference_display = Column(String, nullable=True)

    service_request = relationship("ServiceRequestModel", back_populates="notes")


class ServiceRequestRelevantHistory(Base):
    """relevantHistory[] — Reference(Provenance) records related to this request."""

    __tablename__ = "service_request_relevant_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    service_request_id = Column(
        Integer, ForeignKey("service_request.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(ServiceRequestRelevantHistoryReferenceType, name="sr_relevant_history_ref_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    service_request = relationship("ServiceRequestModel", back_populates="relevant_history")


class ServiceRequestBasedOn(Base):
    """basedOn[] — Reference(CarePlan|ServiceRequest|MedicationRequest) this fulfils."""

    __tablename__ = "service_request_based_on"

    id = Column(Integer, primary_key=True, autoincrement=True)
    service_request_id = Column(
        Integer, ForeignKey("service_request.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(ServiceRequestBasedOnReferenceType, name="sr_based_on_ref_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    service_request = relationship("ServiceRequestModel", back_populates="based_on")


class ServiceRequestReplaces(Base):
    """replaces[] — Reference(ServiceRequest) that this request supersedes."""

    __tablename__ = "service_request_replaces"

    id = Column(Integer, primary_key=True, autoincrement=True)
    service_request_id = Column(
        Integer, ForeignKey("service_request.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(ServiceRequestReplacesReferenceType, name="sr_replaces_ref_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    service_request = relationship("ServiceRequestModel", back_populates="replaces")
