"""
Public re-exports for the Schedule schema package.

Importing from `app.schemas.schedule` instead of the sub-modules avoids
coupling callers to the internal file structure.
"""

from app.schemas.schedule.fhir_schemas import FhirBundleResponse, FhirScheduleResponse
from app.schemas.schedule.input import (
    ListSchedulesSchema,
    ScheduleCreateSchema,
    SchedulePatchSchema,
)
from app.schemas.schedule.response import PaginatedScheduleResponse, ScheduleResponse

__all__ = [
    "ScheduleCreateSchema",
    "SchedulePatchSchema",
    "ListSchedulesSchema",
    "ScheduleResponse",
    "PaginatedScheduleResponse",
    "FhirScheduleResponse",
    "FhirBundleResponse",
]
