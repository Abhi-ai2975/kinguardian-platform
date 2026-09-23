"""
Unit of Work Tests for KinGuardian.

Validates:
1. Atomic multi-repository mutations within a single transaction.
2. Rollback on exception ensuring zero partial state persistence.
3. Access to repository instances via UoW context manager.
"""

import pytest
import uuid
from app.domains.family.infrastructure.unit_of_work import SQLAlchemyUnitOfWork


@pytest.mark.asyncio
async def test_unit_of_work_commit_success(db_session):
    """
    Verifies that mutations across multiple repositories commit atomically via UoW.
    """
    uow = SQLAlchemyUnitOfWork(session=db_session)
    test_email = f"uow_test_{uuid.uuid4().hex[:8]}@example.com"

    async with uow:
        profile = await uow.profiles.create(
            iam_subject_id=f"iam|{uuid.uuid4()}",
            email=test_email,
            display_name="UoW Test User",
            timezone="UTC"
        )
        assert profile.id is not None

        family = await uow.families.create(
            name="UoW Test Family",
            primary_coordinator_profile_id=profile.id
        )
        assert family.id is not None
        await uow.commit()

    # Verify persistence after commit
    fetched_profile = await uow.profiles.get_by_email(test_email)
    assert fetched_profile is not None
    assert fetched_profile.id == profile.id


@pytest.mark.asyncio
async def test_unit_of_work_rollback_on_error(db_session):
    """
    Verifies that uncommitted mutations are rolled back automatically when an error occurs.
    """
    uow = SQLAlchemyUnitOfWork(session=db_session)
    test_email = f"rollback_test_{uuid.uuid4().hex[:8]}@example.com"

    with pytest.raises(ValueError, match="Simulated failure"):
        async with uow:
            await uow.profiles.create(
                iam_subject_id=f"iam|{uuid.uuid4()}",
                email=test_email,
                display_name="Should Rollback",
                timezone="UTC"
            )
            # Deliberate exception before commit
            raise ValueError("Simulated failure")

    # Verify profile was rolled back
    fetched_profile = await uow.profiles.get_by_email(test_email)
    assert fetched_profile is None
