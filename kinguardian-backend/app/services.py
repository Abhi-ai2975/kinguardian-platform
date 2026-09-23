import uuid
from datetime import UTC, datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from app.models import AuditLog, CareGrant, CareSubject, Consent, Family, Membership, Notification, OutboxEvent
from app.security import require_membership

COORDINATOR = {"coordinator"}
CARE_WRITE = {"coordinator", "caregiver", "parent"}
HEALTH_SCOPES = {"health.summary", "care.tasks", "checkins", "medications", "documents", "messages"}


async def subject_for_family(session: AsyncSession, family_id: uuid.UUID, subject_id: uuid.UUID) -> CareSubject:
    subject = await session.get(CareSubject, subject_id)
    if not subject or subject.family_id != family_id or subject.status != "active":
        raise HTTPException(status_code=404, detail="Care subject not found")
    return subject


async def authorize_subject(session: AsyncSession, family_id: uuid.UUID, subject_id: uuid.UUID, actor_id: uuid.UUID, scope: str, write: bool = False) -> CareSubject:
    membership = await require_membership(session, family_id, actor_id)
    subject = await subject_for_family(session, family_id, subject_id)
    if subject.profile_id == actor_id or membership.role == "parent":
        if subject.profile_id is None and membership.role == "parent":
            existing = (await session.execute(select(CareSubject).where(CareSubject.profile_id == actor_id))).scalar_one_or_none()
            if not existing:
                subject.profile_id = actor_id
        return subject  # parent has rights over their own record within explicit APIs
    if write and membership.role not in CARE_WRITE:
        raise HTTPException(status_code=403, detail="Role cannot modify care data")
    if membership.role == "coordinator":
        return subject
    grant = (await session.execute(select(CareGrant).where(CareGrant.subject_id == subject_id, CareGrant.profile_id == actor_id, CareGrant.status == "active"))).scalar_one_or_none()
    now = datetime.now(UTC)
    if not grant or scope not in set(grant.scopes) or (grant.expires_at and grant.expires_at <= now):
        raise HTTPException(status_code=403, detail="Subject consent or delegated scope required")
    return subject


async def record(session: AsyncSession, *, actor_id: uuid.UUID | None, family_id: uuid.UUID | None, action: str, resource_type: str, resource_id: uuid.UUID | str, payload: dict, error: str | None = None) -> None:
    key = f"{action}:{resource_id}:{uuid.uuid4()}"
    session.add(AuditLog(actor_id=actor_id, family_id=family_id, action=action, resource_type=resource_type, resource_id=str(resource_id), metadata_json=payload, error=error))
    session.add(OutboxEvent(aggregate_type=resource_type, aggregate_id=str(resource_id), event_type=action, family_id=family_id, payload=payload, idempotency_key=key))


async def notify_coordinators(session: AsyncSession, family_id: uuid.UUID, event_type: str, payload: dict, adapter) -> None:
    coordinators = (await session.execute(select(Membership).where(Membership.family_id == family_id, Membership.role == "coordinator", Membership.status == "active"))).scalars().all()
    for member in coordinators:
        session.add(Notification(family_id=family_id, recipient_id=member.profile_id, event_type=event_type, payload=payload))
        await adapter.deliver(str(member.profile_id), event_type, payload)


async def create_family(session: AsyncSession, actor_id: uuid.UUID, name: str, timezone: str) -> Family:
    family = Family(name=name, home_timezone=timezone)
    session.add(family)
    await session.flush()
    session.add(Membership(family_id=family.id, profile_id=actor_id, role="coordinator"))
    await record(session, actor_id=actor_id, family_id=family.id, action="family.created.v1", resource_type="family", resource_id=family.id, payload={"timezone": timezone})
    return family


