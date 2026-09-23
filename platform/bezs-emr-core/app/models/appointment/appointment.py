from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Sequence,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import FHIRBase as Base
from app.models.appointment.enums import (
    AppointmentStatus,
    AppointmentParticipantActorType,
    AppointmentReasonReferenceType,
    AppointmentNoteAuthorReferenceType,
    AppointmentPatientInstructionReferenceType,
    AppointmentServiceTypeReferenceType,
    AppointmentBasedOnReferenceType,
    AppointmentReplacesReferenceType,
    AppointmentSlotReferenceType,
    AppointmentAccountReferenceType,
)
from app.models.enums import EncounterReferenceType, SubjectReferenceType

appointment_id_seq = Sequence("appointment_pub_seq", start=40000, increment=1, metadata=Base.metadata)


class AppointmentModel(Base):
    __tablename__ = "appointment"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    appointment_id = Column(
        Integer,
        appointment_id_seq,
        server_default=appointment_id_seq.next_value(),
        unique=True,
        index=True,
        nullable=False,
    )

    user_id = Column(String, nullable=True, index=True)
    org_id = Column(String, nullable=True, index=True)

    # status (1..1)
    status = Column(Enum(AppointmentStatus, name="appointment_status"), nullable=False)

    # cancellationReason (0..1 CodeableConcept) — DB cols keep single-'l' name for compat
    cancelation_reason_system = Column(String, nullable=True)
    cancelation_reason_code = Column(String, nullable=True)
    cancelation_reason_display = Column(String, nullable=True)
    cancelation_reason_text = Column(String, nullable=True)

    # cancellationDate (0..1) — R5 new
    cancellation_date = Column(DateTime(timezone=True), nullable=True)

    # appointmentType (0..1 CodeableConcept)
    appointment_type_system = Column(String, nullable=True)
    appointment_type_code = Column(String, nullable=True)
    appointment_type_display = Column(String, nullable=True)
    appointment_type_text = Column(String, nullable=True)

    # priority (0..1 CodeableConcept) — R5 changed from unsignedInt
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

    # encounter (0..1 Reference(Encounter))
    encounter_type = Column(
        Enum(EncounterReferenceType, name="encounter_reference_type", create_type=False),
        nullable=True,
    )
    encounter_id = Column(Integer, ForeignKey("encounter.id"), nullable=True, index=True)
    encounter_display = Column(String, nullable=True)

    # previousAppointment (0..1 Reference(Appointment)) — R5 new
    previous_appointment_id = Column(Integer, nullable=True)
    previous_appointment_display = Column(String, nullable=True)

    # originatingAppointment (0..1 Reference(Appointment)) — R5 new
    originating_appointment_id = Column(Integer, nullable=True)
    originating_appointment_display = Column(String, nullable=True)

    # Scheduling
    start = Column(DateTime(timezone=True), nullable=True)
    end = Column(DateTime(timezone=True), nullable=True)
    minutes_duration = Column(Integer, nullable=True)
    created = Column(DateTime(timezone=True), nullable=True)

    # Descriptive
    description = Column(Text, nullable=True)

    # recurrenceId / occurrenceChanged — R5 new
    recurrence_id = Column(Integer, nullable=True)
    occurrence_changed = Column(Boolean, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String, nullable=True)
    updated_by = Column(String, nullable=True)

    # Relationships
    encounter = relationship("EncounterModel", foreign_keys=[encounter_id], lazy="selectin")
    identifiers = relationship(
        "AppointmentIdentifier", back_populates="appointment", cascade="all, delete-orphan"
    )
    classes = relationship(
        "AppointmentClass", back_populates="appointment", cascade="all, delete-orphan"
    )
    service_categories = relationship(
        "AppointmentServiceCategory", back_populates="appointment", cascade="all, delete-orphan"
    )
    service_types = relationship(
        "AppointmentServiceType", back_populates="appointment", cascade="all, delete-orphan"
    )
    specialties = relationship(
        "AppointmentSpecialty", back_populates="appointment", cascade="all, delete-orphan"
    )
    reasons = relationship(
        "AppointmentReason", back_populates="appointment", cascade="all, delete-orphan"
    )
    supporting_informations = relationship(
        "AppointmentSupportingInformation", back_populates="appointment", cascade="all, delete-orphan"
    )
    slots = relationship(
        "AppointmentSlot", back_populates="appointment", cascade="all, delete-orphan"
    )
    based_ons = relationship(
        "AppointmentBasedOn", back_populates="appointment", cascade="all, delete-orphan"
    )
    replaces_list = relationship(
        "AppointmentReplaces", back_populates="appointment", cascade="all, delete-orphan"
    )
    virtual_services = relationship(
        "AppointmentVirtualService", back_populates="appointment", cascade="all, delete-orphan"
    )
    accounts = relationship(
        "AppointmentAccount", back_populates="appointment", cascade="all, delete-orphan"
    )
    notes = relationship(
        "AppointmentNote", back_populates="appointment", cascade="all, delete-orphan"
    )
    patient_instructions = relationship(
        "AppointmentPatientInstruction", back_populates="appointment", cascade="all, delete-orphan"
    )
    participants = relationship(
        "AppointmentParticipant", back_populates="appointment", cascade="all, delete-orphan"
    )
    requested_periods = relationship(
        "AppointmentRequestedPeriod", back_populates="appointment", cascade="all, delete-orphan"
    )
    recurrence_template = relationship(
        "AppointmentRecurrenceTemplate",
        back_populates="appointment",
        cascade="all, delete-orphan",
        uselist=False,
    )


