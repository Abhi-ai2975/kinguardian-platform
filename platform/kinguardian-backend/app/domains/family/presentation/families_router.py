import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.domains.family.infrastructure.models import AppProfile
from app.domains.family.infrastructure.repositories import (
    SQLAlchemyAppProfileRepository,
    SQLAlchemyFamilyRepository,
    SQLAlchemyConsentRepository
)
from app.domains.events.services import EventService
from app.domains.family.application.services import FamilyService
from app.domains.family.application.read_services import (
    FamilyDashboardReadService,
    ParentHealthSummaryReadService,
    CoordinatorHomeReadService
)
from app.domains.family.schemas import (
    FamilyCreate,
    FamilyUpdate,
    FamilyResponse,
    FamilyMemberAdd,
    FamilyMemberUpdate,
    CareCircleMemberResponse,
    CareRelationshipCreate,
    CareRelationshipUpdate,
    CareRelationshipResponse,
    ConsentCreate,
    ConsentResponse,
    CareTaskCreate,
    CareTaskResponse,
    CoordinatorHomeResponse,
    FamilyDashboardResponse,
    ParentHealthSummaryResponse
)





from app.domains.family.domain.exceptions import FamilyAccessError, DomainError

router = APIRouter(prefix="/families", tags=["Families"])


def get_family_service(session: AsyncSession) -> FamilyService:
    return FamilyService(
        user_repo=SQLAlchemyAppProfileRepository(session),
        circle_repo=SQLAlchemyFamilyRepository(session),
        consent_repo=SQLAlchemyConsentRepository(session),
        event_logger=EventService(session)
    )


