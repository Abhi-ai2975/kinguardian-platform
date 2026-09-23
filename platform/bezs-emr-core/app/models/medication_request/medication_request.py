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
from app.models.medication_request.enums import (
    MedicationPerformerType,
    MedicationRecorderType,
    MedicationReportedReferenceType,
    MedicationRequestBasedOnReferenceType,
    MedicationRequestDetectedIssueReferenceType,
    MedicationRequestDispensePerformerType,
    MedicationRequestEventHistoryReferenceType,
    MedicationRequestInsuranceReferenceType,
    MedicationRequestIntent,
    MedicationRequestMedicationReferenceType,
    MedicationRequestNoteAuthorReferenceType,
    MedicationRequestPriority,
    MedicationRequestPriorPrescriptionType,
    MedicationRequestReasonReferenceType,
    MedicationRequestStatus,
    MedicationRequesterType,
    MedicationSubjectType,
)
from app.models.enums import EncounterReferenceType

medication_request_id_seq = Sequence("medication_request_pub_seq", start=90000, increment=1, metadata=Base.metadata)


class MedicationRequestModel(Base):
    __tablename__ = "medication_request"

    # Internal PK — never exposed
    id = Column(Integer, primary_key=True, autoincrement=True, index=True)

    # Public ID — used in all API responses and FHIR output
    medication_request_id = Column(
        Integer,
        medication_request_id_seq,
        server_default=medication_request_id_seq.next_value(),
        unique=True,
        index=True,
        nullable=False,
    )

    user_id = Column(String, nullable=True, index=True)
    org_id = Column(String, nullable=True, index=True)

    # ── Required fields ────────────────────────────────────────────────────────

    status = Column(Enum(MedicationRequestStatus, name="mr_status"), nullable=False, index=True)
    intent = Column(Enum(MedicationRequestIntent, name="mr_intent"), nullable=False)

    # ── statusReason (0..1 CodeableConcept) ───────────────────────────────────

    status_reason_system = Column(String, nullable=True)
    status_reason_code = Column(String, nullable=True)
    status_reason_display = Column(String, nullable=True)
    status_reason_text = Column(String, nullable=True)

    # ── Classification ─────────────────────────────────────────────────────────

    priority = Column(Enum(MedicationRequestPriority, name="mr_priority"), nullable=True)
    do_not_perform = Column(Boolean, nullable=True)

    # ── medication[x] — CodeableConcept | Reference(Medication) ──────────────
    # medication[x] is required (1..1) — at least one variant must be populated.

    # medicationCodeableConcept
    medication_code_system = Column(String, nullable=True)
    medication_code_code = Column(String, nullable=True, index=True)
    medication_code_display = Column(String, nullable=True)
    medication_code_text = Column(String, nullable=True)

    # medicationReference — Reference(Medication)
    medication_reference_type = Column(
        Enum(MedicationRequestMedicationReferenceType, name="mr_medication_ref_type"),
        nullable=True,
    )
    medication_reference_id = Column(Integer, nullable=True)
    medication_reference_display = Column(String, nullable=True)

    # ── subject — Reference(Patient | Group) ──────────────────────────────────

    subject_type = Column(
        Enum(MedicationSubjectType, name="mr_subject_type"), nullable=True
    )
    subject_id = Column(Integer, nullable=True, index=True)
    subject_display = Column(String, nullable=True)

    # ── encounter — Reference(Encounter) ──────────────────────────────────────

    encounter_type = Column(
        Enum(EncounterReferenceType, name="encounter_reference_type", create_type=False),
        nullable=True,
    )
    encounter_id = Column(Integer, ForeignKey("encounter.id"), nullable=True, index=True)
    encounter_display = Column(String, nullable=True)

    # ── Authoring metadata ────────────────────────────────────────────────────

    authored_on = Column(DateTime(timezone=True), nullable=True, index=True)

    # ── reported[x] — boolean | Reference(Patient|Practitioner|...) ──────────

    reported_boolean = Column(Boolean, nullable=True)
    reported_reference_type = Column(
        Enum(MedicationReportedReferenceType, name="mr_reported_ref_type"), nullable=True
    )
    reported_reference_id = Column(Integer, nullable=True)
    reported_reference_display = Column(String, nullable=True)

    # ── requester — Reference(Practitioner|PractitionerRole|Organization|Patient|RelatedPerson|Device) ──

    requester_type = Column(
        Enum(MedicationRequesterType, name="mr_requester_type"), nullable=True
    )
    requester_id = Column(Integer, nullable=True)
    requester_display = Column(String, nullable=True)

    # ── performer — 0..1 single reference in R4 ───────────────────────────────

    performer_type = Column(
        Enum(MedicationPerformerType, name="mr_performer_type"), nullable=True
    )
    performer_id = Column(Integer, nullable=True)
    performer_display = Column(String, nullable=True)

    # ── performerType — CodeableConcept (role/type of performer wanted) ───────

    performer_type_system = Column(String, nullable=True)
    performer_type_code = Column(String, nullable=True)
    performer_type_display = Column(String, nullable=True)
    performer_type_text = Column(String, nullable=True)

    # ── recorder — Reference(Practitioner | PractitionerRole) ────────────────

    recorder_type = Column(
        Enum(MedicationRecorderType, name="mr_recorder_type"), nullable=True
    )
    recorder_id = Column(Integer, nullable=True)
    recorder_display = Column(String, nullable=True)

    # ── groupIdentifier — 0..1 Identifier (full datatype) ────────────────────

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

    # ── courseOfTherapyType — 0..1 CodeableConcept ────────────────────────────

    course_of_therapy_type_system = Column(String, nullable=True)
    course_of_therapy_type_code = Column(String, nullable=True)
    course_of_therapy_type_display = Column(String, nullable=True)
    course_of_therapy_type_text = Column(String, nullable=True)

    # ── priorPrescription — 0..1 Reference(MedicationRequest) ────────────────

    prior_prescription_type = Column(
        Enum(MedicationRequestPriorPrescriptionType, name="mr_prior_prescription_type"),
        nullable=True,
    )
    prior_prescription_id = Column(Integer, nullable=True)
    prior_prescription_display = Column(String, nullable=True)

    # ── instantiates ──────────────────────────────────────────────────────────

    instantiates_canonical = Column(Text, nullable=True)  # comma-separated URIs
    instantiates_uri = Column(Text, nullable=True)         # comma-separated URIs

    # ── dispenseRequest — 0..1 BackboneElement (flattened) ───────────────────

    # initialFill.quantity (SimpleQuantity)
    dispense_initial_fill_quantity_value = Column(Float, nullable=True)
    dispense_initial_fill_quantity_unit = Column(String, nullable=True)
    dispense_initial_fill_quantity_system = Column(String, nullable=True)
    dispense_initial_fill_quantity_code = Column(String, nullable=True)

    # initialFill.duration (Duration)
    dispense_initial_fill_duration_value = Column(Float, nullable=True)
    dispense_initial_fill_duration_unit = Column(String, nullable=True)  # s|min|h|d|wk|mo|a

    # dispenseInterval (Duration)
    dispense_interval_value = Column(Float, nullable=True)
    dispense_interval_unit = Column(String, nullable=True)

    # validityPeriod (Period)
    dispense_validity_period_start = Column(DateTime(timezone=True), nullable=True)
    dispense_validity_period_end = Column(DateTime(timezone=True), nullable=True)

    # numberOfRepeatsAllowed
    dispense_number_of_repeats_allowed = Column(Integer, nullable=True)

    # quantity (SimpleQuantity)
    dispense_quantity_value = Column(Float, nullable=True)
    dispense_quantity_unit = Column(String, nullable=True)
    dispense_quantity_system = Column(String, nullable=True)
    dispense_quantity_code = Column(String, nullable=True)

    # expectedSupplyDuration (Duration)
    dispense_expected_supply_duration_value = Column(Float, nullable=True)
    dispense_expected_supply_duration_unit = Column(String, nullable=True)

    # performer — Reference(Organization)
    dispense_performer_type = Column(
        Enum(MedicationRequestDispensePerformerType, name="mr_dispense_performer_type"),
        nullable=True,
    )
    dispense_performer_id = Column(Integer, nullable=True)
    dispense_performer_display = Column(String, nullable=True)

    # ── substitution — 0..1 BackboneElement (flattened) ──────────────────────

    # allowed[x] — boolean | CodeableConcept (required when substitution is present)
    substitution_allowed_boolean = Column(Boolean, nullable=True)
    substitution_allowed_system = Column(String, nullable=True)
    substitution_allowed_code = Column(String, nullable=True)
    substitution_allowed_display = Column(String, nullable=True)
    substitution_allowed_text = Column(String, nullable=True)

    # reason (CodeableConcept)
    substitution_reason_system = Column(String, nullable=True)
    substitution_reason_code = Column(String, nullable=True)
    substitution_reason_display = Column(String, nullable=True)
    substitution_reason_text = Column(String, nullable=True)

    # ── Audit ─────────────────────────────────────────────────────────────────

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String, nullable=True)
    updated_by = Column(String, nullable=True)

    # ── Relationships ─────────────────────────────────────────────────────────

    encounter = relationship("EncounterModel", foreign_keys=[encounter_id], lazy="selectin")

    identifiers = relationship(
        "MedicationRequestIdentifier",
        back_populates="medication_request",
        cascade="all, delete-orphan",
    )
    categories = relationship(
        "MedicationRequestCategory",
        back_populates="medication_request",
        cascade="all, delete-orphan",
    )
    supporting_info = relationship(
        "MedicationRequestSupportingInfo",
        back_populates="medication_request",
        cascade="all, delete-orphan",
    )
    reason_codes = relationship(
        "MedicationRequestReasonCode",
        back_populates="medication_request",
        cascade="all, delete-orphan",
    )
    reason_references = relationship(
        "MedicationRequestReasonReference",
        back_populates="medication_request",
        cascade="all, delete-orphan",
    )
    based_on = relationship(
        "MedicationRequestBasedOn",
        back_populates="medication_request",
        cascade="all, delete-orphan",
    )
    insurance = relationship(
        "MedicationRequestInsurance",
        back_populates="medication_request",
        cascade="all, delete-orphan",
    )
    notes = relationship(
        "MedicationRequestNote",
        back_populates="medication_request",
        cascade="all, delete-orphan",
    )
    dosage_instructions = relationship(
        "MedicationRequestDosageInstruction",
        back_populates="medication_request",
        cascade="all, delete-orphan",
        order_by="MedicationRequestDosageInstruction.sequence",
    )
    detected_issues = relationship(
        "MedicationRequestDetectedIssue",
        back_populates="medication_request",
        cascade="all, delete-orphan",
    )
    event_history = relationship(
        "MedicationRequestEventHistory",
        back_populates="medication_request",
        cascade="all, delete-orphan",
    )


