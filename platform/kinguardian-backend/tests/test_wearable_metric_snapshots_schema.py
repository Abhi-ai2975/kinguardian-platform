"""
Wearable Metric Snapshots Database Schema & Index Verification Test Suite.

Verifies the PostgreSQL schema for local analytics projections:
Table: wearable_metric_snapshots
- id UUID PK
- subject_id UUID
- metric_type VARCHAR
- measured_at TIMESTAMPTZ
- value NUMERIC
- unit VARCHAR
- provider VARCHAR
- device VARCHAR
- source_reference VARCHAR
- created_at TIMESTAMPTZ

Indexes:
- (subject_id, metric_type, measured_at DESC)
- (subject_id, measured_at DESC)
"""

import uuid
from datetime import datetime, timezone
import pytest
from sqlalchemy import create_engine, select, text, inspect
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.domains.family.infrastructure.models import (
    Family,
    CareSubject,
    AppProfile,
    WearableMetricSnapshot
)


def test_wearable_metric_snapshots_table_structure_and_indexes():
    """
    Verifies that wearable_metric_snapshots table defines all required columns and indexes.
    """
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)

    inspector = inspect(engine)
    columns = {col["name"]: col for col in inspector.get_columns("wearable_metric_snapshots")}

    # Verify columns
    assert "id" in columns
    assert "subject_id" in columns
    assert "metric_type" in columns
    assert "measured_at" in columns
    assert "value" in columns
    assert "unit" in columns
    assert "provider" in columns
    assert "device" in columns
    assert "source_reference" in columns
    assert "created_at" in columns

    # Verify table args and indexes defined on model
    index_names = {idx.name for idx in WearableMetricSnapshot.__table__.indexes}
    assert "ix_wearable_snapshots_subj_type_meas" in index_names
    assert "ix_wearable_snapshots_subj_meas" in index_names


def test_wearable_metric_snapshot_crud_and_relationship():
    """
    Verifies persistence of a local analytics snapshot linked to CareSubject.
    """
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    # 1. Setup Family & CareSubject
    fam_id = uuid.uuid4()
    profile_id = uuid.uuid4()
    subject_id = uuid.uuid4()

    prof = AppProfile(
        id=profile_id,
        iam_subject_id=f"auth0|{uuid.uuid4()}",
        email="dad@kinguardian.test",
        display_name="Dad In Chennai"
    )
    session.add(prof)

    fam = Family(id=fam_id, name="Chennai Family")
    session.add(fam)

    subj = CareSubject(
        id=subject_id,
        family_id=fam_id,
        profile_id=profile_id,
        fhir_patient_id="Patient/dad-123",
        relationship_to_coordinator="Father"
    )
    session.add(subj)
    session.commit()

    # 2. Insert Snapshots
    now = datetime(2026, 8, 27, 10, 0, 0, tzinfo=timezone.utc)
    snap1 = WearableMetricSnapshot(
        id=uuid.uuid4(),
        subject_id=subject_id,
        metric_type="steps",
        measured_at=now,
        value=6200.0,
        unit="steps",
        provider="garmin",
        device="Garmin Venu 3",
        source_reference="garmin:daily_summary:20260827"
    )

    snap2 = WearableMetricSnapshot(
        id=uuid.uuid4(),
        subject_id=subject_id,
        metric_type="resting_heart_rate",
        measured_at=now,
        value=58.0,
        unit="bpm",
        provider="oura",
        device="Oura Ring Gen 3",
        source_reference="oura:sleep_session:20260827"
    )

    session.add_all([snap1, snap2])
    session.commit()

    # 3. Query via CareSubject relationship
    loaded_subj = session.get(CareSubject, subject_id)
    assert loaded_subj is not None
    assert len(loaded_subj.wearable_snapshots) == 2

    # Query steps specifically
    steps_snap = session.execute(
        select(WearableMetricSnapshot)
        .where(
            WearableMetricSnapshot.subject_id == subject_id,
            WearableMetricSnapshot.metric_type == "steps"
        )
    ).scalar_one()

    assert float(steps_snap.value) == 6200.0
    assert steps_snap.provider == "garmin"
    assert steps_snap.device == "Garmin Venu 3"
    assert steps_snap.source_reference == "garmin:daily_summary:20260827"

    session.close()
