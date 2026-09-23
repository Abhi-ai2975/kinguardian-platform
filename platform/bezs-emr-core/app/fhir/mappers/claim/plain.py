from __future__ import annotations

from app.fhir.datatypes import fhir_enum


def plain_claim_identifier(i) -> dict:
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


def plain_claim_related(r) -> dict:
    return {
        "id": r.id,
        "related_claim_type": fhir_enum(r.related_claim_type),
        "related_claim_id": r.related_claim_id,
        "related_claim_display": r.related_claim_display,
        "relationship_system": r.relationship_system,
        "relationship_code": r.relationship_code,
        "relationship_display": r.relationship_display,
        "relationship_text": r.relationship_text,
        "reference_use": r.reference_use,
        "reference_type_system": r.reference_type_system,
        "reference_type_code": r.reference_type_code,
        "reference_type_display": r.reference_type_display,
        "reference_type_text": r.reference_type_text,
        "reference_system": r.reference_system,
        "reference_value": r.reference_value,
        "reference_period_start": r.reference_period_start.isoformat() if r.reference_period_start else None,
        "reference_period_end": r.reference_period_end.isoformat() if r.reference_period_end else None,
        "reference_assigner": r.reference_assigner,
    }


def plain_claim_care_team(ct) -> dict:
    return {
        "id": ct.id,
        "sequence": ct.sequence,
        "provider_type": fhir_enum(ct.provider_type),
        "provider_id": ct.provider_id,
        "provider_display": ct.provider_display,
        "responsible": ct.responsible,
        "role_system": ct.role_system,
        "role_code": ct.role_code,
        "role_display": ct.role_display,
        "role_text": ct.role_text,
        "qualification_system": ct.qualification_system,
        "qualification_code": ct.qualification_code,
        "qualification_display": ct.qualification_display,
        "qualification_text": ct.qualification_text,
    }


def plain_claim_supporting_info(si) -> dict:
    return {
        "id": si.id,
        "sequence": si.sequence,
        "category_system": si.category_system,
        "category_code": si.category_code,
        "category_display": si.category_display,
        "category_text": si.category_text,
        "code_system": si.code_system,
        "code_code": si.code_code,
        "code_display": si.code_display,
        "code_text": si.code_text,
        "timing_date": si.timing_date.isoformat() if si.timing_date else None,
        "timing_period_start": si.timing_period_start.isoformat() if si.timing_period_start else None,
        "timing_period_end": si.timing_period_end.isoformat() if si.timing_period_end else None,
        "value_boolean": si.value_boolean,
        "value_string": si.value_string,
        "value_quantity_value": si.value_quantity_value,
        "value_quantity_comparator": si.value_quantity_comparator,
        "value_quantity_unit": si.value_quantity_unit,
        "value_quantity_system": si.value_quantity_system,
        "value_quantity_code": si.value_quantity_code,
        "value_attachment_content_type": si.value_attachment_content_type,
        "value_attachment_language": si.value_attachment_language,
        "value_attachment_data": si.value_attachment_data,
        "value_attachment_url": si.value_attachment_url,
        "value_attachment_size": si.value_attachment_size,
        "value_attachment_hash": si.value_attachment_hash,
        "value_attachment_title": si.value_attachment_title,
        "value_attachment_creation": si.value_attachment_creation.isoformat() if si.value_attachment_creation else None,
        "value_reference_type": si.value_reference_type,
        "value_reference_id": si.value_reference_id,
        "value_reference_display": si.value_reference_display,
        "reason_system": si.reason_system,
        "reason_code": si.reason_code,
        "reason_display": si.reason_display,
        "reason_text": si.reason_text,
    }


def plain_claim_diagnosis_type(dt) -> dict:
    return {
        "id": dt.id,
        "coding_system": dt.coding_system,
        "coding_code": dt.coding_code,
        "coding_display": dt.coding_display,
        "text": dt.text,
    }


