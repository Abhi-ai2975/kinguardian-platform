"""
Domain Family Layer:
Entities, Value Objects, Repository Interfaces, and Events for the Family Care Circle.
"""

from app.domains.family.domain.entities import (
    FamilyEntity,
    FamilyMembershipEntity,
    FamilyRelationshipEntity
)
from app.domains.family.domain.interfaces import IFamilyRepository
from app.domains.family.domain.exceptions import (
    DomainError,
    FamilyAccessError,
    DuplicateMembershipError
)

FamilyError = DomainError
FamilyNotFoundError = DomainError
DuplicateMemberError = DuplicateMembershipError

__all__ = [
    "FamilyEntity",
    "FamilyMembershipEntity",
    "FamilyRelationshipEntity",
    "IFamilyRepository",
    "FamilyError",
    "FamilyAccessError",
    "FamilyNotFoundError",
    "DuplicateMemberError"
]
