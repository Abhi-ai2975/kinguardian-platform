"""
FHIR Security Boundary & Proxy Enforcement:
Enforces that mobile clients never call the FHIR R4 server directly.

Architectural Flow:
Mobile Client
    ↓
KinGuardian API (/api/v1/clinical/*)
    ↓
Authentication (Bearer JWT)
    ↓
KinGuardian Authorization (Family Membership + Consent Scope Verification)
    ↓
FHIR Adapter (Internal M2M Credential Injection)
    ↓
FHIR Service (Private VPC / EMR Core)
"""

import uuid
from typing import Dict, Any, Optional
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.domains.family.application.permissions import PermissionVerifier
from app.domains.family.infrastructure.repositories import (
    SQLAlchemyFamilyRepository,
    SQLAlchemyConsentRepository
)

logger = get_logger(__name__)


class FHIRSecurityBoundary:
    """
    Enforces that all clinical FHIR data access passes through the KinGuardian
    Authorization & Consent Evaluation Pipeline.
    """

    @classmethod
    async def authorize_fhir_access(
        cls,
        session: AsyncSession,
        requester_id: uuid.UUID,
        subject_id: uuid.UUID,
        required_capability: str,
        family_id: Optional[uuid.UUID] = None
    ) -> Dict[str, Any]:
        """
        Validates membership, consent, and role permissions before delegating
        to the server-side FHIR adapter.
        """
        family_repo = SQLAlchemyFamilyRepository(session)
        consent_repo = SQLAlchemyConsentRepository(session)

        # 1. Resolve Care Subject
        subject = await family_repo.get_care_subject(subject_id)
        if not subject:
            logger.warning(f"FHIR Access Denied: Subject {subject_id} not found.")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Care subject not found."
            )

        target_family_id = family_id or subject.family_id

        # 2. Enforce Family Group Membership
        membership = await family_repo.get_member(target_family_id, requester_id)
        if not membership:
            logger.warning(
                f"FHIR Access Denied: Requester {requester_id} is not a member of family {target_family_id}."
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access clinical records for this family circle."
            )

        # 3. If requester is not the subject itself, enforce consent scope
        if subject.profile_id != requester_id:
            consents = await consent_repo.list_by_family(target_family_id)
            has_active_consent = any(
                c.subject_id == subject_id and
                c.grantee_profile_id == requester_id and
                c.status == "active" and
                c.scope.get(required_capability, False) is True
                for c in consents
            )

            # Check coordinator default capability or explicit consent
            if not has_active_consent and membership.membership_role not in ["coordinator", "primary_coordinator"]:
                logger.warning(
                    f"FHIR Access Denied: No active consent for requester {requester_id} on subject {subject_id}."
                )
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Consent not granted for this clinical resource."
                )

        logger.info(
            f"FHIR Security Boundary Authorized: requester={requester_id}, subject={subject_id}, "
            f"fhir_patient_id={subject.fhir_patient_id}, capability={required_capability}"
        )

        return {
            "authorized": True,
            "fhir_patient_id": subject.fhir_patient_id,
            "subject_id": str(subject.id),
            "family_id": str(target_family_id),
            "authorized_capability": required_capability
        }
