from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.questionnaire_response.questionnaire_response import (
        QuestionnaireResponseModel,
        QuestionnaireResponseItemModel,
        QuestionnaireResponseAnswerModel,
    )


def plain_qr_answer(answer: "QuestionnaireResponseAnswerModel") -> dict:
    vt = answer.value_type
    data: dict = {"value_type": vt}

    if vt == "boolean":
        data["value_boolean"] = answer.value_boolean
    elif vt == "decimal":
        data["value_decimal"] = answer.value_decimal
    elif vt == "integer":
        data["value_integer"] = answer.value_integer
    elif vt in ("date", "time", "string", "uri"):
        data["value_string"] = answer.value_string
    elif vt == "dateTime":
        data["value_datetime"] = answer.value_datetime.isoformat() if answer.value_datetime else None
    elif vt == "coding":
        data["value_coding"] = {k: v for k, v in {
            "system": answer.value_coding_system,
            "code": answer.value_coding_code,
            "display": answer.value_coding_display,
        }.items() if v is not None}
    elif vt == "quantity":
        data["value_quantity"] = {k: v for k, v in {
            "value": answer.value_quantity_value,
            "unit": answer.value_quantity_unit,
            "system": answer.value_quantity_system,
            "code": answer.value_quantity_code,
        }.items() if v is not None}
    elif vt == "reference":
        data["value_reference"] = answer.value_reference
        data["value_reference_display"] = answer.value_reference_display
    elif vt == "attachment":
        att: dict = {}
        if answer.value_attachment_content_type:
            att["content_type"] = answer.value_attachment_content_type
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
        data["value_attachment"] = att or None

    if answer.answer_items:
        data["item"] = [plain_qr_item(sub) for sub in answer.answer_items]

    return {k: v for k, v in data.items() if k == "value_type" or v is not None}


def plain_qr_item(item: "QuestionnaireResponseItemModel") -> dict:
    data: dict = {"link_id": item.link_id}
    if item.text:
        data["text"] = item.text
    if item.definition:
        data["definition"] = item.definition
    if item.answers:
        data["answer"] = [plain_qr_answer(a) for a in item.answers]
    if item.sub_items:
        data["item"] = [plain_qr_item(sub) for sub in item.sub_items]
    return data


def to_plain_questionnaire_response(qr: "QuestionnaireResponseModel") -> dict:
    result: dict = {
        "id": qr.questionnaire_response_id,
        "user_id": qr.user_id,
        "org_id": qr.org_id,
        "questionnaire": qr.questionnaire,
        "status": qr.status.value if qr.status else None,
        "identifier_use": qr.identifier_use.value if qr.identifier_use else None,
        "identifier_type_system": qr.identifier_type_system,
        "identifier_type_code": qr.identifier_type_code,
        "identifier_type_display": qr.identifier_type_display,
        "identifier_type_text": qr.identifier_type_text,
        "identifier_system": qr.identifier_system,
        "identifier_value": qr.identifier_value,
        "identifier_period_start": qr.identifier_period_start.isoformat() if qr.identifier_period_start else None,
        "identifier_period_end": qr.identifier_period_end.isoformat() if qr.identifier_period_end else None,
        "identifier_assigner": qr.identifier_assigner,
        "based_on": [
            {
                "reference_type": b.reference_type.value if b.reference_type else None,
                "reference_id": b.reference_id,
                "reference_display": b.reference_display,
            }
            for b in qr.based_ons
        ] if qr.based_ons else None,
        "part_of": [
            {
                "reference_type": p.reference_type.value if p.reference_type else None,
                "reference_id": p.reference_id,
                "reference_display": p.reference_display,
            }
            for p in qr.part_ofs
        ] if qr.part_ofs else None,
        "subject_type": qr.subject_type.value if qr.subject_type else None,
        "subject_id": qr.subject_id,
        "subject_display": qr.subject_display,
        "encounter_id": (
            qr.encounter.encounter_id if qr.encounter and qr.encounter.encounter_id else None
        ),
        "authored": qr.authored.isoformat() if qr.authored else None,
        "author_type": qr.author_type.value if qr.author_type else None,
        "author_id": qr.author_id,
        "author_display": qr.author_display,
        "source_type": qr.source_type.value if qr.source_type else None,
        "source_id": qr.source_id,
        "source_display": qr.source_display,
        "created_at": qr.created_at.isoformat() if qr.created_at else None,
        "updated_at": qr.updated_at.isoformat() if qr.updated_at else None,
        "created_by": qr.created_by,
        "updated_by": qr.updated_by,
    }

    top_level = [i for i in qr.items if i.parent_item_id is None]
    if top_level:
        result["item"] = [plain_qr_item(i) for i in top_level]

    return {k: v for k, v in result.items() if v is not None}
