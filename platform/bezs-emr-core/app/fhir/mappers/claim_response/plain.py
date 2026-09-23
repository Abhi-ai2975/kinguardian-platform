from __future__ import annotations

from app.fhir.datatypes import fhir_enum, fhir_split


def _plain_note_numbers(comma_sep_text):
    parts = fhir_split(comma_sep_text)
    return [int(x) for x in parts] if parts else None


def _plain_adjudication(adj) -> dict:
    return {
        "id": adj.id,
        "category_system": adj.category_system,
        "category_code": adj.category_code,
        "category_display": adj.category_display,
        "category_text": adj.category_text,
        "reason_system": adj.reason_system,
        "reason_code": adj.reason_code,
        "reason_display": adj.reason_display,
        "reason_text": adj.reason_text,
        "amount_value": float(adj.amount_value) if adj.amount_value is not None else None,
        "amount_currency": adj.amount_currency,
        "adj_value": float(adj.adj_value) if adj.adj_value is not None else None,
    }


def plain_cr_identifier(i) -> dict:
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


def plain_cr_item_detail_sub_detail(sd) -> dict:
    return {
        "id": sd.id,
        "sub_detail_sequence": sd.sub_detail_sequence,
        "note_number": _plain_note_numbers(sd.note_number),
        "adjudications": [_plain_adjudication(a) for a in sd.adjudications] if sd.adjudications else [],
    }


def plain_cr_item_detail(d) -> dict:
    return {
        "id": d.id,
        "detail_sequence": d.detail_sequence,
        "note_number": _plain_note_numbers(d.note_number),
        "adjudications": [_plain_adjudication(a) for a in d.adjudications] if d.adjudications else [],
        "sub_details": [plain_cr_item_detail_sub_detail(sd) for sd in d.sub_details] if d.sub_details else [],
    }


def plain_cr_item(item) -> dict:
    return {
        "id": item.id,
        "item_sequence": item.item_sequence,
        "note_number": _plain_note_numbers(item.note_number),
        "adjudications": [_plain_adjudication(a) for a in item.adjudications] if item.adjudications else [],
        "details": [plain_cr_item_detail(d) for d in item.details] if item.details else [],
    }


def plain_cr_add_item_modifier(m) -> dict:
    return {"id": m.id, "coding_system": m.coding_system, "coding_code": m.coding_code, "coding_display": m.coding_display, "text": m.text}


def plain_cr_add_item_program_code(pc) -> dict:
    return {"id": pc.id, "coding_system": pc.coding_system, "coding_code": pc.coding_code, "coding_display": pc.coding_display, "text": pc.text}


def plain_cr_add_item_sub_site(ss) -> dict:
    return {"id": ss.id, "coding_system": ss.coding_system, "coding_code": ss.coding_code, "coding_display": ss.coding_display, "text": ss.text}


def plain_cr_add_item_provider(p) -> dict:
    return {
        "id": p.id,
        "reference_type": fhir_enum(p.reference_type),
        "reference_id": p.reference_id,
        "reference_display": p.reference_display,
    }


def plain_cr_add_item_detail_sub_detail(sd) -> dict:
    return {
        "id": sd.id,
        "product_or_service_system": sd.product_or_service_system,
        "product_or_service_code": sd.product_or_service_code,
        "product_or_service_display": sd.product_or_service_display,
        "product_or_service_text": sd.product_or_service_text,
        "quantity_value": float(sd.quantity_value) if sd.quantity_value is not None else None,
        "quantity_unit": sd.quantity_unit,
        "quantity_system": sd.quantity_system,
        "quantity_code": sd.quantity_code,
        "unit_price_value": float(sd.unit_price_value) if sd.unit_price_value is not None else None,
        "unit_price_currency": sd.unit_price_currency,
        "factor": float(sd.factor) if sd.factor is not None else None,
        "net_value": float(sd.net_value) if sd.net_value is not None else None,
        "net_currency": sd.net_currency,
        "note_number": _plain_note_numbers(sd.note_number),
        "modifiers": [plain_cr_add_item_modifier(m) for m in sd.modifiers] if sd.modifiers else [],
        "adjudications": [_plain_adjudication(a) for a in sd.adjudications] if sd.adjudications else [],
    }


