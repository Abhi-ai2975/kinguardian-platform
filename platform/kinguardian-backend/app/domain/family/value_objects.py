from pydantic import BaseModel, EmailStr
from typing import Optional

class FamilyRole(str):
    COORDINATOR = "coordinator"
    PARENT = "parent"
    CAREGIVER = "caregiver"
    FAMILY_MEMBER = "family_member"

class MemberStatus(str):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    LEFT = "left"
