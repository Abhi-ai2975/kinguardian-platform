"""
Reusable helpers for parsing and resolving FHIR reference strings.

Usage:
    subject_type, subject_id = parse_reference(payload.subject, SubjectReferenceType)
    subject_display = await resolve_subject(subject_type, subject_id, patient_service=patient_service)
"""

from typing import Optional, Type, TypeVar
from enum import Enum

from fastapi import HTTPException, status

from app.models.enums import SubjectReferenceType

E = TypeVar("E", bound=Enum)


def parse_reference(ref: str, enum_class: Type[E]) -> tuple[E, int]:
    """
    Parse a FHIR reference string and validate the resource type against an enum.

    parse_reference("Patient/10001", SubjectReferenceType)
    → (SubjectReferenceType.Patient, 10001)

    Raises HTTP 422 on invalid format, unknown type, or non-integer id.
    """
    parts = ref.split("/")
    if len(parts) != 2:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid reference format: '{ref}'. Expected 'ResourceType/id'.",
        )
    resource_type, resource_id_str = parts
    try:
        typed = enum_class(resource_type)
    except ValueError:
        valid = [e.value for e in enum_class]
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unsupported reference type: '{resource_type}'. Must be one of: {valid}.",
        )
    try:
        resource_id = int(resource_id_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid reference id: '{resource_id_str}'. Must be an integer.",
        )
    return typed, resource_id


async def resolve_subject(
    subject_type: SubjectReferenceType,
    subject_id: int,
    user_id: str,
    org_id: str,
    patient_service=None,
) -> Optional[str]:
    """
    Look up the subject by type, public id, user_id, and org_id, returning a display name.

    Raises HTTP 404 if the referenced resource does not exist (or is not owned by the caller).
    Raises HTTP 422 if the subject type is not yet supported.
    """
    if subject_type == SubjectReferenceType.Patient:
        if patient_service is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="patient_service is required to resolve a Patient subject.",
            )
        patient = await patient_service.get_patient_in_org(subject_id, user_id, org_id)
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Patient/{subject_id} not found.",
            )
        name = patient.names[0] if patient.names else None
        given = (name.given or "") if name else ""
        family = (name.family or "") if name else ""
        return f"{given} {family}".strip()

    elif subject_type == SubjectReferenceType.Group:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Group subject references are not yet supported.",
        )

    else:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unsupported subject type: '{subject_type.value}'.",
        )
