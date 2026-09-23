"""
Workers layer — BaseWorker.

Implements the shared consume loop that all worker types inherit.
Each concrete worker (AuditWorker, LogWorker, etc.) only needs to define
its stream topic — the loop logic lives here once.

This is the transport-layer equivalent from clean architecture: it knows
about the infrastructure (Redis consumer, use case) but contains no
business logic itself.
"""

from __future__ import annotations

import logging
import time

from src.adapters.redis_adapter.consumer import RedisStreamConsumer
from src.usecases.process_batch import ProcessBatchUseCase

logger = logging.getLogger(__name__)

# How long to sleep (seconds) after an unexpected error before retrying.
# Prevents a tight error loop from hammering a broken Redis/ClickHouse.
_ERROR_SLEEP_SECONDS = 1


class BaseWorker:
    """
    Shared consume loop for all worker types.

    Subclasses define stream_topic and group_name.
    The loop:
      1. Claims any pending (unACK'd) messages from a previous crash
      2. Reads a new batch from the stream
      3. Calls the use case to process + store + ACK
      4. Repeats forever

    On any exception: logs the error, sleeps briefly, then retries.
    The message stays pending in Redis so it won't be lost.
    """

    # Subclasses must override these
    stream_topic: str = ""
    group_name: str = ""

    def __init__(
        self,
        consumer: RedisStreamConsumer,
        use_case: ProcessBatchUseCase,
        batch_size: int = 100,
        block_ms: int = 2000,
    ) -> None:
        """
        Args:
            consumer: The Redis Streams consumer for this worker's topic.
            use_case: The ProcessBatch use case — handles parsing, storing, ACK.
            batch_size: Max events to read per loop iteration.
            block_ms: Milliseconds to block on XREADGROUP when stream is empty.
        """
        self._consumer = consumer
        self._use_case = use_case
        self._batch_size = batch_size
        self._block_ms = block_ms

    def run(self) -> None:
        """
        Starts the consume loop. Blocks forever (intended to run in its own thread).

        On startup, first claims any pending messages from a previous crash,
        then enters the main read → process → ACK loop.
        """
        logger.info("worker[%s]: starting on %s", self.__class__.__name__, self.stream_topic)

        # Recover pending messages from any previous crash before reading new ones.
        # 30_000ms idle threshold — claim messages pending for over 30 seconds.
        self._recover_pending(min_idle_ms=30_000)

        while True:
            try:
                self._tick()
            except Exception as exc:
                # Log the full traceback so we can debug without losing context.
                logger.exception(
                    "worker[%s]: unexpected error: %s",
                    self.__class__.__name__,
                    exc,
                )
                time.sleep(_ERROR_SLEEP_SECONDS)

    def _tick(self) -> None:
        """
        Single loop iteration: read → process → (ACK is handled by use case).
        """
        messages = self._consumer.read_batch(
            batch_size=self._batch_size,
            block_ms=self._block_ms,
        )

        if not messages:
            # Stream was empty during the block window — just loop again.
            return

        result = self._use_case.execute(self._consumer, messages)

        logger.info(
            "worker[%s]: processed batch — stored=%d skipped=%d",
            self.__class__.__name__,
            result.stored,
            result.skipped,
        )

    def _recover_pending(self, min_idle_ms: int) -> None:
        """
        Processes any messages left pending from a previous crash.
        Runs once at startup before entering the main loop.
        """
        logger.info("worker[%s]: checking for pending messages...", self.__class__.__name__)

        pending = self._consumer.claim_pending(
            batch_size=self._batch_size,
            min_idle_ms=min_idle_ms,
        )

        if not pending:
            logger.info("worker[%s]: no pending messages found", self.__class__.__name__)
            return

        logger.info(
            "worker[%s]: recovering %d pending messages",
            self.__class__.__name__,
            len(pending),
        )
        self._use_case.execute(self._consumer, pending)
