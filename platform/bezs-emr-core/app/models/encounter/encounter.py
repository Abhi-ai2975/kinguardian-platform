from sqlalchemy import (
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
from app.models.encounter.enums import (
    EncounterStatus,
    EncounterLocationStatus,
    EncounterParticipantReferenceType,
    EncounterBasedOnReferenceType,
    EncounterDiagnosisConditionType,
    EncounterServiceTypeReferenceType,
    EncounterReasonValueReferenceType,
    EncounterEpisodeOfCareReferenceType,
    EncounterCareTeamReferenceType,
    EncounterAppointmentReferenceType,
    EncounterAccountReferenceType,
    EncounterLocationReferenceType,
)
from app.models.enums import SubjectReferenceType, OrganizationReferenceType

encounter_id_seq = Sequence("encounter_pub_seq", start=20000, increment=1, metadata=Base.metadata)


class EncounterModel(Base):
    __tablename__ = "encounter"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    encounter_id = Column(
        Integer,
        encounter_id_seq,
        server_default=encounter_id_seq.next_value(),
        unique=True,
        index=True,
        nullable=False,
    )

    user_id = Column(String, nullable=True, index=True)
    org_id = Column(String, nullable=True, index=True)

    # status (1..1) — R5 value set
    status = Column(Enum(EncounterStatus, name="encounter_status"), nullable=True)

    # priority (0..1 CodeableConcept) — flat columns
    priority_system = Column(String, nullable=True)
    priority_code = Column(String, nullable=True)
    priority_display = Column(String, nullable=True)
    priority_text = Column(String, nullable=True)

    # subject (0..1 Reference(Patient|Group))
    subject_type = Column(
        Enum(SubjectReferenceType, name="subject_reference_type"),
        nullable=True,
    )
    subject_id = Column(Integer, nullable=True)
    subject_display = Column(String, nullable=True)

    # subjectStatus (0..1 CodeableConcept) — R5 new
    subject_status_system = Column(String, nullable=True)
    subject_status_code = Column(String, nullable=True)
    subject_status_display = Column(String, nullable=True)
    subject_status_text = Column(String, nullable=True)

    # actualPeriod (0..1 Period) — R5 renamed from period
    actual_period_start = Column(DateTime(timezone=True), nullable=True)
    actual_period_end = Column(DateTime(timezone=True), nullable=True)

    # plannedStartDate / plannedEndDate (0..1 dateTime) — R5 new
    planned_start_date = Column(DateTime(timezone=True), nullable=True)
    planned_end_date = Column(DateTime(timezone=True), nullable=True)

    # length (0..1 Duration) — flat columns
    length_value = Column(Float, nullable=True)
    length_comparator = Column(String, nullable=True)
    length_unit = Column(String, nullable=True)
    length_system = Column(String, nullable=True)
    length_code = Column(String, nullable=True)

    # serviceProvider (0..1 Reference(Organization))
    service_provider_type = Column(
        Enum(OrganizationReferenceType, name="organization_reference_type", create_type=False),
        nullable=True,
    )
    service_provider_id = Column(Integer, nullable=True)
    service_provider_display = Column(String, nullable=True)

    # partOf (0..1 Reference(Encounter)) — store the public encounter_id
    part_of_id = Column(Integer, nullable=True)

    # admission (0..1 BackboneElement) — R5 renamed from hospitalization
    # preAdmissionIdentifier (0..1 Identifier)
    admission_pre_admission_identifier_system = Column(String, nullable=True)
    admission_pre_admission_identifier_value = Column(String, nullable=True)
    # origin (0..1 Reference(Location|Organization))
    admission_origin_type = Column(String, nullable=True)
    admission_origin_id = Column(Integer, nullable=True)
    admission_origin_display = Column(String, nullable=True)
    # admitSource (0..1 CodeableConcept)
    admission_admit_source_system = Column(String, nullable=True)
    admission_admit_source_code = Column(String, nullable=True)
    admission_admit_source_display = Column(String, nullable=True)
    admission_admit_source_text = Column(String, nullable=True)
    # reAdmission (0..1 CodeableConcept)
    admission_re_admission_system = Column(String, nullable=True)
    admission_re_admission_code = Column(String, nullable=True)
    admission_re_admission_display = Column(String, nullable=True)
    admission_re_admission_text = Column(String, nullable=True)
    # destination (0..1 Reference(Location|Organization))
    admission_destination_type = Column(String, nullable=True)
    admission_destination_id = Column(Integer, nullable=True)
    admission_destination_display = Column(String, nullable=True)
    # dischargeDisposition (0..1 CodeableConcept)
    admission_discharge_disposition_system = Column(String, nullable=True)
    admission_discharge_disposition_code = Column(String, nullable=True)
    admission_discharge_disposition_display = Column(String, nullable=True)
    admission_discharge_disposition_text = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String, nullable=True)
    updated_by = Column(String, nullable=True)

    # Relationships
    identifiers = relationship(
        "EncounterIdentifier", back_populates="encounter", cascade="all, delete-orphan"
    )
    status_history = relationship(
        "EncounterStatusHistory", back_populates="encounter", cascade="all, delete-orphan"
    )
    # classHistory kept for R4 backward compat — R5 removed this element
    class_history = relationship(
        "EncounterClassHistory", back_populates="encounter", cascade="all, delete-orphan"
    )
    classes = relationship(
        "EncounterClass", back_populates="encounter", cascade="all, delete-orphan"
    )
    service_types = relationship(
        "EncounterServiceType", back_populates="encounter", cascade="all, delete-orphan"
    )
    business_statuses = relationship(
        "EncounterBusinessStatus", back_populates="encounter", cascade="all, delete-orphan"
    )
    types = relationship(
        "EncounterType", back_populates="encounter", cascade="all, delete-orphan"
    )
    episode_of_cares = relationship(
        "EncounterEpisodeOfCare", back_populates="encounter", cascade="all, delete-orphan"
    )
    based_ons = relationship(
        "EncounterBasedOn", back_populates="encounter", cascade="all, delete-orphan"
    )
    care_teams = relationship(
        "EncounterCareTeam", back_populates="encounter", cascade="all, delete-orphan"
    )
    participants = relationship(
        "EncounterParticipant", back_populates="encounter", cascade="all, delete-orphan"
    )
    appointment_refs = relationship(
        "EncounterAppointmentRef", back_populates="encounter", cascade="all, delete-orphan"
    )
    virtual_services = relationship(
        "EncounterVirtualService", back_populates="encounter", cascade="all, delete-orphan"
    )
    reasons = relationship(
        "EncounterReason", back_populates="encounter", cascade="all, delete-orphan"
    )
    diagnoses = relationship(
        "EncounterDiagnosis", back_populates="encounter", cascade="all, delete-orphan"
    )
    accounts = relationship(
        "EncounterAccount", back_populates="encounter", cascade="all, delete-orphan"
    )
    # dietPreference / specialArrangement / specialCourtesy moved to top-level in R5
    diet_preferences = relationship(
        "EncounterDietPreference", back_populates="encounter", cascade="all, delete-orphan"
    )
    special_arrangements = relationship(
        "EncounterSpecialArrangement", back_populates="encounter", cascade="all, delete-orphan"
    )
    special_courtesies = relationship(
        "EncounterSpecialCourtesy", back_populates="encounter", cascade="all, delete-orphan"
    )
    locations = relationship(
        "EncounterLocation", back_populates="encounter", cascade="all, delete-orphan"
    )


