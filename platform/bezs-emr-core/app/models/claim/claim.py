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
from app.models.enums import OrganizationReferenceType
from app.models.claim.enums import (
    ClaimStatus,
    ClaimUse,
    ClaimPatientReferenceType,
    ClaimEntererReferenceType,
    ClaimProviderReferenceType,
    ClaimPrescriptionReferenceType,
    ClaimReferralReferenceType,
    ClaimLocationReferenceType,
    ClaimPayeePartyReferenceType,
    ClaimRelatedClaimReferenceType,
    ClaimDiagnosisConditionReferenceType,
    ClaimProcedureReferenceType,
    ClaimDeviceReferenceType,
    ClaimInsuranceCoverageReferenceType,
    ClaimInsuranceClaimResponseReferenceType,
    ClaimItemEncounterReferenceType,
)

claim_id_seq = Sequence("claim_pub_seq", start=170000, increment=1, metadata=Base.metadata)


# ---------------------------------------------------------------------------
# Main table
# ---------------------------------------------------------------------------

class ClaimModel(Base):
    __tablename__ = "claim"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    claim_id = Column(
        Integer,
        claim_id_seq,
        server_default=claim_id_seq.next_value(),
        unique=True,
        index=True,
        nullable=False,
    )

    user_id = Column(String, nullable=True, index=True)
    org_id = Column(String, nullable=True, index=True)

    # status (1..1 code)
    status = Column(Enum(ClaimStatus, name="claim_status"), nullable=False)

    # type (1..1 CodeableConcept)
    type_system = Column(String, nullable=True)
    type_code = Column(String, nullable=True)
    type_display = Column(String, nullable=True)
    type_text = Column(String, nullable=True)

    # subType (0..1 CodeableConcept)
    sub_type_system = Column(String, nullable=True)
    sub_type_code = Column(String, nullable=True)
    sub_type_display = Column(String, nullable=True)
    sub_type_text = Column(String, nullable=True)

    # use (1..1 code)
    use = Column(Enum(ClaimUse, name="claim_use"), nullable=False)

    # patient (1..1 Reference(Patient))
    patient_type = Column(
        Enum(ClaimPatientReferenceType, name="claim_patient_ref_type"),
        nullable=True,
    )
    patient_id = Column(Integer, nullable=True)
    patient_display = Column(String, nullable=True)

    # billablePeriod (0..1 Period)
    billable_period_start = Column(DateTime(timezone=True), nullable=True)
    billable_period_end = Column(DateTime(timezone=True), nullable=True)

    # created (1..1 dateTime)
    created = Column(DateTime(timezone=True), nullable=False)

    # enterer (0..1 Reference(Practitioner | PractitionerRole))
    enterer_type = Column(
        Enum(ClaimEntererReferenceType, name="claim_enterer_ref_type"),
        nullable=True,
    )
    enterer_id = Column(Integer, nullable=True)
    enterer_display = Column(String, nullable=True)

    # insurer (0..1 Reference(Organization)) — shared enum
    insurer_type = Column(
        Enum(OrganizationReferenceType, name="organization_reference_type", create_type=False),
        nullable=True,
    )
    insurer_id = Column(Integer, nullable=True)
    insurer_display = Column(String, nullable=True)

    # provider (1..1 Reference(Practitioner | PractitionerRole | Organization))
    provider_type = Column(
        Enum(ClaimProviderReferenceType, name="claim_provider_ref_type"),
        nullable=True,
    )
    provider_id = Column(Integer, nullable=True)
    provider_display = Column(String, nullable=True)

    # priority (1..1 CodeableConcept)
    priority_system = Column(String, nullable=True)
    priority_code = Column(String, nullable=True)
    priority_display = Column(String, nullable=True)
    priority_text = Column(String, nullable=True)

    # fundsReserve (0..1 CodeableConcept)
    funds_reserve_system = Column(String, nullable=True)
    funds_reserve_code = Column(String, nullable=True)
    funds_reserve_display = Column(String, nullable=True)
    funds_reserve_text = Column(String, nullable=True)

    # prescription (0..1 Reference(DeviceRequest | MedicationRequest | VisionPrescription))
    prescription_type = Column(
        Enum(ClaimPrescriptionReferenceType, name="claim_prescription_ref_type"),
        nullable=True,
    )
    prescription_id = Column(Integer, nullable=True)
    prescription_display = Column(String, nullable=True)

    # originalPrescription (0..1 Reference — same allowed types as prescription)
    original_prescription_type = Column(
        Enum(ClaimPrescriptionReferenceType, name="claim_prescription_ref_type", create_type=False),
        nullable=True,
    )
    original_prescription_id = Column(Integer, nullable=True)
    original_prescription_display = Column(String, nullable=True)

    # payee (0..1 BackboneElement — flattened)
    payee_type_system = Column(String, nullable=True)
    payee_type_code = Column(String, nullable=True)
    payee_type_display = Column(String, nullable=True)
    payee_type_text = Column(String, nullable=True)
    payee_party_type = Column(
        Enum(ClaimPayeePartyReferenceType, name="claim_payee_party_ref_type"),
        nullable=True,
    )
    payee_party_id = Column(Integer, nullable=True)
    payee_party_display = Column(String, nullable=True)

    # referral (0..1 Reference(ServiceRequest))
    referral_type = Column(
        Enum(ClaimReferralReferenceType, name="claim_referral_ref_type"),
        nullable=True,
    )
    referral_id = Column(Integer, nullable=True)
    referral_display = Column(String, nullable=True)

    # facility (0..1 Reference(Location))
    facility_type = Column(
        Enum(ClaimLocationReferenceType, name="claim_location_ref_type"),
        nullable=True,
    )
    facility_id = Column(Integer, nullable=True)
    facility_display = Column(String, nullable=True)

    # accident (0..1 BackboneElement — flattened)
    accident_date = Column(Date, nullable=True)
    accident_type_system = Column(String, nullable=True)
    accident_type_code = Column(String, nullable=True)
    accident_type_display = Column(String, nullable=True)
    accident_type_text = Column(String, nullable=True)
    # accident.location[x]: Address | Reference(Location)
    accident_location_address_use = Column(String, nullable=True)
    accident_location_address_type = Column(String, nullable=True)
    accident_location_address_text = Column(String, nullable=True)
    accident_location_address_line = Column(Text, nullable=True)       # comma-separated
    accident_location_address_city = Column(String, nullable=True)
    accident_location_address_district = Column(String, nullable=True)
    accident_location_address_state = Column(String, nullable=True)
    accident_location_address_postal_code = Column(String, nullable=True)
    accident_location_address_country = Column(String, nullable=True)
    accident_location_address_period_start = Column(DateTime(timezone=True), nullable=True)
    accident_location_address_period_end = Column(DateTime(timezone=True), nullable=True)
    accident_location_reference_type = Column(
        Enum(ClaimLocationReferenceType, name="claim_location_ref_type", create_type=False),
        nullable=True,
    )
    accident_location_reference_id = Column(Integer, nullable=True)
    accident_location_reference_display = Column(String, nullable=True)

    # total (0..1 Money — flattened)
    total_value = Column(Numeric, nullable=True)
    total_currency = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String, nullable=True)
    updated_by = Column(String, nullable=True)

    # child relationships
    identifiers = relationship(
        "ClaimIdentifier", back_populates="claim", cascade="all, delete-orphan"
    )
    related = relationship(
        "ClaimRelated", back_populates="claim", cascade="all, delete-orphan"
    )
    care_team = relationship(
        "ClaimCareTeam", back_populates="claim", cascade="all, delete-orphan"
    )
    supporting_info = relationship(
        "ClaimSupportingInfo", back_populates="claim", cascade="all, delete-orphan"
    )
    diagnoses = relationship(
        "ClaimDiagnosis", back_populates="claim", cascade="all, delete-orphan"
    )
    procedures = relationship(
        "ClaimProcedure", back_populates="claim", cascade="all, delete-orphan"
    )
    insurance = relationship(
        "ClaimInsurance", back_populates="claim", cascade="all, delete-orphan"
    )
    items = relationship(
        "ClaimItem", back_populates="claim", cascade="all, delete-orphan"
    )


