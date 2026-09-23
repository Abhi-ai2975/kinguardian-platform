from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.questionnaire_response.questionnaire_response import (
        QuestionnaireResponseModel,
        QuestionnaireResponseItemModel,
        QuestionnaireResponseAnswerModel,
    )


def fhir_qr_answer(answer: "QuestionnaireResponseAnswerModel") -> dict:
    vt = answer.value_type
    data: dict = {}

    if vt == "boolean":
        data["valueBoolean"] = answer.value_boolean
    elif vt == "decimal":
        data["valueDecimal"] = answer.value_decimal
    elif vt == "integer":
        data["valueInteger"] = answer.value_integer
    elif vt == "date":
        data["valueDate"] = answer.value_string
    elif vt == "dateTime":
        data["valueDateTime"] = answer.value_datetime.isoformat() if answer.value_datetime else None
    elif vt == "time":
        data["valueTime"] = answer.value_string
    elif vt == "string":
        data["valueString"] = answer.value_string
    elif vt == "uri":
        data["valueUri"] = answer.value_string
    elif vt == "coding":
        coding = {k: v for k, v in {
            "system": answer.value_coding_system,
            "code": answer.value_coding_code,
            "display": answer.value_coding_display,
        }.items() if v is not None}
        if coding:
            data["valueCoding"] = coding
    elif vt == "quantity":
        qty = {k: v for k, v in {
            "value": answer.value_quantity_value,
            "unit": answer.value_quantity_unit,
            "system": answer.value_quantity_system,
            "code": answer.value_quantity_code,
        }.items() if v is not None}
        if qty:
            data["valueQuantity"] = qty
    elif vt == "reference":
        ref: dict = {}
        if answer.value_reference:
            ref["reference"] = answer.value_reference
        if answer.value_reference_display:
            ref["display"] = answer.value_reference_display
        if ref:
            data["valueReference"] = ref
    elif vt == "attachment":
        att: dict = {}
        if answer.value_attachment_content_type:
            att["contentType"] = answer.value_attachment_content_type
        if answer.value_attachment_language:
            att["language"] = answer.value_attachment_language
        if answer.value_attachment_data:
            att["data"] = answer.value_attachment_data
        if answer.value_attachment_url:
            att["url"] = answer.value_attachment_url
        if answer.value_attachment_size is not None:
            att["size"] = answer.value_attachment_size
        if answer.value_attachment_hash:
            att["hash"] = answer.value_attachment_hash
        if answer.value_attachment_title:
            att["title"] = answer.value_attachment_title
        if answer.value_attachment_creation:
            att["creation"] = answer.value_attachment_creation.isoformat()
        if att:
            data["valueAttachment"] = att

    if answer.answer_items:
        data["item"] = [fhir_qr_item(sub) for sub in answer.answer_items]

    return data


def fhir_qr_item(item: "QuestionnaireResponseItemModel") -> dict:
    data: dict = {"linkId": item.link_id}
    if item.text:
        data["text"] = item.text
    if item.definition:
        data["definition"] = item.definition
    if item.answers:
        data["answer"] = [fhir_qr_answer(a) for a in item.answers]
    if item.sub_items:
        data["item"] = [fhir_qr_item(sub) for sub in item.sub_items]
    return data


def to_fhir_questionnaire_response(qr: "QuestionnaireResponseModel") -> dict:
    result: dict = {
        "resourceType": "QuestionnaireResponse",
        "id": str(qr.questionnaire_response_id),
        "questionnaire": qr.questionnaire,
        "status": qr.status.value if qr.status else None,
    }

    if qr.identifier_value or qr.identifier_system:
        ident: dict = {}
        if qr.identifier_use:
            ident["use"] = qr.identifier_use.value
        if qr.identifier_system:
            ident["system"] = qr.identifier_system
        if qr.identifier_value:
            ident["value"] = qr.identifier_value
        if qr.identifier_type_code or qr.identifier_type_system:
            coding: dict = {k: v for k, v in {
                "system": qr.identifier_type_system,
                "code": qr.identifier_type_code,
                "display": qr.identifier_type_display,
            }.items() if v is not None}
            ident["type"] = {k: v for k, v in {
                "coding": [coding] if coding else None,
                "text": qr.identifier_type_text,
            }.items() if v is not None}
        if qr.identifier_period_start or qr.identifier_period_end:
            ident["period"] = {k: v for k, v in {
                "start": qr.identifier_period_start.isoformat() if qr.identifier_period_start else None,
                "end": qr.identifier_period_end.isoformat() if qr.identifier_period_end else None,
            }.items() if v is not None}
        if qr.identifier_assigner:
            ident["assigner"] = {"display": qr.identifier_assigner}
        result["identifier"] = ident

    if qr.based_ons:
        result["basedOn"] = [
            {k: v for k, v in {
                "reference": f"{b.reference_type.value}/{b.reference_id}" if b.reference_type and b.reference_id else None,
                "display": b.reference_display,
            }.items() if v is not None}
            for b in qr.based_ons
        ]

    if qr.part_ofs:
        result["partOf"] = [
            {k: v for k, v in {
                "reference": f"{p.reference_type.value}/{p.reference_id}" if p.reference_type and p.reference_id else None,
                "display": p.reference_display,
            }.items() if v is not None}
            for p in qr.part_ofs
        ]

    if qr.subject_type and qr.subject_id:
        subject: dict = {"reference": f"{qr.subject_type.value}/{qr.subject_id}"}
        if qr.subject_display:
            subject["display"] = qr.subject_display
        result["subject"] = subject

    if qr.encounter and qr.encounter.encounter_id:
        result["encounter"] = {"reference": f"Encounter/{qr.encounter.encounter_id}"}

    if qr.authored:
        result["authored"] = qr.authored.isoformat()

    if qr.author_type and qr.author_id:
        author: dict = {"reference": f"{qr.author_type.value}/{qr.author_id}"}
        if qr.author_display:
            author["display"] = qr.author_display
        result["author"] = author

    if qr.source_type and qr.source_id:
        source: dict = {"reference": f"{qr.source_type.value}/{qr.source_id}"}
        if qr.source_display:
            source["display"] = qr.source_display
        result["source"] = source

    top_level = [i for i in qr.items if i.parent_item_id is None]
    if top_level:
        result["item"] = [fhir_qr_item(i) for i in top_level]

    return {k: v for k, v in result.items() if v is not None}
