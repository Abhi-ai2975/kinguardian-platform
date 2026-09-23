"""
FHIR Reference builder.

to_fhir_reference(resource_type, obj) always uses the PUBLIC id of the
resource — never the internal PK — so references are safe to expose.

Public-id attribute mapping per resource type:
  Patient      → patient_id
  Encounter    → encounter_id
  (all others) → id  (fallback; add explicit mappings as new resources arrive)
"""

_PUBLIC_ID_FIELD: dict[str, str] = {
    "Patient": "patient_id",
    "Practitioner": "practitioner_id",
    "Encounter": "encounter_id",
}


def to_fhir_reference(resource_type: str, obj) -> dict:
    """
    Build a FHIR Reference dict for the given resource.

    Example outputs:
      to_fhir_reference("Patient",   patient_model)   → {"reference": "Patient/10001",   "type": "Patient"}
      to_fhir_reference("Encounter", encounter_model) → {"reference": "Encounter/20001", "type": "Encounter"}
    """
    field = _PUBLIC_ID_FIELD.get(resource_type, "id")
    ref_id = getattr(obj, field, None)

    if ref_id is None:
        raise ValueError(
            f"Cannot build FHIR reference: object of type '{type(obj).__name__}' "
            f"has no attribute '{field}'."
        )

    return {
        "reference": f"{resource_type}/{ref_id}",
        "type": resource_type,
    }
