from sqlalchemy import (
    Boolean,
    Column,
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
from app.models.enums import EncounterReferenceType
from app.models.observation.enums import (
    ObservationBasedOnReferenceType,
    ObservationDerivedFromReferenceType,
    ObservationDeviceReferenceType,
    ObservationHasMemberReferenceType,
    ObservationPartOfReferenceType,
    ObservationPerformerReferenceType,
    ObservationSpecimenReferenceType,
    ObservationStatus,
    ObservationSubjectReferenceType,
)

observation_id_seq = Sequence("observation_pub_seq", start=160000, increment=1, metadata=Base.metadata)


# ---------------------------------------------------------------------------
# Main table
# ---------------------------------------------------------------------------

class ObservationModel(Base):
    __tablename__ = "observation"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    observation_id = Column(
        Integer,
        observation_id_seq,
        server_default=observation_id_seq.next_value(),
        unique=True,
        index=True,
        nullable=False,
    )

    user_id = Column(String, nullable=True, index=True)
    org_id = Column(String, nullable=True, index=True)

    # status (1..1 code)
    status = Column(
        Enum(ObservationStatus, name="observation_status"),
        nullable=False,
    )

    # code (1..1 CodeableConcept)
    code_system = Column(String, nullable=True)
    code_code = Column(String, nullable=True)
    code_display = Column(String, nullable=True)
    code_text = Column(String, nullable=True)

    # subject (0..1 Reference(Patient | Group | Device | Location))
    subject_type = Column(
        Enum(ObservationSubjectReferenceType, name="obs_subject_ref_type"),
        nullable=True,
    )
    subject_id = Column(Integer, nullable=True)
    subject_display = Column(String, nullable=True)

    # encounter (0..1 Reference(Encounter))
    encounter_type = Column(
        Enum(EncounterReferenceType, name="obs_encounter_ref_type", create_type=False),
        nullable=True,
    )
    encounter_id = Column(Integer, ForeignKey("encounter.id"), nullable=True, index=True)
    encounter_display = Column(String, nullable=True)

    # effective[x] (0..1 choice: dateTime | Period | Timing | instant)
    effective_date_time = Column(DateTime(timezone=True), nullable=True)
    effective_period_start = Column(DateTime(timezone=True), nullable=True)
    effective_period_end = Column(DateTime(timezone=True), nullable=True)
    effective_instant = Column(DateTime(timezone=True), nullable=True)
    # Timing variant — event[] stored comma-separated (ordered dateTime list, never individually filtered)
    effective_timing_event = Column(Text, nullable=True)
    effective_timing_code_system = Column(String, nullable=True)
    effective_timing_code_code = Column(String, nullable=True)
    effective_timing_code_display = Column(String, nullable=True)
    effective_timing_code_text = Column(String, nullable=True)
    # Timing.repeat BackboneElement — bounds[x] choice
    effective_timing_repeat_bounds_duration_value = Column(Numeric, nullable=True)
    effective_timing_repeat_bounds_duration_comparator = Column(String, nullable=True)
    effective_timing_repeat_bounds_duration_unit = Column(String, nullable=True)
    effective_timing_repeat_bounds_duration_system = Column(String, nullable=True)
    effective_timing_repeat_bounds_duration_code = Column(String, nullable=True)
    effective_timing_repeat_bounds_range_low_value = Column(Numeric, nullable=True)
    effective_timing_repeat_bounds_range_low_unit = Column(String, nullable=True)
    effective_timing_repeat_bounds_range_low_system = Column(String, nullable=True)
    effective_timing_repeat_bounds_range_low_code = Column(String, nullable=True)
    effective_timing_repeat_bounds_range_high_value = Column(Numeric, nullable=True)
    effective_timing_repeat_bounds_range_high_unit = Column(String, nullable=True)
    effective_timing_repeat_bounds_range_high_system = Column(String, nullable=True)
    effective_timing_repeat_bounds_range_high_code = Column(String, nullable=True)
    effective_timing_repeat_bounds_period_start = Column(DateTime(timezone=True), nullable=True)
    effective_timing_repeat_bounds_period_end = Column(DateTime(timezone=True), nullable=True)
    effective_timing_repeat_count = Column(Integer, nullable=True)
    effective_timing_repeat_count_max = Column(Integer, nullable=True)
    effective_timing_repeat_duration = Column(Numeric, nullable=True)
    effective_timing_repeat_duration_max = Column(Numeric, nullable=True)
    effective_timing_repeat_duration_unit = Column(String, nullable=True)
    effective_timing_repeat_frequency = Column(Integer, nullable=True)
    effective_timing_repeat_frequency_max = Column(Integer, nullable=True)
    effective_timing_repeat_period = Column(Numeric, nullable=True)
    effective_timing_repeat_period_max = Column(Numeric, nullable=True)
    effective_timing_repeat_period_unit = Column(String, nullable=True)
    # comma-separated code lists (ordered, never individually filtered)
    effective_timing_repeat_day_of_week = Column(Text, nullable=True)
    effective_timing_repeat_time_of_day = Column(Text, nullable=True)
    effective_timing_repeat_when = Column(Text, nullable=True)
    effective_timing_repeat_offset = Column(Integer, nullable=True)

    # issued (0..1 instant)
    issued = Column(DateTime(timezone=True), nullable=True)

    # value[x] (0..1 choice — all variants nullable; only one is non-null at a time)
    # Quantity
    value_quantity_value = Column(Numeric, nullable=True)
    value_quantity_comparator = Column(String, nullable=True)
    value_quantity_unit = Column(String, nullable=True)
    value_quantity_system = Column(String, nullable=True)
    value_quantity_code = Column(String, nullable=True)
    # CodeableConcept
    value_codeable_concept_system = Column(String, nullable=True)
    value_codeable_concept_code = Column(String, nullable=True)
    value_codeable_concept_display = Column(String, nullable=True)
    value_codeable_concept_text = Column(String, nullable=True)
    # primitives
    value_string = Column(String, nullable=True)
    value_boolean = Column(Boolean, nullable=True)
    value_integer = Column(Integer, nullable=True)
    value_time = Column(String, nullable=True)          # HH:mm:ss
    value_date_time = Column(DateTime(timezone=True), nullable=True)
    # Period
    value_period_start = Column(DateTime(timezone=True), nullable=True)
    value_period_end = Column(DateTime(timezone=True), nullable=True)
    # Range (low / high are SimpleQuantity — no comparator)
    value_range_low_value = Column(Numeric, nullable=True)
    value_range_low_unit = Column(String, nullable=True)
    value_range_low_system = Column(String, nullable=True)
    value_range_low_code = Column(String, nullable=True)
    value_range_high_value = Column(Numeric, nullable=True)
    value_range_high_unit = Column(String, nullable=True)
    value_range_high_system = Column(String, nullable=True)
    value_range_high_code = Column(String, nullable=True)
    # Ratio (numerator / denominator are full Quantity — have comparator)
    value_ratio_numerator_value = Column(Numeric, nullable=True)
    value_ratio_numerator_comparator = Column(String, nullable=True)
    value_ratio_numerator_unit = Column(String, nullable=True)
    value_ratio_numerator_system = Column(String, nullable=True)
    value_ratio_numerator_code = Column(String, nullable=True)
    value_ratio_denominator_value = Column(Numeric, nullable=True)
    value_ratio_denominator_comparator = Column(String, nullable=True)
    value_ratio_denominator_unit = Column(String, nullable=True)
    value_ratio_denominator_system = Column(String, nullable=True)
    value_ratio_denominator_code = Column(String, nullable=True)
    # SampledData
    value_sampled_data_origin_value = Column(Numeric, nullable=True)
    value_sampled_data_origin_unit = Column(String, nullable=True)
    value_sampled_data_origin_system = Column(String, nullable=True)
    value_sampled_data_origin_code = Column(String, nullable=True)
    value_sampled_data_period = Column(Numeric, nullable=True)
    value_sampled_data_factor = Column(Numeric, nullable=True)
    value_sampled_data_lower_limit = Column(Numeric, nullable=True)
    value_sampled_data_upper_limit = Column(Numeric, nullable=True)
    value_sampled_data_dimensions = Column(Integer, nullable=True)
    value_sampled_data_data = Column(Text, nullable=True)

    # dataAbsentReason (0..1 CodeableConcept)
    data_absent_reason_system = Column(String, nullable=True)
    data_absent_reason_code = Column(String, nullable=True)
    data_absent_reason_display = Column(String, nullable=True)
    data_absent_reason_text = Column(String, nullable=True)

    # bodySite (0..1 CodeableConcept)
    body_site_system = Column(String, nullable=True)
    body_site_code = Column(String, nullable=True)
    body_site_display = Column(String, nullable=True)
    body_site_text = Column(String, nullable=True)

    # method (0..1 CodeableConcept)
    method_system = Column(String, nullable=True)
    method_code = Column(String, nullable=True)
    method_display = Column(String, nullable=True)
    method_text = Column(String, nullable=True)

    # specimen (0..1 Reference(Specimen))
    specimen_type = Column(
        Enum(ObservationSpecimenReferenceType, name="obs_specimen_ref_type"),
        nullable=True,
    )
    specimen_id = Column(Integer, nullable=True)
    specimen_display = Column(String, nullable=True)

    # device (0..1 Reference(Device | DeviceMetric))
    device_type = Column(
        Enum(ObservationDeviceReferenceType, name="obs_device_ref_type"),
        nullable=True,
    )
    device_id = Column(Integer, nullable=True)
    device_display = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String, nullable=True)
    updated_by = Column(String, nullable=True)

    # encounter relationship (child → parent)
    encounter = relationship("EncounterModel", foreign_keys=[encounter_id], lazy="selectin")

    # child relationships
    identifiers = relationship(
        "ObservationIdentifier", back_populates="observation", cascade="all, delete-orphan"
    )
    based_on = relationship(
        "ObservationBasedOn", back_populates="observation", cascade="all, delete-orphan"
    )
    part_of = relationship(
        "ObservationPartOf", back_populates="observation", cascade="all, delete-orphan"
    )
    categories = relationship(
        "ObservationCategory", back_populates="observation", cascade="all, delete-orphan"
    )
    focus = relationship(
        "ObservationFocus", back_populates="observation", cascade="all, delete-orphan"
    )
    performers = relationship(
        "ObservationPerformer", back_populates="observation", cascade="all, delete-orphan"
    )
    interpretations = relationship(
        "ObservationInterpretation", back_populates="observation", cascade="all, delete-orphan"
    )
    notes = relationship(
        "ObservationNote", back_populates="observation", cascade="all, delete-orphan"
    )
    reference_ranges = relationship(
        "ObservationReferenceRange", back_populates="observation", cascade="all, delete-orphan"
    )
    has_members = relationship(
        "ObservationHasMember", back_populates="observation", cascade="all, delete-orphan"
    )
    derived_from = relationship(
        "ObservationDerivedFrom", back_populates="observation", cascade="all, delete-orphan"
    )
    components = relationship(
        "ObservationComponent", back_populates="observation", cascade="all, delete-orphan"
    )


