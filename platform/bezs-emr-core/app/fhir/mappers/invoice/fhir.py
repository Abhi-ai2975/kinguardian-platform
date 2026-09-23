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


def _cc(system, code, display, text) -> dict | None:
    coding = {k: v for k, v in {"system": system, "code": code, "display": display}.items() if v}
    result: dict = {}
    if coding:
        result["coding"] = [coding]
    if text:
        result["text"] = text
    return result if result else None


def _money(value, currency) -> dict | None:
    if value is None and not currency:
        return None
    m: dict = {}
    if value is not None:
        m["value"] = float(value)
    if currency:
        m["currency"] = currency
    return m if m else None


def fhir_invoice_identifier(i: "InvoiceIdentifier") -> dict:
    entry: dict = {}
    if i.use:
        entry["use"] = i.use
    type_cc = _cc(i.type_system, i.type_code, i.type_display, i.type_text)
    if type_cc:
        entry["type"] = type_cc
    if i.system:
        entry["system"] = i.system
    if i.value:
        entry["value"] = i.value
    if i.period_start or i.period_end:
        entry["period"] = {k: v for k, v in {
            "start": i.period_start.isoformat() if i.period_start else None,
            "end": i.period_end.isoformat() if i.period_end else None,
        }.items() if v}
    if i.assigner:
        entry["assigner"] = {"display": i.assigner}
    return entry


def fhir_invoice_participant(p: "InvoiceParticipant") -> dict:
    entry: dict = {}
    role_cc = _cc(p.role_system, p.role_code, p.role_display, p.role_text)
    if role_cc:
        entry["role"] = role_cc
    if p.reference_type and p.reference_id:
        ref_type = p.reference_type.value if hasattr(p.reference_type, "value") else p.reference_type
        actor: dict = {"reference": f"{ref_type}/{p.reference_id}"}
        if p.reference_display:
            actor["display"] = p.reference_display
        entry["actor"] = actor
    return entry


def fhir_invoice_price_component(pc: "InvoiceLineItemPriceComponent | InvoiceTotalPriceComponent") -> dict:
    entry: dict = {"type": pc.type}
    code_cc = _cc(pc.code_system, pc.code_code, pc.code_display, pc.code_text)
    if code_cc:
        entry["code"] = code_cc
    if pc.factor is not None:
        entry["factor"] = float(pc.factor)
    amount = _money(pc.amount_value, pc.amount_currency)
    if amount:
        entry["amount"] = amount
    return entry


def fhir_invoice_line_item(li: "InvoiceLineItem") -> dict:
    entry: dict = {}
    if li.sequence is not None:
        entry["sequence"] = li.sequence
    if li.chargeitem_ref_type and li.chargeitem_ref_id:
        ref_type = li.chargeitem_ref_type.value if hasattr(li.chargeitem_ref_type, "value") else li.chargeitem_ref_type
        ref: dict = {"reference": f"{ref_type}/{li.chargeitem_ref_id}"}
        if li.chargeitem_ref_display:
            ref["display"] = li.chargeitem_ref_display
        entry["chargeItemReference"] = ref
    else:
        cc = _cc(li.chargeitem_cc_system, li.chargeitem_cc_code, li.chargeitem_cc_display, li.chargeitem_cc_text)
        if cc:
            entry["chargeItemCodeableConcept"] = cc
    if li.price_components:
        entry["priceComponent"] = [fhir_invoice_price_component(pc) for pc in li.price_components]
    return entry


def fhir_invoice_note(n: "InvoiceNote") -> dict:
    entry: dict = {"text": n.text}
    if n.author_string:
        entry["authorString"] = n.author_string
    elif n.author_reference_type and n.author_reference_id:
        ref: dict = {"reference": f"{n.author_reference_type}/{n.author_reference_id}"}
        if n.author_reference_display:
            ref["display"] = n.author_reference_display
        entry["authorReference"] = ref
    if n.time:
        entry["time"] = n.time.isoformat()
    return entry


def to_fhir_invoice(model: "InvoiceModel") -> dict:
    result: dict = {
        "resourceType": "Invoice",
        "id": str(model.invoice_id),
    }

    if model.identifiers:
        result["identifier"] = [fhir_invoice_identifier(i) for i in model.identifiers]

    if model.status:
        status_val = model.status.value if hasattr(model.status, "value") else model.status
        result["status"] = status_val

    if model.cancelled_reason:
        result["cancelledReason"] = model.cancelled_reason

    type_cc = _cc(model.type_system, model.type_code, model.type_display, model.type_text)
    if type_cc:
        result["type"] = type_cc

    if model.subject_type and model.subject_id:
        subj_type = model.subject_type.value if hasattr(model.subject_type, "value") else model.subject_type
        subj: dict = {"reference": f"{subj_type}/{model.subject_id}"}
        if model.subject_display:
            subj["display"] = model.subject_display
        result["subject"] = subj

    if model.recipient_type and model.recipient_id:
        rec_type = model.recipient_type.value if hasattr(model.recipient_type, "value") else model.recipient_type
        rec: dict = {"reference": f"{rec_type}/{model.recipient_id}"}
        if model.recipient_display:
            rec["display"] = model.recipient_display
        result["recipient"] = rec

    if model.date:
        result["date"] = model.date.isoformat()

    if model.participants:
        result["participant"] = [fhir_invoice_participant(p) for p in model.participants]

    if model.issuer_type and model.issuer_id:
        iss_type = model.issuer_type.value if hasattr(model.issuer_type, "value") else model.issuer_type
        iss: dict = {"reference": f"{iss_type}/{model.issuer_id}"}
        if model.issuer_display:
            iss["display"] = model.issuer_display
        result["issuer"] = iss

    if model.account_type and model.account_id:
        acc_type = model.account_type.value if hasattr(model.account_type, "value") else model.account_type
        acc: dict = {"reference": f"{acc_type}/{model.account_id}"}
        if model.account_display:
            acc["display"] = model.account_display
        result["account"] = acc

    if model.line_items:
        result["lineItem"] = [fhir_invoice_line_item(li) for li in model.line_items]

    if model.total_price_components:
        result["totalPriceComponent"] = [fhir_invoice_price_component(pc) for pc in model.total_price_components]

    total_net = _money(model.total_net_value, model.total_net_currency)
    if total_net:
        result["totalNet"] = total_net

    total_gross = _money(model.total_gross_value, model.total_gross_currency)
    if total_gross:
        result["totalGross"] = total_gross

    if model.payment_terms:
        result["paymentTerms"] = model.payment_terms

    if model.notes:
        result["note"] = [fhir_invoice_note(n) for n in model.notes]

    return {k: v for k, v in result.items() if v is not None}
