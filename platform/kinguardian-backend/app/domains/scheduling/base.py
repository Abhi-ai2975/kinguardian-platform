import abc
import uuid
import time
from typing import Dict, Any, Optional
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger

logger = get_logger(__name__)


class JobStatus(str, Enum):
    IDLE = "idle"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class JobResult(BaseModel):
    job_id: str
    job_name: str
    success: bool
    records_processed: int = 0
    error: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    duration_ms: float = 0.0
    executed_at: datetime = Field(default_factory=datetime.now)


class BaseScheduledJob(abc.ABC):
    """
    Abstract Job Scheduling Abstraction.
    Every recurring background job implements this contract to ensure reliable worker execution.
    """
    job_id: str
    name: str
    description: str
    interval_seconds: int = 300  # Default 5 minutes

    def __init__(self):
        self.last_run_at: Optional[datetime] = None
        self.last_result: Optional[JobResult] = None
        self.current_status: JobStatus = JobStatus.IDLE

    @abc.abstractmethod
    async def run(self, session: AsyncSession) -> JobResult:
        """Core execution logic performed inside a scoped database session."""
        pass

    async def execute(self, session: AsyncSession) -> JobResult:
        """
        Executes the job, records metrics, error logs, and execution duration.
        """
        start = time.perf_counter()
        self.current_status = JobStatus.RUNNING
        logger.info(f"[ScheduledJob:{self.job_id}] Starting execution: '{self.name}'")

        try:
            result = await self.run(session)
            duration_ms = (time.perf_counter() - start) * 1000
            result.duration_ms = round(duration_ms, 2)
            self.last_result = result
            self.last_run_at = datetime.now()
            self.current_status = JobStatus.COMPLETED if result.success else JobStatus.FAILED
            logger.info(
                f"[ScheduledJob:{self.job_id}] Completed in {result.duration_ms}ms. "
                f"Processed: {result.records_processed}, Success: {result.success}"
            )
            return result
        except Exception as e:
            duration_ms = (time.perf_counter() - start) * 1000
            logger.error(f"[ScheduledJob:{self.job_id}] Execution failed: {e}", exc_info=True)
            result = JobResult(
                job_id=self.job_id,
                job_name=self.name,
                success=False,
                error=str(e),
                duration_ms=round(duration_ms, 2)
            )
            self.last_result = result
            self.last_run_at = datetime.now()
            self.current_status = JobStatus.FAILED
            return result
