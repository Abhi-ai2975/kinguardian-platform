"""
Workers layer — RetentionScheduler.

A periodic background job (not a Redis stream consumer) that runs a full
data retention pass once every 24 hours. It sleeps between runs rather than
blocking on a queue.

Unlike BaseWorker, RetentionScheduler does not consume a Redis stream — it
wakes up on a timer, calls PurgeExpiredEventsUseCase, then sleeps again.
This separation keeps the hot-path stream workers isolated from the slow,
batch-oriented retention mutations.
"""

from __future__ import annotations

import logging
import time

from src.usecases.purge_expired_events import PurgeExpiredEventsUseCase

logger = logging.getLogger(__name__)

# How long to sleep between retention passes (seconds).
# Default is 24 hours. Exposed here so tests can override via subclass.
_DEFAULT_INTERVAL_SECONDS = 24 * 60 * 60


class RetentionScheduler:
    """
    Runs PurgeExpiredEventsUseCase on a fixed interval.

    Intended to run in its own daemon thread. If the use case raises an
    unhandled exception, it is logged and the scheduler sleeps before retrying
    on the next interval — a single crash does not take down the process.
    """

    def __init__(
        self,
        use_case: PurgeExpiredEventsUseCase,
        interval_seconds: int = _DEFAULT_INTERVAL_SECONDS,
    ) -> None:
        """
        Args:
            use_case: The purge use case to execute each interval.
            interval_seconds: Seconds to sleep between passes. Defaults to 86400 (24h).
        """
        self._use_case = use_case
        self._interval = interval_seconds

    def run(self) -> None:
        """
        Starts the scheduler loop. Blocks forever (intended to run in a daemon thread).

        Runs the first pass immediately on startup so that retention is
        enforced as soon as the process comes up, rather than waiting a full
        24 hours for the first pass.
        """
        logger.info("retention-scheduler: starting (interval=%ds)", self._interval)

        while True:
            try:
                self._use_case.execute()
            except Exception as exc:
                logger.exception("retention-scheduler: unexpected error during pass: %s", exc)

            logger.info("retention-scheduler: sleeping %ds until next pass", self._interval)
            time.sleep(self._interval)
