"""
Family Application Use Cases:
- CreateFamilyUseCase
- AddFamilyMemberUseCase
- CreateCareRelationshipUseCase
- GetCoordinatorHomeUseCase
- GetParentHomeUseCase
"""

import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.family.application.services import FamilyService
from app.domains.family.application.home_read_service import FamilyHomeReadService, FamilyHomeAggregateResponse
from app.domains.family.domain.entities import FamilyEntity, FamilyMembershipEntity, FamilyRelationshipEntity


class CreateFamilyUseCase:
    """Creates a new Care Circle / Family group with the actor as primary coordinator."""
    def __init__(self, family_service: FamilyService):
        self.family_service = family_service

    async def execute(
        self,
        coordinator_profile_id: uuid.UUID,
        name: str,
        role: str = "coordinator"
    ) -> FamilyEntity:
        return await self.family_service.create_care_circle(

            creator_id=coordinator_profile_id,
            name=name,
            creator_role=role
        )



class AddFamilyMemberUseCase:
    """Invites and adds a new member into a Family Care Circle."""
    def __init__(self, family_service: FamilyService):
        self.family_service = family_service

    async def execute(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        email: str,
        role: str
    ) -> FamilyMembershipEntity:
        return await self.family_service.add_member_to_circle(

            requester_id=requester_id,
            care_circle_id=family_id,
            target_email=email,
            role=role
        )



class CreateCareRelationshipUseCase:
    """Establishes an explicit interpersonal relationship between two family circle profiles."""
    def __init__(self, family_service: FamilyService):
        self.family_service = family_service

    async def execute(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        from_profile_id: uuid.UUID,
        to_profile_id: uuid.UUID,
        relationship_type: str
    ) -> FamilyRelationshipEntity:
        return await self.family_service.add_relationship(

            requester_id=requester_id,
            family_id=family_id,
            from_profile_id=from_profile_id,
            to_profile_id=to_profile_id,
            relationship_type=relationship_type
        )



class GetCoordinatorHomeUseCase:
    """Aggregates high-performance dashboard view for the Coordinator."""
    def __init__(self, home_read_service: FamilyHomeReadService):
        self.home_read_service = home_read_service

    async def execute(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID
    ) -> FamilyHomeAggregateResponse:
        return await self.home_read_service.get_family_home_view(
            requester_id=requester_id,
            family_id=family_id
        )


class GetParentHomeUseCase:
    """Aggregates simplified, high-contrast dashboard view for Parents."""
    def __init__(self, home_read_service: FamilyHomeReadService):
        self.home_read_service = home_read_service

    async def execute(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID
    ) -> FamilyHomeAggregateResponse:
        return await self.home_read_service.get_family_home_view(
            requester_id=requester_id,
            family_id=family_id
        )
