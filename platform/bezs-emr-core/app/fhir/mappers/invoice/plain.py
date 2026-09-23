from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.invoice.invoice import (
        InvoiceModel,
        InvoiceIdentifier,
        InvoiceParticipant,
        InvoiceLineItem,
        InvoiceLineItemPriceComponent,
        InvoiceTotalPriceComponent,
        InvoiceNote,
    )


def plain_invoice_identifier(i: "InvoiceIdentifier") -> dict:
    return {
        "id": i.id,
        "use": i.use,
        "type_system": i.type_system,
        "type_code": i.type_code,
        "type_display": i.type_display,
        "type_text": i.type_text,
        "system": i.system,
        "value": i.value,
        "period_start": i.period_start.isoformat() if i.period_start else None,
        "period_end": i.period_end.isoformat() if i.period_end else None,
        "assigner": i.assigner,
    }


def plain_invoice_participant(p: "InvoiceParticipant") -> dict:
    ref_type = p.reference_type.value if p.reference_type and hasattr(p.reference_type, "value") else p.reference_type
    return {
        "id": p.id,
        "role_system": p.role_system,
        "role_code": p.role_code,
        "role_display": p.role_display,
        "role_text": p.role_text,
        "reference_type": ref_type,
        "reference_id": p.reference_id,
        "reference_display": p.reference_display,
    }


def plain_invoice_price_component(pc: "InvoiceLineItemPriceComponent | InvoiceTotalPriceComponent") -> dict:
    return {
        "id": pc.id,
        "type": pc.type,
        "code_system": pc.code_system,
        "code_code": pc.code_code,
        "code_display": pc.code_display,
        "code_text": pc.code_text,
        "factor": float(pc.factor) if pc.factor is not None else None,
        "amount_value": float(pc.amount_value) if pc.amount_value is not None else None,
        "amount_currency": pc.amount_currency,
    }


def plain_invoice_line_item(li: "InvoiceLineItem") -> dict:
    ref_type = li.chargeitem_ref_type.value if li.chargeitem_ref_type and hasattr(li.chargeitem_ref_type, "value") else li.chargeitem_ref_type
    entry: dict = {
        "id": li.id,
        "sequence": li.sequence,
        "chargeitem_ref_type": ref_type,
        "chargeitem_ref_id": li.chargeitem_ref_id,
        "chargeitem_ref_display": li.chargeitem_ref_display,
        "chargeitem_cc_system": li.chargeitem_cc_system,
        "chargeitem_cc_code": li.chargeitem_cc_code,
        "chargeitem_cc_display": li.chargeitem_cc_display,
        "chargeitem_cc_text": li.chargeitem_cc_text,
    }
    if li.price_components:
        entry["price_components"] = [plain_invoice_price_component(pc) for pc in li.price_components]
    return entry


def plain_invoice_note(n: "InvoiceNote") -> dict:
    return {
        "id": n.id,
        "text": n.text,
        "time": n.time.isoformat() if n.time else None,
        "author_string": n.author_string,
        "author_reference_type": n.author_reference_type,
        "author_reference_id": n.author_reference_id,
        "author_reference_display": n.author_reference_display,
    }


def to_plain_invoice(model: "InvoiceModel") -> dict:
    status_val = model.status.value if model.status and hasattr(model.status, "value") else model.status
    subj_type = model.subject_type.value if model.subject_type and hasattr(model.subject_type, "value") else model.subject_type
    rec_type = model.recipient_type.value if model.recipient_type and hasattr(model.recipient_type, "value") else model.recipient_type
    iss_type = model.issuer_type.value if model.issuer_type and hasattr(model.issuer_type, "value") else model.issuer_type
    acc_type = model.account_type.value if model.account_type and hasattr(model.account_type, "value") else model.account_type

    result: dict = {
        "id": model.invoice_id,
        "status": status_val,
        "cancelled_reason": model.cancelled_reason,
        "type_system": model.type_system,
        "type_code": model.type_code,
        "type_display": model.type_display,
        "type_text": model.type_text,
        "subject_type": subj_type,
        "subject_id": model.subject_id,
        "subject_display": model.subject_display,
        "recipient_type": rec_type,
        "recipient_id": model.recipient_id,
        "recipient_display": model.recipient_display,
        "date": model.date.isoformat() if model.date else None,
        "issuer_type": iss_type,
        "issuer_id": model.issuer_id,
        "issuer_display": model.issuer_display,
        "account_type": acc_type,
        "account_id": model.account_id,
        "account_display": model.account_display,
        "total_net_value": float(model.total_net_value) if model.total_net_value is not None else None,
        "total_net_currency": model.total_net_currency,
        "total_gross_value": float(model.total_gross_value) if model.total_gross_value is not None else None,
        "total_gross_currency": model.total_gross_currency,
        "payment_terms": model.payment_terms,
        "user_id": model.user_id,
        "org_id": model.org_id,
        "created_at": model.created_at.isoformat() if model.created_at else None,
        "updated_at": model.updated_at.isoformat() if model.updated_at else None,
        "created_by": model.created_by,
        "updated_by": model.updated_by,
    }

    if model.identifiers:
        result["identifier"] = [plain_invoice_identifier(i) for i in model.identifiers]
    if model.participants:
        result["participant"] = [plain_invoice_participant(p) for p in model.participants]
    if model.line_items:
        result["line_item"] = [plain_invoice_line_item(li) for li in model.line_items]
    if model.total_price_components:
        result["total_price_component"] = [plain_invoice_price_component(pc) for pc in model.total_price_components]
    if model.notes:
        result["note"] = [plain_invoice_note(n) for n in model.notes]

    return {k: v for k, v in result.items() if v is not None}
