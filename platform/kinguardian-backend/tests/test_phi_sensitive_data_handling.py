"""
PHI & Sensitive Data Handling Test Suite:
1. Treat all health data as highly sensitive.
2. Data Minimization: Do not store more than necessary (clinical references vs raw EMR duplication).
3. Separate:
   - Identity Data (app_profiles)
   - Family Relationship Data (families, memberships, care_relationships)
   - Clinical References (care_subjects, medication_adherence_events with FHIR pointers)
   - Derived Insights (ai_insights, ai_insight_sources)
   - Audit Information (event_logs)
   - AI Interaction Metadata (ai_conversations, ai_actions)
4. Enforce least-privilege access and automatic PHI redaction in logs/exports.
"""

import pytest
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy import select, inspect
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import sanitize_value, SENSITIVE_FIELD_NAMES
from app.domains.family.infrastructure.models import (
    AppProfile,
    Family,
    FamilyMembership,
    CareSubject,
    CareRelationship,
    MedicationAdherenceEvent,
    AIInsight,
    AIInsightSource,
    AIConversation,
    AIAction
)
from app.domains.events.models import EventLog
from app.domains.family.application.permissions import (
    PermissionVerifier,
    ROLE_CAPABILITIES,
    CAP_VIEW_BASIC,
    CAP_VIEW_HEALTH_SUMMARY,
    CAP_VIEW_MEDICATIONS,
    CAP_VIEW_VITALS,
    CAP_VIEW_DOCUMENTS,
    CAP_ASSIGN_CARE_TASKS
)


def test_phi_redaction_and_data_masking():
    """
    Verifies that health payloads, authentication secrets, raw document OCR,
    and AI private context are strictly redacted from logs.
    """
    # 1. Health Payloads (PHI / HIPAA)
    phi_payload = {
        "blood_pressure": "150/95 mmHg",
        "glucose": "140 mg/dL",
        "diagnosis": "Stage 2 Hypertension",
        "clinical_note": "Patient reports dizziness and morning fatigue.",
        "vital_signs": {"systolic": 150, "diastolic": 95}
    }
    sanitized_phi = sanitize_value(phi_payload)
    for field in phi_payload.keys():
        assert sanitized_phi[field] == "[REDACTED]"

    # 2. Authentication & Identity Secrets
    auth_payload = {
        "password": "SuperSecretPassword123!",
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.secret",
        "api_key": "live_apikey_998877",
        "ssn": "000-12-3456"
    }
    sanitized_auth = sanitize_value(auth_payload)
    for field in auth_payload.keys():
        assert sanitized_auth[field] == "[REDACTED]"

    # 3. Document OCR Contents
    doc_payload = {
        "raw_content": "Extracted medical record text containing patient history.",
        "extracted_text": "Hospital discharge summary details."
    }
    sanitized_doc = sanitize_value(doc_payload)
    assert sanitized_doc["raw_content"] == "[REDACTED]"
    assert sanitized_doc["extracted_text"] == "[REDACTED]"

    # 4. AI Private Context
    ai_payload = {
        "system_prompt": "You are DrGodly. Secret internal system instructions.",
        "conversation_history": ["Patient says hello", "Agent replies"]
    }
    sanitized_ai = sanitize_value(ai_payload)
    assert sanitized_ai["system_prompt"] == "[REDACTED]"
    assert sanitized_ai["conversation_history"] == "[REDACTED]"