# ---------------------------------------------------------------------------
# identifier[] — 0..*  (Identifier)
# ---------------------------------------------------------------------------

class ClaimIdentifier(Base):
    __tablename__ = "claim_identifier"

    id = Column(Integer, primary_key=True, autoincrement=True)
    claim_id = Column(Integer, ForeignKey("claim.id"), nullable=False, index=True)
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

    claim = relationship("ClaimModel", back_populates="identifiers")


# ---------------------------------------------------------------------------
# related[] — 0..*  (BackboneElement)
# ---------------------------------------------------------------------------

class ClaimRelated(Base):
    __tablename__ = "claim_related"

    id = Column(Integer, primary_key=True, autoincrement=True)
    claim_id = Column(Integer, ForeignKey("claim.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    # claim (0..1 Reference(Claim))
    related_claim_type = Column(
        Enum(ClaimRelatedClaimReferenceType, name="claim_related_claim_ref_type"),
        nullable=True,
    )
    related_claim_id = Column(Integer, nullable=True)
    related_claim_display = Column(String, nullable=True)

    # relationship (0..1 CodeableConcept)
    relationship_system = Column(String, nullable=True)
    relationship_code = Column(String, nullable=True)
    relationship_display = Column(String, nullable=True)
    relationship_text = Column(String, nullable=True)

    # reference (0..1 Identifier — flattened)
    reference_use = Column(String, nullable=True)
    reference_type_system = Column(String, nullable=True)
    reference_type_code = Column(String, nullable=True)
    reference_type_display = Column(String, nullable=True)
    reference_type_text = Column(String, nullable=True)
    reference_system = Column(String, nullable=True)
    reference_value = Column(String, nullable=True)
    reference_period_start = Column(DateTime(timezone=True), nullable=True)
    reference_period_end = Column(DateTime(timezone=True), nullable=True)
    reference_assigner = Column(String, nullable=True)

    claim = relationship("ClaimModel", back_populates="related")


# ---------------------------------------------------------------------------
# careTeam[] — 0..*  (BackboneElement)
# ---------------------------------------------------------------------------

class ClaimCareTeam(Base):
    __tablename__ = "claim_care_team"

    id = Column(Integer, primary_key=True, autoincrement=True)
    claim_id = Column(Integer, ForeignKey("claim.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    sequence = Column(Integer, nullable=False)

    # provider (1..1 Reference(Practitioner | PractitionerRole | Organization))
    # Reuses claim_provider_ref_type (create_type=False — type already created on claim.provider)
    provider_type = Column(
        Enum(ClaimProviderReferenceType, name="claim_provider_ref_type", create_type=False),
        nullable=True,
    )
    provider_id = Column(Integer, nullable=True)
    provider_display = Column(String, nullable=True)

    responsible = Column(Boolean, nullable=True)

    # role (0..1 CodeableConcept)
    role_system = Column(String, nullable=True)
    role_code = Column(String, nullable=True)
    role_display = Column(String, nullable=True)
    role_text = Column(String, nullable=True)

    # qualification (0..1 CodeableConcept)
    qualification_system = Column(String, nullable=True)
    qualification_code = Column(String, nullable=True)
    qualification_display = Column(String, nullable=True)
    qualification_text = Column(String, nullable=True)

    claim = relationship("ClaimModel", back_populates="care_team")


# ---------------------------------------------------------------------------
# supportingInfo[] — 0..*  (BackboneElement)
# ---------------------------------------------------------------------------

class ClaimSupportingInfo(Base):
    __tablename__ = "claim_supporting_info"

    id = Column(Integer, primary_key=True, autoincrement=True)
    claim_id = Column(Integer, ForeignKey("claim.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    sequence = Column(Integer, nullable=False)

    # category (1..1 CodeableConcept)
    category_system = Column(String, nullable=True)
    category_code = Column(String, nullable=True)
    category_display = Column(String, nullable=True)
    category_text = Column(String, nullable=True)

    # code (0..1 CodeableConcept)
    code_system = Column(String, nullable=True)
    code_code = Column(String, nullable=True)
    code_display = Column(String, nullable=True)
    code_text = Column(String, nullable=True)

    # timing[x] (0..1 date | Period)
    timing_date = Column(Date, nullable=True)
    timing_period_start = Column(DateTime(timezone=True), nullable=True)
    timing_period_end = Column(DateTime(timezone=True), nullable=True)

    # value[x] (0..1 boolean | string | Quantity | Attachment | Reference(Any))
    value_boolean = Column(Boolean, nullable=True)
    value_string = Column(String, nullable=True)
    # Quantity
    value_quantity_value = Column(Numeric, nullable=True)
    value_quantity_comparator = Column(String, nullable=True)
    value_quantity_unit = Column(String, nullable=True)
    value_quantity_system = Column(String, nullable=True)
    value_quantity_code = Column(String, nullable=True)
    # Attachment
    value_attachment_content_type = Column(String, nullable=True)
    value_attachment_language = Column(String, nullable=True)
    value_attachment_data = Column(Text, nullable=True)    # base64Binary
    value_attachment_url = Column(String, nullable=True)
    value_attachment_size = Column(Integer, nullable=True)
    value_attachment_hash = Column(String, nullable=True)
    value_attachment_title = Column(String, nullable=True)
    value_attachment_creation = Column(DateTime(timezone=True), nullable=True)
    # Reference(Any) — open reference type
    value_reference_type = Column(String, nullable=True)
    value_reference_id = Column(Integer, nullable=True)
    value_reference_display = Column(String, nullable=True)

    # reason (0..1 CodeableConcept)
    reason_system = Column(String, nullable=True)
    reason_code = Column(String, nullable=True)
    reason_display = Column(String, nullable=True)
    reason_text = Column(String, nullable=True)

    claim = relationship("ClaimModel", back_populates="supporting_info")


# ---------------------------------------------------------------------------
# diagnosis[] — 0..*  (BackboneElement)
#
# Structure:
#   claim
#     └── claim_diagnosis
#           └── claim_diagnosis_type[]
# ---------------------------------------------------------------------------

class ClaimDiagnosis(Base):
    __tablename__ = "claim_diagnosis"

    id = Column(Integer, primary_key=True, autoincrement=True)
    claim_id = Column(Integer, ForeignKey("claim.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    sequence = Column(Integer, nullable=False)

    # diagnosis[x] (1..1 CodeableConcept | Reference(Condition))
    diagnosis_codeable_concept_system = Column(String, nullable=True)
    diagnosis_codeable_concept_code = Column(String, nullable=True)
    diagnosis_codeable_concept_display = Column(String, nullable=True)
    diagnosis_codeable_concept_text = Column(String, nullable=True)
    diagnosis_reference_type = Column(
        Enum(ClaimDiagnosisConditionReferenceType, name="claim_diagnosis_condition_ref_type"),
        nullable=True,
    )
    diagnosis_reference_id = Column(Integer, nullable=True)
    diagnosis_reference_display = Column(String, nullable=True)

    # onAdmission (0..1 CodeableConcept)
    on_admission_system = Column(String, nullable=True)
    on_admission_code = Column(String, nullable=True)
    on_admission_display = Column(String, nullable=True)
    on_admission_text = Column(String, nullable=True)

    # packageCode (0..1 CodeableConcept)
    package_code_system = Column(String, nullable=True)
    package_code_code = Column(String, nullable=True)
    package_code_display = Column(String, nullable=True)
    package_code_text = Column(String, nullable=True)

    claim = relationship("ClaimModel", back_populates="diagnoses")
    types = relationship(
        "ClaimDiagnosisType", back_populates="diagnosis", cascade="all, delete-orphan"
    )


class ClaimDiagnosisType(Base):
    """type[] CodeableConcept entries within a diagnosis."""
    __tablename__ = "claim_diagnosis_type"

    id = Column(Integer, primary_key=True, autoincrement=True)
    diagnosis_id = Column(Integer, ForeignKey("claim_diagnosis.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    diagnosis = relationship("ClaimDiagnosis", back_populates="types")


# ---------------------------------------------------------------------------
# procedure[] — 0..*  (BackboneElement)
#
# Structure:
#   claim
#     └── claim_procedure
#           ├── claim_procedure_type[]
#           └── claim_procedure_udi[]
# ---------------------------------------------------------------------------

class ClaimProcedure(Base):
    __tablename__ = "claim_procedure"

    id = Column(Integer, primary_key=True, autoincrement=True)
    claim_id = Column(Integer, ForeignKey("claim.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    sequence = Column(Integer, nullable=False)
    date = Column(DateTime(timezone=True), nullable=True)

    # procedure[x] (1..1 CodeableConcept | Reference(Procedure))
    procedure_codeable_concept_system = Column(String, nullable=True)
    procedure_codeable_concept_code = Column(String, nullable=True)
    procedure_codeable_concept_display = Column(String, nullable=True)
    procedure_codeable_concept_text = Column(String, nullable=True)
    procedure_reference_type = Column(
        Enum(ClaimProcedureReferenceType, name="claim_procedure_ref_type"),
        nullable=True,
    )
    procedure_reference_id = Column(Integer, nullable=True)
    procedure_reference_display = Column(String, nullable=True)

    claim = relationship("ClaimModel", back_populates="procedures")
    types = relationship(
        "ClaimProcedureType", back_populates="procedure", cascade="all, delete-orphan"
    )
    udi = relationship(
        "ClaimProcedureUdi", back_populates="procedure", cascade="all, delete-orphan"
    )


class ClaimProcedureType(Base):
    """type[] CodeableConcept entries within a procedure."""
    __tablename__ = "claim_procedure_type"

    id = Column(Integer, primary_key=True, autoincrement=True)
    procedure_id = Column(Integer, ForeignKey("claim_procedure.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    procedure = relationship("ClaimProcedure", back_populates="types")


class ClaimProcedureUdi(Base):
    """udi[] Reference(Device) entries within a procedure."""
    __tablename__ = "claim_procedure_udi"

    id = Column(Integer, primary_key=True, autoincrement=True)
    procedure_id = Column(Integer, ForeignKey("claim_procedure.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(ClaimDeviceReferenceType, name="claim_device_ref_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    procedure = relationship("ClaimProcedure", back_populates="udi")


# ---------------------------------------------------------------------------
# insurance[] — 1..*  (BackboneElement)
#
# Structure:
#   claim
#     └── claim_insurance
#           └── claim_insurance_pre_auth_ref[]
# ---------------------------------------------------------------------------

class ClaimInsurance(Base):
    __tablename__ = "claim_insurance"

    id = Column(Integer, primary_key=True, autoincrement=True)
    claim_id = Column(Integer, ForeignKey("claim.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    sequence = Column(Integer, nullable=False)
    focal = Column(Boolean, nullable=False)

    # identifier (0..1 Identifier — flattened)
    identifier_use = Column(String, nullable=True)
    identifier_type_system = Column(String, nullable=True)
    identifier_type_code = Column(String, nullable=True)
    identifier_type_display = Column(String, nullable=True)
    identifier_type_text = Column(String, nullable=True)
    identifier_system = Column(String, nullable=True)
    identifier_value = Column(String, nullable=True)
    identifier_period_start = Column(DateTime(timezone=True), nullable=True)
    identifier_period_end = Column(DateTime(timezone=True), nullable=True)
    identifier_assigner = Column(String, nullable=True)

    # coverage (1..1 Reference(Coverage))
    coverage_type = Column(
        Enum(ClaimInsuranceCoverageReferenceType, name="claim_insurance_coverage_ref_type"),
        nullable=True,
    )
    coverage_id = Column(Integer, nullable=True)
    coverage_display = Column(String, nullable=True)

    business_arrangement = Column(String, nullable=True)

    # claimResponse (0..1 Reference(ClaimResponse))
    claim_response_type = Column(
        Enum(ClaimInsuranceClaimResponseReferenceType, name="claim_insurance_claim_response_ref_type"),
        nullable=True,
    )
    claim_response_id = Column(Integer, nullable=True)
    claim_response_display = Column(String, nullable=True)

    claim = relationship("ClaimModel", back_populates="insurance")
    pre_auth_refs = relationship(
        "ClaimInsurancePreAuthRef", back_populates="insurance", cascade="all, delete-orphan"
    )


class ClaimInsurancePreAuthRef(Base):
    """preAuthRef[] string entries within an insurance entry."""
    __tablename__ = "claim_insurance_pre_auth_ref"

    id = Column(Integer, primary_key=True, autoincrement=True)
    insurance_id = Column(Integer, ForeignKey("claim_insurance.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    value = Column(String, nullable=False)

    insurance = relationship("ClaimInsurance", back_populates="pre_auth_refs")


# ---------------------------------------------------------------------------
# item[] — 0..*  (BackboneElement)
#
# Structure:
#   claim
#     └── claim_item
#           ├── claim_item_modifier[]
#           ├── claim_item_program_code[]
#           ├── claim_item_udi[]
#           ├── claim_item_sub_site[]
#           ├── claim_item_encounter[]
#           └── claim_item_detail[]
#                 ├── claim_item_detail_modifier[]
#                 ├── claim_item_detail_program_code[]
#                 ├── claim_item_detail_udi[]
#                 └── claim_item_detail_sub_detail[]
#                       ├── claim_item_detail_sub_detail_modifier[]
#                       ├── claim_item_detail_sub_detail_program_code[]
#                       └── claim_item_detail_sub_detail_udi[]
# ---------------------------------------------------------------------------

class ClaimItem(Base):
    __tablename__ = "claim_item"

    id = Column(Integer, primary_key=True, autoincrement=True)
    claim_id = Column(Integer, ForeignKey("claim.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    sequence = Column(Integer, nullable=False)

    # careTeamSequence[], diagnosisSequence[], procedureSequence[], informationSequence[]
    # are 0..* positiveInt cross-references; stored comma-separated (never individually filtered)
    care_team_sequence = Column(Text, nullable=True)
    diagnosis_sequence = Column(Text, nullable=True)
    procedure_sequence = Column(Text, nullable=True)
    information_sequence = Column(Text, nullable=True)

    # revenue (0..1 CodeableConcept)
    revenue_system = Column(String, nullable=True)
    revenue_code = Column(String, nullable=True)
    revenue_display = Column(String, nullable=True)
    revenue_text = Column(String, nullable=True)

    # category (0..1 CodeableConcept)
    category_system = Column(String, nullable=True)
    category_code = Column(String, nullable=True)
    category_display = Column(String, nullable=True)
    category_text = Column(String, nullable=True)

    # productOrService (1..1 CodeableConcept)
    product_or_service_system = Column(String, nullable=True)
    product_or_service_code = Column(String, nullable=True)
    product_or_service_display = Column(String, nullable=True)
    product_or_service_text = Column(String, nullable=True)

    # serviced[x] (0..1 date | Period)
    serviced_date = Column(Date, nullable=True)
    serviced_period_start = Column(DateTime(timezone=True), nullable=True)
    serviced_period_end = Column(DateTime(timezone=True), nullable=True)

    # location[x] (0..1 CodeableConcept | Address | Reference(Location))
    location_codeable_concept_system = Column(String, nullable=True)
    location_codeable_concept_code = Column(String, nullable=True)
    location_codeable_concept_display = Column(String, nullable=True)
    location_codeable_concept_text = Column(String, nullable=True)
    location_address_use = Column(String, nullable=True)
    location_address_type = Column(String, nullable=True)
    location_address_text = Column(String, nullable=True)
    location_address_line = Column(Text, nullable=True)         # comma-separated
    location_address_city = Column(String, nullable=True)
    location_address_district = Column(String, nullable=True)
    location_address_state = Column(String, nullable=True)
    location_address_postal_code = Column(String, nullable=True)
    location_address_country = Column(String, nullable=True)
    location_address_period_start = Column(DateTime(timezone=True), nullable=True)
    location_address_period_end = Column(DateTime(timezone=True), nullable=True)
    location_reference_type = Column(
        Enum(ClaimLocationReferenceType, name="claim_location_ref_type", create_type=False),
        nullable=True,
    )
    location_reference_id = Column(Integer, nullable=True)
    location_reference_display = Column(String, nullable=True)

    # quantity (0..1 SimpleQuantity — no comparator)
    quantity_value = Column(Numeric, nullable=True)
    quantity_unit = Column(String, nullable=True)
    quantity_system = Column(String, nullable=True)
    quantity_code = Column(String, nullable=True)

    # unitPrice (0..1 Money)
    unit_price_value = Column(Numeric, nullable=True)
    unit_price_currency = Column(String, nullable=True)

    # factor (0..1 decimal)
    factor = Column(Numeric, nullable=True)

    # net (0..1 Money)
    net_value = Column(Numeric, nullable=True)
    net_currency = Column(String, nullable=True)

    # bodySite (0..1 CodeableConcept)
    body_site_system = Column(String, nullable=True)
    body_site_code = Column(String, nullable=True)
    body_site_display = Column(String, nullable=True)
    body_site_text = Column(String, nullable=True)

    claim = relationship("ClaimModel", back_populates="items")
    modifiers = relationship(
        "ClaimItemModifier", back_populates="item", cascade="all, delete-orphan"
    )
    program_codes = relationship(
        "ClaimItemProgramCode", back_populates="item", cascade="all, delete-orphan"
    )
    udi = relationship(
        "ClaimItemUdi", back_populates="item", cascade="all, delete-orphan"
    )
    sub_sites = relationship(
        "ClaimItemSubSite", back_populates="item", cascade="all, delete-orphan"
    )
    encounters = relationship(
        "ClaimItemEncounter", back_populates="item", cascade="all, delete-orphan"
    )
    details = relationship(
        "ClaimItemDetail", back_populates="item", cascade="all, delete-orphan"
    )


class ClaimItemModifier(Base):
    """modifier[] CodeableConcept entries within an item."""
    __tablename__ = "claim_item_modifier"

    id = Column(Integer, primary_key=True, autoincrement=True)
    item_id = Column(Integer, ForeignKey("claim_item.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    item = relationship("ClaimItem", back_populates="modifiers")


class ClaimItemProgramCode(Base):
    """programCode[] CodeableConcept entries within an item."""
    __tablename__ = "claim_item_program_code"

    id = Column(Integer, primary_key=True, autoincrement=True)
    item_id = Column(Integer, ForeignKey("claim_item.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    item = relationship("ClaimItem", back_populates="program_codes")


class ClaimItemUdi(Base):
    """udi[] Reference(Device) entries within an item."""
    __tablename__ = "claim_item_udi"

    id = Column(Integer, primary_key=True, autoincrement=True)
    item_id = Column(Integer, ForeignKey("claim_item.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(ClaimDeviceReferenceType, name="claim_device_ref_type", create_type=False),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    item = relationship("ClaimItem", back_populates="udi")


class ClaimItemSubSite(Base):
    """subSite[] CodeableConcept entries within an item."""
    __tablename__ = "claim_item_sub_site"

    id = Column(Integer, primary_key=True, autoincrement=True)
    item_id = Column(Integer, ForeignKey("claim_item.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    item = relationship("ClaimItem", back_populates="sub_sites")


class ClaimItemEncounter(Base):
    """encounter[] Reference(Encounter) entries within an item."""
    __tablename__ = "claim_item_encounter"

    id = Column(Integer, primary_key=True, autoincrement=True)
    item_id = Column(Integer, ForeignKey("claim_item.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(ClaimItemEncounterReferenceType, name="claim_item_encounter_ref_type"),
        nullable=True,
    )
    reference_id = Column(Integer, ForeignKey("encounter.id"), nullable=True, index=True)
    reference_display = Column(String, nullable=True)

    item = relationship("ClaimItem", back_populates="encounters")
    encounter = relationship("EncounterModel", foreign_keys=[reference_id], lazy="selectin")


# ---------------------------------------------------------------------------
# item.detail[] — 0..*  (BackboneElement inside item)
# ---------------------------------------------------------------------------

class ClaimItemDetail(Base):
    __tablename__ = "claim_item_detail"

    id = Column(Integer, primary_key=True, autoincrement=True)
    item_id = Column(Integer, ForeignKey("claim_item.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    sequence = Column(Integer, nullable=False)

    # revenue (0..1 CodeableConcept)
    revenue_system = Column(String, nullable=True)
    revenue_code = Column(String, nullable=True)
    revenue_display = Column(String, nullable=True)
    revenue_text = Column(String, nullable=True)

    # category (0..1 CodeableConcept)
    category_system = Column(String, nullable=True)
    category_code = Column(String, nullable=True)
    category_display = Column(String, nullable=True)
    category_text = Column(String, nullable=True)

    # productOrService (1..1 CodeableConcept)
    product_or_service_system = Column(String, nullable=True)
    product_or_service_code = Column(String, nullable=True)
    product_or_service_display = Column(String, nullable=True)
    product_or_service_text = Column(String, nullable=True)

    # quantity (0..1 SimpleQuantity)
    quantity_value = Column(Numeric, nullable=True)
    quantity_unit = Column(String, nullable=True)
    quantity_system = Column(String, nullable=True)
    quantity_code = Column(String, nullable=True)

    # unitPrice (0..1 Money)
    unit_price_value = Column(Numeric, nullable=True)
    unit_price_currency = Column(String, nullable=True)

    # factor (0..1 decimal)
    factor = Column(Numeric, nullable=True)

    # net (0..1 Money)
    net_value = Column(Numeric, nullable=True)
    net_currency = Column(String, nullable=True)

    item = relationship("ClaimItem", back_populates="details")
    modifiers = relationship(
        "ClaimItemDetailModifier", back_populates="detail", cascade="all, delete-orphan"
    )
    program_codes = relationship(
        "ClaimItemDetailProgramCode", back_populates="detail", cascade="all, delete-orphan"
    )
    udi = relationship(
        "ClaimItemDetailUdi", back_populates="detail", cascade="all, delete-orphan"
    )
    sub_details = relationship(
        "ClaimItemDetailSubDetail", back_populates="detail", cascade="all, delete-orphan"
    )


class ClaimItemDetailModifier(Base):
    """modifier[] CodeableConcept entries within a detail."""
    __tablename__ = "claim_item_detail_modifier"

    id = Column(Integer, primary_key=True, autoincrement=True)
    detail_id = Column(Integer, ForeignKey("claim_item_detail.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    detail = relationship("ClaimItemDetail", back_populates="modifiers")


class ClaimItemDetailProgramCode(Base):
    """programCode[] CodeableConcept entries within a detail."""
    __tablename__ = "claim_item_detail_program_code"

    id = Column(Integer, primary_key=True, autoincrement=True)
    detail_id = Column(Integer, ForeignKey("claim_item_detail.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    detail = relationship("ClaimItemDetail", back_populates="program_codes")


class ClaimItemDetailUdi(Base):
    """udi[] Reference(Device) entries within a detail."""
    __tablename__ = "claim_item_detail_udi"

    id = Column(Integer, primary_key=True, autoincrement=True)
    detail_id = Column(Integer, ForeignKey("claim_item_detail.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(ClaimDeviceReferenceType, name="claim_device_ref_type", create_type=False),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    detail = relationship("ClaimItemDetail", back_populates="udi")


# ---------------------------------------------------------------------------
# item.detail.subDetail[] — 0..*  (BackboneElement inside detail)
# ---------------------------------------------------------------------------

class ClaimItemDetailSubDetail(Base):
    __tablename__ = "claim_item_detail_sub_detail"

    id = Column(Integer, primary_key=True, autoincrement=True)
    detail_id = Column(Integer, ForeignKey("claim_item_detail.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    sequence = Column(Integer, nullable=False)

    # revenue (0..1 CodeableConcept)
    revenue_system = Column(String, nullable=True)
    revenue_code = Column(String, nullable=True)
    revenue_display = Column(String, nullable=True)
    revenue_text = Column(String, nullable=True)

    # category (0..1 CodeableConcept)
    category_system = Column(String, nullable=True)
    category_code = Column(String, nullable=True)
    category_display = Column(String, nullable=True)
    category_text = Column(String, nullable=True)

    # productOrService (1..1 CodeableConcept)
    product_or_service_system = Column(String, nullable=True)
    product_or_service_code = Column(String, nullable=True)
    product_or_service_display = Column(String, nullable=True)
    product_or_service_text = Column(String, nullable=True)

    # quantity (0..1 SimpleQuantity)
    quantity_value = Column(Numeric, nullable=True)
    quantity_unit = Column(String, nullable=True)
    quantity_system = Column(String, nullable=True)
    quantity_code = Column(String, nullable=True)

    # unitPrice (0..1 Money)
    unit_price_value = Column(Numeric, nullable=True)
    unit_price_currency = Column(String, nullable=True)

    # factor (0..1 decimal)
    factor = Column(Numeric, nullable=True)

    # net (0..1 Money)
    net_value = Column(Numeric, nullable=True)
    net_currency = Column(String, nullable=True)

    detail = relationship("ClaimItemDetail", back_populates="sub_details")
    modifiers = relationship(
        "ClaimItemDetailSubDetailModifier", back_populates="sub_detail", cascade="all, delete-orphan"
    )
    program_codes = relationship(
        "ClaimItemDetailSubDetailProgramCode", back_populates="sub_detail", cascade="all, delete-orphan"
    )
    udi = relationship(
        "ClaimItemDetailSubDetailUdi", back_populates="sub_detail", cascade="all, delete-orphan"
    )


class ClaimItemDetailSubDetailModifier(Base):
    """modifier[] CodeableConcept entries within a subDetail."""
    __tablename__ = "claim_item_detail_sub_detail_modifier"

    id = Column(Integer, primary_key=True, autoincrement=True)
    sub_detail_id = Column(
        Integer, ForeignKey("claim_item_detail_sub_detail.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    sub_detail = relationship("ClaimItemDetailSubDetail", back_populates="modifiers")


class ClaimItemDetailSubDetailProgramCode(Base):
    """programCode[] CodeableConcept entries within a subDetail."""
    __tablename__ = "claim_item_detail_sub_detail_program_code"

    id = Column(Integer, primary_key=True, autoincrement=True)
    sub_detail_id = Column(
        Integer, ForeignKey("claim_item_detail_sub_detail.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    sub_detail = relationship("ClaimItemDetailSubDetail", back_populates="program_codes")


class ClaimItemDetailSubDetailUdi(Base):
    """udi[] Reference(Device) entries within a subDetail."""
    __tablename__ = "claim_item_detail_sub_detail_udi"

    id = Column(Integer, primary_key=True, autoincrement=True)
    sub_detail_id = Column(
        Integer, ForeignKey("claim_item_detail_sub_detail.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(ClaimDeviceReferenceType, name="claim_device_ref_type", create_type=False),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    sub_detail = relationship("ClaimItemDetailSubDetail", back_populates="udi")
