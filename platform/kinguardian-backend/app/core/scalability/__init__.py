"""
Scalability Core Package:
Table Partitioning, Sharding Keys, and Domain Boundary Extraction Readiness.
"""

from app.core.scalability.partitioning import TablePartitionManager
from app.core.scalability.extraction_contracts import (
    BOUNDED_DOMAINS,
    DomainBoundaryValidator
)
from app.core.scalability.extraction_manifest import (
    ServiceExtractionDefinition,
    ServiceExtractionRegistry,
    FUTURE_EXTRACTION_SERVICES
)

__all__ = [
    "TablePartitionManager",
    "BOUNDED_DOMAINS",
    "DomainBoundaryValidator",
    "ServiceExtractionDefinition",
    "ServiceExtractionRegistry",
    "FUTURE_EXTRACTION_SERVICES"
]

