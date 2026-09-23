from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.immunization.immunization import (
        ImmunizationModel,
        ImmunizationIdentifier,
        ImmunizationPerformer,
        ImmunizationNote,
        ImmunizationReasonCode,
        ImmunizationReasonReference,
        ImmunizationSubpotentReason,
        ImmunizationEducation,
        ImmunizationProgramEligibility,
        ImmunizationReaction,
        ImmunizationProtocolApplied,
        ImmunizationProtocolAppliedTargetDisease,
    )


def _ev(v):
    return v.value if v and hasattr(v, "value") else v


def _dt(v):
    return v.isoformat() if v else None


def plain_immunization_identifier(i: "ImmunizationIdentifier") -> dict:
    return {
        "id": i.id,
        "use": i.use,
        "type_system": i.type_system,
        "type_code": i.type_code,
        "type_display": i.type_display,
        "type_text": i.type_text,
        "system": i.system,
        "value": i.value,
        "period_start": _dt(i.period_start),
        "period_end": _dt(i.period_end),
        "assigner": i.assigner,
    }


def plain_immunization_performer(p: "ImmunizationPerformer") -> dict:
    return {
        "id": p.id,
        "function_system": p.function_system,
        "function_code": p.function_code,
        "function_display": p.function_display,
        "function_text": p.function_text,
        "reference_type": _ev(p.reference_type),
        "reference_id": p.reference_id,
        "reference_display": p.reference_display,
    }


def plain_immunization_note(n: "ImmunizationNote") -> dict:
    return {
        "id": n.id,
        "text": n.text,
        "time": _dt(n.time),
        "author_string": n.author_string,
        "author_reference_type": n.author_reference_type,
        "author_reference_id": n.author_reference_id,
        "author_reference_display": n.author_reference_display,
    }


def plain_immunization_reason_code(rc: "ImmunizationReasonCode") -> dict:
    return {
        "id": rc.id,
        "coding_system": rc.coding_system,
        "coding_code": rc.coding_code,
        "coding_display": rc.coding_display,
        "text": rc.text,
    }


def plain_immunization_reason_reference(rr: "ImmunizationReasonReference") -> dict:
    return {
        "id": rr.id,
        "reference_type": _ev(rr.reference_type),
        "reference_id": rr.reference_id,
        "reference_display": rr.reference_display,
    }


def plain_immunization_subpotent_reason(sr: "ImmunizationSubpotentReason") -> dict:
    return {
        "id": sr.id,
        "coding_system": sr.coding_system,
        "coding_code": sr.coding_code,
        "coding_display": sr.coding_display,
        "text": sr.text,
    }


def plain_immunization_education(e: "ImmunizationEducation") -> dict:
    return {
        "id": e.id,
        "document_type": e.document_type,
        "reference": e.reference,
        "publication_date": _dt(e.publication_date),
        "presentation_date": _dt(e.presentation_date),
    }


def plain_immunization_program_eligibility(pe: "ImmunizationProgramEligibility") -> dict:
    return {
        "id": pe.id,
        "coding_system": pe.coding_system,
        "coding_code": pe.coding_code,
        "coding_display": pe.coding_display,
        "text": pe.text,
    }


def plain_immunization_reaction(r: "ImmunizationReaction") -> dict:
    return {
        "id": r.id,
        "date": _dt(r.date),
        "detail_type": _ev(r.detail_type),
        "detail_id": r.detail_id,
        "detail_display": r.detail_display,
        "reported": r.reported,
    }


def plain_immunization_target_disease(td: "ImmunizationProtocolAppliedTargetDisease") -> dict:
    return {
        "id": td.id,
        "coding_system": td.coding_system,
        "coding_code": td.coding_code,
        "coding_display": td.coding_display,
        "text": td.text,
    }


