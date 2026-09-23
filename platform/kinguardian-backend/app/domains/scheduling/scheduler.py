from typing import Dict, List, Optional, Type
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.domains.scheduling.base import BaseScheduledJob, JobResult
from app.domains.scheduling.jobs import (
    MedicationReminderJob,
    AppointmentReminderJob,
    CheckinReminderJob,
    GuardianTrendEvaluationJob,
    NotificationRetryJob,
    DocumentProcessingRetryJob,
    OutboxPublishingJob
)

logger = get_logger(__name__)


class JobScheduler:
    """
    Job Scheduler Abstraction:
    Manages and orchestrates recurring jobs in a reliable worker architecture.
    """
    DEFAULT_JOB_CLASSES: List[Type[BaseScheduledJob]] = [
        MedicationReminderJob,
        AppointmentReminderJob,
        CheckinReminderJob,
        GuardianTrendEvaluationJob,
        NotificationRetryJob,
        DocumentProcessingRetryJob,
        OutboxPublishingJob
    ]

    def __init__(self, jobs: Optional[List[BaseScheduledJob]] = None):
        self._jobs: Dict[str, BaseScheduledJob] = {}
        initial_jobs = jobs or [cls() for cls in self.DEFAULT_JOB_CLASSES]
        for job in initial_jobs:
            self._jobs[job.job_id] = job

    def register_job(self, job: BaseScheduledJob) -> None:
        self._jobs[job.job_id] = job

    def get_job(self, job_id: str) -> Optional[BaseScheduledJob]:
        return self._jobs.get(job_id)

    def list_jobs(self) -> List[BaseScheduledJob]:
        return list(self._jobs.values())

    async def run_job(self, job_id: str, session: AsyncSession) -> JobResult:
        """Runs a single job on-demand."""
        job = self.get_job(job_id)
        if not job:
            raise ValueError(f"Job '{job_id}' is not registered in the JobScheduler.")
        return await job.execute(session)

    async def run_all(self, session: AsyncSession) -> List[JobResult]:
        """Runs all registered scheduled jobs in sequence."""
        results: List[JobResult] = []
        for job in self._jobs.values():
            res = await job.execute(session)
            results.append(res)
        return results


# Global Default Singleton Instance
global_job_scheduler = JobScheduler()
