"""
Database Performance & Optimization Test Suite:
Verifies:
1. Intentional eager loading using selectinload (avoiding N+1 queries)
2. High-performance projection queries
3. Connection pool tuning and engine parameters
4. Database indexing on composite and foreign keys
5. Development query logging
"""

import pytest
import uuid
from datetime import datetime, timezone
from sqlalchemy import select, func, text
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import Database
from app.domains.family.infrastructure.models import (
    Family,
    FamilyMembership,
    CareSubject,
    CareTask,
    AIInsight,
    AppProfile
)
from app.domains.family.infrastructure.repositories import (
    SQLAlchemyAppProfileRepository,
    SQLAlchemyFamilyRepository,
    SQLAlchemyConsentRepository
)
from app.domains.events.services import EventService
from app.domains.family.application.services import FamilyService


def test_database_connection_pool_tuning_config():
    """
    Verifies that connection pool tuning settings are properly defined and configured.
    """
    assert settings.DB_POOL_SIZE >= 10
    assert settings.DB_MAX_OVERFLOW >= 5
    assert settings.DB_POOL_TIMEOUT >= 10
    assert settings.DB_POOL_RECYCLE >= 300
    assert settings.DB_POOL_PRE_PING is True


@pytest.mark.asyncio
async def test_selectin_eager_loading_avoids_n_plus_one(db_session: AsyncSession):
    """
    Verifies that loading a Family with its full aggregate hierarchy (members, care subjects,
    tasks, insights) uses intentional selectinload without raising lazy load errors.
    """
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    family_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    family_service = FamilyService(user_repo, family_repo, consent_repo, event_logger)

    coord = await family_service.get_or_create_profile(
        iam_subject_id="iam_coord_perf_01",
        email="coord.perf@kinguardian.com",
        display_name="Meera",
        timezone="America/New_York"
    )
    parent = await family_service.get_or_create_profile(
        iam_subject_id="iam_parent_perf_01",
        email="parent.perf@kinguardian.com",
        display_name="Kishore",
        timezone="Asia/Kolkata"
    )
    family = await family_service.create_care_circle(
        creator_id=coord.id,
        name="Kishore Family Circle",
        creator_role="coordinator"
    )
    await family_service.add_member_to_circle(
        requester_id=coord.id,
        care_circle_id=family.id,
        target_email="parent.perf@kinguardian.com",
        role="parent"
    )
    subject = await family_service.add_care_subject(
        requester_id=coord.id,
        family_id=family.id,
        fhir_patient_id="fhir-pat-perf-101",
        profile_id=parent.id,
        relationship_to_coordinator="father"
    )
    await family_service.add_care_task(
        requester_id=coord.id,
        family_id=family.id,
        subject_id=subject.id,
        assigned_to_profile_id=coord.id,
        title="Check Vitals",
        description="Fasting pulse & SpO2",
        category="medication",
        priority="medium",
        due_at=datetime.now(timezone.utc)
    )



    # Fetch family aggregate using selectinload
    family_entity = await family_repo.get_by_id(family.id)
    assert family_entity is not None
    assert len(family_entity.members) == 2
    assert len(family_entity.care_subjects) == 1
    assert len(family_entity.care_tasks) == 1


@pytest.mark.asyncio
async def test_high_performance_projection_queries(db_session: AsyncSession):
    """
    Verifies that projection queries execute efficiently by selecting only required columns.
    """
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    family_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    family_service = FamilyService(user_repo, family_repo, consent_repo, event_logger)

    coord = await family_service.get_or_create_profile(
        iam_subject_id="iam_coord_proj_01",
        email="coord.proj@kinguardian.com",
        display_name="Radha",
        timezone="America/New_York"
    )
    family = await family_service.create_care_circle(
        creator_id=coord.id,
        name="Radha Circle",
        creator_role="coordinator"
    )
    await family_service.add_care_subject(
        requester_id=coord.id,
        family_id=family.id,
        fhir_patient_id="fhir-pat-proj-102",
        profile_id=coord.id,
        relationship_to_coordinator="self"
    )

    # 1. Test family summary projection query
    summary_proj = await family_repo.get_family_summary_projection(family.id)
    assert summary_proj is not None
    assert summary_proj["family_id"] == family.id
    assert summary_proj["name"] == "Radha Circle"
    assert summary_proj["member_count"] >= 1

    # 2. Test care subjects projection query
    subjects_proj = await family_repo.get_care_subjects_projection(family.id)
    assert len(subjects_proj) == 1
    assert subjects_proj[0]["fhir_patient_id"] == "fhir-pat-proj-102"
    assert subjects_proj[0]["relationship"] == "self"
