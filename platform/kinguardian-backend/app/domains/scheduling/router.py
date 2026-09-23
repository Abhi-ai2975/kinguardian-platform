from typing import List, Dict, Any, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.domains.family.infrastructure.models import AppProfile
from app.domains.scheduling.base import JobResult, JobStatus
from app.domains.scheduling.scheduler import global_job_scheduler, JobScheduler

router = APIRouter(prefix="/scheduling", tags=["Job Scheduling & Background Workers"])


class ScheduledJobInfo(BaseModel):
    job_id: str
    name: str
    description: str
    interval_seconds: int
    current_status: JobStatus
    last_run_at: Optional[datetime] = None
    last_duration_ms: Optional[float] = None
    last_success: Optional[bool] = None


@router.get("/jobs", response_model=List[ScheduledJobInfo])
async def list_scheduled_jobs(
    current_user: AppProfile = Depends(get_current_user)
):
    """
    Lists all registered background jobs in the worker scheduler.
    """
    jobs = global_job_scheduler.list_jobs()
    return [
        ScheduledJobInfo(
            job_id=j.job_id,
            name=j.name,
            description=j.description,
            interval_seconds=j.interval_seconds,
            current_status=j.current_status,
            last_run_at=j.last_run_at,
            last_duration_ms=j.last_result.duration_ms if j.last_result else None,
            last_success=j.last_result.success if j.last_result else None
        )
        for j in jobs
    ]


@router.post("/jobs/{job_id}/run", response_model=JobResult)
async def run_scheduled_job(
    job_id: str,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Triggers immediate on-demand execution of a scheduled worker job.
    """
    try:
        return await global_job_scheduler.run_job(job_id, db_session)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/jobs/run-all", response_model=List[JobResult])
async def run_all_scheduled_jobs(
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Triggers execution of all 7 scheduled background jobs.
    """
    return await global_job_scheduler.run_all(db_session)
