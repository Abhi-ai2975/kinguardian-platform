import uuid
from typing import List, Optional, Tuple
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.core.logging import get_logger
from app.domains.family.infrastructure.models import (
    PlatformOrganization,
    Family,
    FamilyMembership,
    CareSubject,
    AppProfile
)

logger = get_logger(__name__)


class TenancyService:
    """
    Multi-Tenant Tenancy Service:
    Enforces the organizational hierarchy:
        Platform Organization -> Families (Primary Tenant) -> Family Members -> Care Subjects.

    Security Rule:
    Never rely on a client-supplied family_id.
    Derive allowed families from authenticated identity and authorization.
    """

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_user_authorized_families(self, user_id: uuid.UUID) -> List[Family]:
        """
        Derives all families for which the user is an active member.
        """
        stmt = (
            select(Family)
            .join(FamilyMembership, Family.id == FamilyMembership.family_id)
            .where(
                and_(
                    FamilyMembership.profile_id == user_id,
                    FamilyMembership.status == "active"
                )
            )
        )
        res = await self.session.execute(stmt)
        return list(res.scalars().all())

    async def resolve_family_for_user(
        self,
        user_id: uuid.UUID,
        client_family_id: Optional[uuid.UUID] = None
    ) -> Family:
        """
        Securely resolves the tenant family:
        - If client_family_id is passed, verifies user's active membership (Default Deny if unauthorized).
        - If client_family_id is omitted, derives the primary/active family from identity.
        """
        authorized_families = await self.get_user_authorized_families(user_id)

        if not authorized_families:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User does not belong to any active family tenant."
            )

        if client_family_id:
            for fam in authorized_families:
                if fam.id == client_family_id:
                    return fam
            # Security Rule: Client-supplied family_id is not among user's authorized families
            logger.warning(
                f"Tenancy violation: User {user_id} attempted unauthorized access to family {client_family_id}."
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You are not authorized for the requested family tenant."
            )

        # Default to first active family if not explicitly provided
        return authorized_families[0]

    async def resolve_subject_access(
        self,
        user_id: uuid.UUID,
        subject_id: uuid.UUID
    ) -> Tuple[Family, CareSubject]:
        """
        Derives the CareSubject and its parent Family tenant, verifying caller membership
        without relying on client-supplied family_id.
        """
        res_subj = await self.session.execute(
            select(CareSubject).where(CareSubject.id == subject_id)
        )
        subject = res_subj.scalar_one_or_none()
        if not subject:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Care Subject '{subject_id}' not found."
            )

        # Verify caller belongs to the family that owns this care subject
        authorized_family = await self.resolve_family_for_user(
            user_id=user_id,
            client_family_id=subject.family_id
        )

        return authorized_family, subject

    async def get_family_subjects(
        self,
        user_id: uuid.UUID,
        client_family_id: Optional[uuid.UUID] = None
    ) -> List[CareSubject]:
        """
        Retrieves care subjects belonging strictly to the derived authorized family tenant.
        """
        family = await self.resolve_family_for_user(user_id, client_family_id)

        stmt = select(CareSubject).where(
            and_(
                CareSubject.family_id == family.id,
                CareSubject.status == "active"
            )
        )
        res = await self.session.execute(stmt)
        return list(res.scalars().all())