# ── Sub-resource tables ────────────────────────────────────────────────────────


class MedicationRequestIdentifier(Base):
    """identifier[] — business identifiers assigned to this prescription."""

    __tablename__ = "medication_request_identifier"

    id = Column(Integer, primary_key=True, autoincrement=True)
    medication_request_id = Column(
        Integer, ForeignKey("medication_request.id"), nullable=False, index=True
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

    medication_request = relationship("MedicationRequestModel", back_populates="identifiers")


class MedicationRequestCategory(Base):
    """category[] — type of medication usage (inpatient | outpatient | community | discharge)."""

    __tablename__ = "medication_request_category"

    id = Column(Integer, primary_key=True, autoincrement=True)
    medication_request_id = Column(
        Integer, ForeignKey("medication_request.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    medication_request = relationship("MedicationRequestModel", back_populates="categories")


class MedicationRequestSupportingInfo(Base):
    """supportingInformation[] — additional clinical context for the prescription."""

    __tablename__ = "medication_request_supporting_info"

    id = Column(Integer, primary_key=True, autoincrement=True)
    medication_request_id = Column(
        Integer, ForeignKey("medication_request.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    # Open reference — any FHIR resource type allowed
    reference_type = Column(String, nullable=True)
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    medication_request = relationship("MedicationRequestModel", back_populates="supporting_info")


class MedicationRequestReasonCode(Base):
    """reasonCode[] — coded reason or indication for the prescription."""

    __tablename__ = "medication_request_reason_code"

    id = Column(Integer, primary_key=True, autoincrement=True)
    medication_request_id = Column(
        Integer, ForeignKey("medication_request.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    medication_request = relationship("MedicationRequestModel", back_populates="reason_codes")


class MedicationRequestReasonReference(Base):
    """reasonReference[] — Reference(Condition|Observation) justifying the prescription."""

    __tablename__ = "medication_request_reason_reference"

    id = Column(Integer, primary_key=True, autoincrement=True)
    medication_request_id = Column(
        Integer, ForeignKey("medication_request.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(MedicationRequestReasonReferenceType, name="mr_reason_ref_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    medication_request = relationship("MedicationRequestModel", back_populates="reason_references")


class MedicationRequestBasedOn(Base):
    """basedOn[] — Reference(CarePlan|MedicationRequest|ServiceRequest|ImmunizationRecommendation)."""

    __tablename__ = "medication_request_based_on"

    id = Column(Integer, primary_key=True, autoincrement=True)
    medication_request_id = Column(
        Integer, ForeignKey("medication_request.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(MedicationRequestBasedOnReferenceType, name="mr_based_on_ref_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    medication_request = relationship("MedicationRequestModel", back_populates="based_on")


class MedicationRequestInsurance(Base):
    """insurance[] — Reference(Coverage|ClaimResponse) covering the medication."""

    __tablename__ = "medication_request_insurance"

    id = Column(Integer, primary_key=True, autoincrement=True)
    medication_request_id = Column(
        Integer, ForeignKey("medication_request.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(MedicationRequestInsuranceReferenceType, name="mr_insurance_ref_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    medication_request = relationship("MedicationRequestModel", back_populates="insurance")


class MedicationRequestNote(Base):
    """note[] — Annotation comments about the prescription."""

    __tablename__ = "medication_request_note"

    id = Column(Integer, primary_key=True, autoincrement=True)
    medication_request_id = Column(
        Integer, ForeignKey("medication_request.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    text = Column(Text, nullable=False)
    time = Column(DateTime(timezone=True), nullable=True)

    # author[x] — string | Reference(Practitioner|Patient|RelatedPerson|Organization)
    author_string = Column(String, nullable=True)
    author_reference_type = Column(
        Enum(MedicationRequestNoteAuthorReferenceType, name="mr_note_author_ref_type"),
        nullable=True,
    )
    author_reference_id = Column(Integer, nullable=True)
    author_reference_display = Column(String, nullable=True)

    medication_request = relationship("MedicationRequestModel", back_populates="notes")


class MedicationRequestDosageInstruction(Base):
    """dosageInstruction[] — how the medication should be taken (Dosage datatype)."""

    __tablename__ = "medication_request_dosage_instruction"

    id = Column(Integer, primary_key=True, autoincrement=True)
    medication_request_id = Column(
        Integer, ForeignKey("medication_request.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    # sequence — ordering of dosage instructions
    sequence = Column(Integer, nullable=True)

    # text — free-text dosage instruction
    text = Column(Text, nullable=True)

    # patientInstruction — patient-friendly instructions
    patient_instruction = Column(Text, nullable=True)

    # asNeeded[x] — boolean | CodeableConcept
    as_needed_boolean = Column(Boolean, nullable=True)
    as_needed_system = Column(String, nullable=True)
    as_needed_code = Column(String, nullable=True)
    as_needed_display = Column(String, nullable=True)
    as_needed_text = Column(String, nullable=True)

    # site — CodeableConcept (body site for administration)
    site_system = Column(String, nullable=True)
    site_code = Column(String, nullable=True)
    site_display = Column(String, nullable=True)
    site_text = Column(String, nullable=True)

    # route — CodeableConcept (how drug enters the body)
    route_system = Column(String, nullable=True)
    route_code = Column(String, nullable=True)
    route_display = Column(String, nullable=True)
    route_text = Column(String, nullable=True)

    # method — CodeableConcept (technique for administering)
    method_system = Column(String, nullable=True)
    method_code = Column(String, nullable=True)
    method_display = Column(String, nullable=True)
    method_text = Column(String, nullable=True)

    # ── timing (flattened Timing datatype) ────────────────────────────────────

    # timing.code — CodeableConcept (e.g. BID, TID, QID)
    timing_code_system = Column(String, nullable=True)
    timing_code_code = Column(String, nullable=True)
    timing_code_display = Column(String, nullable=True)

    # timing.repeat fields
    timing_repeat_bounds_start = Column(DateTime(timezone=True), nullable=True)
    timing_repeat_bounds_end = Column(DateTime(timezone=True), nullable=True)
    timing_repeat_count = Column(Integer, nullable=True)
    timing_repeat_count_max = Column(Integer, nullable=True)
    timing_repeat_duration = Column(Float, nullable=True)
    timing_repeat_duration_max = Column(Float, nullable=True)
    timing_repeat_duration_unit = Column(String, nullable=True)  # s|min|h|d|wk|mo|a
    timing_repeat_frequency = Column(Integer, nullable=True)
    timing_repeat_frequency_max = Column(Integer, nullable=True)
    timing_repeat_period = Column(Float, nullable=True)
    timing_repeat_period_max = Column(Float, nullable=True)
    timing_repeat_period_unit = Column(String, nullable=True)    # s|min|h|d|wk|mo|a
    timing_repeat_day_of_week = Column(String, nullable=True)    # comma-separated: mon|tue|...
    timing_repeat_time_of_day = Column(String, nullable=True)    # comma-separated HH:MM
    timing_repeat_when = Column(String, nullable=True)           # comma-separated event codes
    timing_repeat_offset = Column(Integer, nullable=True)        # minutes from event

    # ── maxDose fields ────────────────────────────────────────────────────────

    # maxDosePerPeriod (Ratio)
    max_dose_per_period_numerator_value = Column(Float, nullable=True)
    max_dose_per_period_numerator_unit = Column(String, nullable=True)
    max_dose_per_period_denominator_value = Column(Float, nullable=True)
    max_dose_per_period_denominator_unit = Column(String, nullable=True)

    # maxDosePerAdministration (SimpleQuantity)
    max_dose_per_administration_value = Column(Float, nullable=True)
    max_dose_per_administration_unit = Column(String, nullable=True)

    # maxDosePerLifetime (SimpleQuantity)
    max_dose_per_lifetime_value = Column(Float, nullable=True)
    max_dose_per_lifetime_unit = Column(String, nullable=True)

    medication_request = relationship(
        "MedicationRequestModel", back_populates="dosage_instructions"
    )
    additional_instructions = relationship(
        "MedicationRequestDosageAdditionalInstruction",
        back_populates="dosage_instruction",
        cascade="all, delete-orphan",
    )
    dose_and_rates = relationship(
        "MedicationRequestDosageDoseAndRate",
        back_populates="dosage_instruction",
        cascade="all, delete-orphan",
    )


class MedicationRequestDosageAdditionalInstruction(Base):
    """dosageInstruction[].additionalInstruction[] — supplemental coded instructions."""

    __tablename__ = "medication_request_dosage_additional_instruction"

    id = Column(Integer, primary_key=True, autoincrement=True)
    dosage_instruction_id = Column(
        Integer,
        ForeignKey("medication_request_dosage_instruction.id"),
        nullable=False,
        index=True,
    )
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    dosage_instruction = relationship(
        "MedicationRequestDosageInstruction", back_populates="additional_instructions"
    )


class MedicationRequestDosageDoseAndRate(Base):
    """dosageInstruction[].doseAndRate[] — amount of medication per dose."""

    __tablename__ = "medication_request_dosage_dose_and_rate"

    id = Column(Integer, primary_key=True, autoincrement=True)
    dosage_instruction_id = Column(
        Integer,
        ForeignKey("medication_request_dosage_instruction.id"),
        nullable=False,
        index=True,
    )
    org_id = Column(String, nullable=True)

    # type — CodeableConcept (calculated | ordered | protocol-defined)
    type_system = Column(String, nullable=True)
    type_code = Column(String, nullable=True)
    type_display = Column(String, nullable=True)

    # dose[x] — SimpleQuantity | Range
    dose_quantity_value = Column(Float, nullable=True)
    dose_quantity_unit = Column(String, nullable=True)
    dose_quantity_system = Column(String, nullable=True)
    dose_quantity_code = Column(String, nullable=True)
    dose_range_low_value = Column(Float, nullable=True)
    dose_range_low_unit = Column(String, nullable=True)
    dose_range_high_value = Column(Float, nullable=True)
    dose_range_high_unit = Column(String, nullable=True)

    # rate[x] — Ratio | Range | SimpleQuantity
    rate_ratio_numerator_value = Column(Float, nullable=True)
    rate_ratio_numerator_unit = Column(String, nullable=True)
    rate_ratio_denominator_value = Column(Float, nullable=True)
    rate_ratio_denominator_unit = Column(String, nullable=True)
    rate_range_low_value = Column(Float, nullable=True)
    rate_range_low_unit = Column(String, nullable=True)
    rate_range_high_value = Column(Float, nullable=True)
    rate_range_high_unit = Column(String, nullable=True)
    rate_quantity_value = Column(Float, nullable=True)
    rate_quantity_unit = Column(String, nullable=True)
    rate_quantity_system = Column(String, nullable=True)
    rate_quantity_code = Column(String, nullable=True)

    dosage_instruction = relationship(
        "MedicationRequestDosageInstruction", back_populates="dose_and_rates"
    )


class MedicationRequestDetectedIssue(Base):
    """detectedIssue[] — Reference(DetectedIssue) clinical issues with the prescription."""

    __tablename__ = "medication_request_detected_issue"

    id = Column(Integer, primary_key=True, autoincrement=True)
    medication_request_id = Column(
        Integer, ForeignKey("medication_request.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(MedicationRequestDetectedIssueReferenceType, name="mr_detected_issue_ref_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    medication_request = relationship("MedicationRequestModel", back_populates="detected_issues")


class MedicationRequestEventHistory(Base):
    """eventHistory[] — Reference(Provenance) records of key lifecycle transitions."""

    __tablename__ = "medication_request_event_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    medication_request_id = Column(
        Integer, ForeignKey("medication_request.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(MedicationRequestEventHistoryReferenceType, name="mr_event_history_ref_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    medication_request = relationship("MedicationRequestModel", back_populates="event_history")
