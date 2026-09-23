from sqlalchemy import (
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
from app.models.enums import OrganizationReferenceType
from app.models.invoice.enums import (
    InvoiceAccountReferenceType,
    InvoiceLineItemChargeItemReferenceType,
    InvoiceParticipantActorReferenceType,
    InvoiceRecipientReferenceType,
    InvoiceStatus,
    InvoiceSubjectReferenceType,
)

invoice_id_seq = Sequence("invoice_pub_seq", start=210000, increment=1, metadata=Base.metadata)


# ---------------------------------------------------------------------------
# Main table
# ---------------------------------------------------------------------------

class InvoiceModel(Base):
    __tablename__ = "invoice"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    invoice_id = Column(
        Integer,
        invoice_id_seq,
        server_default=invoice_id_seq.next_value(),
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
        Enum(InvoiceStatus, name="invoice_status"),
        nullable=False,
    )

    # cancelledReason (0..1)
    cancelled_reason = Column(String, nullable=True)

    # type (0..1) CodeableConcept
    type_system = Column(String, nullable=True)
    type_code = Column(String, nullable=True)
    type_display = Column(String, nullable=True)
    type_text = Column(String, nullable=True)

    # subject (0..1) Reference(Patient | Group)
    subject_type = Column(
        Enum(InvoiceSubjectReferenceType, name="invoice_subject_reference_type"),
        nullable=True,
    )
    subject_id = Column(Integer, nullable=True)
    subject_display = Column(String, nullable=True)

    # recipient (0..1) Reference(Organization | Patient | RelatedPerson)
    recipient_type = Column(
        Enum(InvoiceRecipientReferenceType, name="invoice_recipient_reference_type"),
        nullable=True,
    )
    recipient_id = Column(Integer, nullable=True)
    recipient_display = Column(String, nullable=True)

    # date (0..1)
    date = Column(DateTime(timezone=True), nullable=True)

    # issuer (0..1) Reference(Organization) — shared PG type
    issuer_type = Column(
        Enum(OrganizationReferenceType, name="organization_reference_type", create_type=False),
        nullable=True,
    )
    issuer_id = Column(Integer, nullable=True)
    issuer_display = Column(String, nullable=True)

    # account (0..1) Reference(Account)
    account_type = Column(
        Enum(InvoiceAccountReferenceType, name="invoice_account_reference_type"),
        nullable=True,
    )
    account_id = Column(Integer, nullable=True)
    account_display = Column(String, nullable=True)

    # totalNet (0..1) Money
    total_net_value = Column(Numeric(12, 2), nullable=True)
    total_net_currency = Column(String(3), nullable=True)

    # totalGross (0..1) Money
    total_gross_value = Column(Numeric(12, 2), nullable=True)
    total_gross_currency = Column(String(3), nullable=True)

    # paymentTerms (0..1) markdown
    payment_terms = Column(Text, nullable=True)

    # Relationships
    identifiers = relationship(
        "InvoiceIdentifier", back_populates="invoice", cascade="all, delete-orphan"
    )
    participants = relationship(
        "InvoiceParticipant", back_populates="invoice", cascade="all, delete-orphan"
    )
    line_items = relationship(
        "InvoiceLineItem", back_populates="invoice", cascade="all, delete-orphan"
    )
    total_price_components = relationship(
        "InvoiceTotalPriceComponent", back_populates="invoice", cascade="all, delete-orphan"
    )
    notes = relationship(
        "InvoiceNote", back_populates="invoice", cascade="all, delete-orphan"
    )


# ---------------------------------------------------------------------------
# identifier (0..*) child table
# ---------------------------------------------------------------------------

class InvoiceIdentifier(Base):
    __tablename__ = "invoice_identifier"

    id = Column(Integer, primary_key=True, autoincrement=True)
    invoice_id = Column(Integer, ForeignKey("invoice.id"), nullable=False, index=True)
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

    invoice = relationship("InvoiceModel", back_populates="identifiers")


# ---------------------------------------------------------------------------
# participant (0..*) BackboneElement child table
# ---------------------------------------------------------------------------

class InvoiceParticipant(Base):
    __tablename__ = "invoice_participant"

    id = Column(Integer, primary_key=True, autoincrement=True)
    invoice_id = Column(Integer, ForeignKey("invoice.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    # role (0..1) CodeableConcept
    role_system = Column(String, nullable=True)
    role_code = Column(String, nullable=True)
    role_display = Column(String, nullable=True)
    role_text = Column(String, nullable=True)

    # actor (1..1) Reference(Practitioner | Organization | Patient | PractitionerRole | Device | RelatedPerson)
    reference_type = Column(
        Enum(InvoiceParticipantActorReferenceType, name="invoice_participant_actor_reference_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    invoice = relationship("InvoiceModel", back_populates="participants")


# ---------------------------------------------------------------------------
# lineItem (0..*) BackboneElement child table
# ---------------------------------------------------------------------------

class InvoiceLineItem(Base):
    __tablename__ = "invoice_line_item"

    id = Column(Integer, primary_key=True, autoincrement=True)
    invoice_id = Column(Integer, ForeignKey("invoice.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    # sequence (0..1)
    sequence = Column(Integer, nullable=True)

    # chargeItem[x] (1..1) choice: Reference(ChargeItem) OR CodeableConcept
    # Reference variant
    chargeitem_ref_type = Column(
        Enum(InvoiceLineItemChargeItemReferenceType, name="invoice_line_item_chargeitem_ref_type"),
        nullable=True,
    )
    chargeitem_ref_id = Column(Integer, nullable=True)
    chargeitem_ref_display = Column(String, nullable=True)
    # CodeableConcept variant
    chargeitem_cc_system = Column(String, nullable=True)
    chargeitem_cc_code = Column(String, nullable=True)
    chargeitem_cc_display = Column(String, nullable=True)
    chargeitem_cc_text = Column(String, nullable=True)

    invoice = relationship("InvoiceModel", back_populates="line_items")
    price_components = relationship(
        "InvoiceLineItemPriceComponent", back_populates="line_item", cascade="all, delete-orphan"
    )


# ---------------------------------------------------------------------------
# lineItem.priceComponent (0..*) BackboneElement grandchild table
# ---------------------------------------------------------------------------

class InvoiceLineItemPriceComponent(Base):
    __tablename__ = "invoice_line_item_price_component"

    id = Column(Integer, primary_key=True, autoincrement=True)
    line_item_id = Column(Integer, ForeignKey("invoice_line_item.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    # type (1..1) code — base | surcharge | deduction | discount | tax | informational
    type = Column(String, nullable=False)

    # code (0..1) CodeableConcept
    code_system = Column(String, nullable=True)
    code_code = Column(String, nullable=True)
    code_display = Column(String, nullable=True)
    code_text = Column(String, nullable=True)

    # factor (0..1) decimal
    factor = Column(Numeric(12, 4), nullable=True)

    # amount (0..1) Money
    amount_value = Column(Numeric(12, 2), nullable=True)
    amount_currency = Column(String(3), nullable=True)

    line_item = relationship("InvoiceLineItem", back_populates="price_components")


# ---------------------------------------------------------------------------
# totalPriceComponent (0..*) child table — same structure as priceComponent
# ---------------------------------------------------------------------------

class InvoiceTotalPriceComponent(Base):
    __tablename__ = "invoice_total_price_component"

    id = Column(Integer, primary_key=True, autoincrement=True)
    invoice_id = Column(Integer, ForeignKey("invoice.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    # type (1..1) code
    type = Column(String, nullable=False)

    # code (0..1) CodeableConcept
    code_system = Column(String, nullable=True)
    code_code = Column(String, nullable=True)
    code_display = Column(String, nullable=True)
    code_text = Column(String, nullable=True)

    # factor (0..1) decimal
    factor = Column(Numeric(12, 4), nullable=True)

    # amount (0..1) Money
    amount_value = Column(Numeric(12, 2), nullable=True)
    amount_currency = Column(String(3), nullable=True)

    invoice = relationship("InvoiceModel", back_populates="total_price_components")


# ---------------------------------------------------------------------------
# note (0..*) Annotation child table
# ---------------------------------------------------------------------------

class InvoiceNote(Base):
    __tablename__ = "invoice_note"

    id = Column(Integer, primary_key=True, autoincrement=True)
    invoice_id = Column(Integer, ForeignKey("invoice.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    text = Column(Text, nullable=False)
    time = Column(DateTime(timezone=True), nullable=True)
    # author[x]: authorString or authorReference(Practitioner|Patient|RelatedPerson|Organization)
    author_string = Column(String, nullable=True)
    author_reference_type = Column(String, nullable=True)   # open reference
    author_reference_id = Column(Integer, nullable=True)
    author_reference_display = Column(String, nullable=True)

    invoice = relationship("InvoiceModel", back_populates="notes")