def plain_claim_diagnosis(d) -> dict:
    return {
        "id": d.id,
        "sequence": d.sequence,
        "diagnosis_codeable_concept_system": d.diagnosis_codeable_concept_system,
        "diagnosis_codeable_concept_code": d.diagnosis_codeable_concept_code,
        "diagnosis_codeable_concept_display": d.diagnosis_codeable_concept_display,
        "diagnosis_codeable_concept_text": d.diagnosis_codeable_concept_text,
        "diagnosis_reference_type": fhir_enum(d.diagnosis_reference_type),
        "diagnosis_reference_id": d.diagnosis_reference_id,
        "diagnosis_reference_display": d.diagnosis_reference_display,
        "on_admission_system": d.on_admission_system,
        "on_admission_code": d.on_admission_code,
        "on_admission_display": d.on_admission_display,
        "on_admission_text": d.on_admission_text,
        "package_code_system": d.package_code_system,
        "package_code_code": d.package_code_code,
        "package_code_display": d.package_code_display,
        "package_code_text": d.package_code_text,
        "types": [plain_claim_diagnosis_type(t) for t in d.types] if d.types else [],
    }


def plain_claim_procedure_type(pt) -> dict:
    return {
        "id": pt.id,
        "coding_system": pt.coding_system,
        "coding_code": pt.coding_code,
        "coding_display": pt.coding_display,
        "text": pt.text,
    }


def plain_claim_procedure_udi(u) -> dict:
    return {
        "id": u.id,
        "reference_type": fhir_enum(u.reference_type),
        "reference_id": u.reference_id,
        "reference_display": u.reference_display,
    }


def plain_claim_procedure(p) -> dict:
    return {
        "id": p.id,
        "sequence": p.sequence,
        "date": p.date.isoformat() if p.date else None,
        "procedure_codeable_concept_system": p.procedure_codeable_concept_system,
        "procedure_codeable_concept_code": p.procedure_codeable_concept_code,
        "procedure_codeable_concept_display": p.procedure_codeable_concept_display,
        "procedure_codeable_concept_text": p.procedure_codeable_concept_text,
        "procedure_reference_type": fhir_enum(p.procedure_reference_type),
        "procedure_reference_id": p.procedure_reference_id,
        "procedure_reference_display": p.procedure_reference_display,
        "types": [plain_claim_procedure_type(t) for t in p.types] if p.types else [],
        "udi": [plain_claim_procedure_udi(u) for u in p.udi] if p.udi else [],
    }


def plain_claim_insurance_pre_auth_ref(r) -> dict:
    return {"id": r.id, "value": r.value}


def plain_claim_insurance(ins) -> dict:
    return {
        "id": ins.id,
        "sequence": ins.sequence,
        "focal": ins.focal,
        "identifier_use": ins.identifier_use,
        "identifier_type_system": ins.identifier_type_system,
        "identifier_type_code": ins.identifier_type_code,
        "identifier_type_display": ins.identifier_type_display,
        "identifier_type_text": ins.identifier_type_text,
        "identifier_system": ins.identifier_system,
        "identifier_value": ins.identifier_value,
        "identifier_period_start": ins.identifier_period_start.isoformat() if ins.identifier_period_start else None,
        "identifier_period_end": ins.identifier_period_end.isoformat() if ins.identifier_period_end else None,
        "identifier_assigner": ins.identifier_assigner,
        "coverage_type": fhir_enum(ins.coverage_type),
        "coverage_id": ins.coverage_id,
        "coverage_display": ins.coverage_display,
        "business_arrangement": ins.business_arrangement,
        "claim_response_type": fhir_enum(ins.claim_response_type),
        "claim_response_id": ins.claim_response_id,
        "claim_response_display": ins.claim_response_display,
        "pre_auth_refs": [plain_claim_insurance_pre_auth_ref(r) for r in ins.pre_auth_refs] if ins.pre_auth_refs else [],
    }


def plain_claim_item_modifier(m) -> dict:
    return {"id": m.id, "coding_system": m.coding_system, "coding_code": m.coding_code, "coding_display": m.coding_display, "text": m.text}


def plain_claim_item_program_code(pc) -> dict:
    return {"id": pc.id, "coding_system": pc.coding_system, "coding_code": pc.coding_code, "coding_display": pc.coding_display, "text": pc.text}


def plain_claim_item_udi(u) -> dict:
    return {"id": u.id, "reference_type": fhir_enum(u.reference_type), "reference_id": u.reference_id, "reference_display": u.reference_display}


