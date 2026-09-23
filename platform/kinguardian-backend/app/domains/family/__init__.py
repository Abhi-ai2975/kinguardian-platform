"""
Family Domain Module:
Bounded domain for Care Circles, Family Memberships, Care Relationships, and Home Screen Aggregation.
"""

from app.domains.family.infrastructure.models import (
    Family,
    FamilyMembership,
    FamilyRelationship
)
from app.domains.family.domain.entities import (
    FamilyEntity,
    FamilyMembershipEntity,
    FamilyRelationshipEntity
)
from app.domains.family.domain.interfaces import IFamilyRepository
from app.domains.family.infrastructure.repositories import SQLAlchemyFamilyRepository
from app.domains.family.application.services import FamilyService
from app.domains.family.application.home_read_service import FamilyHomeReadService
from app.domains.family.schemas import (
    FamilyCreate,
    FamilyUpdate,
    FamilyResponse,
    FamilyMemberAdd,
    FamilyMemberUpdate,
    CareCircleMemberResponse,
    FamilyRelationshipCreate,
    FamilyRelationshipResponse
)

FamilyMembershipResponse = CareCircleMemberResponse

__all__ = [
    "Family",
    "FamilyMembership",
    "FamilyRelationship",
    "FamilyEntity",
    "FamilyMembershipEntity",
    "FamilyRelationshipEntity",
    "IFamilyRepository",
    "SQLAlchemyFamilyRepository",
    "FamilyService",
    "FamilyHomeReadService",
    "FamilyCreate",
    "FamilyUpdate",
    "FamilyResponse",
    "FamilyMemberAdd",
    "FamilyMemberUpdate",
    "CareCircleMemberResponse",
    "FamilyMembershipResponse",
    "FamilyRelationshipCreate",
    "FamilyRelationshipResponse"
]
