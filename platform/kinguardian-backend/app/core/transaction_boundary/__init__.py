"""
Transaction Boundary Core Package:
Enforces local DB transactions, transactional outbox, retry loops, idempotency, and compensating actions (Sagas).
"""

from app.core.transaction_boundary.saga import (
    TransactionBoundaryCoordinator,
    CompensatingActionEngine
)

__all__ = [
    "TransactionBoundaryCoordinator",
    "CompensatingActionEngine"
]
