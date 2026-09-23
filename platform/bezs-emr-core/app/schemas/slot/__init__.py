from app.schemas.slot.input import (
    SlotCreateSchema,
    SlotPatchSchema,
    SlotIdentifierInput,
    SlotServiceCategoryInput,
    SlotServiceTypeInput,
    SlotSpecialtyInput,
)
from app.schemas.slot.response import (
    FHIRSlotSchema,
    FHIRSlotBundleEntry,
    FHIRSlotBundle,
    PlainSlotResponse,
    PaginatedSlotResponse,
    PlainSlotIdentifier,
    PlainSlotServiceCategory,
    PlainSlotServiceType,
    PlainSlotSpecialty,
)

__all__ = [
    "SlotCreateSchema",
    "SlotPatchSchema",
    "SlotIdentifierInput",
    "SlotServiceCategoryInput",
    "SlotServiceTypeInput",
    "SlotSpecialtyInput",
    "FHIRSlotSchema",
    "FHIRSlotBundleEntry",
    "FHIRSlotBundle",
    "PlainSlotResponse",
    "PaginatedSlotResponse",
    "PlainSlotIdentifier",
    "PlainSlotServiceCategory",
    "PlainSlotServiceType",
    "PlainSlotSpecialty",
]
