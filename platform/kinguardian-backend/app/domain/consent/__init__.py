"""
Domain Consent Layer:
Entities and Repositories for Granular Consent Evaluation.
"""

from app.domains.family.domain.entities import ConsentEntity
from app.domains.family.domain.interfaces import IConsentRepository

__all__ = ["ConsentEntity", "IConsentRepository"]