def plain_cr_add_item_detail(d) -> dict:
    return {
        "id": d.id,
        "product_or_service_system": d.product_or_service_system,
        "product_or_service_code": d.product_or_service_code,
        "product_or_service_display": d.product_or_service_display,
        "product_or_service_text": d.product_or_service_text,
        "quantity_value": float(d.quantity_value) if d.quantity_value is not None else None,
        "quantity_unit": d.quantity_unit,
        "quantity_system": d.quantity_system,
        "quantity_code": d.quantity_code,
        "unit_price_value": float(d.unit_price_value) if d.unit_price_value is not None else None,
        "unit_price_currency": d.unit_price_currency,
        "factor": float(d.factor) if d.factor is not None else None,
        "net_value": float(d.net_value) if d.net_value is not None else None,
        "net_currency": d.net_currency,
        "note_number": _plain_note_numbers(d.note_number),
        "modifiers": [plain_cr_add_item_modifier(m) for m in d.modifiers] if d.modifiers else [],
        "adjudications": [_plain_adjudication(a) for a in d.adjudications] if d.adjudications else [],
        "sub_details": [plain_cr_add_item_detail_sub_detail(sd) for sd in d.sub_details] if d.sub_details else [],
    }


def plain_cr_add_item(ai) -> dict:
    return {
        "id": ai.id,
        "item_sequence": _plain_note_numbers(ai.item_sequence),
        "detail_sequence": _plain_note_numbers(ai.detail_sequence),
        "subdetail_sequence": _plain_note_numbers(ai.subdetail_sequence),
        "product_or_service_system": ai.product_or_service_system,
        "product_or_service_code": ai.product_or_service_code,
        "product_or_service_display": ai.product_or_service_display,
        "product_or_service_text": ai.product_or_service_text,
        "serviced_date": ai.serviced_date.isoformat() if ai.serviced_date else None,
        "serviced_period_start": ai.serviced_period_start.isoformat() if ai.serviced_period_start else None,
        "serviced_period_end": ai.serviced_period_end.isoformat() if ai.serviced_period_end else None,
        "location_cc_system": ai.location_cc_system,
        "location_cc_code": ai.location_cc_code,
        "location_cc_display": ai.location_cc_display,
        "location_cc_text": ai.location_cc_text,
        "location_address_use": ai.location_address_use,
        "location_address_type": ai.location_address_type,
        "location_address_text": ai.location_address_text,
        "location_address_line": fhir_split(ai.location_address_line) if ai.location_address_line else None,
        "location_address_city": ai.location_address_city,
        "location_address_district": ai.location_address_district,
        "location_address_state": ai.location_address_state,
        "location_address_postal_code": ai.location_address_postal_code,
        "location_address_country": ai.location_address_country,
        "location_ref_type": fhir_enum(ai.location_ref_type),
        "location_ref_id": ai.location_ref_id,
        "location_ref_display": ai.location_ref_display,
        "quantity_value": float(ai.quantity_value) if ai.quantity_value is not None else None,
        "quantity_unit": ai.quantity_unit,
        "quantity_system": ai.quantity_system,
        "quantity_code": ai.quantity_code,
        "unit_price_value": float(ai.unit_price_value) if ai.unit_price_value is not None else None,
        "unit_price_currency": ai.unit_price_currency,
        "factor": float(ai.factor) if ai.factor is not None else None,
        "net_value": float(ai.net_value) if ai.net_value is not None else None,
        "net_currency": ai.net_currency,
        "body_site_system": ai.body_site_system,
        "body_site_code": ai.body_site_code,
        "body_site_display": ai.body_site_display,
        "body_site_text": ai.body_site_text,
        "note_number": _plain_note_numbers(ai.note_number),
        "providers": [plain_cr_add_item_provider(p) for p in ai.providers] if ai.providers else [],
        "modifiers": [plain_cr_add_item_modifier(m) for m in ai.modifiers] if ai.modifiers else [],
        "program_codes": [plain_cr_add_item_program_code(pc) for pc in ai.program_codes] if ai.program_codes else [],
        "sub_sites": [plain_cr_add_item_sub_site(ss) for ss in ai.sub_sites] if ai.sub_sites else [],
        "adjudications": [_plain_adjudication(a) for a in ai.adjudications] if ai.adjudications else [],
        "details": [plain_cr_add_item_detail(d) for d in ai.details] if ai.details else [],
    }


