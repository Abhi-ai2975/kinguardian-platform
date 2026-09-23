"""
Consent Application Use Cases:
- GrantConsentUseCase
- RevokeConsentUseCase
"""

import uuid
from typing import Dict, Any, Optional
from datetime import datetime
from app.domains.family.application.services import FamilyService
from app.domains.family.domain.entities import ConsentEntity


class GrantConsentUseCase:
    """Grants granular clinical data and insight access permissions from Parent to Coordinator/Caregiver."""
    def __init__(self, family_service: FamilyService):
        self.family_service = family_service

    async def execute(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        subject_id: uuid.UUID,
        grantee_id: uuid.UUID,
        scope: Dict[str, bool],
        consent_type: str = "clinical_data_access",
        expires_at: Optional[datetime] = None
    ) -> ConsentEntity:
        return await self.family_service.create_consent(
            requester_id=requester_id,
            family_id=family_id,
            subject_id=subject_id,
            grantee_id=grantee_id,
            scope=scope,
            consent_type=consent_type,
            expires_at=expires_at
        )



class RevokeConsentUseCase:
    """Revokes active clinical data access permissions."""
    def __init__(self, family_service: FamilyService):
        self.family_service = family_service

    async def execute(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        consent_id: uuid.UUID
    ) -> ConsentEntity:
        return await self.family_service.revoke_family_consent(
            requester_id=requester_id,
            family_id=family_id,
            consent_id=consent_id
        )

