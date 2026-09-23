from app.schemas.vitals.input import VitalsCreateSchema, VitalsPatchSchema
from app.schemas.vitals.response import VitalsResponseSchema, PaginatedVitalsResponse

__all__ = [
    "VitalsCreateSchema", "VitalsPatchSchema",
    "VitalsResponseSchema", "PaginatedVitalsResponse",
]
