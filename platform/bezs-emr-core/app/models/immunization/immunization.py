from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    Sequence,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import FHIRBase as Base
from app.models.enums import EncounterReferenceType, OrganizationReferenceType
from app.models.immunization.enums import (
    ImmunizationLocationReferenceType,
    ImmunizationPatientReferenceType,
    ImmunizationPerformerActorReferenceType,
    ImmunizationReactionDetailReferenceType,
    ImmunizationReasonReferenceType,
    ImmunizationStatus,
)

immunization_id_seq = Sequence("immunization_pub_seq", start=330000, increment=1, metadata=Base.metadata)


# ---------------------------------------------------------------------------
# Main table
# ---------------------------------------------------------------------------


class ImmunizationModel(Base):
    __tablename__ = "immunization"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    immunization_id = Column(
        Integer,
        immunization_id_seq,
        server_default=immunization_id_seq.next_value(),
        unique=True,
        index=True,
        nullable=False,
    )
    user_id = Column(String, nullable=True, index=True)
    org_id = Column(String, nullable=True, index=True)

    # status (1..1 code)
    status = Column(
        Enum(ImmunizationStatus, name="immunization_status"),
        nullable=False,
    )

    # statusReason (0..1 CodeableConcept)
    status_reason_system = Column(String, nullable=True)
    status_reason_code = Column(String, nullable=True)
    status_reason_display = Column(String, nullable=True)
    status_reason_text = Column(String, nullable=True)

    # vaccineCode (1..1 CodeableConcept)
    vaccine_code_system = Column(String, nullable=True)
    vaccine_code_code = Column(String, nullable=True)
    vaccine_code_display = Column(String, nullable=True)
    vaccine_code_text = Column(String, nullable=True)

    # patient (1..1 Reference(Patient))
    patient_type = Column(
        Enum(ImmunizationPatientReferenceType, name="immunization_patient_reference_type"),
        nullable=True,
    )
    patient_id = Column(Integer, nullable=True)
    patient_display = Column(String, nullable=True)

    # encounter (0..1 Reference(Encounter)) — shared enum
    encounter_type = Column(
        Enum(EncounterReferenceType, name="encounter_reference_type", create_type=False),
        nullable=True,
    )
    encounter_id = Column(Integer, nullable=True)
    encounter_display = Column(String, nullable=True)

    # occurrence[x] (1..1 dateTime | string)
    occurrence_datetime = Column(DateTime(timezone=True), nullable=True)
    occurrence_string = Column(String, nullable=True)

    # recorded (0..1 dateTime)
    recorded = Column(DateTime(timezone=True), nullable=True)

    # primarySource (0..1 boolean)
    primary_source = Column(Boolean, nullable=True)

    # reportOrigin (0..1 CodeableConcept)
    report_origin_system = Column(String, nullable=True)
    report_origin_code = Column(String, nullable=True)
    report_origin_display = Column(String, nullable=True)
    report_origin_text = Column(String, nullable=True)

    # location (0..1 Reference(Location))
    location_type = Column(
        Enum(ImmunizationLocationReferenceType, name="immunization_location_reference_type"),
        nullable=True,
    )
    location_id = Column(Integer, nullable=True)
    location_display = Column(String, nullable=True)

    # manufacturer (0..1 Reference(Organization)) — shared enum + FK
    manufacturer_type = Column(
        Enum(OrganizationReferenceType, name="organization_reference_type", create_type=False),
        nullable=True,
    )
    manufacturer_id = Column(Integer, ForeignKey("organization.id"), nullable=True, index=True)
    manufacturer_display = Column(String, nullable=True)
    manufacturer = relationship("OrganizationModel", foreign_keys=[manufacturer_id], lazy="selectin")

    # lotNumber (0..1 string)
    lot_number = Column(String, nullable=True)

    # expirationDate (0..1 date)
    expiration_date = Column(Date, nullable=True)

    # site (0..1 CodeableConcept)
    site_system = Column(String, nullable=True)
    site_code = Column(String, nullable=True)
    site_display = Column(String, nullable=True)
    site_text = Column(String, nullable=True)

    # route (0..1 CodeableConcept)
    route_system = Column(String, nullable=True)
    route_code = Column(String, nullable=True)
    route_display = Column(String, nullable=True)
    route_text = Column(String, nullable=True)

    # doseQuantity (0..1 SimpleQuantity)
    dose_quantity_value = Column(Numeric, nullable=True)
    dose_quantity_unit = Column(String, nullable=True)
    dose_quantity_system = Column(String, nullable=True)
    dose_quantity_code = Column(String, nullable=True)

    # isSubpotent (0..1 boolean)
    is_subpotent = Column(Boolean, nullable=True)

    # fundingSource (0..1 CodeableConcept)
    funding_source_system = Column(String, nullable=True)
    funding_source_code = Column(String, nullable=True)
    funding_source_display = Column(String, nullable=True)
    funding_source_text = Column(String, nullable=True)

    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String, nullable=True)
    updated_by = Column(String, nullable=True)

    # Relationships
    identifiers = relationship("ImmunizationIdentifier", back_populates="immunization", cascade="all, delete-orphan")
    performers = relationship("ImmunizationPerformer", back_populates="immunization", cascade="all, delete-orphan")
    notes = relationship("ImmunizationNote", back_populates="immunization", cascade="all, delete-orphan")
    reason_codes = relationship("ImmunizationReasonCode", back_populates="immunization", cascade="all, delete-orphan")
    reason_references = relationship("ImmunizationReasonReference", back_populates="immunization", cascade="all, delete-orphan")
    subpotent_reasons = relationship("ImmunizationSubpotentReason", back_populates="immunization", cascade="all, delete-orphan")
    educations = relationship("ImmunizationEducation", back_populates="immunization", cascade="all, delete-orphan")
    program_eligibilities = relationship("ImmunizationProgramEligibility", back_populates="immunization", cascade="all, delete-orphan")
    reactions = relationship("ImmunizationReaction", back_populates="immunization", cascade="all, delete-orphan")
    protocol_applied = relationship("ImmunizationProtocolApplied", back_populates="immunization", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# identifier (0..*) — Identifier child table
# ---------------------------------------------------------------------------


class ImmunizationIdentifier(Base):
    __tablename__ = "immunization_identifier"

    id = Column(Integer, primary_key=True, autoincrement=True)
    immunization_id = Column(Integer, ForeignKey("immunization.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    use = Column(String, nullable=True)
    type_system = Column(String, nullable=True)
    type_code = Column(String, nullable=True)
    type_display = Column(String, nullable=True)
    type_text = Column(String, nullable=True)
    system = Column(String, nullable=True)
    value = Column(String, nullable=True)
    period_start = Column(DateTime(timezone=True), nullable=True)
    period_end = Column(DateTime(timezone=True), nullable=True)
    assigner = Column(String, nullable=True)

    immunization = relationship("ImmunizationModel", back_populates="identifiers")


# ---------------------------------------------------------------------------
# performer (0..*) — BackboneElement child table
# ---------------------------------------------------------------------------


class ImmunizationPerformer(Base):
    __tablename__ = "immunization_performer"

    id = Column(Integer, primary_key=True, autoincrement=True)
    immunization_id = Column(Integer, ForeignKey("immunization.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    # function (0..1 CodeableConcept)
    function_system = Column(String, nullable=True)
    function_code = Column(String, nullable=True)
    function_display = Column(String, nullable=True)
    function_text = Column(String, nullable=True)

    # actor (1..1 Reference(Practitioner|PractitionerRole|Organization))
    reference_type = Column(
        Enum(ImmunizationPerformerActorReferenceType, name="immunization_performer_actor_reference_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    immunization = relationship("ImmunizationModel", back_populates="performers")


# ---------------------------------------------------------------------------
# note (0..*) — Annotation child table
# ---------------------------------------------------------------------------


class ImmunizationNote(Base):
    __tablename__ = "immunization_note"

    id = Column(Integer, primary_key=True, autoincrement=True)
    immunization_id = Column(Integer, ForeignKey("immunization.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    text = Column(Text, nullable=False)
    time = Column(DateTime(timezone=True), nullable=True)
    author_string = Column(String, nullable=True)
    author_reference_type = Column(String, nullable=True)
    author_reference_id = Column(Integer, nullable=True)
    author_reference_display = Column(String, nullable=True)

    immunization = relationship("ImmunizationModel", back_populates="notes")


# ---------------------------------------------------------------------------
# reasonCode (0..*) — CodeableConcept child table
# ---------------------------------------------------------------------------


class ImmunizationReasonCode(Base):
    __tablename__ = "immunization_reason_code"

    id = Column(Integer, primary_key=True, autoincrement=True)
    immunization_id = Column(Integer, ForeignKey("immunization.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    immunization = relationship("ImmunizationModel", back_populates="reason_codes")


# ---------------------------------------------------------------------------
# reasonReference (0..*) — Reference child table
# ---------------------------------------------------------------------------


class ImmunizationReasonReference(Base):
    __tablename__ = "immunization_reason_reference"

    id = Column(Integer, primary_key=True, autoincrement=True)
    immunization_id = Column(Integer, ForeignKey("immunization.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(ImmunizationReasonReferenceType, name="immunization_reason_reference_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    immunization = relationship("ImmunizationModel", back_populates="reason_references")


# ---------------------------------------------------------------------------
# subpotentReason (0..*) — CodeableConcept child table
# ---------------------------------------------------------------------------


class ImmunizationSubpotentReason(Base):
    __tablename__ = "immunization_subpotent_reason"

    id = Column(Integer, primary_key=True, autoincrement=True)
    immunization_id = Column(Integer, ForeignKey("immunization.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    immunization = relationship("ImmunizationModel", back_populates="subpotent_reasons")


# ---------------------------------------------------------------------------
# education (0..*) — BackboneElement child table
# ---------------------------------------------------------------------------


class ImmunizationEducation(Base):
    __tablename__ = "immunization_education"

    id = Column(Integer, primary_key=True, autoincrement=True)
    immunization_id = Column(Integer, ForeignKey("immunization.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    document_type = Column(String, nullable=True)
    reference = Column(String, nullable=True)
    publication_date = Column(DateTime(timezone=True), nullable=True)
    presentation_date = Column(DateTime(timezone=True), nullable=True)

    immunization = relationship("ImmunizationModel", back_populates="educations")


# ---------------------------------------------------------------------------
# programEligibility (0..*) — CodeableConcept child table
# ---------------------------------------------------------------------------


class ImmunizationProgramEligibility(Base):
    __tablename__ = "immunization_program_eligibility"

    id = Column(Integer, primary_key=True, autoincrement=True)
    immunization_id = Column(Integer, ForeignKey("immunization.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    immunization = relationship("ImmunizationModel", back_populates="program_eligibilities")


# ---------------------------------------------------------------------------
# reaction (0..*) — BackboneElement child table
# ---------------------------------------------------------------------------


class ImmunizationReaction(Base):
    __tablename__ = "immunization_reaction"

    id = Column(Integer, primary_key=True, autoincrement=True)
    immunization_id = Column(Integer, ForeignKey("immunization.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    date = Column(DateTime(timezone=True), nullable=True)

    # detail (0..1 Reference(Observation))
    detail_type = Column(
        Enum(ImmunizationReactionDetailReferenceType, name="immunization_reaction_detail_reference_type"),
        nullable=True,
    )
    detail_id = Column(Integer, nullable=True)
    detail_display = Column(String, nullable=True)

    reported = Column(Boolean, nullable=True)

    immunization = relationship("ImmunizationModel", back_populates="reactions")


# ---------------------------------------------------------------------------
# protocolApplied (0..*) — BackboneElement child table
# ---------------------------------------------------------------------------


class ImmunizationProtocolApplied(Base):
    __tablename__ = "immunization_protocol_applied"

    id = Column(Integer, primary_key=True, autoincrement=True)
    immunization_id = Column(Integer, ForeignKey("immunization.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    series = Column(String, nullable=True)

    # authority (0..1 Reference(Organization)) — shared enum, no FK on child table
    authority_type = Column(
        Enum(OrganizationReferenceType, name="organization_reference_type", create_type=False),
        nullable=True,
    )
    authority_id = Column(Integer, nullable=True)
    authority_display = Column(String, nullable=True)

    # doseNumber[x] (1..1 positiveInt | string)
    dose_number_positive_int = Column(Integer, nullable=True)
    dose_number_string = Column(String, nullable=True)

    # seriesDoses[x] (0..1 positiveInt | string)
    series_doses_positive_int = Column(Integer, nullable=True)
    series_doses_string = Column(String, nullable=True)

    immunization = relationship("ImmunizationModel", back_populates="protocol_applied")
    target_diseases = relationship(
        "ImmunizationProtocolAppliedTargetDisease",
        back_populates="protocol_applied",
        cascade="all, delete-orphan",
    )


# ---------------------------------------------------------------------------
# protocolApplied.targetDisease (0..*) — grandchild CodeableConcept table
# ---------------------------------------------------------------------------


class ImmunizationProtocolAppliedTargetDisease(Base):
    __tablename__ = "immunization_protocol_applied_target_disease"

    id = Column(Integer, primary_key=True, autoincrement=True)
    protocol_applied_id = Column(Integer, ForeignKey("immunization_protocol_applied.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    protocol_applied = relationship("ImmunizationProtocolApplied", back_populates="target_diseases")