def plain_cr_total(t) -> dict:
    return {
        "id": t.id,
        "category_system": t.category_system,
        "category_code": t.category_code,
        "category_display": t.category_display,
        "category_text": t.category_text,
        "amount_value": float(t.amount_value) if t.amount_value is not None else None,
        "amount_currency": t.amount_currency,
    }


def plain_cr_process_note(n) -> dict:
    return {
        "id": n.id,
        "number": n.number,
        "note_type": n.note_type,
        "text": n.text,
        "language_system": n.language_system,
        "language_code": n.language_code,
        "language_display": n.language_display,
        "language_text": n.language_text,
    }


def plain_cr_communication_request(cr) -> dict:
    return {
        "id": cr.id,
        "reference_type": fhir_enum(cr.reference_type),
        "reference_id": cr.reference_id,
        "reference_display": cr.reference_display,
    }


def plain_cr_insurance(ins) -> dict:
    return {
        "id": ins.id,
        "sequence": ins.sequence,
        "focal": ins.focal,
        "coverage_type": fhir_enum(ins.coverage_type),
        "coverage_id": ins.coverage_id,
        "coverage_display": ins.coverage_display,
        "business_arrangement": ins.business_arrangement,
        "claim_response_ref_type": fhir_enum(ins.claim_response_ref_type),
        "claim_response_ref_id": ins.claim_response_ref_id,
        "claim_response_ref_display": ins.claim_response_ref_display,
    }


def plain_cr_error(e) -> dict:
    return {
        "id": e.id,
        "item_sequence": e.item_sequence,
        "detail_sequence": e.detail_sequence,
        "sub_detail_sequence": e.sub_detail_sequence,
        "code_system": e.code_system,
        "code_code": e.code_code,
        "code_display": e.code_display,
        "code_text": e.code_text,
    }


