"""
Data Ownership & Single Source of Truth Tests.

Validates that every field has a clear, authoritative owner:
1. Medication dose -> FHIR (KinGuardian holds only external pointer)
2. Medication adherence -> KinGuardian (MedicationAdherenceEvent)
3. Parent relationship -> KinGuardian (CareSubject, FamilyMembership, CareRelationship)
4. Patient identity -> FHIR + identity linkage (care_subjects.fhir_patient_id)
5. File binary -> FileNest (health_documents.filenest_file_id, no raw bytes in DB)
6. AI session -> bezs-agent (ai_conversations.agent_session_id)
7. AI insight application metadata -> KinGuardian (AIInsight, AIAction, CareTask)
"""

import pytest
import uuid
from app.core.architecture.data_ownership import (
    DataOwnershipRegistry,
    SystemOfRecord,
    DATA_OWNERSHIP_CATALOG
)
from app.domains.family.infrastructure.models import (
    CareSubject,
    CareRelationship,
    FamilyMembership,
    MedicationAdherenceEvent,
    HealthDocument,
    AIConversation,
    AIInsight,
    CareTask
)


def test_data_ownership_registry_integrity():
    """
    Verifies that all required domain concepts are registered with their authoritative System of Record.
    """
    assert DataOwnershipRegistry.get_owner_for_concept("Medication Prescriptions") == SystemOfRecord.FHIR_EMR
    assert DataOwnershipRegistry.get_owner_for_concept("Medication Adherence") == SystemOfRecord.KINGUARDIAN
    assert DataOwnershipRegistry.get_owner_for_concept("Parent & Care Circle") == SystemOfRecord.KINGUARDIAN
    assert DataOwnershipRegistry.get_owner_for_concept("Patient Demographics") == SystemOfRecord.FHIR_EMR
    assert DataOwnershipRegistry.get_owner_for_concept("File Binary Storage") == SystemOfRecord.FILENEST
    assert DataOwnershipRegistry.get_owner_for_concept("AI Conversational Session") == SystemOfRecord.BEZS_AGENT
    assert DataOwnershipRegistry.get_owner_for_concept("AI Insight Application Metadata") == SystemOfRecord.KINGUARDIAN


def test_kinguardian_schema_adheres_to_data_ownership_rules():
    """
    Verifies that KinGuardian database models only store pointers/metadata for external resources,
    and are authoritative only for their own domain concepts.
    """
    # 1. Medication dose: KinGuardian models hold ONLY the FHIR pointer, NOT duplicate dose records
    assert hasattr(MedicationAdherenceEvent, "fhir_medication_request_id")
    assert not hasattr(MedicationAdherenceEvent, "active_prescription_catalog")

    # 2. Medication adherence: KinGuardian holds full authoritative adherence lifecycle
    assert hasattr(MedicationAdherenceEvent, "status")
    assert hasattr(MedicationAdherenceEvent, "confirmed_at")

    # 3. Parent relationship: KinGuardian holds full hierarchy
    assert hasattr(CareSubject, "family_id")
    assert hasattr(CareSubject, "relationship_to_coordinator")
    assert hasattr(CareRelationship, "relationship_type")
    assert hasattr(FamilyMembership, "membership_role")

    # 4. Patient identity: KinGuardian holds linkage pointer to FHIR Patient
    assert hasattr(CareSubject, "fhir_patient_id")

    # 5. File binary: KinGuardian holds FileNest reference, NEVER binary blob columns
    assert hasattr(HealthDocument, "filenest_file_id")
    assert not hasattr(HealthDocument, "binary_content")
    assert not hasattr(HealthDocument, "raw_bytes")

    # 6. AI session: KinGuardian holds external agent session linkage
    assert hasattr(AIConversation, "agent_session_id")
    assert not hasattr(AIConversation, "internal_llm_scratchpad")

    # 7. AI insight application metadata: KinGuardian holds full human-in-the-loop lifecycle
    assert hasattr(AIInsight, "status")
    assert hasattr(AIInsight, "severity")
    assert hasattr(CareTask, "priority")
    assert hasattr(CareTask, "status")
