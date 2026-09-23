"""
app.core.messaging — Transactional outbox for reliable NATS event publishing.

The outbox pattern guarantees at-least-once delivery even across crashes:
  1. Service writes an OutboxMessage row inside the same DB transaction as the
     business operation.
  2. Both rows commit atomically.
  3. OutboxWorker polls unpublished rows and sends them to NATS JetStream.
  4. OutboxWorker marks each row published_at = now() after successful delivery.

Rules:
  - Never call NATS directly from a service — always use TransactionalOutboxPublisher.
  - The publisher does NOT flush or commit. The service owns the transaction.
  - OutboxWorker delivers at-least-once; downstream consumers must be idempotent.

NATS subject format: filenest.<org_id>.<project_id>.<event_type>

Usage:
    from app.core.messaging import TransactionalOutboxPublisher, OutboxWorker
    from app.core.database import AsyncSessionLocal

    # In service code — write event alongside business operation:
    publisher = TransactionalOutboxPublisher(session)
    await publisher.publish(
        "filenest.org1.proj1.file.uploaded",
        {"file_id": "...", "filename": "..."},
        organization_id="org1",
        project_id="proj1",
    )

    # In lifespan — start the background delivery worker:
    worker = OutboxWorker(AsyncSessionLocal)
    task = worker.start()
"""
import asyncio
import json
import uuid
from datetime import UTC, datetime

from sqlalchemy import Column, DateTime, String, Text, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.database import Base
from app.core.logging import get_logger

logger = get_logger(__name__)


class OutboxMessage(Base):
    """ORM model for the outbox_messages table."""

    __tablename__ = "outbox_messages"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    subject = Column(String, nullable=False)
    payload = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    published_at = Column(DateTime(timezone=True), nullable=True)
    organization_id = Column(String, nullable=False)
    project_id = Column(String, nullable=False)


class TransactionalOutboxPublisher:
    """
    Enqueues an event into the outbox table within an existing DB transaction.

    Args:
        session: Active AsyncSession. The publisher adds the row to it but never
                 flushes or commits — the caller owns the transaction boundary.
    """

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def publish(
        self,
        subject: str,
        payload: dict,
        *,
        organization_id: str,
        project_id: str,
    ) -> None:
        """
        Enqueue an event for NATS delivery after the current transaction commits.

        Args:
            subject:         NATS subject, e.g. "filenest.org1.proj1.file.uploaded".
            payload:         JSON-serialisable event body.
            organization_id: Owning organisation UUID.
            project_id:      Target project UUID.
        """
        msg = OutboxMessage(
            subject=subject,
            payload=json.dumps(payload),
            organization_id=organization_id,
            project_id=project_id,
        )
        self._session.add(msg)


class OutboxWorker:
    """
    Background asyncio task that polls outbox_messages and publishes to NATS.

    Delivery guarantee: at-least-once. If the process crashes after a NATS
    publish but before the DB commit, the message will be re-published on
    the next cycle. Consumers must be idempotent.

    Uses SELECT FOR UPDATE SKIP LOCKED so multiple worker replicas can run
    without delivering the same message twice in the common case.

    Args:
        session_factory: async_sessionmaker used to open DB sessions per cycle.
                         Typically AsyncSessionLocal from app.core.database.
        poll_interval:   Seconds between poll cycles when the queue is empty.
        batch_size:      Maximum rows fetched and published per cycle.
    """

    def __init__(
        self,
        session_factory: async_sessionmaker,
        *,
        poll_interval: float = 1.0,
        batch_size: int = 100,
    ) -> None:
        self._session_factory = session_factory
        self._poll_interval = poll_interval
        self._batch_size = batch_size

    def start(self) -> asyncio.Task:
        """
        Spawn the worker as a named asyncio.Task and return it.

        The caller (lifespan) holds the reference to cancel it on shutdown.
        """
        return asyncio.create_task(self._run(), name="outbox-worker")

    async def _run(self) -> None:
        """Main loop: poll → publish batch → sleep → repeat."""
        logger.info("outbox_worker.started", poll_interval=self._poll_interval)
        while True:
            try:
                published = await self._poll_and_publish()
                if published:
                    logger.info("outbox_worker.batch_published", count=published)
            except asyncio.CancelledError:
                logger.info("outbox_worker.stopped")
                return
            except Exception as exc:
                # Transient NATS or DB errors must not crash the worker.
                # The next cycle will retry all unpublished rows.
                logger.error("outbox_worker.cycle_error", error=str(exc))

            try:
                await asyncio.sleep(self._poll_interval)
            except asyncio.CancelledError:
                logger.info("outbox_worker.stopped")
                return

    async def _poll_and_publish(self) -> int:
        """
        Fetch a batch of unpublished rows, publish each to NATS JetStream,
        then mark them published in the same DB transaction.

        If any NATS publish raises, the exception propagates to _run(), the
        session rolls back (no rows are marked published), and the next cycle
        retries. Already-published NATS messages are not harmful — downstream
        consumers must deduplicate on the NATS sequence number.

        Returns:
            Number of messages published in this cycle (0 if queue was empty).
        """
        # Late import avoids a circular dependency at module load time:
        # messaging → nats → (nothing from messaging)
        from app.core.nats import get_js

        js = get_js()

        async with self._session_factory() as session:
            stmt = (
                select(OutboxMessage)
                .where(OutboxMessage.published_at.is_(None))
                .order_by(OutboxMessage.created_at)
                .limit(self._batch_size)
                .with_for_update(skip_locked=True)
            )
            result = await session.execute(stmt)
            messages = list(result.scalars().all())

            if not messages:
                # Commit the empty transaction so SQLAlchemy closes it with
                # COMMIT rather than ROLLBACK — both are no-ops but COMMIT
                # is the correct semantic for a clean read.
                await session.commit()
                return 0

            now = datetime.now(UTC)
            for msg in messages:
                await js.publish(msg.subject, msg.payload.encode())
                msg.published_at = now

            await session.commit()
            return len(messages)