async def grant_access(session: AsyncSession, family_id: uuid.UUID, subject_id: uuid.UUID, actor_id: uuid.UUID, profile_id: uuid.UUID, scopes: set[str], expires_at: datetime | None) -> CareGrant:
    membership = await require_membership(session, family_id, actor_id)
    subject = await subject_for_family(session, family_id, subject_id)
    if membership.role != "coordinator" and subject.profile_id != actor_id:
        raise HTTPException(status_code=403, detail="Only coordinator or care subject can grant access")
    if not scopes.issubset(HEALTH_SCOPES):
        raise HTTPException(status_code=422, detail="Unknown consent scope")
    existing = (await session.execute(select(CareGrant).where(CareGrant.subject_id == subject_id, CareGrant.profile_id == profile_id))).scalar_one_or_none()
    if existing:
        existing.scopes, existing.status, existing.expires_at = sorted(scopes), "active", expires_at
        grant = existing
    else:
        grant = CareGrant(subject_id=subject_id, profile_id=profile_id, scopes=sorted(scopes), expires_at=expires_at)
        session.add(grant)
    await session.flush()
    existing_consent = (await session.execute(select(Consent).where(Consent.subject_id == subject_id, Consent.granted_to_profile_id == profile_id))).scalar_one_or_none()
    if existing_consent:
        existing_consent.scopes = sorted(scopes)
        existing_consent.status = "active"
        existing_consent.revoked_at = None
    else:
        session.add(Consent(subject_id=subject_id, granted_to_profile_id=profile_id, scopes=sorted(scopes)))
    await record(session, actor_id=actor_id, family_id=family_id, action="care.access_granted.v1", resource_type="care_grant", resource_id=grant.id, payload={"subject_id": str(subject_id), "scopes": sorted(scopes)})
    return grant


async def revoke_access_grant(session: AsyncSession, family_id: uuid.UUID, subject_id: uuid.UUID, actor_id: uuid.UUID, grant_id: uuid.UUID) -> CareGrant:
    membership = await require_membership(session, family_id, actor_id)
    subject = await subject_for_family(session, family_id, subject_id)
    if membership.role != "coordinator" and subject.profile_id != actor_id:
        raise HTTPException(status_code=403, detail="Only coordinator or care subject can revoke access")
    grant = await session.get(CareGrant, grant_id)
    if not grant or grant.subject_id != subject_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Access grant not found")
    grant.status = "inactive"
    consent = (await session.execute(select(Consent).where(Consent.subject_id == subject_id, Consent.granted_to_profile_id == grant.profile_id, Consent.status == "active"))).scalar_one_or_none()
    if consent:
        consent.status = "inactive"
        consent.revoked_at = datetime.now(UTC)
    await record(session, actor_id=actor_id, family_id=family_id, action="care.access_revoked.v1", resource_type="care_grant", resource_id=grant.id, payload={"subject_id": str(subject_id), "profile_id": str(grant.profile_id)})
    return grant


async def update_member_role(session: AsyncSession, family_id: uuid.UUID, actor_id: uuid.UUID, target_profile_id: uuid.UUID, new_role: str) -> Membership:
    await require_membership(session, family_id, actor_id, COORDINATOR)
    result = await session.execute(select(Membership).where(Membership.family_id == family_id, Membership.profile_id == target_profile_id, Membership.status == "active"))
    membership = result.scalar_one_or_none()
    if not membership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Family member not found")
    old_role = membership.role
    membership.role = new_role
    await record(session, actor_id=actor_id, family_id=family_id, action="family.role_updated.v1", resource_type="membership", resource_id=membership.id, payload={"old_role": old_role, "new_role": new_role, "profile_id": str(target_profile_id)})
    return membership


async def remove_member(session: AsyncSession, family_id: uuid.UUID, actor_id: uuid.UUID, target_profile_id: uuid.UUID) -> Membership:
    await require_membership(session, family_id, actor_id, COORDINATOR)
    result = await session.execute(select(Membership).where(Membership.family_id == family_id, Membership.profile_id == target_profile_id, Membership.status == "active"))
    membership = result.scalar_one_or_none()
    if not membership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Family member not found")
    if membership.role == "coordinator":
        coord_count = (await session.execute(select(Membership).where(Membership.family_id == family_id, Membership.role == "coordinator", Membership.status == "active"))).scalars().all()
        if len(coord_count) <= 1:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot remove the only coordinator of a family")
    membership.status = "removed"
    await record(session, actor_id=actor_id, family_id=family_id, action="family.member_removed.v1", resource_type="membership", resource_id=membership.id, payload={"profile_id": str(target_profile_id), "role": membership.role})
    return membership