# ── Sub-resource tables ────────────────────────────────────────────────────────


class EncounterIdentifier(Base):
    __tablename__ = "encounter_identifier"

    id = Column(Integer, primary_key=True, autoincrement=True)
    encounter_id = Column(Integer, ForeignKey("encounter.id"), nullable=False, index=True)
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

    encounter = relationship("EncounterModel", back_populates="identifiers")


class EncounterStatusHistory(Base):
    """statusHistory[] — R4 field kept for backward compat; removed in R5."""

    __tablename__ = "encounter_status_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    encounter_id = Column(Integer, ForeignKey("encounter.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    status = Column(String, nullable=False)
    period_start = Column(DateTime(timezone=True), nullable=True)
    period_end = Column(DateTime(timezone=True), nullable=True)

    encounter = relationship("EncounterModel", back_populates="status_history")


class EncounterClassHistory(Base):
    """classHistory[] — R4 field kept for backward compat; removed in R5."""

    __tablename__ = "encounter_class_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    encounter_id = Column(Integer, ForeignKey("encounter.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    class_system = Column(String, nullable=True)
    class_version = Column(String, nullable=True)
    class_code = Column(String, nullable=True)
    class_display = Column(String, nullable=True)
    period_start = Column(DateTime(timezone=True), nullable=True)
    period_end = Column(DateTime(timezone=True), nullable=True)

    encounter = relationship("EncounterModel", back_populates="class_history")


