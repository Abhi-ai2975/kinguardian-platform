"""
Identity Domain Module:
Bounded domain for user identities, application profiles, contact info, IAM bindings, and localization.
"""

from app.domains.family.infrastructure.models import AppProfile
from app.domains.family.domain.entities import AppProfileEntity
from app.domains.family.domain.interfaces import IAppProfileRepository
from app.domains.family.infrastructure.repositories import SQLAlchemyAppProfileRepository
from app.domains.family.schemas import (
    ProfileBase,
    ProfileResponse
)

AppProfileResponse = ProfileResponse
AppProfileCreate = ProfileBase
AppProfileUpdate = ProfileBase

__all__ = [
    "AppProfile",
    "AppProfileEntity",
    "IAppProfileRepository",
    "SQLAlchemyAppProfileRepository",
    "ProfileBase",
    "ProfileResponse",
    "AppProfileCreate",
    "AppProfileUpdate",
    "AppProfileResponse",
]
