from enum import Enum


class MedicationStatus(str, Enum):
    """FHIR R4 Medication.status — active | inactive | entered-in-error."""

    active = "active"
    inactive = "inactive"
    entered_in_error = "entered-in-error"


class MedicationIngredientItemReferenceType(str, Enum):
    """Allowed reference types for Medication.ingredient.item[x] reference variant."""

    Substance = "Substance"
    Medication = "Medication"