def plain_claim_item_sub_site(ss) -> dict:
    return {"id": ss.id, "coding_system": ss.coding_system, "coding_code": ss.coding_code, "coding_display": ss.coding_display, "text": ss.text}


def plain_claim_item_encounter(enc) -> dict:
    return {
        "id": enc.id,
        "reference_type": fhir_enum(enc.reference_type),
        "encounter_id": enc.encounter.encounter_id if enc.encounter else None,
        "reference_display": enc.reference_display,
    }


def plain_claim_item_detail_sub_detail_modifier(m) -> dict:
    return {"id": m.id, "coding_system": m.coding_system, "coding_code": m.coding_code, "coding_display": m.coding_display, "text": m.text}


def plain_claim_item_detail_sub_detail_program_code(pc) -> dict:
    return {"id": pc.id, "coding_system": pc.coding_system, "coding_code": pc.coding_code, "coding_display": pc.coding_display, "text": pc.text}


def plain_claim_item_detail_sub_detail_udi(u) -> dict:
    return {"id": u.id, "reference_type": fhir_enum(u.reference_type), "reference_id": u.reference_id, "reference_display": u.reference_display}


def plain_claim_item_detail_sub_detail(sd) -> dict:
    return {
        "id": sd.id,
        "sequence": sd.sequence,
        "revenue_system": sd.revenue_system,
        "revenue_code": sd.revenue_code,
        "revenue_display": sd.revenue_display,
        "revenue_text": sd.revenue_text,
        "category_system": sd.category_system,
        "category_code": sd.category_code,
        "category_display": sd.category_display,
        "category_text": sd.category_text,
        "product_or_service_system": sd.product_or_service_system,
        "product_or_service_code": sd.product_or_service_code,
        "product_or_service_display": sd.product_or_service_display,
        "product_or_service_text": sd.product_or_service_text,
        "quantity_value": sd.quantity_value,
        "quantity_unit": sd.quantity_unit,
        "quantity_system": sd.quantity_system,
        "quantity_code": sd.quantity_code,
        "unit_price_value": sd.unit_price_value,
        "unit_price_currency": sd.unit_price_currency,
        "factor": sd.factor,
        "net_value": sd.net_value,
        "net_currency": sd.net_currency,
        "modifiers": [plain_claim_item_detail_sub_detail_modifier(m) for m in sd.modifiers] if sd.modifiers else [],
        "program_codes": [plain_claim_item_detail_sub_detail_program_code(pc) for pc in sd.program_codes] if sd.program_codes else [],
        "udi": [plain_claim_item_detail_sub_detail_udi(u) for u in sd.udi] if sd.udi else [],
    }


def plain_claim_item_detail_modifier(m) -> dict:
    return {"id": m.id, "coding_system": m.coding_system, "coding_code": m.coding_code, "coding_display": m.coding_display, "text": m.text}


def plain_claim_item_detail_program_code(pc) -> dict:
    return {"id": pc.id, "coding_system": pc.coding_system, "coding_code": pc.coding_code, "coding_display": pc.coding_display, "text": pc.text}


def plain_claim_item_detail_udi(u) -> dict:
    return {"id": u.id, "reference_type": fhir_enum(u.reference_type), "reference_id": u.reference_id, "reference_display": u.reference_display}


def plain_claim_item_detail(d) -> dict:
    return {
        "id": d.id,
        "sequence": d.sequence,
        "revenue_system": d.revenue_system,
        "revenue_code": d.revenue_code,
        "revenue_display": d.revenue_display,
        "revenue_text": d.revenue_text,
        "category_system": d.category_system,
        "category_code": d.category_code,
        "category_display": d.category_display,
        "category_text": d.category_text,
        "product_or_service_system": d.product_or_service_system,
        "product_or_service_code": d.product_or_service_code,
        "product_or_service_display": d.product_or_service_display,
        "product_or_service_text": d.product_or_service_text,
        "quantity_value": d.quantity_value,
        "quantity_unit": d.quantity_unit,
        "quantity_system": d.quantity_system,
        "quantity_code": d.quantity_code,
        "unit_price_value": d.unit_price_value,
        "unit_price_currency": d.unit_price_currency,
        "factor": d.factor,
        "net_value": d.net_value,
        "net_currency": d.net_currency,
        "modifiers": [plain_claim_item_detail_modifier(m) for m in d.modifiers] if d.modifiers else [],
        "program_codes": [plain_claim_item_detail_program_code(pc) for pc in d.program_codes] if d.program_codes else [],
        "udi": [plain_claim_item_detail_udi(u) for u in d.udi] if d.udi else [],
        "sub_details": [plain_claim_item_detail_sub_detail(sd) for sd in d.sub_details] if d.sub_details else [],
    }


