"""
DrGodly / KinGuardian Background Worker.
Orchestrates asynchronous cron/periodic jobs including:
- Transactional outbox publishing
- Medication, appointment, and checkin reminders
- Guardian trend evaluations and AI insights
- Notification and document processing retries
"""

import asyncio
import signal
import sys
from app.core.database import db
from app.core.logging import get_logger
from app.domains.scheduling.scheduler import JobScheduler

logger = get_logger(__name__)


class WorkerRunner:
    def __init__(self, poll_interval_seconds: int = 10):
        self.poll_interval_seconds = poll_interval_seconds
        self.scheduler = JobScheduler()
        self._running = False

    async def start(self):
        self._running = True
        logger.info(
            "DrGodly Background Worker started",
            extra={"registered_jobs": [j.job_id for j in self.scheduler.list_jobs()]}
        )

        while self._running:
            try:
                async with db.session() as session:
                    results = await self.scheduler.run_all(session)
                    for res in results:
                        if res.success:
                            logger.info(
                                f"Worker completed job '{res.job_id}'",
                                extra={"job_id": res.job_id, "processed_count": res.processed_count}
                            )
                        else:
                            logger.error(
                                f"Worker job '{res.job_id}' failed: {res.error}",
                                extra={"job_id": res.job_id, "error": res.error}
                            )
            except Exception as e:
                logger.error(f"Worker iteration encountered error: {e}")

            try:
                await asyncio.sleep(self.poll_interval_seconds)
            except asyncio.CancelledError:
                break

    def stop(self):
        logger.info("Stopping DrGodly Background Worker...")
        self._running = False


async def main():
    runner = WorkerRunner()

    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, runner.stop)
        except NotImplementedError:
            # Signal handlers not fully supported on Windows event loops
            pass

    try:
        await runner.start()
    except (KeyboardInterrupt, SystemExit):
        runner.stop()


if __name__ == "__main__":
    asyncio.run(main())
