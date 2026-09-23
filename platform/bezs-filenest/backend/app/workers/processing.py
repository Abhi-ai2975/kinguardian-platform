"""
app.workers.processing — NATS push consumer for file.uploaded events.

Subscribes to the FILENEST_EVENTS stream on the `filenest.*.*.file.uploaded`
filter subject using a durable push consumer named "processing-workers". NATS
delivers messages to the callback as they arrive — no polling required.

Up to `max_concurrent` files are processed in parallel via an asyncio.Semaphore.
Messages are ack'd after PipelineExecutor.run() completes (success or failure)
so the file is never stuck in processing state due to a worker crash — the NATS
server re-delivers after the ack_wait timeout.

Usage:
    from app.workers.processing import ProcessingWorker
    worker = ProcessingWorker()
    task = worker.start()          # returns asyncio.Task
    task.cancel(); await task      # graceful shutdown
"""
import asyncio
import json

from app.core.logging import get_logger
from app.core.nats import get_js
from app.core.config import settings
from app.processing.pipeline import PipelineExecutor

logger = get_logger(__name__)

_CONSUMER_DURABLE = "processing-workers"


class ProcessingWorker:
    """
    Durable push consumer that runs PipelineExecutor for each file.uploaded event.

    NATS delivers messages via callback as they arrive. Up to max_concurrent
    pipeline runs execute in parallel under an asyncio.Semaphore.

    Args:
        max_concurrent: Maximum number of files being processed simultaneously.
                        Each in-flight file holds a DB session + storage connection.
    """

    def __init__(self, *, max_concurrent: int = 20) -> None:
        self._semaphore = asyncio.Semaphore(max_concurrent)
        self._executor = PipelineExecutor()

    def start(self) -> asyncio.Task:
        """Spawn the worker as a named asyncio.Task and return it."""
        return asyncio.create_task(self._run(), name="processing-worker")

    async def _run(self) -> None:
        js = get_js()
        logger.info("processing_worker.starting", consumer=_CONSUMER_DURABLE)

        tasks: set[asyncio.Task] = set()

        async def _on_message(msg) -> None:
            task = asyncio.create_task(self._handle(msg))
            tasks.add(task)
            task.add_done_callback(tasks.discard)

        try:
            sub = await js.subscribe(
                subject="filenest.*.*.file.uploaded",
                durable=_CONSUMER_DURABLE,
                stream=settings.nats_stream_name,
                cb=_on_message,
                manual_ack=True,
            )
        except Exception as exc:
            logger.error("processing_worker.subscribe_failed", error=str(exc))
            return

        logger.info("processing_worker.started", consumer=_CONSUMER_DURABLE)

        try:
            while True:
                await asyncio.sleep(5)
                tasks = {t for t in tasks if not t.done()}
        except asyncio.CancelledError:
            logger.info("processing_worker.stopping")
            await sub.unsubscribe()
            if tasks:
                await asyncio.gather(*tasks, return_exceptions=True)

    async def _handle(self, msg) -> None:
        """Process one NATS message under the concurrency semaphore."""
        async with self._semaphore:
            try:
                payload = json.loads(msg.data.decode())
                file_id: str = payload["file_id"]

                # Subject format: filenest.<org_id>.<project_id>.file.uploaded
                parts = msg.subject.split(".")
                organization_id = parts[1]
                project_id = parts[2]

                logger.info(
                    "processing_worker.received",
                    file_id=file_id,
                    organization_id=organization_id,
                    project_id=project_id,
                )

                await self._executor.run(file_id, organization_id, project_id)
                await msg.ack()

                logger.info(
                    "processing_worker.processed",
                    file_id=file_id,
                    organization_id=organization_id,
                    project_id=project_id,
                )
            except Exception as exc:
                logger.error(
                    "processing_worker.handle_error",
                    subject=msg.subject,
                    error=str(exc),
                )
                try:
                    await msg.nak()
                except Exception:
                    pass
