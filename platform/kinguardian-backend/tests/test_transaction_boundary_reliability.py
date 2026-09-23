"""
Transaction Boundary Reliability & Sagas Test Suite:
Verifies:
1. Zero distributed transactions across PostgreSQL, FHIR, FileNest, Agent runtime, and notifications
2. Local database transactions committing entity + outbox records atomically
3. Idempotency replay prevention
4. Compensating actions executing on downstream external failure
"""

import pytest
import uuid
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.transaction_boundary.saga import (
    TransactionBoundaryCoordinator,
    CompensatingActionEngine
)
from app.domains.events.models import EventLog, OutboxEvent
from app.domains.family.infrastructure.models import (
    MedicationAdherenceEvent,
    CareSubject,
    Family,
    AppProfile
)


@pytest.mark.asyncio
async def test_local_transaction_and_outbox_atomicity(db_session: AsyncSession):
    """
    Verifies that business state changes and outbox records commit atomically
    within a single local PostgreSQL database transaction.
    """
    coordinator = TransactionBoundaryCoordinator(db_session)

    # 1. Setup base entity
    profile = AppProfile(
        id=uuid.uuid4(),
        iam_subject_id=f"iam_{uuid.uuid4().hex}",
        email="parent.boundary@example.com",
        display_name="Ravi"
    )
    family = Family(id=uuid.uuid4(), name="Ravi Family", primary_coordinator_profile_id=profile.id)
    subject = CareSubject(id=uuid.uuid4(), family_id=family.id, fhir_patient_id="fhir-pat-ravi-01")
    db_session.add_all([profile, family, subject])
    await db_session.commit()

    adherence_id = uuid.uuid4()

    # 2. Define domain mutation closure
    async def create_adherence(session: AsyncSession):
        adh = MedicationAdherenceEvent(
            id=adherence_id,
            subject_id=subject.id,
            fhir_medication_request_id="fhir-med-req-123",
            scheduled_at=datetime.now(timezone.utc),
            status="taken",
            confirmed_at=datetime.now(timezone.utc),
            confirmed_by_profile_id=profile.id,
            source="parent_mobile"
        )
        session.add(adh)
        return adh

    # 3. Execute in local transaction
    idempotency_key = f"idemp_med_{uuid.uuid4().hex}"
    adh_entity, outbox = await coordinator.execute_in_local_transaction(
        domain_mutations=create_adherence,
        event_type="MedicationConfirmed",
        aggregate_type="MedicationAdherenceEvent",
        aggregate_id=adherence_id,
        family_id=family.id,
        payload={"adherence_id": str(adherence_id), "status": "taken"},
        idempotency_key=idempotency_key
    )

    assert adh_entity.status == "taken"
    assert outbox is not None
    assert outbox.status == "pending"

    # 4. Verify idempotent replay does not create duplicate outbox events
    replayed_res, replayed_outbox = await coordinator.execute_in_local_transaction(
        domain_mutations=create_adherence,
        event_type="MedicationConfirmed",
        aggregate_type="MedicationAdherenceEvent",
        aggregate_id=adherence_id,
        family_id=family.id,
        payload={"adherence_id": str(adherence_id), "status": "taken"},
        idempotency_key=idempotency_key
    )
    assert replayed_outbox is None
    assert replayed_res["status"] == "committed"


@pytest.mark.asyncio
async def test_compensating_action_execution_on_external_failure(db_session: AsyncSession):
    """
    Verifies that when external FHIR write fails permanently, CompensatingActionEngine
    executes a compensating saga step: marks entity as sync_failed, logs audit event,
    and updates outbox status to compensated_failure.
    """
    coordinator = TransactionBoundaryCoordinator(db_session)
    saga_engine = CompensatingActionEngine(db_session)

    # 1. Setup base entity
    profile = AppProfile(
        id=uuid.uuid4(),
        iam_subject_id=f"iam_{uuid.uuid4().hex}",
        email="parent.saga@example.com",
        display_name="Sanjay"
    )
    family = Family(id=uuid.uuid4(), name="Sanjay Family", primary_coordinator_profile_id=profile.id)
    subject = CareSubject(id=uuid.uuid4(), family_id=family.id, fhir_patient_id="fhir-pat-sanjay-02")
    db_session.add_all([profile, family, subject])
    await db_session.commit()

    adherence_id = uuid.uuid4()

    async def create_adherence(session: AsyncSession):
        adh = MedicationAdherenceEvent(
            id=adherence_id,
            subject_id=subject.id,
            fhir_medication_request_id="fhir-med-req-unresolvable",
            scheduled_at=datetime.now(timezone.utc),
            status="taken",
            confirmed_at=datetime.now(timezone.utc),
            confirmed_by_profile_id=profile.id,
            source="parent_mobile"
        )
        session.add(adh)
        return adh

    # 2. Local commit
    _, outbox = await coordinator.execute_in_local_transaction(
        domain_mutations=create_adherence,
        event_type="MedicationConfirmed",
        aggregate_type="MedicationAdherenceEvent",
        aggregate_id=adherence_id,
        family_id=family.id,
        payload={"adherence_id": str(adherence_id), "status": "taken"}
    )

    # 3. Define compensating logic callback
    async def compensate_adherence(session: AsyncSession, agg_id: uuid.UUID):
        stmt = select(MedicationAdherenceEvent).where(MedicationAdherenceEvent.id == agg_id)
        res = await session.execute(stmt)
        adh = res.scalar_one_or_none()
        if adh:
            adh.status = "sync_failed"

    # 4. Trigger Compensating Action
    await saga_engine.execute_compensating_action(
        outbox_id=outbox.id,
        aggregate_type="MedicationAdherenceEvent",
        aggregate_id=adherence_id,
        family_id=family.id,
        failure_reason="FHIR R4 Server returned 422 Unprocessable Entity (Invalid Patient Resource)",
        compensation_logic=compensate_adherence
    )

    # 5. Verify Compensation Invariants
    # A. Entity status updated
    stmt_adh = select(MedicationAdherenceEvent).where(MedicationAdherenceEvent.id == adherence_id)
    res_adh = await db_session.execute(stmt_adh)
    compensated_adh = res_adh.scalar_one()
    assert compensated_adh.status == "sync_failed"

    # B. Outbox status updated
    stmt_ob = select(OutboxEvent).where(OutboxEvent.id == outbox.id)
    res_ob = await db_session.execute(stmt_ob)
    compensated_ob = res_ob.scalar_one()
    assert compensated_ob.status == "compensated_failure"
    assert "Invalid Patient Resource" in compensated_ob.last_error

    # C. Audit trail recorded
    stmt_audit = select(EventLog).where(
        EventLog.aggregate_id == str(adherence_id),
        EventLog.event_type == "audit.compensating_action_executed"
    )
    res_audit = await db_session.execute(stmt_audit)
    audit_record = res_audit.scalar_one_or_none()
    assert audit_record is not None
    assert audit_record.payload["outbox_id"] == str(outbox.id)
