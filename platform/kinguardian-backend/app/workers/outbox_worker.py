"""
Transactional Outbox Background Worker:
Continuously polls and publishes pending OutboxEvent records to the event bus.
"""

import asyncio
from app.core.logging import get_logger
from app.domains.events.outbox import OutboxService
from app.core.database import AsyncSessionLocal

logger = get_logger(__name__)


async def run_outbox_worker(poll_interval_seconds: float = 1.0, max_iterations: int = None):
    logger.info("Starting Transactional Outbox Worker...")
    iterations = 0
    while max_iterations is None or iterations < max_iterations:
        iterations += 1
        try:
            async with AsyncSessionLocal() as session:
                processor = OutboxService(session)
                processed = await processor.process_outbox_batch(batch_size=50)
                if processed > 0:
                    logger.debug(f"Outbox Worker processed {processed} events.")
        except Exception as e:
            if "does not exist" in str(e):
                logger.warning("Database tables not yet ready, waiting for migrations...")
            else:
                logger.error(f"Outbox Worker error: {e}")
        await asyncio.sleep(poll_interval_seconds)


if __name__ == "__main__":
    asyncio.run(run_outbox_worker())