def plain_claim_item(item) -> dict:
    return {
        "id": item.id,
        "sequence": item.sequence,
        "care_team_sequence": item.care_team_sequence,
        "diagnosis_sequence": item.diagnosis_sequence,
        "procedure_sequence": item.procedure_sequence,
        "information_sequence": item.information_sequence,
        "revenue_system": item.revenue_system,
        "revenue_code": item.revenue_code,
        "revenue_display": item.revenue_display,
        "revenue_text": item.revenue_text,
        "category_system": item.category_system,
        "category_code": item.category_code,
        "category_display": item.category_display,
        "category_text": item.category_text,
        "product_or_service_system": item.product_or_service_system,
        "product_or_service_code": item.product_or_service_code,
        "product_or_service_display": item.product_or_service_display,
        "product_or_service_text": item.product_or_service_text,
        "serviced_date": item.serviced_date.isoformat() if item.serviced_date else None,
        "serviced_period_start": item.serviced_period_start.isoformat() if item.serviced_period_start else None,
        "serviced_period_end": item.serviced_period_end.isoformat() if item.serviced_period_end else None,
        "location_codeable_concept_system": item.location_codeable_concept_system,
        "location_codeable_concept_code": item.location_codeable_concept_code,
        "location_codeable_concept_display": item.location_codeable_concept_display,
        "location_codeable_concept_text": item.location_codeable_concept_text,
        "location_address_use": item.location_address_use,
        "location_address_type": item.location_address_type,
        "location_address_text": item.location_address_text,
        "location_address_line": item.location_address_line,
        "location_address_city": item.location_address_city,
        "location_address_district": item.location_address_district,
        "location_address_state": item.location_address_state,
        "location_address_postal_code": item.location_address_postal_code,
        "location_address_country": item.location_address_country,
        "location_address_period_start": item.location_address_period_start.isoformat() if item.location_address_period_start else None,
        "location_address_period_end": item.location_address_period_end.isoformat() if item.location_address_period_end else None,
        "location_reference_type": fhir_enum(item.location_reference_type),
        "location_reference_id": item.location_reference_id,
        "location_reference_display": item.location_reference_display,
        "quantity_value": item.quantity_value,
        "quantity_unit": item.quantity_unit,
        "quantity_system": item.quantity_system,
        "quantity_code": item.quantity_code,
        "unit_price_value": item.unit_price_value,
        "unit_price_currency": item.unit_price_currency,
        "factor": item.factor,
        "net_value": item.net_value,
        "net_currency": item.net_currency,
        "body_site_system": item.body_site_system,
        "body_site_code": item.body_site_code,
        "body_site_display": item.body_site_display,
        "body_site_text": item.body_site_text,
        "modifiers": [plain_claim_item_modifier(m) for m in item.modifiers] if item.modifiers else [],
        "program_codes": [plain_claim_item_program_code(pc) for pc in item.program_codes] if item.program_codes else [],
        "udi": [plain_claim_item_udi(u) for u in item.udi] if item.udi else [],
        "sub_sites": [plain_claim_item_sub_site(ss) for ss in item.sub_sites] if item.sub_sites else [],
        "encounters": [plain_claim_item_encounter(e) for e in item.encounters] if item.encounters else [],
        "details": [plain_claim_item_detail(d) for d in item.details] if item.details else [],
    }


