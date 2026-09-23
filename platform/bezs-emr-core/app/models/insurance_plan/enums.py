from enum import Enum


class InsurancePlanStatus(str, Enum):
    draft = "draft"
    active = "active"
    retired = "retired"
    unknown = "unknown"
