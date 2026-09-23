"""
Data Ownership & System of Record (SoR) Architecture.
Defines authoritative domain data boundaries to strictly prevent duplicate sources of truth.
"""

from enum import Enum
from typing import Dict, List, Optional
from dataclasses import dataclass


class SystemOfRecord(str, Enum):
    """Authoritative Systems of Record."""
    FHIR_EMR = "FHIR / EMR"
    KINGUARDIAN = "KinGuardian Platform"
    KINGUARD = KINGUARDIAN  # Alias for backward compatibility
    FILENEST = "FileNest WORM Storage"
    BEZS_AGENT = "bezs-agent AI Orchestrator"
    IAM = "IAM Identity Provider"


@dataclass(frozen=True)
class DataFieldOwnership:
    domain_concept: str
    owner_system: SystemOfRecord
    field_or_resource: str
    kinguardian_representation: str
    anti_duplication_rule: str


DATA_OWNERSHIP_CATALOG: List[DataFieldOwnership] = [
    DataFieldOwnership(
        domain_concept="Medication Prescriptions & Dosage",
        owner_system=SystemOfRecord.FHIR_EMR,
        field_or_resource="MedicationRequest.dosageInstruction, MedicationStatement.dosage",
        kinguardian_representation="External reference pointer (fhir_medication_request_id)",
        anti_duplication_rule="KinGuardian must NEVER store or mutate master medication prescriptions locally."
    ),
    DataFieldOwnership(
        domain_concept="Medication Adherence Tracking",
        owner_system=SystemOfRecord.KINGUARDIAN,
        field_or_resource="medication_adherence_events (status, confirmed_at, dual-time timestamps)",
        kinguardian_representation="Authoritative Entity (AdherenceEvent)",
        anti_duplication_rule="KinGuardian is the single source of truth for adherence confirmations and reminders."
    ),
    DataFieldOwnership(
        domain_concept="Parent & Care Circle Relationships",
        owner_system=SystemOfRecord.KINGUARDIAN,
        field_or_resource="care_subjects, family_members, family_invitations, consents",
        kinguardian_representation="Authoritative Aggregate Root (Family, CareSubject, Consent)",
        anti_duplication_rule="All family membership hierarchies and access delegations are exclusively managed by KinGuardian."
    ),
    DataFieldOwnership(
        domain_concept="Patient Demographics & Medical Identity",
        owner_system=SystemOfRecord.FHIR_EMR,
        field_or_resource="Patient (identifier, birthDate, gender, telecom)",
        kinguardian_representation="Linkage pointer (care_subjects.fhir_patient_id) + cached read projection",
        anti_duplication_rule="Master clinical demographics originate from FHIR; KinGuardian only maintains linkage."
    ),
    DataFieldOwnership(
        domain_concept="User Authentication Identity",
        owner_system=SystemOfRecord.IAM,
        field_or_resource="IAM User (sub, email, password, MFA, session token)",
        kinguardian_representation="Linkage pointer (app_profiles.iam_subject_id)",
        anti_duplication_rule="Credentials, passwords, and tokens are strictly owned by IAM, never stored in KinGuardian DB."
    ),
    DataFieldOwnership(
        domain_concept="File Binary Storage (PDF, Images, DICOM)",
        owner_system=SystemOfRecord.FILENEST,
        field_or_resource="WORM Object Chunks, Immutable Storage Keys",
        kinguardian_representation="Pointer & Checksum (health_documents.filenest_file_id, sha256_checksum)",
        anti_duplication_rule="Raw document binaries are NEVER permanently stored in KinGuardian SQL database."
    ),
    DataFieldOwnership(
        domain_concept="AI Conversational Session & Reasoning Context",
        owner_system=SystemOfRecord.BEZS_AGENT,
        field_or_resource="LLM Context Memory, Scratchpads, Agent Execution Graph",
        kinguardian_representation="Session ID Linkage (ai_conversations.external_session_id)",
        anti_duplication_rule="Intermediate LLM working state and agent scratchpads are owned by bezs-agent."
    ),
    DataFieldOwnership(
        domain_concept="AI Insight Application Metadata & Approvals",
        owner_system=SystemOfRecord.KINGUARDIAN,
        field_or_resource="ai_insights, ai_actions, care_tasks (status, severity, user_feedback)",
        kinguardian_representation="Authoritative Entity (AIInsight, AIAction, CareTask)",
        anti_duplication_rule="User decisions, human-in-the-loop approvals, and task execution states are owned by KinGuardian."
    )
]


class DataOwnershipRegistry:
    """Registry providing lookup and validation of authoritative data boundaries."""

    @classmethod
    def get_ownership(cls, domain_concept: str) -> Optional[DataFieldOwnership]:
        for entry in DATA_OWNERSHIP_CATALOG:
            if domain_concept.lower() in entry.domain_concept.lower():
                return entry
        return None

    @classmethod
    def get_owner_for_concept(cls, domain_concept: str) -> Optional[SystemOfRecord]:
        entry = cls.get_ownership(domain_concept)
        return entry.owner_system if entry else None

    @classmethod
    def list_all(cls) -> List[DataFieldOwnership]:
        return list(DATA_OWNERSHIP_CATALOG)