def to_plain_claim(model) -> dict:
    return {
        "id": model.claim_id,
        "status": fhir_enum(model.status),
        "use": fhir_enum(model.use),
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
        "billable_period_start": model.billable_period_start.isoformat() if model.billable_period_start else None,
        "billable_period_end": model.billable_period_end.isoformat() if model.billable_period_end else None,
        "created": model.created.isoformat(),
        "enterer_type": fhir_enum(model.enterer_type),
        "enterer_id": model.enterer_id,
        "enterer_display": model.enterer_display,
        "insurer_type": fhir_enum(model.insurer_type),
        "insurer_id": model.insurer_id,
        "insurer_display": model.insurer_display,
        "provider_type": fhir_enum(model.provider_type),
        "provider_id": model.provider_id,
        "provider_display": model.provider_display,
        "priority_system": model.priority_system,
        "priority_code": model.priority_code,
        "priority_display": model.priority_display,
        "priority_text": model.priority_text,
        "funds_reserve_system": model.funds_reserve_system,
        "funds_reserve_code": model.funds_reserve_code,
        "funds_reserve_display": model.funds_reserve_display,
        "funds_reserve_text": model.funds_reserve_text,
        "prescription_type": fhir_enum(model.prescription_type),
        "prescription_id": model.prescription_id,
        "prescription_display": model.prescription_display,
        "original_prescription_type": fhir_enum(model.original_prescription_type),
        "original_prescription_id": model.original_prescription_id,
        "original_prescription_display": model.original_prescription_display,
        "payee_type_system": model.payee_type_system,
        "payee_type_code": model.payee_type_code,
        "payee_type_display": model.payee_type_display,
        "payee_type_text": model.payee_type_text,
        "payee_party_type": fhir_enum(model.payee_party_type),
        "payee_party_id": model.payee_party_id,
        "payee_party_display": model.payee_party_display,
        "referral_type": fhir_enum(model.referral_type),
        "referral_id": model.referral_id,
        "referral_display": model.referral_display,
        "facility_type": fhir_enum(model.facility_type),
        "facility_id": model.facility_id,
        "facility_display": model.facility_display,
        "accident_date": model.accident_date.isoformat() if model.accident_date else None,
        "accident_type_system": model.accident_type_system,
        "accident_type_code": model.accident_type_code,
        "accident_type_display": model.accident_type_display,
        "accident_type_text": model.accident_type_text,
        "accident_location_address_use": model.accident_location_address_use,
        "accident_location_address_type": model.accident_location_address_type,
        "accident_location_address_text": model.accident_location_address_text,
        "accident_location_address_line": model.accident_location_address_line,
        "accident_location_address_city": model.accident_location_address_city,
        "accident_location_address_district": model.accident_location_address_district,
        "accident_location_address_state": model.accident_location_address_state,
        "accident_location_address_postal_code": model.accident_location_address_postal_code,
        "accident_location_address_country": model.accident_location_address_country,
        "accident_location_address_period_start": model.accident_location_address_period_start.isoformat() if model.accident_location_address_period_start else None,
        "accident_location_address_period_end": model.accident_location_address_period_end.isoformat() if model.accident_location_address_period_end else None,
        "accident_location_reference_type": fhir_enum(model.accident_location_reference_type),
        "accident_location_reference_id": model.accident_location_reference_id,
        "accident_location_reference_display": model.accident_location_reference_display,
        "total_value": model.total_value,
        "total_currency": model.total_currency,
        "user_id": model.user_id,
        "org_id": model.org_id,
        "created_at": model.created_at.isoformat() if model.created_at else None,
        "updated_at": model.updated_at.isoformat() if model.updated_at else None,
        "created_by": model.created_by,
        "updated_by": model.updated_by,
        "identifiers": [plain_claim_identifier(i) for i in model.identifiers] if model.identifiers else [],
        "related": [plain_claim_related(r) for r in model.related] if model.related else [],
        "care_team": [plain_claim_care_team(ct) for ct in model.care_team] if model.care_team else [],
        "supporting_info": [plain_claim_supporting_info(si) for si in model.supporting_info] if model.supporting_info else [],
        "diagnoses": [plain_claim_diagnosis(d) for d in model.diagnoses] if model.diagnoses else [],
        "procedures": [plain_claim_procedure(p) for p in model.procedures] if model.procedures else [],
        "insurance": [plain_claim_insurance(ins) for ins in model.insurance] if model.insurance else [],
        "items": [plain_claim_item(item) for item in model.items] if model.items else [],
    }