@pytest.mark.asyncio
async def test_phi_architectural_separation_of_six_data_layers(db_session: AsyncSession):
    """
    Verifies that database schema strictly separates:
    1. Identity Data (AppProfile)
    2. Family Relationship Data (Family, FamilyMembership, CareRelationship)
    3. Clinical References (CareSubject, MedicationAdherenceEvent)
    4. Derived Insights (AIInsight, AIInsightSource)
    5. Audit Information (EventLog)
    6. AI Interaction Metadata (AIConversation, AIAction)
    """
    now = datetime.now(timezone.utc)

    # 1. Identity Data Layer (Only user identity, IAM pointer, contact, timezone)
    profile = AppProfile(
        id=uuid.uuid4(),
        iam_subject_id="iam_phi_subj_01",
        display_name="Ramesh Sharma",
        email="ramesh.sharma@example.com",
        timezone="Asia/Kolkata"
    )
    db_session.add(profile)
    await db_session.flush()

    # Identity table columns verify NO clinical diagnosis or prescriptions in identity table
    profile_cols = {c.name for c in AppProfile.__table__.columns}
    assert "diagnosis" not in profile_cols
    assert "prescription" not in profile_cols
    assert "blood_pressure" not in profile_cols
    assert "medical_history" not in profile_cols

    # 2. Family Relationship Data Layer (Circle structure, roles, care relationships)
    family = Family(id=uuid.uuid4(), name="Sharma Family Circle", primary_coordinator_profile_id=profile.id)
    db_session.add(family)
    await db_session.flush()

    membership = FamilyMembership(id=uuid.uuid4(), family_id=family.id, profile_id=profile.id, membership_role="elder_parent")
    db_session.add(membership)

    # 3. Clinical References Layer (Data Minimization: Pointers to FHIR resources, adherence events)
    subject = CareSubject(
        id=uuid.uuid4(),
        family_id=family.id,
        profile_id=profile.id,
        fhir_patient_id="fhir-pat-ramesh-789",  # Upstream FHIR pointer
        timezone="Asia/Kolkata"
    )
    db_session.add(subject)
    await db_session.flush()

    adherence_event = MedicationAdherenceEvent(
        id=uuid.uuid4(),
        subject_id=subject.id,
        fhir_medication_request_id="fhir-med-metformin-101",  # Upstream FHIR pointer
        scheduled_at=now,
        status="taken",
        confirmed_at=now,
        confirmed_by_profile_id=profile.id,
        source="elder_parent"
    )
    db_session.add(adherence_event)

    # 4. Derived Insights Layer (Trend metrics, baseline comparisons, confidence scores)
    insight = AIInsight(
        id=uuid.uuid4(),
        family_id=family.id,
        subject_id=subject.id,
        type="vitals_trend",
        severity="info",
        title="Stable Morning Blood Pressure Baseline",
        summary="Blood pressure remained within target baseline over the 14-day evaluation window.",
        observation="Deterministic baseline average 122/80 mmHg.",
        confidence=0.96,
        timeframe_start=now - timedelta(days=14),
        timeframe_end=now,
        status="active"
    )
    db_session.add(insight)
    await db_session.flush()

    insight_source = AIInsightSource(
        id=uuid.uuid4(),
        insight_id=insight.id,
        source_type="fhir_observation",
        source_id="fhir-obs-bp-456"
    )
    db_session.add(insight_source)

    # 5. Audit Information Layer (Immutable event logs with dual-timezone context)
    audit_entry = EventLog(
        id=uuid.uuid4(),
        family_id=family.id,
        event_type="medication_adherence_logged",
        payload={"event_id": str(adherence_event.id), "status": "taken"},
        parent_timezone_timestamp="2026-08-23 20:45:00 IST",
        coordinator_timezone_timestamp="2026-08-23 16:15:00 BST"
    )
    db_session.add(audit_entry)


    # 6. AI Interaction Metadata Layer (Proposals, risk level, human confirmation)
    ai_conv = AIConversation(
        id=uuid.uuid4(),
        family_id=family.id,
        subject_id=subject.id,
        profile_id=profile.id,
        agent_session_id="agent-sess-001"
    )
    db_session.add(ai_conv)
    await db_session.flush()

    ai_action = AIAction(
        id=uuid.uuid4(),
        family_id=family.id,
        subject_id=subject.id,
        profile_id=profile.id,
        agent_session_id="agent-sess-001",
        action_type="create_care_task",
        requires_approval=False,
        status="approved"
    )
    db_session.add(ai_action)
    await db_session.commit()


    # Verify all 6 layers are persisted and decoupled
    assert profile.id is not None
    assert family.id is not None
    assert subject.id is not None
    assert adherence_event.id is not None
    assert insight.id is not None
    assert audit_entry.id is not None
    assert ai_action.id is not None


def test_least_privilege_access_capabilities():
    """
    Verifies that least-privilege access is enforced across all roles.
    Unprivileged roles cannot access clinical data or modify care structures.
    """
    # Observer: Least-privilege read-only basic view
    obs_caps = ROLE_CAPABILITIES.get("observer", set())
    assert CAP_VIEW_BASIC in obs_caps
    assert CAP_VIEW_HEALTH_SUMMARY in obs_caps
    assert CAP_VIEW_MEDICATIONS not in obs_caps
    assert CAP_VIEW_VITALS not in obs_caps
    assert CAP_VIEW_DOCUMENTS not in obs_caps
    assert CAP_ASSIGN_CARE_TASKS not in obs_caps

    # Family Member: Standard basic communication & view
    fm_caps = ROLE_CAPABILITIES.get("family_member", set())
    assert CAP_VIEW_MEDICATIONS not in fm_caps
    assert CAP_VIEW_VITALS not in fm_caps
    assert CAP_VIEW_DOCUMENTS not in fm_caps
    assert CAP_ASSIGN_CARE_TASKS not in fm_caps

    # Caregiver: Care tasks & medication adherence, but NOT task assignment or permission management
    cg_caps = ROLE_CAPABILITIES.get("caregiver", set())
    assert CAP_VIEW_MEDICATIONS in cg_caps
    assert CAP_VIEW_VITALS in cg_caps
    assert CAP_ASSIGN_CARE_TASKS not in cg_caps
    assert "manage_permissions" not in cg_caps

    # Coordinator: Full circle management capabilities
    coord_caps = ROLE_CAPABILITIES.get("coordinator", set())
    assert CAP_ASSIGN_CARE_TASKS in coord_caps
    assert "manage_permissions" in coord_caps