def to_plain_claim_response(model) -> dict:
    return {
        "id": model.claim_response_id,
        "status": fhir_enum(model.status),
        "use": fhir_enum(model.use),
        "outcome": fhir_enum(model.outcome),
        "created": model.created.isoformat(),
        "type_system": model.type_system,
        "type_code": model.type_code,
        "type_display": model.type_display,
        "type_text": model.type_text,
        "sub_type_system": model.sub_type_system,
        "sub_type_code": model.sub_type_code,
        "sub_type_display": model.sub_type_display,
        "sub_type_text": model.sub_type_text,
        "patient_type": fhir_enum(model.patient_type),
        "patient_id": model.patient_id,
        "patient_display": model.patient_display,
        "insurer_type": fhir_enum(model.insurer_type),
        "insurer_id": model.insurer_id,
        "insurer_display": model.insurer_display,
        "requestor_type": fhir_enum(model.requestor_type),
        "requestor_id": model.requestor_id,
        "requestor_display": model.requestor_display,
        "request_type": fhir_enum(model.request_type),
        "request_id": model.request_id,
        "request_display": model.request_display,
        "disposition": model.disposition,
        "pre_auth_ref": model.pre_auth_ref,
        "pre_auth_period_start": model.pre_auth_period_start.isoformat() if model.pre_auth_period_start else None,
        "pre_auth_period_end": model.pre_auth_period_end.isoformat() if model.pre_auth_period_end else None,
        "payee_type_system": model.payee_type_system,
        "payee_type_code": model.payee_type_code,
        "payee_type_display": model.payee_type_display,
        "payee_type_text": model.payee_type_text,
        "payment_type_system": model.payment_type_system,
        "payment_type_code": model.payment_type_code,
        "payment_type_display": model.payment_type_display,
        "payment_type_text": model.payment_type_text,
        "payment_adjustment_value": float(model.payment_adjustment_value) if model.payment_adjustment_value is not None else None,
        "payment_adjustment_currency": model.payment_adjustment_currency,
        "payment_adjustment_reason_system": model.payment_adjustment_reason_system,
        "payment_adjustment_reason_code": model.payment_adjustment_reason_code,
        "payment_adjustment_reason_display": model.payment_adjustment_reason_display,
        "payment_adjustment_reason_text": model.payment_adjustment_reason_text,
        "payment_date": model.payment_date.isoformat() if model.payment_date else None,
        "payment_amount_value": float(model.payment_amount_value) if model.payment_amount_value is not None else None,
        "payment_amount_currency": model.payment_amount_currency,
        "payment_identifier_use": model.payment_identifier_use,
        "payment_identifier_type_system": model.payment_identifier_type_system,
        "payment_identifier_type_code": model.payment_identifier_type_code,
        "payment_identifier_type_display": model.payment_identifier_type_display,
        "payment_identifier_type_text": model.payment_identifier_type_text,
        "payment_identifier_system": model.payment_identifier_system,
        "payment_identifier_value": model.payment_identifier_value,
        "payment_identifier_period_start": model.payment_identifier_period_start.isoformat() if model.payment_identifier_period_start else None,
        "payment_identifier_period_end": model.payment_identifier_period_end.isoformat() if model.payment_identifier_period_end else None,
        "payment_identifier_assigner": model.payment_identifier_assigner,
        "funds_reserve_system": model.funds_reserve_system,
        "funds_reserve_code": model.funds_reserve_code,
        "funds_reserve_display": model.funds_reserve_display,
        "funds_reserve_text": model.funds_reserve_text,
        "form_code_system": model.form_code_system,
        "form_code_code": model.form_code_code,
        "form_code_display": model.form_code_display,
        "form_code_text": model.form_code_text,
        "form_content_type": model.form_content_type,
        "form_language": model.form_language,
        "form_data": model.form_data,
        "form_url": model.form_url,
        "form_size": model.form_size,
        "form_hash": model.form_hash,
        "form_title": model.form_title,
        "form_creation": model.form_creation.isoformat() if model.form_creation else None,
        "identifier": [plain_cr_identifier(i) for i in model.identifiers] if model.identifiers else [],
        "items": [plain_cr_item(i) for i in model.items] if model.items else [],
        "add_items": [plain_cr_add_item(ai) for ai in model.add_items] if model.add_items else [],
        "adjudications": [_plain_adjudication(a) for a in model.adjudications] if model.adjudications else [],
        "totals": [plain_cr_total(t) for t in model.totals] if model.totals else [],
        "process_notes": [plain_cr_process_note(n) for n in model.process_notes] if model.process_notes else [],
        "communication_requests": [plain_cr_communication_request(cr) for cr in model.communication_requests] if model.communication_requests else [],
        "insurances": [plain_cr_insurance(ins) for ins in model.insurances] if model.insurances else [],
        "errors": [plain_cr_error(e) for e in model.errors] if model.errors else [],
        "user_id": model.user_id,
        "org_id": model.org_id,
        "created_at": model.created_at.isoformat() if model.created_at else None,
        "updated_at": model.updated_at.isoformat() if model.updated_at else None,
        "created_by": model.created_by,
        "updated_by": model.updated_by,
    }
