from enum import Enum


class SlotStatus(str, Enum):
    busy = "busy"
    free = "free"
    busy_unavailable = "busy-unavailable"
    busy_tentative = "busy-tentative"
    entered_in_error = "entered-in-error"


class SlotScheduleReferenceType(str, Enum):
    Schedule = "Schedule"
