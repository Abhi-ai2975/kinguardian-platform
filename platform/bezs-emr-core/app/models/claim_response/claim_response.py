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
from app.models.claim_response.enums import (
    ClaimResponseStatus,
    ClaimResponseUse,
    ClaimResponseOutcome,
    ClaimResponsePatientReferenceType,
    ClaimResponseRequestorReferenceType,
    ClaimResponseRequestReferenceType,
    ClaimResponseAddItemProviderReferenceType,
    ClaimResponseAddItemLocationReferenceType,
    ClaimResponseInsuranceCoverageReferenceType,
    ClaimResponseInsuranceClaimResponseReferenceType,
    ClaimResponseCommunicationRequestReferenceType,
)

claim_response_id_seq = Sequence("claim_response_pub_seq", start=180000, increment=1, metadata=Base.metadata)


# ---------------------------------------------------------------------------
# Main table
# ---------------------------------------------------------------------------

class ClaimResponseModel(Base):
    __tablename__ = "claim_response"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    claim_response_id = Column(
        Integer,
        claim_response_id_seq,
        server_default=claim_response_id_seq.next_value(),
        unique=True,
        index=True,
        nullable=False,
    )
    user_id = Column(String, nullable=True, index=True)
    org_id = Column(String, nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String, nullable=True)
    updated_by = Column(String, nullable=True)

    # status (1..1)
    status = Column(
        Enum(ClaimResponseStatus, name="claim_response_status"),
        nullable=False,
    )

    # type (1..1) CodeableConcept
    type_system = Column(String, nullable=True)
    type_code = Column(String, nullable=True)
    type_display = Column(String, nullable=True)
    type_text = Column(String, nullable=True)

    # subType (0..1) CodeableConcept
    sub_type_system = Column(String, nullable=True)
    sub_type_code = Column(String, nullable=True)
    sub_type_display = Column(String, nullable=True)
    sub_type_text = Column(String, nullable=True)

    # use (1..1)
    use = Column(
        Enum(ClaimResponseUse, name="claim_response_use"),
        nullable=False,
    )

    # patient (1..1) Reference(Patient)
    patient_type = Column(
        Enum(ClaimResponsePatientReferenceType, name="claim_response_patient_ref_type"),
        nullable=True,
    )
    patient_id = Column(Integer, nullable=True)
    patient_display = Column(String, nullable=True)

    # created (1..1) dateTime
    created = Column(DateTime(timezone=True), nullable=False)

    # insurer (1..1) Reference(Organization) — shared PG type
    insurer_type = Column(
        Enum(OrganizationReferenceType, name="organization_reference_type", create_type=False),
        nullable=True,
    )
    insurer_id = Column(Integer, nullable=True)
    insurer_display = Column(String, nullable=True)

    # requestor (0..1) Reference(Practitioner | PractitionerRole | Organization)
    requestor_type = Column(
        Enum(ClaimResponseRequestorReferenceType, name="claim_response_requestor_ref_type"),
        nullable=True,
    )
    requestor_id = Column(Integer, nullable=True)
    requestor_display = Column(String, nullable=True)

    # request (0..1) Reference(Claim)
    request_type = Column(
        Enum(ClaimResponseRequestReferenceType, name="claim_response_request_ref_type"),
        nullable=True,
    )
    request_id = Column(Integer, nullable=True)
    request_display = Column(String, nullable=True)

    # outcome (1..1)
    outcome = Column(
        Enum(ClaimResponseOutcome, name="claim_response_outcome"),
        nullable=False,
    )

    # disposition (0..1)
    disposition = Column(String, nullable=True)

    # preAuthRef (0..1)
    pre_auth_ref = Column(String, nullable=True)

    # preAuthPeriod (0..1) Period
    pre_auth_period_start = Column(DateTime(timezone=True), nullable=True)
    pre_auth_period_end = Column(DateTime(timezone=True), nullable=True)

    # payeeType (0..1) CodeableConcept
    payee_type_system = Column(String, nullable=True)
    payee_type_code = Column(String, nullable=True)
    payee_type_display = Column(String, nullable=True)
    payee_type_text = Column(String, nullable=True)

    # payment (0..1) BackboneElement — flattened onto main table
    payment_type_system = Column(String, nullable=True)
    payment_type_code = Column(String, nullable=True)
    payment_type_display = Column(String, nullable=True)
    payment_type_text = Column(String, nullable=True)
    payment_adjustment_value = Column(Numeric(12, 2), nullable=True)
    payment_adjustment_currency = Column(String(3), nullable=True)
    payment_adjustment_reason_system = Column(String, nullable=True)
    payment_adjustment_reason_code = Column(String, nullable=True)
    payment_adjustment_reason_display = Column(String, nullable=True)
    payment_adjustment_reason_text = Column(String, nullable=True)
    payment_date = Column(Date, nullable=True)
    payment_amount_value = Column(Numeric(12, 2), nullable=True)
    payment_amount_currency = Column(String(3), nullable=True)
    # payment.identifier (0..1 Identifier) — flattened
    payment_identifier_use = Column(String, nullable=True)
    payment_identifier_type_system = Column(String, nullable=True)
    payment_identifier_type_code = Column(String, nullable=True)
    payment_identifier_type_display = Column(String, nullable=True)
    payment_identifier_type_text = Column(String, nullable=True)
    payment_identifier_system = Column(String, nullable=True)
    payment_identifier_value = Column(String, nullable=True)
    payment_identifier_period_start = Column(DateTime(timezone=True), nullable=True)
    payment_identifier_period_end = Column(DateTime(timezone=True), nullable=True)
    payment_identifier_assigner = Column(String, nullable=True)

    # fundsReserve (0..1) CodeableConcept
    funds_reserve_system = Column(String, nullable=True)
    funds_reserve_code = Column(String, nullable=True)
    funds_reserve_display = Column(String, nullable=True)
    funds_reserve_text = Column(String, nullable=True)

    # formCode (0..1) CodeableConcept
    form_code_system = Column(String, nullable=True)
    form_code_code = Column(String, nullable=True)
    form_code_display = Column(String, nullable=True)
    form_code_text = Column(String, nullable=True)

    # form (0..1) Attachment
    form_content_type = Column(String, nullable=True)
    form_language = Column(String, nullable=True)
    form_data = Column(Text, nullable=True)
    form_url = Column(String, nullable=True)
    form_size = Column(Integer, nullable=True)
    form_hash = Column(Text, nullable=True)
    form_title = Column(String, nullable=True)
    form_creation = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    identifiers = relationship(
        "ClaimResponseIdentifier", back_populates="claim_response", cascade="all, delete-orphan"
    )
    items = relationship(
        "ClaimResponseItem", back_populates="claim_response", cascade="all, delete-orphan"
    )
    add_items = relationship(
        "ClaimResponseAddItem", back_populates="claim_response", cascade="all, delete-orphan"
    )
    adjudications = relationship(
        "ClaimResponseAdjudication", back_populates="claim_response", cascade="all, delete-orphan"
    )
    totals = relationship(
        "ClaimResponseTotal", back_populates="claim_response", cascade="all, delete-orphan"
    )
    process_notes = relationship(
        "ClaimResponseProcessNote", back_populates="claim_response", cascade="all, delete-orphan"
    )
    communication_requests = relationship(
        "ClaimResponseCommunicationRequest", back_populates="claim_response", cascade="all, delete-orphan"
    )
    insurances = relationship(
        "ClaimResponseInsurance", back_populates="claim_response", cascade="all, delete-orphan"
    )
    errors = relationship(
        "ClaimResponseError", back_populates="claim_response", cascade="all, delete-orphan"
    )


