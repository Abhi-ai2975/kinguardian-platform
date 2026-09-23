"""
Consent Domain Module:
Bounded domain for Care Subject granular consent evaluation, scope definitions, revocation, and expiration.
"""

from app.domains.family.infrastructure.models import Consent
from app.domains.family.domain.entities import ConsentEntity
from app.domains.family.domain.interfaces import IConsentRepository
from app.domains.family.infrastructure.repositories import SQLAlchemyConsentRepository
from app.domains.family.schemas import (
    ConsentCreate,
    ConsentResponse
)

__all__ = [
    "Consent",
    "ConsentEntity",
    "IConsentRepository",
    "SQLAlchemyConsentRepository",
    "ConsentCreate",
    "ConsentResponse"
]
