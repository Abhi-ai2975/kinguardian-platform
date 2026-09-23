"""
Input schema exports for the Encounter resource.

Re-exports the two write schemas so importers can use the short form:
    from app.schemas.encounter import EncounterCreateSchema, EncounterPatchSchema
"""

from app.schemas.encounter.input import EncounterCreateSchema, EncounterPatchSchema

__all__ = ["EncounterCreateSchema", "EncounterPatchSchema"]