@router.post("", response_model=FamilyResponse, status_code=status.HTTP_201_CREATED)
async def create_family(
    payload: FamilyCreate,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Creates a new Family group with the authenticated caller assigned as the initial member/coordinator.
    """
    service = get_family_service(db_session)
    return await service.create_care_circle(
        creator_id=current_user.id,
        name=payload.name,
        creator_role=payload.role
    )


@router.get("", response_model=List[FamilyResponse])
async def list_families(
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Lists all active families the authenticated user belongs to.
    """
    service = get_family_service(db_session)
    return await service.list_user_circles(current_user.id)


@router.get("/{family_id}", response_model=FamilyResponse)
async def get_family_by_id(
    family_id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Retrieves full details for a single Family group by ID.
    Enforces that the caller must be an authorized member.
    """
    service = get_family_service(db_session)
    try:
        return await service.get_family(requester_id=current_user.id, family_id=family_id)
    except FamilyAccessError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.patch("/{family_id}", response_model=FamilyResponse)
async def patch_family_by_id(
    family_id: uuid.UUID,
    payload: FamilyUpdate,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Updates family attributes (name, primary coordinator).
    Enforces that the caller must have a coordinator/parent role.
    """
    service = get_family_service(db_session)
    try:
        return await service.update_family(
            requester_id=current_user.id,
            family_id=family_id,
            name=payload.name,
            primary_coordinator_profile_id=payload.primary_coordinator_profile_id
        )
    except FamilyAccessError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.post("/{family_id}/members", response_model=CareCircleMemberResponse, status_code=status.HTTP_201_CREATED)
async def add_family_member(
    family_id: uuid.UUID,
    payload: FamilyMemberAdd,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Adds a new member to the family group by email.
    """
    service = get_family_service(db_session)
    try:
        return await service.add_member_to_circle(
            requester_id=current_user.id,
            care_circle_id=family_id,
            target_email=payload.email,
            role=payload.role
        )
    except FamilyAccessError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except Exception as e:
        if "Duplicate" in type(e).__name__:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User is already a member of this family.")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{family_id}/members", response_model=List[CareCircleMemberResponse])
async def get_family_members(
    family_id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Lists all members in the specified family group.
    """
    service = get_family_service(db_session)
    try:
        return await service.list_family_members(
            requester_id=current_user.id,
            care_circle_id=family_id
        )
    except FamilyAccessError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.patch("/{family_id}/members/{member_id}", response_model=CareCircleMemberResponse)
async def patch_family_member(
    family_id: uuid.UUID,
    member_id: uuid.UUID,
    payload: FamilyMemberUpdate,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Updates a family member's role or active/suspended status.
    """
    service = get_family_service(db_session)
    try:
        return await service.update_family_member(
            requester_id=current_user.id,
            care_circle_id=family_id,
            member_id=member_id,
            role=payload.role,
            status=payload.status
        )
    except FamilyAccessError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.delete("/{family_id}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_family_member(
    family_id: uuid.UUID,
    member_id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Removes a member from the family group.
    """
    service = get_family_service(db_session)
    try:
        await service.remove_family_member_by_id(
            requester_id=current_user.id,
            care_circle_id=family_id,
            member_id=member_id
        )
        return None
    except FamilyAccessError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.post("/{family_id}/care-relationships", response_model=CareRelationshipResponse, status_code=status.HTTP_201_CREATED)
async def create_care_relationship(
    family_id: uuid.UUID,
    payload: CareRelationshipCreate,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Creates a new care relationship between a care subject and a caregiver/family member.
    """
    service = get_family_service(db_session)
    try:
        return await service.add_care_relationship(
            requester_id=current_user.id,
            family_id=family_id,
            subject_id=payload.subject_id,
            profile_id=payload.profile_id,
            relationship_type=payload.relationship_type,
            access_level=payload.access_level,
            starts_at=payload.starts_at,
            ends_at=payload.ends_at
        )
    except FamilyAccessError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.get("/{family_id}/care-relationships", response_model=List[CareRelationshipResponse])
async def list_care_relationships(
    family_id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Lists all care relationships configured for the specified family.
    """
    service = get_family_service(db_session)
    try:
        return await service.list_care_relationships(
            requester_id=current_user.id,
            family_id=family_id
        )
    except FamilyAccessError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.patch("/{family_id}/care-relationships/{id}", response_model=CareRelationshipResponse)
async def patch_care_relationship(
    family_id: uuid.UUID,
    id: uuid.UUID,
    payload: CareRelationshipUpdate,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Updates an existing care relationship (access level, relationship type, status, or ends_at).
    """
    service = get_family_service(db_session)
    try:
        return await service.update_care_relationship(
            requester_id=current_user.id,
            family_id=family_id,
            relationship_id=id,
            relationship_type=payload.relationship_type,
            access_level=payload.access_level,
            status=payload.status,
            ends_at=payload.ends_at
        )
    except FamilyAccessError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.delete("/{family_id}/care-relationships/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_care_relationship(
    family_id: uuid.UUID,
    id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Deletes a care relationship from the family.
    """
    service = get_family_service(db_session)
    try:
        await service.remove_care_relationship(
            requester_id=current_user.id,
            family_id=family_id,
            relationship_id=id
        )
        return None
    except FamilyAccessError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.post("/{family_id}/consents", response_model=ConsentResponse, status_code=status.HTTP_201_CREATED)
async def create_family_consent(
    family_id: uuid.UUID,
    payload: ConsentCreate,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Grants or updates clinical data access consent for a caregiver or family member.
    """
    service = get_family_service(db_session)
    try:
        return await service.create_consent(
            requester_id=current_user.id,
            family_id=family_id,
            subject_id=payload.subject_id,
            grantee_id=payload.grantee_id,
            grantee_email=payload.grantee_email,
            scope=payload.scope,
            status=payload.status,
            consent_type=payload.consent_type,
            expires_at=payload.expires_at
        )
    except FamilyAccessError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.get("/{family_id}/consents", response_model=List[ConsentResponse])
async def list_family_consents(
    family_id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Lists all consents granted within the family.
    """
    service = get_family_service(db_session)
    try:
        return await service.list_family_consents(
            requester_id=current_user.id,
            family_id=family_id
        )
    except FamilyAccessError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.post("/{family_id}/consents/{id}/revoke", response_model=ConsentResponse)
async def revoke_family_consent(
    family_id: uuid.UUID,
    id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Revokes an active clinical data access consent.
    """
    service = get_family_service(db_session)
    try:
        return await service.revoke_family_consent(
            requester_id=current_user.id,
            family_id=family_id,
            consent_id=id
        )
    except FamilyAccessError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.get("/{family_id}/home", response_model=CoordinatorHomeResponse)
async def get_family_coordinator_home(
    family_id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Optimized read service for Coordinator Home screen scoped to a specific family.
    Aggregates parent statuses, attention items, Guardian Moments, today's medication status,
    upcoming appointments, pending care tasks, and recent updates.
    """
    read_service = CoordinatorHomeReadService(db_session)
    try:
        return await read_service.get_coordinator_home(
            coordinator_profile_id=current_user.id,
            family_id=family_id
        )
    except FamilyAccessError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.get("/{family_id}/dashboard", response_model=FamilyDashboardResponse)

async def get_family_dashboard(
    family_id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Summarized family projection dashboard.
    Returns care subjects summary, 7-day adherence rates, active Guardian Moments,
    upcoming care schedule, active members, and recent timeline activity.
    Avoids raw clinical/FHIR record dumps.
    """
    read_service = FamilyDashboardReadService(db_session)
    try:
        return await read_service.get_family_dashboard(
            requester_id=current_user.id,
            family_id=family_id
        )
    except FamilyAccessError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.get("/{family_id}/subjects/{subject_id}/summary", response_model=ParentHealthSummaryResponse)
async def get_parent_health_summary(
    family_id: uuid.UUID,
    subject_id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Composes parent health summary across multiple sub-domains:
    FHIR data, care relationships, medication adherence, wellbeing check-ins,
    AI insights / Guardian Moments, appointments, and recent health documents.
    """
    read_service = ParentHealthSummaryReadService(db_session)
    try:
        return await read_service.get_parent_health_summary(
            requester_id=current_user.id,
            family_id=family_id,
            subject_id=subject_id
        )
    except FamilyAccessError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.get("/{family_id}/care/tasks", response_model=List[CareTaskResponse])
async def list_family_care_tasks(
    family_id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Lists all care tasks for the given family group.
    """
    service = get_family_service(db_session)
    try:
        return await service.list_care_tasks(
            requester_id=current_user.id,
            family_id=family_id
        )
    except FamilyAccessError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.post("/{family_id}/care/tasks", response_model=CareTaskResponse, status_code=status.HTTP_201_CREATED)
async def create_family_care_task(
    family_id: uuid.UUID,
    payload: CareTaskCreate,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Creates a new care task for a care subject within the family group.
    """
    service = get_family_service(db_session)
    try:
        return await service.add_care_task(
            requester_id=current_user.id,
            family_id=family_id,
            subject_id=payload.subject_id,
            assigned_to_profile_id=payload.assigned_to_profile_id,
            title=payload.title,
            description=payload.description,
            category=payload.category,
            priority=payload.priority,
            due_at=payload.due_at
        )
    except FamilyAccessError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))