class EncounterClass(Base):
    """class[] (0..*) CodeableConcept — R5 changed from 0..1 Coding to 0..* CodeableConcept."""

    __tablename__ = "encounter_class"

    id = Column(Integer, primary_key=True, autoincrement=True)
    encounter_id = Column(Integer, ForeignKey("encounter.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    encounter = relationship("EncounterModel", back_populates="classes")


class EncounterBusinessStatus(Base):
    """businessStatus[] (0..*) BackboneElement — R5 new workflow status tracking."""

    __tablename__ = "encounter_business_status"

    id = Column(Integer, primary_key=True, autoincrement=True)
    encounter_id = Column(Integer, ForeignKey("encounter.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    # code (1..1 CodeableConcept)
    code_system = Column(String, nullable=True)
    code_code = Column(String, nullable=False)
    code_display = Column(String, nullable=True)
    code_text = Column(String, nullable=True)

    # type (0..1 Coding)
    type_system = Column(String, nullable=True)
    type_code = Column(String, nullable=True)
    type_display = Column(String, nullable=True)

    # effectiveDate (0..1 dateTime)
    effective_date = Column(DateTime(timezone=True), nullable=True)

    encounter = relationship("EncounterModel", back_populates="business_statuses")


class EncounterServiceType(Base):
    """serviceType[] (0..*) CodeableReference(HealthcareService) — R5 changed from 0..1 CodeableConcept."""

    __tablename__ = "encounter_service_type"

    id = Column(Integer, primary_key=True, autoincrement=True)
    encounter_id = Column(Integer, ForeignKey("encounter.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    # concept (CodeableConcept)
    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    # reference (Reference(HealthcareService))
    reference_type = Column(
        Enum(EncounterServiceTypeReferenceType, name="encounter_service_type_reference_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    encounter = relationship("EncounterModel", back_populates="service_types")


class EncounterType(Base):
    """type[] (0..*) CodeableConcept."""

    __tablename__ = "encounter_type"

    id = Column(Integer, primary_key=True, autoincrement=True)
    encounter_id = Column(Integer, ForeignKey("encounter.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    encounter = relationship("EncounterModel", back_populates="types")


class EncounterEpisodeOfCare(Base):
    """episodeOfCare[] (0..*) Reference(EpisodeOfCare)."""

    __tablename__ = "encounter_episode_of_care"

    id = Column(Integer, primary_key=True, autoincrement=True)
    encounter_id = Column(Integer, ForeignKey("encounter.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(EncounterEpisodeOfCareReferenceType, name="encounter_episode_of_care_reference_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    encounter = relationship("EncounterModel", back_populates="episode_of_cares")


class EncounterBasedOn(Base):
    """basedOn[] (0..*) Reference(CarePlan|DeviceRequest|MedicationRequest|ServiceRequest|RequestOrchestration|NutritionOrder|VisionPrescription)."""

    __tablename__ = "encounter_based_on"

    id = Column(Integer, primary_key=True, autoincrement=True)
    encounter_id = Column(Integer, ForeignKey("encounter.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(EncounterBasedOnReferenceType, name="encounter_based_on_reference_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    encounter = relationship("EncounterModel", back_populates="based_ons")


class EncounterCareTeam(Base):
    """careTeam[] (0..*) Reference(CareTeam) — R5 new."""

    __tablename__ = "encounter_care_team"

    id = Column(Integer, primary_key=True, autoincrement=True)
    encounter_id = Column(Integer, ForeignKey("encounter.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(EncounterCareTeamReferenceType, name="encounter_care_team_reference_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    encounter = relationship("EncounterModel", back_populates="care_teams")


class EncounterParticipant(Base):
    __tablename__ = "encounter_participant"

    id = Column(Integer, primary_key=True, autoincrement=True)
    encounter_id = Column(Integer, ForeignKey("encounter.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    # actor (0..1 Reference) — R5 renamed from individual; expanded allowed types
    reference_type = Column(
        Enum(EncounterParticipantReferenceType, name="encounter_participant_reference_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    period_start = Column(DateTime(timezone=True), nullable=True)
    period_end = Column(DateTime(timezone=True), nullable=True)

    encounter = relationship("EncounterModel", back_populates="participants")
    types = relationship(
        "EncounterParticipantType", back_populates="participant", cascade="all, delete-orphan"
    )


class EncounterParticipantType(Base):
    """participant.type[] (0..*) CodeableConcept."""

    __tablename__ = "encounter_participant_type"

    id = Column(Integer, primary_key=True, autoincrement=True)
    participant_id = Column(
        Integer, ForeignKey("encounter_participant.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    participant = relationship("EncounterParticipant", back_populates="types")


class EncounterAppointmentRef(Base):
    """appointment[] (0..*) Reference(Appointment)."""

    __tablename__ = "encounter_appointment_ref"

    id = Column(Integer, primary_key=True, autoincrement=True)
    encounter_id = Column(Integer, ForeignKey("encounter.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(EncounterAppointmentReferenceType, name="encounter_appointment_ref_reference_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    encounter = relationship("EncounterModel", back_populates="appointment_refs")


class EncounterVirtualService(Base):
    """virtualService[] (0..*) VirtualServiceDetail — R5 new."""

    __tablename__ = "encounter_virtual_service"

    id = Column(Integer, primary_key=True, autoincrement=True)
    encounter_id = Column(Integer, ForeignKey("encounter.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    channel_type_system = Column(String, nullable=True)
    channel_type_code = Column(String, nullable=True)
    channel_type_display = Column(String, nullable=True)
    address_url = Column(String, nullable=True)
    additional_info = Column(Text, nullable=True)  # comma-separated URLs
    max_participants = Column(Integer, nullable=True)
    session_key = Column(String, nullable=True)

    encounter = relationship("EncounterModel", back_populates="virtual_services")


class EncounterReason(Base):
    """reason[] (0..*) BackboneElement — R5 consolidates reasonCode + reasonReference."""

    __tablename__ = "encounter_reason"

    id = Column(Integer, primary_key=True, autoincrement=True)
    encounter_id = Column(Integer, ForeignKey("encounter.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    encounter = relationship("EncounterModel", back_populates="reasons")
    uses = relationship(
        "EncounterReasonUse", back_populates="reason", cascade="all, delete-orphan"
    )
    values = relationship(
        "EncounterReasonValue", back_populates="reason", cascade="all, delete-orphan"
    )


class EncounterReasonUse(Base):
    """reason[].use[] (0..*) CodeableConcept — reason categorization."""

    __tablename__ = "encounter_reason_use"

    id = Column(Integer, primary_key=True, autoincrement=True)
    reason_id = Column(Integer, ForeignKey("encounter_reason.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    reason = relationship("EncounterReason", back_populates="uses")


class EncounterReasonValue(Base):
    """reason[].value[] (0..*) CodeableReference(Condition|DiagnosticReport|Observation|Procedure)."""

    __tablename__ = "encounter_reason_value"

    id = Column(Integer, primary_key=True, autoincrement=True)
    reason_id = Column(Integer, ForeignKey("encounter_reason.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    # concept (CodeableConcept)
    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    # reference
    reference_type = Column(
        Enum(EncounterReasonValueReferenceType, name="encounter_reason_value_reference_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    reason = relationship("EncounterReason", back_populates="values")


class EncounterDiagnosis(Base):
    """diagnosis[] (0..*) BackboneElement."""

    __tablename__ = "encounter_diagnosis"

    id = Column(Integer, primary_key=True, autoincrement=True)
    encounter_id = Column(Integer, ForeignKey("encounter.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    encounter = relationship("EncounterModel", back_populates="diagnoses")
    conditions = relationship(
        "EncounterDiagnosisCondition", back_populates="diagnosis", cascade="all, delete-orphan"
    )
    uses = relationship(
        "EncounterDiagnosisUse", back_populates="diagnosis", cascade="all, delete-orphan"
    )


class EncounterDiagnosisCondition(Base):
    """diagnosis[].condition[] (0..*) CodeableReference(Condition) — R5 changed from 0..1 Reference."""

    __tablename__ = "encounter_diagnosis_condition"

    id = Column(Integer, primary_key=True, autoincrement=True)
    diagnosis_id = Column(
        Integer, ForeignKey("encounter_diagnosis.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    # concept (CodeableConcept)
    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    # reference (Reference(Condition))
    reference_type = Column(
        Enum(EncounterDiagnosisConditionType, name="encounter_diagnosis_condition_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    diagnosis = relationship("EncounterDiagnosis", back_populates="conditions")


class EncounterDiagnosisUse(Base):
    """diagnosis[].use[] (0..*) CodeableConcept — R5 changed from 0..1 to 0..*."""

    __tablename__ = "encounter_diagnosis_use"

    id = Column(Integer, primary_key=True, autoincrement=True)
    diagnosis_id = Column(
        Integer, ForeignKey("encounter_diagnosis.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    diagnosis = relationship("EncounterDiagnosis", back_populates="uses")


class EncounterAccount(Base):
    """account[] (0..*) Reference(Account)."""

    __tablename__ = "encounter_account"

    id = Column(Integer, primary_key=True, autoincrement=True)
    encounter_id = Column(Integer, ForeignKey("encounter.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(EncounterAccountReferenceType, name="encounter_account_reference_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    encounter = relationship("EncounterModel", back_populates="accounts")


class EncounterDietPreference(Base):
    """dietPreference[] (0..*) CodeableConcept — R5 moved to top-level from hospitalization."""

    __tablename__ = "encounter_diet_preference"

    id = Column(Integer, primary_key=True, autoincrement=True)
    encounter_id = Column(Integer, ForeignKey("encounter.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    encounter = relationship("EncounterModel", back_populates="diet_preferences")


class EncounterSpecialArrangement(Base):
    """specialArrangement[] (0..*) CodeableConcept — R5 moved to top-level from hospitalization."""

    __tablename__ = "encounter_special_arrangement"

    id = Column(Integer, primary_key=True, autoincrement=True)
    encounter_id = Column(Integer, ForeignKey("encounter.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    encounter = relationship("EncounterModel", back_populates="special_arrangements")


class EncounterSpecialCourtesy(Base):
    """specialCourtesy[] (0..*) CodeableConcept — R5 moved to top-level from hospitalization."""

    __tablename__ = "encounter_special_courtesy"

    id = Column(Integer, primary_key=True, autoincrement=True)
    encounter_id = Column(Integer, ForeignKey("encounter.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    encounter = relationship("EncounterModel", back_populates="special_courtesies")


class EncounterLocation(Base):
    """location[] (0..*) BackboneElement."""

    __tablename__ = "encounter_location"

    id = Column(Integer, primary_key=True, autoincrement=True)
    encounter_id = Column(Integer, ForeignKey("encounter.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    # location (1..1 Reference(Location))
    reference_type = Column(
        Enum(EncounterLocationReferenceType, name="encounter_location_reference_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    status = Column(
        Enum(EncounterLocationStatus, name="encounter_location_status"),
        nullable=True,
    )

    # form (0..1 CodeableConcept) — R5 renamed from physicalType
    form_system = Column(String, nullable=True)
    form_code = Column(String, nullable=True)
    form_display = Column(String, nullable=True)
    form_text = Column(String, nullable=True)

    period_start = Column(DateTime(timezone=True), nullable=True)
    period_end = Column(DateTime(timezone=True), nullable=True)

    encounter = relationship("EncounterModel", back_populates="locations")
