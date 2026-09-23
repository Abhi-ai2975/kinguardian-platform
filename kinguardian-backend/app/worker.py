"""Outbox publishing worker boundary.

This module deliberately publishes envelopes, not domain-table updates. A production
publisher can target NATS, SQS, or a workflow engine through the same interface.
"""
from datetime import UTC, datetime
from sqlalchemy import select
from app.db import SessionLocal
from app.models import OutboxEvent


async def claim_pending(limit: int = 100) -> list[OutboxEvent]:
    async with SessionLocal() as session:
        events = (await session.execute(select(OutboxEvent).where(OutboxEvent.status == "pending").order_by(OutboxEvent.occurred_at).limit(limit))).scalars().all()
        for event in events:
            event.status, event.attempts = "publishing", event.attempts + 1
        await session.commit()
        return events


async def mark_published(event_id):
    async with SessionLocal() as session:
        event = await session.get(OutboxEvent, event_id)
        if event:
            event.status = "published"
            await session.commit()
