"""
Documents Domain Module:
Bounded domain for Health Documents, WORM Storage Integration, FileNest Gateways, OCR extractions, and secure signed access.
"""

from app.domains.family.infrastructure.models import (
    HealthDocument,
    DocumentExtraction
)
from app.domains.family.domain.entities import (
    HealthDocumentEntity,
    DocumentExtractionEntity
)
from app.domains.family.schemas import (
    HealthDocumentCreate,
    HealthDocumentUpdate,
    HealthDocumentResponse,
    DocumentExtractionCreate,
    DocumentExtractionResponse
)
from app.core.adapters.prod_filenest import FileNestGateway
from app.core.adapters.mock_filenest import MockFileStorageGateway

__all__ = [
    "HealthDocument",
    "DocumentExtraction",
    "HealthDocumentEntity",
    "DocumentExtractionEntity",
    "HealthDocumentCreate",
    "HealthDocumentUpdate",
    "HealthDocumentResponse",
    "DocumentExtractionCreate",
    "DocumentExtractionResponse",
    "FileNestGateway",
    "MockFileStorageGateway"
]