class AppointmentIdentifier(Base):
    __tablename__ = "appointment_identifier"

    id = Column(Integer, primary_key=True, autoincrement=True)
    appointment_id = Column(Integer, ForeignKey("appointment.id"), nullable=False, index=True)
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

    appointment = relationship("AppointmentModel", back_populates="identifiers")


class AppointmentClass(Base):
    """class[] (0..*) CodeableConcept — R5 new."""

    __tablename__ = "appointment_class"

    id = Column(Integer, primary_key=True, autoincrement=True)
    appointment_id = Column(Integer, ForeignKey("appointment.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    appointment = relationship("AppointmentModel", back_populates="classes")


class AppointmentServiceCategory(Base):
    """serviceCategory[] (0..*) CodeableConcept."""

    __tablename__ = "appointment_service_category"

    id = Column(Integer, primary_key=True, autoincrement=True)
    appointment_id = Column(Integer, ForeignKey("appointment.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    appointment = relationship("AppointmentModel", back_populates="service_categories")


class AppointmentServiceType(Base):
    """serviceType[] (0..*) CodeableReference(HealthcareService)."""

    __tablename__ = "appointment_service_type"

    id = Column(Integer, primary_key=True, autoincrement=True)
    appointment_id = Column(Integer, ForeignKey("appointment.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    # concept (CodeableConcept)
    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    # reference (Reference(HealthcareService))
    reference_type = Column(
        Enum(AppointmentServiceTypeReferenceType, name="appointment_service_type_reference_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    appointment = relationship("AppointmentModel", back_populates="service_types")


class AppointmentSpecialty(Base):
    """specialty[] (0..*) CodeableConcept."""

    __tablename__ = "appointment_specialty"

    id = Column(Integer, primary_key=True, autoincrement=True)
    appointment_id = Column(Integer, ForeignKey("appointment.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    appointment = relationship("AppointmentModel", back_populates="specialties")


class AppointmentReason(Base):
    """reason[] (0..*) CodeableReference — R5 consolidation of reasonCode + reasonReference."""

    __tablename__ = "appointment_reason"

    id = Column(Integer, primary_key=True, autoincrement=True)
    appointment_id = Column(Integer, ForeignKey("appointment.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    # concept (CodeableConcept)
    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    # reference (Reference(Condition|Procedure|Observation|ImmunizationRecommendation|DiagnosticReport))
    reference_type = Column(
        Enum(AppointmentReasonReferenceType, name="appointment_reason_reference_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    appointment = relationship("AppointmentModel", back_populates="reasons")


class AppointmentSupportingInformation(Base):
    """supportingInformation[] (0..*) Reference(Any)."""

    __tablename__ = "appointment_supporting_information"

    id = Column(Integer, primary_key=True, autoincrement=True)
    appointment_id = Column(Integer, ForeignKey("appointment.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_type = Column(String, nullable=True)
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    appointment = relationship("AppointmentModel", back_populates="supporting_informations")


class AppointmentSlot(Base):
    """slot[] (0..*) Reference(Slot)."""

    __tablename__ = "appointment_slot"

    id = Column(Integer, primary_key=True, autoincrement=True)
    appointment_id = Column(Integer, ForeignKey("appointment.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(AppointmentSlotReferenceType, name="appointment_slot_reference_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    appointment = relationship("AppointmentModel", back_populates="slots")


class AppointmentBasedOn(Base):
    """basedOn[] (0..*) Reference(CarePlan|DeviceRequest|MedicationRequest|ServiceRequest|RequestOrchestration|NutritionOrder|VisionPrescription)."""

    __tablename__ = "appointment_based_on"

    id = Column(Integer, primary_key=True, autoincrement=True)
    appointment_id = Column(Integer, ForeignKey("appointment.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(AppointmentBasedOnReferenceType, name="appointment_based_on_reference_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    appointment = relationship("AppointmentModel", back_populates="based_ons")


class AppointmentReplaces(Base):
    """replaces[] (0..*) Reference(Appointment) — R5 new."""

    __tablename__ = "appointment_replaces"

    id = Column(Integer, primary_key=True, autoincrement=True)
    appointment_id = Column(Integer, ForeignKey("appointment.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(AppointmentReplacesReferenceType, name="appointment_replaces_reference_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    appointment = relationship("AppointmentModel", back_populates="replaces_list")


class AppointmentVirtualService(Base):
    """virtualService[] (0..*) VirtualServiceDetail — R5 new."""

    __tablename__ = "appointment_virtual_service"

    id = Column(Integer, primary_key=True, autoincrement=True)
    appointment_id = Column(Integer, ForeignKey("appointment.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    channel_type_system = Column(String, nullable=True)
    channel_type_code = Column(String, nullable=True)
    channel_type_display = Column(String, nullable=True)
    address_url = Column(String, nullable=True)
    additional_info = Column(Text, nullable=True)  # comma-separated URLs
    max_participants = Column(Integer, nullable=True)
    session_key = Column(String, nullable=True)

    appointment = relationship("AppointmentModel", back_populates="virtual_services")


class AppointmentAccount(Base):
    """account[] (0..*) Reference(Account) — R5 new."""

    __tablename__ = "appointment_account"

    id = Column(Integer, primary_key=True, autoincrement=True)
    appointment_id = Column(Integer, ForeignKey("appointment.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(AppointmentAccountReferenceType, name="appointment_account_reference_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    appointment = relationship("AppointmentModel", back_populates="accounts")


class AppointmentNote(Base):
    """note[] (0..*) Annotation — R5 replaces comment string."""

    __tablename__ = "appointment_note"

    id = Column(Integer, primary_key=True, autoincrement=True)
    appointment_id = Column(Integer, ForeignKey("appointment.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    # author[x]: authorString | authorReference(Practitioner|PractitionerRole|Patient|RelatedPerson|Organization)
    author_string = Column(String, nullable=True)
    author_reference_type = Column(
        Enum(AppointmentNoteAuthorReferenceType, name="appointment_note_author_reference_type"),
        nullable=True,
    )
    author_reference_id = Column(Integer, nullable=True)
    author_reference_display = Column(String, nullable=True)

    time = Column(DateTime(timezone=True), nullable=True)
    text = Column(Text, nullable=False)

    appointment = relationship("AppointmentModel", back_populates="notes")


class AppointmentPatientInstruction(Base):
    """patientInstruction[] (0..*) CodeableReference — R5 replaces string."""

    __tablename__ = "appointment_patient_instruction"

    id = Column(Integer, primary_key=True, autoincrement=True)
    appointment_id = Column(Integer, ForeignKey("appointment.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    # concept (CodeableConcept)
    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    # reference (Reference(DocumentReference))
    reference_type = Column(
        Enum(AppointmentPatientInstructionReferenceType, name="appointment_pi_reference_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    appointment = relationship("AppointmentModel", back_populates="patient_instructions")


class AppointmentParticipant(Base):
    __tablename__ = "appointment_participant"

    id = Column(Integer, primary_key=True, autoincrement=True)
    appointment_id = Column(Integer, ForeignKey("appointment.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(AppointmentParticipantActorType, name="appointment_participant_actor_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    required = Column(Boolean, nullable=True)   # R5: boolean (was R4 code string)
    status = Column(String, nullable=False, default="needs-action")

    period_start = Column(DateTime(timezone=True), nullable=True)
    period_end = Column(DateTime(timezone=True), nullable=True)

    appointment = relationship("AppointmentModel", back_populates="participants")
    types = relationship(
        "AppointmentParticipantType", back_populates="participant", cascade="all, delete-orphan"
    )


class AppointmentParticipantType(Base):
    """participant.type[] (0..*) CodeableConcept."""

    __tablename__ = "appointment_participant_type"

    id = Column(Integer, primary_key=True, autoincrement=True)
    participant_id = Column(
        Integer, ForeignKey("appointment_participant.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    participant = relationship("AppointmentParticipant", back_populates="types")


class AppointmentRequestedPeriod(Base):
    """requestedPeriod[] (0..*) Period."""

    __tablename__ = "appointment_requested_period"

    id = Column(Integer, primary_key=True, autoincrement=True)
    appointment_id = Column(Integer, ForeignKey("appointment.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    period_start = Column(DateTime(timezone=True), nullable=True)
    period_end = Column(DateTime(timezone=True), nullable=True)

    appointment = relationship("AppointmentModel", back_populates="requested_periods")


class AppointmentRecurrenceTemplate(Base):
    """Operational recurrence pattern — kept for scheduling use."""

    __tablename__ = "appointment_recurrence_template"

    id = Column(Integer, primary_key=True, autoincrement=True)
    appointment_id = Column(
        Integer, ForeignKey("appointment.id"), nullable=False, unique=True, index=True
    )

    recurrence_type_code = Column(String, nullable=False)
    recurrence_type_display = Column(String, nullable=True)
    recurrence_type_system = Column(String, nullable=True)

    timezone_code = Column(String, nullable=True)
    timezone_display = Column(String, nullable=True)

    last_occurrence_date = Column(Date, nullable=True)
    occurrence_count = Column(Integer, nullable=True)

    occurrence_dates = Column(Text, nullable=True)
    excluding_dates = Column(Text, nullable=True)
    excluding_recurrence_ids = Column(Text, nullable=True)

    weekly_monday = Column(Boolean, nullable=True)
    weekly_tuesday = Column(Boolean, nullable=True)
    weekly_wednesday = Column(Boolean, nullable=True)
    weekly_thursday = Column(Boolean, nullable=True)
    weekly_friday = Column(Boolean, nullable=True)
    weekly_saturday = Column(Boolean, nullable=True)
    weekly_sunday = Column(Boolean, nullable=True)
    weekly_week_interval = Column(Integer, nullable=True)

    monthly_day_of_month = Column(Integer, nullable=True)
    monthly_nth_week_code = Column(String, nullable=True)
    monthly_nth_week_display = Column(String, nullable=True)
    monthly_day_of_week_code = Column(String, nullable=True)
    monthly_day_of_week_display = Column(String, nullable=True)
    monthly_month_interval = Column(Integer, nullable=True)

    yearly_year_interval = Column(Integer, nullable=True)

    appointment = relationship("AppointmentModel", back_populates="recurrence_template")