def plain_immunization_protocol_applied(pa: "ImmunizationProtocolApplied") -> dict:
    return {
        "id": pa.id,
        "series": pa.series,
        "authority_type": _ev(pa.authority_type),
        "authority_id": pa.authority_id,
        "authority_display": pa.authority_display,
        "dose_number_positive_int": pa.dose_number_positive_int,
        "dose_number_string": pa.dose_number_string,
        "series_doses_positive_int": pa.series_doses_positive_int,
        "series_doses_string": pa.series_doses_string,
        "target_diseases": [plain_immunization_target_disease(td) for td in pa.target_diseases] if pa.target_diseases else [],
    }


def to_plain_immunization(model: "ImmunizationModel") -> dict:
    return {
        "id": model.immunization_id,
        "user_id": model.user_id,
        "org_id": model.org_id,
        "status": _ev(model.status),
        "occurrence_datetime": _dt(model.occurrence_datetime),
        "occurrence_string": model.occurrence_string,
        "status_reason_system": model.status_reason_system,
        "status_reason_code": model.status_reason_code,
        "status_reason_display": model.status_reason_display,
        "status_reason_text": model.status_reason_text,
        "vaccine_code_system": model.vaccine_code_system,
        "vaccine_code_code": model.vaccine_code_code,
        "vaccine_code_display": model.vaccine_code_display,
        "vaccine_code_text": model.vaccine_code_text,
        "patient_type": _ev(model.patient_type),
        "patient_id": model.patient_id,
        "patient_display": model.patient_display,
        "encounter_type": _ev(model.encounter_type),
        "encounter_id": model.encounter_id,
        "encounter_display": model.encounter_display,
        "recorded": _dt(model.recorded),
        "primary_source": model.primary_source,
        "report_origin_system": model.report_origin_system,
        "report_origin_code": model.report_origin_code,
        "report_origin_display": model.report_origin_display,
        "report_origin_text": model.report_origin_text,
        "location_type": _ev(model.location_type),
        "location_id": model.location_id,
        "location_display": model.location_display,
        "manufacturer_type": _ev(model.manufacturer_type),
        "manufacturer_id": model.manufacturer_id,
        "manufacturer_display": model.manufacturer_display,
        "lot_number": model.lot_number,
        "expiration_date": model.expiration_date.isoformat() if model.expiration_date else None,
        "site_system": model.site_system,
        "site_code": model.site_code,
        "site_display": model.site_display,
        "site_text": model.site_text,
        "route_system": model.route_system,
        "route_code": model.route_code,
        "route_display": model.route_display,
        "route_text": model.route_text,
        "dose_quantity_value": model.dose_quantity_value,
        "dose_quantity_unit": model.dose_quantity_unit,
        "dose_quantity_system": model.dose_quantity_system,
        "dose_quantity_code": model.dose_quantity_code,
        "is_subpotent": model.is_subpotent,
        "funding_source_system": model.funding_source_system,
        "funding_source_code": model.funding_source_code,
        "funding_source_display": model.funding_source_display,
        "funding_source_text": model.funding_source_text,
        "created_at": _dt(model.created_at),
        "updated_at": _dt(model.updated_at),
        "identifiers": [plain_immunization_identifier(i) for i in model.identifiers] if model.identifiers else [],
        "performers": [plain_immunization_performer(p) for p in model.performers] if model.performers else [],
        "notes": [plain_immunization_note(n) for n in model.notes] if model.notes else [],
        "reason_codes": [plain_immunization_reason_code(rc) for rc in model.reason_codes] if model.reason_codes else [],
        "reason_references": [plain_immunization_reason_reference(rr) for rr in model.reason_references] if model.reason_references else [],
        "subpotent_reasons": [plain_immunization_subpotent_reason(sr) for sr in model.subpotent_reasons] if model.subpotent_reasons else [],
        "educations": [plain_immunization_education(e) for e in model.educations] if model.educations else [],
        "program_eligibilities": [plain_immunization_program_eligibility(pe) for pe in model.program_eligibilities] if model.program_eligibilities else [],
        "reactions": [plain_immunization_reaction(r) for r in model.reactions] if model.reactions else [],
        "protocol_applied": [plain_immunization_protocol_applied(pa) for pa in model.protocol_applied] if model.protocol_applied else [],
    }