# ---------------------------------------------------------------------------
# identifier[] — 0..*  (Identifier)
# ---------------------------------------------------------------------------

class ObservationIdentifier(Base):
    __tablename__ = "observation_identifier"

    id = Column(Integer, primary_key=True, autoincrement=True)
    observation_id = Column(Integer, ForeignKey("observation.id"), nullable=False, index=True)
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

    observation = relationship("ObservationModel", back_populates="identifiers")


# ---------------------------------------------------------------------------
# basedOn[] — 0..*  Reference(CarePlan | DeviceRequest | ImmunizationRecommendation
#                              | MedicationRequest | NutritionOrder | ServiceRequest)
# ---------------------------------------------------------------------------

class ObservationBasedOn(Base):
    __tablename__ = "observation_based_on"

    id = Column(Integer, primary_key=True, autoincrement=True)
    observation_id = Column(Integer, ForeignKey("observation.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(ObservationBasedOnReferenceType, name="obs_based_on_ref_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    observation = relationship("ObservationModel", back_populates="based_on")


# ---------------------------------------------------------------------------
# partOf[] — 0..*  Reference(MedicationAdministration | MedicationDispense
#                             | MedicationStatement | Procedure | Immunization | ImagingStudy)
# ---------------------------------------------------------------------------

class ObservationPartOf(Base):
    __tablename__ = "observation_part_of"

    id = Column(Integer, primary_key=True, autoincrement=True)
    observation_id = Column(Integer, ForeignKey("observation.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(ObservationPartOfReferenceType, name="obs_part_of_ref_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    observation = relationship("ObservationModel", back_populates="part_of")


# ---------------------------------------------------------------------------
# category[] — 0..*  (CodeableConcept)
# ---------------------------------------------------------------------------

class ObservationCategory(Base):
    __tablename__ = "observation_category"

    id = Column(Integer, primary_key=True, autoincrement=True)
    observation_id = Column(Integer, ForeignKey("observation.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    observation = relationship("ObservationModel", back_populates="categories")


# ---------------------------------------------------------------------------
# focus[] — 0..*  Reference(Any)  — open reference type
# ---------------------------------------------------------------------------

class ObservationFocus(Base):
    __tablename__ = "observation_focus"

    id = Column(Integer, primary_key=True, autoincrement=True)
    observation_id = Column(Integer, ForeignKey("observation.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_type = Column(String, nullable=True)    # open — any FHIR resource type
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    observation = relationship("ObservationModel", back_populates="focus")


# ---------------------------------------------------------------------------
# performer[] — 0..*  Reference(Practitioner | PractitionerRole | Organization
#                                | CareTeam | Patient | RelatedPerson)
# ---------------------------------------------------------------------------

class ObservationPerformer(Base):
    __tablename__ = "observation_performer"

    id = Column(Integer, primary_key=True, autoincrement=True)
    observation_id = Column(Integer, ForeignKey("observation.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(ObservationPerformerReferenceType, name="obs_performer_ref_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    observation = relationship("ObservationModel", back_populates="performers")


# ---------------------------------------------------------------------------
# interpretation[] — 0..*  (CodeableConcept)
# ---------------------------------------------------------------------------

class ObservationInterpretation(Base):
    __tablename__ = "observation_interpretation"

    id = Column(Integer, primary_key=True, autoincrement=True)
    observation_id = Column(Integer, ForeignKey("observation.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    observation = relationship("ObservationModel", back_populates="interpretations")


# ---------------------------------------------------------------------------
# note[] — 0..*  (Annotation)
# ---------------------------------------------------------------------------

class ObservationNote(Base):
    __tablename__ = "observation_note"

    id = Column(Integer, primary_key=True, autoincrement=True)
    observation_id = Column(Integer, ForeignKey("observation.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    # author[x] choice: authorString | authorReference
    author_string = Column(String, nullable=True)
    # authorReference: Reference(Practitioner | Patient | RelatedPerson | Organization)
    author_reference_type = Column(String, nullable=True)
    author_reference_id = Column(Integer, nullable=True)
    author_reference_display = Column(String, nullable=True)

    time = Column(DateTime(timezone=True), nullable=True)
    text = Column(Text, nullable=False)    # 1..1 in Annotation

    observation = relationship("ObservationModel", back_populates="notes")


# ---------------------------------------------------------------------------
# referenceRange[] — 0..*  (BackboneElement)
#
# Structure:
#   observation
#     └── observation_reference_range          (one row per range entry)
#           └── observation_reference_range_applies_to[]  (appliesTo CodeableConcept[])
# ---------------------------------------------------------------------------

class ObservationReferenceRange(Base):
    __tablename__ = "observation_reference_range"

    id = Column(Integer, primary_key=True, autoincrement=True)
    observation_id = Column(Integer, ForeignKey("observation.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    # low (0..1 SimpleQuantity — no comparator)
    low_value = Column(Numeric, nullable=True)
    low_unit = Column(String, nullable=True)
    low_system = Column(String, nullable=True)
    low_code = Column(String, nullable=True)

    # high (0..1 SimpleQuantity)
    high_value = Column(Numeric, nullable=True)
    high_unit = Column(String, nullable=True)
    high_system = Column(String, nullable=True)
    high_code = Column(String, nullable=True)

    # type (0..1 CodeableConcept)
    type_system = Column(String, nullable=True)
    type_code = Column(String, nullable=True)
    type_display = Column(String, nullable=True)
    type_text = Column(String, nullable=True)

    # age (0..1 Range — low/high are SimpleQuantity)
    age_low_value = Column(Numeric, nullable=True)
    age_low_unit = Column(String, nullable=True)
    age_low_system = Column(String, nullable=True)
    age_low_code = Column(String, nullable=True)
    age_high_value = Column(Numeric, nullable=True)
    age_high_unit = Column(String, nullable=True)
    age_high_system = Column(String, nullable=True)
    age_high_code = Column(String, nullable=True)

    # text (0..1 string)
    text = Column(String, nullable=True)

    observation = relationship("ObservationModel", back_populates="reference_ranges")
    applies_to = relationship(
        "ObservationReferenceRangeAppliesTo",
        back_populates="reference_range",
        cascade="all, delete-orphan",
    )


class ObservationReferenceRangeAppliesTo(Base):
    """appliesTo[] CodeableConcept entries within a referenceRange."""
    __tablename__ = "observation_reference_range_applies_to"

    id = Column(Integer, primary_key=True, autoincrement=True)
    reference_range_id = Column(
        Integer, ForeignKey("observation_reference_range.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    reference_range = relationship("ObservationReferenceRange", back_populates="applies_to")


# ---------------------------------------------------------------------------
# hasMember[] — 0..*  Reference(Observation | QuestionnaireResponse | MolecularSequence)
# ---------------------------------------------------------------------------

class ObservationHasMember(Base):
    __tablename__ = "observation_has_member"

    id = Column(Integer, primary_key=True, autoincrement=True)
    observation_id = Column(Integer, ForeignKey("observation.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(ObservationHasMemberReferenceType, name="obs_has_member_ref_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    observation = relationship("ObservationModel", back_populates="has_members")


# ---------------------------------------------------------------------------
# derivedFrom[] — 0..*  Reference(DocumentReference | ImagingStudy | Media
#                                  | QuestionnaireResponse | Observation | MolecularSequence)
# ---------------------------------------------------------------------------

class ObservationDerivedFrom(Base):
    __tablename__ = "observation_derived_from"

    id = Column(Integer, primary_key=True, autoincrement=True)
    observation_id = Column(Integer, ForeignKey("observation.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(ObservationDerivedFromReferenceType, name="obs_derived_from_ref_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    observation = relationship("ObservationModel", back_populates="derived_from")


# ---------------------------------------------------------------------------
# component[] — 0..*  (BackboneElement)
#
# Structure:
#   observation
#     └── observation_component
#           ├── observation_component_interpretation[]
#           └── observation_component_reference_range[]
#                 └── observation_component_reference_range_applies_to[]
# ---------------------------------------------------------------------------

class ObservationComponent(Base):
    __tablename__ = "observation_component"

    id = Column(Integer, primary_key=True, autoincrement=True)
    observation_id = Column(Integer, ForeignKey("observation.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    # code (1..1 CodeableConcept)
    code_system = Column(String, nullable=True)
    code_code = Column(String, nullable=True)
    code_display = Column(String, nullable=True)
    code_text = Column(String, nullable=True)

    # value[x] (0..1 choice — same variants as main observation.value[x])
    value_quantity_value = Column(Numeric, nullable=True)
    value_quantity_comparator = Column(String, nullable=True)
    value_quantity_unit = Column(String, nullable=True)
    value_quantity_system = Column(String, nullable=True)
    value_quantity_code = Column(String, nullable=True)
    value_codeable_concept_system = Column(String, nullable=True)
    value_codeable_concept_code = Column(String, nullable=True)
    value_codeable_concept_display = Column(String, nullable=True)
    value_codeable_concept_text = Column(String, nullable=True)
    value_string = Column(String, nullable=True)
    value_boolean = Column(Boolean, nullable=True)
    value_integer = Column(Integer, nullable=True)
    value_time = Column(String, nullable=True)
    value_date_time = Column(DateTime(timezone=True), nullable=True)
    value_period_start = Column(DateTime(timezone=True), nullable=True)
    value_period_end = Column(DateTime(timezone=True), nullable=True)
    value_range_low_value = Column(Numeric, nullable=True)
    value_range_low_unit = Column(String, nullable=True)
    value_range_low_system = Column(String, nullable=True)
    value_range_low_code = Column(String, nullable=True)
    value_range_high_value = Column(Numeric, nullable=True)
    value_range_high_unit = Column(String, nullable=True)
    value_range_high_system = Column(String, nullable=True)
    value_range_high_code = Column(String, nullable=True)
    value_ratio_numerator_value = Column(Numeric, nullable=True)
    value_ratio_numerator_comparator = Column(String, nullable=True)
    value_ratio_numerator_unit = Column(String, nullable=True)
    value_ratio_numerator_system = Column(String, nullable=True)
    value_ratio_numerator_code = Column(String, nullable=True)
    value_ratio_denominator_value = Column(Numeric, nullable=True)
    value_ratio_denominator_comparator = Column(String, nullable=True)
    value_ratio_denominator_unit = Column(String, nullable=True)
    value_ratio_denominator_system = Column(String, nullable=True)
    value_ratio_denominator_code = Column(String, nullable=True)
    value_sampled_data_origin_value = Column(Numeric, nullable=True)
    value_sampled_data_origin_unit = Column(String, nullable=True)
    value_sampled_data_origin_system = Column(String, nullable=True)
    value_sampled_data_origin_code = Column(String, nullable=True)
    value_sampled_data_period = Column(Numeric, nullable=True)
    value_sampled_data_factor = Column(Numeric, nullable=True)
    value_sampled_data_lower_limit = Column(Numeric, nullable=True)
    value_sampled_data_upper_limit = Column(Numeric, nullable=True)
    value_sampled_data_dimensions = Column(Integer, nullable=True)
    value_sampled_data_data = Column(Text, nullable=True)

    # dataAbsentReason (0..1 CodeableConcept)
    data_absent_reason_system = Column(String, nullable=True)
    data_absent_reason_code = Column(String, nullable=True)
    data_absent_reason_display = Column(String, nullable=True)
    data_absent_reason_text = Column(String, nullable=True)

    observation = relationship("ObservationModel", back_populates="components")
    interpretations = relationship(
        "ObservationComponentInterpretation",
        back_populates="component",
        cascade="all, delete-orphan",
    )
    reference_ranges = relationship(
        "ObservationComponentReferenceRange",
        back_populates="component",
        cascade="all, delete-orphan",
    )


class ObservationComponentInterpretation(Base):
    """interpretation[] CodeableConcept entries within a component."""
    __tablename__ = "observation_component_interpretation"

    id = Column(Integer, primary_key=True, autoincrement=True)
    component_id = Column(
        Integer, ForeignKey("observation_component.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    component = relationship("ObservationComponent", back_populates="interpretations")


class ObservationComponentReferenceRange(Base):
    """referenceRange[] BackboneElement entries within a component."""
    __tablename__ = "observation_component_reference_range"

    id = Column(Integer, primary_key=True, autoincrement=True)
    component_id = Column(
        Integer, ForeignKey("observation_component.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    low_value = Column(Numeric, nullable=True)
    low_unit = Column(String, nullable=True)
    low_system = Column(String, nullable=True)
    low_code = Column(String, nullable=True)

    high_value = Column(Numeric, nullable=True)
    high_unit = Column(String, nullable=True)
    high_system = Column(String, nullable=True)
    high_code = Column(String, nullable=True)

    type_system = Column(String, nullable=True)
    type_code = Column(String, nullable=True)
    type_display = Column(String, nullable=True)
    type_text = Column(String, nullable=True)

    age_low_value = Column(Numeric, nullable=True)
    age_low_unit = Column(String, nullable=True)
    age_low_system = Column(String, nullable=True)
    age_low_code = Column(String, nullable=True)
    age_high_value = Column(Numeric, nullable=True)
    age_high_unit = Column(String, nullable=True)
    age_high_system = Column(String, nullable=True)
    age_high_code = Column(String, nullable=True)

    text = Column(String, nullable=True)

    component = relationship("ObservationComponent", back_populates="reference_ranges")
    applies_to = relationship(
        "ObservationComponentReferenceRangeAppliesTo",
        back_populates="reference_range",
        cascade="all, delete-orphan",
    )


class ObservationComponentReferenceRangeAppliesTo(Base):
    """appliesTo[] CodeableConcept entries within a component.referenceRange."""
    __tablename__ = "observation_component_reference_range_applies_to"

    id = Column(Integer, primary_key=True, autoincrement=True)
    reference_range_id = Column(
        Integer,
        ForeignKey("observation_component_reference_range.id"),
        nullable=False,
        index=True,
    )
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    reference_range = relationship(
        "ObservationComponentReferenceRange", back_populates="applies_to"
    )