# ---------------------------------------------------------------------------
# identifier (0..*) child table
# ---------------------------------------------------------------------------

class ClaimResponseIdentifier(Base):
    __tablename__ = "claim_response_identifier"

    id = Column(Integer, primary_key=True, autoincrement=True)
    claim_response_id = Column(Integer, ForeignKey("claim_response.id"), nullable=False, index=True)
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

    claim_response = relationship("ClaimResponseModel", back_populates="identifiers")


# ---------------------------------------------------------------------------
# item (0..*) child table
# ---------------------------------------------------------------------------

class ClaimResponseItem(Base):
    __tablename__ = "claim_response_item"

    id = Column(Integer, primary_key=True, autoincrement=True)
    claim_response_id = Column(Integer, ForeignKey("claim_response.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)
    item_sequence = Column(Integer, nullable=False)
    note_number = Column(Text, nullable=True)  # comma-separated positiveInt list

    claim_response = relationship("ClaimResponseModel", back_populates="items")
    adjudications = relationship(
        "ClaimResponseItemAdjudication", back_populates="item", cascade="all, delete-orphan"
    )
    details = relationship(
        "ClaimResponseItemDetail", back_populates="item", cascade="all, delete-orphan"
    )


class ClaimResponseItemAdjudication(Base):
    __tablename__ = "claim_response_item_adjudication"

    id = Column(Integer, primary_key=True, autoincrement=True)
    item_id = Column(Integer, ForeignKey("claim_response_item.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)
    category_system = Column(String, nullable=True)
    category_code = Column(String, nullable=True)
    category_display = Column(String, nullable=True)
    category_text = Column(String, nullable=True)
    reason_system = Column(String, nullable=True)
    reason_code = Column(String, nullable=True)
    reason_display = Column(String, nullable=True)
    reason_text = Column(String, nullable=True)
    amount_value = Column(Numeric(12, 2), nullable=True)
    amount_currency = Column(String(3), nullable=True)
    adj_value = Column(Numeric(12, 4), nullable=True)

    item = relationship("ClaimResponseItem", back_populates="adjudications")


class ClaimResponseItemDetail(Base):
    __tablename__ = "claim_response_item_detail"

    id = Column(Integer, primary_key=True, autoincrement=True)
    item_id = Column(Integer, ForeignKey("claim_response_item.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)
    detail_sequence = Column(Integer, nullable=False)
    note_number = Column(Text, nullable=True)

    item = relationship("ClaimResponseItem", back_populates="details")
    adjudications = relationship(
        "ClaimResponseItemDetailAdjudication", back_populates="detail", cascade="all, delete-orphan"
    )
    sub_details = relationship(
        "ClaimResponseItemDetailSubDetail", back_populates="detail", cascade="all, delete-orphan"
    )


class ClaimResponseItemDetailAdjudication(Base):
    __tablename__ = "claim_response_item_detail_adjudication"

    id = Column(Integer, primary_key=True, autoincrement=True)
    detail_id = Column(Integer, ForeignKey("claim_response_item_detail.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)
    category_system = Column(String, nullable=True)
    category_code = Column(String, nullable=True)
    category_display = Column(String, nullable=True)
    category_text = Column(String, nullable=True)
    reason_system = Column(String, nullable=True)
    reason_code = Column(String, nullable=True)
    reason_display = Column(String, nullable=True)
    reason_text = Column(String, nullable=True)
    amount_value = Column(Numeric(12, 2), nullable=True)
    amount_currency = Column(String(3), nullable=True)
    adj_value = Column(Numeric(12, 4), nullable=True)

    detail = relationship("ClaimResponseItemDetail", back_populates="adjudications")


class ClaimResponseItemDetailSubDetail(Base):
    __tablename__ = "claim_response_item_detail_sub_detail"

    id = Column(Integer, primary_key=True, autoincrement=True)
    detail_id = Column(Integer, ForeignKey("claim_response_item_detail.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)
    sub_detail_sequence = Column(Integer, nullable=False)
    note_number = Column(Text, nullable=True)

    detail = relationship("ClaimResponseItemDetail", back_populates="sub_details")
    adjudications = relationship(
        "ClaimResponseItemDetailSubDetailAdjudication",
        back_populates="sub_detail",
        cascade="all, delete-orphan",
    )


class ClaimResponseItemDetailSubDetailAdjudication(Base):
    __tablename__ = "claim_response_item_detail_sub_detail_adjudication"

    id = Column(Integer, primary_key=True, autoincrement=True)
    sub_detail_id = Column(
        Integer, ForeignKey("claim_response_item_detail_sub_detail.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)
    category_system = Column(String, nullable=True)
    category_code = Column(String, nullable=True)
    category_display = Column(String, nullable=True)
    category_text = Column(String, nullable=True)
    reason_system = Column(String, nullable=True)
    reason_code = Column(String, nullable=True)
    reason_display = Column(String, nullable=True)
    reason_text = Column(String, nullable=True)
    amount_value = Column(Numeric(12, 2), nullable=True)
    amount_currency = Column(String(3), nullable=True)
    adj_value = Column(Numeric(12, 4), nullable=True)

    sub_detail = relationship("ClaimResponseItemDetailSubDetail", back_populates="adjudications")


# ---------------------------------------------------------------------------
# addItem (0..*) child table
# ---------------------------------------------------------------------------

class ClaimResponseAddItem(Base):
    __tablename__ = "claim_response_add_item"

    id = Column(Integer, primary_key=True, autoincrement=True)
    claim_response_id = Column(Integer, ForeignKey("claim_response.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    # cross-reference sequences (0..* positiveInt each) — comma-separated
    item_sequence = Column(Text, nullable=True)
    detail_sequence = Column(Text, nullable=True)
    subdetail_sequence = Column(Text, nullable=True)

    # productOrService (1..1) CodeableConcept
    product_or_service_system = Column(String, nullable=True)
    product_or_service_code = Column(String, nullable=True)
    product_or_service_display = Column(String, nullable=True)
    product_or_service_text = Column(String, nullable=True)

    # serviced[x] (0..1) date | Period
    serviced_date = Column(Date, nullable=True)
    serviced_period_start = Column(DateTime(timezone=True), nullable=True)
    serviced_period_end = Column(DateTime(timezone=True), nullable=True)

    # location[x] (0..1) CodeableConcept | Address | Reference(Location)
    location_cc_system = Column(String, nullable=True)
    location_cc_code = Column(String, nullable=True)
    location_cc_display = Column(String, nullable=True)
    location_cc_text = Column(String, nullable=True)
    location_address_use = Column(String, nullable=True)
    location_address_type = Column(String, nullable=True)
    location_address_text = Column(String, nullable=True)
    location_address_line = Column(Text, nullable=True)  # comma-separated
    location_address_city = Column(String, nullable=True)
    location_address_district = Column(String, nullable=True)
    location_address_state = Column(String, nullable=True)
    location_address_postal_code = Column(String, nullable=True)
    location_address_country = Column(String, nullable=True)
    location_ref_type = Column(
        Enum(ClaimResponseAddItemLocationReferenceType, name="claim_response_add_item_location_ref_type"),
        nullable=True,
    )
    location_ref_id = Column(Integer, nullable=True)
    location_ref_display = Column(String, nullable=True)

    # quantity (0..1) SimpleQuantity
    quantity_value = Column(Numeric(12, 4), nullable=True)
    quantity_unit = Column(String, nullable=True)
    quantity_system = Column(String, nullable=True)
    quantity_code = Column(String, nullable=True)

    # unitPrice (0..1) Money
    unit_price_value = Column(Numeric(12, 2), nullable=True)
    unit_price_currency = Column(String(3), nullable=True)

    # factor (0..1) decimal
    factor = Column(Numeric(12, 4), nullable=True)

    # net (0..1) Money
    net_value = Column(Numeric(12, 2), nullable=True)
    net_currency = Column(String(3), nullable=True)

    # bodySite (0..1) CodeableConcept
    body_site_system = Column(String, nullable=True)
    body_site_code = Column(String, nullable=True)
    body_site_display = Column(String, nullable=True)
    body_site_text = Column(String, nullable=True)

    # noteNumber (0..*) positiveInt — comma-separated
    note_number = Column(Text, nullable=True)

    claim_response = relationship("ClaimResponseModel", back_populates="add_items")
    providers = relationship(
        "ClaimResponseAddItemProvider", back_populates="add_item", cascade="all, delete-orphan"
    )
    modifiers = relationship(
        "ClaimResponseAddItemModifier", back_populates="add_item", cascade="all, delete-orphan"
    )
    program_codes = relationship(
        "ClaimResponseAddItemProgramCode", back_populates="add_item", cascade="all, delete-orphan"
    )
    sub_sites = relationship(
        "ClaimResponseAddItemSubSite", back_populates="add_item", cascade="all, delete-orphan"
    )
    adjudications = relationship(
        "ClaimResponseAddItemAdjudication", back_populates="add_item", cascade="all, delete-orphan"
    )
    details = relationship(
        "ClaimResponseAddItemDetail", back_populates="add_item", cascade="all, delete-orphan"
    )


class ClaimResponseAddItemProvider(Base):
    __tablename__ = "claim_response_add_item_provider"

    id = Column(Integer, primary_key=True, autoincrement=True)
    add_item_id = Column(Integer, ForeignKey("claim_response_add_item.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)
    reference_type = Column(
        Enum(
            ClaimResponseAddItemProviderReferenceType,
            name="claim_response_add_item_provider_ref_type",
        ),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    add_item = relationship("ClaimResponseAddItem", back_populates="providers")


class ClaimResponseAddItemModifier(Base):
    __tablename__ = "claim_response_add_item_modifier"

    id = Column(Integer, primary_key=True, autoincrement=True)
    add_item_id = Column(Integer, ForeignKey("claim_response_add_item.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)
    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    add_item = relationship("ClaimResponseAddItem", back_populates="modifiers")


class ClaimResponseAddItemProgramCode(Base):
    __tablename__ = "claim_response_add_item_program_code"

    id = Column(Integer, primary_key=True, autoincrement=True)
    add_item_id = Column(Integer, ForeignKey("claim_response_add_item.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)
    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    add_item = relationship("ClaimResponseAddItem", back_populates="program_codes")


class ClaimResponseAddItemSubSite(Base):
    __tablename__ = "claim_response_add_item_sub_site"

    id = Column(Integer, primary_key=True, autoincrement=True)
    add_item_id = Column(Integer, ForeignKey("claim_response_add_item.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)
    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    add_item = relationship("ClaimResponseAddItem", back_populates="sub_sites")


class ClaimResponseAddItemAdjudication(Base):
    __tablename__ = "claim_response_add_item_adjudication"

    id = Column(Integer, primary_key=True, autoincrement=True)
    add_item_id = Column(Integer, ForeignKey("claim_response_add_item.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)
    category_system = Column(String, nullable=True)
    category_code = Column(String, nullable=True)
    category_display = Column(String, nullable=True)
    category_text = Column(String, nullable=True)
    reason_system = Column(String, nullable=True)
    reason_code = Column(String, nullable=True)
    reason_display = Column(String, nullable=True)
    reason_text = Column(String, nullable=True)
    amount_value = Column(Numeric(12, 2), nullable=True)
    amount_currency = Column(String(3), nullable=True)
    adj_value = Column(Numeric(12, 4), nullable=True)

    add_item = relationship("ClaimResponseAddItem", back_populates="adjudications")


# ---------------------------------------------------------------------------
# addItem.detail (0..*) grandchild table
# ---------------------------------------------------------------------------

class ClaimResponseAddItemDetail(Base):
    __tablename__ = "claim_response_add_item_detail"

    id = Column(Integer, primary_key=True, autoincrement=True)
    add_item_id = Column(Integer, ForeignKey("claim_response_add_item.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    # productOrService (1..1) CodeableConcept
    product_or_service_system = Column(String, nullable=True)
    product_or_service_code = Column(String, nullable=True)
    product_or_service_display = Column(String, nullable=True)
    product_or_service_text = Column(String, nullable=True)

    # quantity (0..1) SimpleQuantity
    quantity_value = Column(Numeric(12, 4), nullable=True)
    quantity_unit = Column(String, nullable=True)
    quantity_system = Column(String, nullable=True)
    quantity_code = Column(String, nullable=True)

    # unitPrice (0..1) Money
    unit_price_value = Column(Numeric(12, 2), nullable=True)
    unit_price_currency = Column(String(3), nullable=True)

    factor = Column(Numeric(12, 4), nullable=True)

    # net (0..1) Money
    net_value = Column(Numeric(12, 2), nullable=True)
    net_currency = Column(String(3), nullable=True)

    note_number = Column(Text, nullable=True)

    add_item = relationship("ClaimResponseAddItem", back_populates="details")
    modifiers = relationship(
        "ClaimResponseAddItemDetailModifier", back_populates="detail", cascade="all, delete-orphan"
    )
    adjudications = relationship(
        "ClaimResponseAddItemDetailAdjudication", back_populates="detail", cascade="all, delete-orphan"
    )
    sub_details = relationship(
        "ClaimResponseAddItemDetailSubDetail", back_populates="detail", cascade="all, delete-orphan"
    )


class ClaimResponseAddItemDetailModifier(Base):
    __tablename__ = "claim_response_add_item_detail_modifier"

    id = Column(Integer, primary_key=True, autoincrement=True)
    detail_id = Column(Integer, ForeignKey("claim_response_add_item_detail.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)
    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    detail = relationship("ClaimResponseAddItemDetail", back_populates="modifiers")


class ClaimResponseAddItemDetailAdjudication(Base):
    __tablename__ = "claim_response_add_item_detail_adjudication"

    id = Column(Integer, primary_key=True, autoincrement=True)
    detail_id = Column(Integer, ForeignKey("claim_response_add_item_detail.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)
    category_system = Column(String, nullable=True)
    category_code = Column(String, nullable=True)
    category_display = Column(String, nullable=True)
    category_text = Column(String, nullable=True)
    reason_system = Column(String, nullable=True)
    reason_code = Column(String, nullable=True)
    reason_display = Column(String, nullable=True)
    reason_text = Column(String, nullable=True)
    amount_value = Column(Numeric(12, 2), nullable=True)
    amount_currency = Column(String(3), nullable=True)
    adj_value = Column(Numeric(12, 4), nullable=True)

    detail = relationship("ClaimResponseAddItemDetail", back_populates="adjudications")


# ---------------------------------------------------------------------------
# addItem.detail.subDetail (0..*) great-grandchild table
# ---------------------------------------------------------------------------

class ClaimResponseAddItemDetailSubDetail(Base):
    __tablename__ = "claim_response_add_item_detail_sub_detail"

    id = Column(Integer, primary_key=True, autoincrement=True)
    detail_id = Column(Integer, ForeignKey("claim_response_add_item_detail.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    # productOrService (1..1) CodeableConcept
    product_or_service_system = Column(String, nullable=True)
    product_or_service_code = Column(String, nullable=True)
    product_or_service_display = Column(String, nullable=True)
    product_or_service_text = Column(String, nullable=True)

    # quantity (0..1) SimpleQuantity
    quantity_value = Column(Numeric(12, 4), nullable=True)
    quantity_unit = Column(String, nullable=True)
    quantity_system = Column(String, nullable=True)
    quantity_code = Column(String, nullable=True)

    # unitPrice (0..1) Money
    unit_price_value = Column(Numeric(12, 2), nullable=True)
    unit_price_currency = Column(String(3), nullable=True)

    factor = Column(Numeric(12, 4), nullable=True)

    # net (0..1) Money
    net_value = Column(Numeric(12, 2), nullable=True)
    net_currency = Column(String(3), nullable=True)

    note_number = Column(Text, nullable=True)

    detail = relationship("ClaimResponseAddItemDetail", back_populates="sub_details")
    modifiers = relationship(
        "ClaimResponseAddItemDetailSubDetailModifier",
        back_populates="sub_detail",
        cascade="all, delete-orphan",
    )
    adjudications = relationship(
        "ClaimResponseAddItemDetailSubDetailAdjudication",
        back_populates="sub_detail",
        cascade="all, delete-orphan",
    )


class ClaimResponseAddItemDetailSubDetailModifier(Base):
    __tablename__ = "claim_response_add_item_detail_sub_detail_modifier"

    id = Column(Integer, primary_key=True, autoincrement=True)
    sub_detail_id = Column(
        Integer,
        ForeignKey("claim_response_add_item_detail_sub_detail.id"),
        nullable=False,
        index=True,
    )
    org_id = Column(String, nullable=True)
    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    sub_detail = relationship("ClaimResponseAddItemDetailSubDetail", back_populates="modifiers")


class ClaimResponseAddItemDetailSubDetailAdjudication(Base):
    __tablename__ = "claim_response_add_item_detail_sub_detail_adjudication"

    id = Column(Integer, primary_key=True, autoincrement=True)
    sub_detail_id = Column(
        Integer,
        ForeignKey("claim_response_add_item_detail_sub_detail.id"),
        nullable=False,
        index=True,
    )
    org_id = Column(String, nullable=True)
    category_system = Column(String, nullable=True)
    category_code = Column(String, nullable=True)
    category_display = Column(String, nullable=True)
    category_text = Column(String, nullable=True)
    reason_system = Column(String, nullable=True)
    reason_code = Column(String, nullable=True)
    reason_display = Column(String, nullable=True)
    reason_text = Column(String, nullable=True)
    amount_value = Column(Numeric(12, 2), nullable=True)
    amount_currency = Column(String(3), nullable=True)
    adj_value = Column(Numeric(12, 4), nullable=True)

    sub_detail = relationship("ClaimResponseAddItemDetailSubDetail", back_populates="adjudications")


# ---------------------------------------------------------------------------
# Header-level adjudication (0..*) child table
# ---------------------------------------------------------------------------

class ClaimResponseAdjudication(Base):
    __tablename__ = "claim_response_adjudication"

    id = Column(Integer, primary_key=True, autoincrement=True)
    claim_response_id = Column(Integer, ForeignKey("claim_response.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)
    category_system = Column(String, nullable=True)
    category_code = Column(String, nullable=True)
    category_display = Column(String, nullable=True)
    category_text = Column(String, nullable=True)
    reason_system = Column(String, nullable=True)
    reason_code = Column(String, nullable=True)
    reason_display = Column(String, nullable=True)
    reason_text = Column(String, nullable=True)
    amount_value = Column(Numeric(12, 2), nullable=True)
    amount_currency = Column(String(3), nullable=True)
    adj_value = Column(Numeric(12, 4), nullable=True)

    claim_response = relationship("ClaimResponseModel", back_populates="adjudications")


# ---------------------------------------------------------------------------
# total (0..*) child table
# ---------------------------------------------------------------------------

class ClaimResponseTotal(Base):
    __tablename__ = "claim_response_total"

    id = Column(Integer, primary_key=True, autoincrement=True)
    claim_response_id = Column(Integer, ForeignKey("claim_response.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)
    category_system = Column(String, nullable=True)
    category_code = Column(String, nullable=True)
    category_display = Column(String, nullable=True)
    category_text = Column(String, nullable=True)
    amount_value = Column(Numeric(12, 2), nullable=True)
    amount_currency = Column(String(3), nullable=True)

    claim_response = relationship("ClaimResponseModel", back_populates="totals")


# ---------------------------------------------------------------------------
# processNote (0..*) child table
# ---------------------------------------------------------------------------

class ClaimResponseProcessNote(Base):
    __tablename__ = "claim_response_process_note"

    id = Column(Integer, primary_key=True, autoincrement=True)
    claim_response_id = Column(Integer, ForeignKey("claim_response.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)
    number = Column(Integer, nullable=True)
    note_type = Column(String, nullable=True)  # display | print | printoper
    text = Column(Text, nullable=False)
    language_system = Column(String, nullable=True)
    language_code = Column(String, nullable=True)
    language_display = Column(String, nullable=True)
    language_text = Column(String, nullable=True)

    claim_response = relationship("ClaimResponseModel", back_populates="process_notes")


# ---------------------------------------------------------------------------
# communicationRequest (0..*) child table
# ---------------------------------------------------------------------------

class ClaimResponseCommunicationRequest(Base):
    __tablename__ = "claim_response_communication_request"

    id = Column(Integer, primary_key=True, autoincrement=True)
    claim_response_id = Column(Integer, ForeignKey("claim_response.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)
    reference_type = Column(
        Enum(
            ClaimResponseCommunicationRequestReferenceType,
            name="claim_response_comm_req_ref_type",
        ),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    claim_response = relationship("ClaimResponseModel", back_populates="communication_requests")


# ---------------------------------------------------------------------------
# insurance (0..*) child table
# ---------------------------------------------------------------------------

class ClaimResponseInsurance(Base):
    __tablename__ = "claim_response_insurance"

    id = Column(Integer, primary_key=True, autoincrement=True)
    claim_response_id = Column(Integer, ForeignKey("claim_response.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)
    sequence = Column(Integer, nullable=False)
    focal = Column(Boolean, nullable=False)
    coverage_type = Column(
        Enum(ClaimResponseInsuranceCoverageReferenceType, name="claim_response_insurance_coverage_ref_type"),
        nullable=True,
    )
    coverage_id = Column(Integer, nullable=True)
    coverage_display = Column(String, nullable=True)
    business_arrangement = Column(String, nullable=True)
    # claimResponse (0..1) Reference(ClaimResponse) — FHIR reference to another resource
    claim_response_ref_type = Column(
        Enum(
            ClaimResponseInsuranceClaimResponseReferenceType,
            name="claim_response_insurance_cr_ref_type",
        ),
        nullable=True,
    )
    claim_response_ref_id = Column(Integer, nullable=True)
    claim_response_ref_display = Column(String, nullable=True)

    claim_response = relationship("ClaimResponseModel", back_populates="insurances")


# ---------------------------------------------------------------------------
# error (0..*) child table
# ---------------------------------------------------------------------------

class ClaimResponseError(Base):
    __tablename__ = "claim_response_error"

    id = Column(Integer, primary_key=True, autoincrement=True)
    claim_response_id = Column(Integer, ForeignKey("claim_response.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)
    item_sequence = Column(Integer, nullable=True)
    detail_sequence = Column(Integer, nullable=True)
    sub_detail_sequence = Column(Integer, nullable=True)
    code_system = Column(String, nullable=True)
    code_code = Column(String, nullable=True)
    code_display = Column(String, nullable=True)
    code_text = Column(String, nullable=True)

    claim_response = relationship("ClaimResponseModel", back_populates="errors")
