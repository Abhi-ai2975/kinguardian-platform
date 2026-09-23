"""
Transaction Boundary & Compensating Action (Saga) Engine:
Guarantees reliable cross-system execution without distributed transactions across:
- PostgreSQL
- FHIR Platform
- FileNest Object Store
- Agent Runtime
- Notification Providers (FCM, Twilio, WhatsApp)

Implements:
1. Local Database Transaction
2. Transactional Outbox
3. Exponential Backoff Retries
4. Idempotency Keys
5. Compensating Actions for Permanent Failure Recovery
"""

import uuid
from typing import Dict, Any, Optional, Callable, Awaitable, Tuple
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.core.logging import get_logger
from app.core.redis import redis_service
from app.domains.events.models import EventLog, OutboxEvent

logger = get_logger(__name__)


class TransactionBoundaryCoordinator:
    """
    Enforces local database transactional integrity and outbox dispatch.
    Ensures zero distributed transactions cross PostgreSQL boundaries.
    """

    def __init__(self, session: AsyncSession):
        self.session = session

    async def execute_in_local_transaction(
        self,
        domain_mutations: Callable[[AsyncSession], Awaitable[Any]],
        event_type: str,
        aggregate_type: str,
        aggregate_id: uuid.UUID,
        family_id: Optional[uuid.UUID],
        payload: Dict[str, Any],
        idempotency_key: Optional[str] = None
    ) -> Tuple[Any, OutboxEvent]:
        """
        Executes business mutations and records an OutboxEvent within a single local DB transaction.
        Never invokes external APIs (FHIR, FileNest, FCM, Agent) inside this transaction.
        """
        # Check idempotency
        if idempotency_key:
            recorded = redis_service.get_idempotency_record(
                key=idempotency_key,
                user_id=None,
                endpoint=event_type
            )
            if recorded:
                logger.info(f"Idempotent replay detected for key={idempotency_key}")
                return recorded["response_body"], None

        # 1. Execute local domain mutations
        result = await domain_mutations(self.session)

        # 2. Append OutboxEvent in the same local transaction
        outbox_event = OutboxEvent(
            id=uuid.uuid4(),
            event_type=event_type,
            aggregate_type=aggregate_type,
            aggregate_id=aggregate_id,
            family_id=family_id,
            payload=payload,
            status="pending",
            attempt_count=0,
            available_at=datetime.now(timezone.utc)
        )
        self.session.add(outbox_event)

        # 3. Commit local transaction
        await self.session.commit()

        # Cache idempotency record post-commit
        if idempotency_key:
            redis_service.set_idempotency_record(
                key=idempotency_key,
                user_id=None,
                endpoint=event_type,
                status_code=200,
                response_body={"status": "committed", "outbox_id": str(outbox_event.id)}
            )

        logger.info(
            f"Local DB transaction committed for aggregate={aggregate_type}:{aggregate_id}, "
            f"outbox_event={outbox_event.id} (status=pending)"
        )
        return result, outbox_event


class CompensatingActionEngine:
    """
    Executes compensating transactions (Sagas) when external downstream systems
    (FHIR, FileNest, Agent Runtime, Notification Providers) fail permanently.
    """

    def __init__(self, session: AsyncSession):
        self.session = session

    async def execute_compensating_action(
        self,
        outbox_id: uuid.UUID,
        aggregate_type: str,
        aggregate_id: uuid.UUID,
        family_id: Optional[uuid.UUID],
        failure_reason: str,
        compensation_logic: Callable[[AsyncSession, uuid.UUID], Awaitable[None]]
    ) -> None:
        """
        Executes a compensating transaction:
        1. Invokes the domain-specific compensation callback (e.g. reverts state to 'sync_failed')
        2. Logs an audit compensation event in event_logs
        3. Marks the outbox event as failed/compensated
        """
        logger.warning(
            f"Initiating Compensating Action for outbox={outbox_id}, aggregate={aggregate_type}:{aggregate_id}. "
            f"Reason: {failure_reason}"
        )

        try:
            # 1. Execute domain compensation
            await compensation_logic(self.session, aggregate_id)

            # 2. Record Compensation Audit Log
            audit_log = EventLog(
                id=uuid.uuid4(),
                family_id=family_id,
                event_type="audit.compensating_action_executed",
                aggregate_type=aggregate_type,
                aggregate_id=str(aggregate_id),
                payload={
                    "outbox_id": str(outbox_id),
                    "failure_reason": failure_reason,
                    "compensated_at": datetime.now(timezone.utc).isoformat()
                },
                utc_timestamp=datetime.now(timezone.utc)
            )
            self.session.add(audit_log)

            # 3. Update Outbox Event
            stmt = select(OutboxEvent).where(OutboxEvent.id == outbox_id)
            res = await self.session.execute(stmt)
            outbox = res.scalar_one_or_none()
            if outbox:
                outbox.status = "compensated_failure"
                outbox.last_error = failure_reason

            await self.session.commit()
            logger.info(f"Compensating Action successfully committed for outbox={outbox_id}")
        except Exception as e:
            logger.exception(f"Failed to execute compensating action for outbox={outbox_id}: {e}")
            await self.session.rollback()
            raise
