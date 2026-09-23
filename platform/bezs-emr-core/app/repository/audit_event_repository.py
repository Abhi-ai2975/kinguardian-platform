from datetime import datetime, timezone
from typing import List, Optional, Tuple

from fastapi import HTTPException, status as http_status
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker  # noqa: F401
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.audit_event.enums import (
    AuditEventLocationReferenceType,
    AuditEventWhoReferenceType,
)
from app.models.audit_event.audit_event import (
    AuditEventAgent,
    AuditEventAgentPolicy,
    AuditEventAgentPurposeOfUse,
    AuditEventAgentRole,
    AuditEventEntity,
    AuditEventEntityDetail,
    AuditEventEntitySecurityLabel,
    AuditEventModel,
    AuditEventPurposeOfEvent,
    AuditEventSourceType,
    AuditEventSubtype,
)
from app.schemas.audit_event.input import (
    AuditEventCreateSchema,
    AuditEventPatchSchema,
)


def _parse_dt(s) -> Optional[datetime]:
    if s is None:
        return None
    if isinstance(s, datetime):
        return s
    return datetime.fromisoformat(str(s).replace("Z", "+00:00"))


def _parse_ref(ref: str, enum_class, field: str):
    parts = ref.split("/", 1)
    if len(parts) != 2:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid reference format for '{field}': '{ref}'. Expected 'ResourceType/<id>'.",
        )
    try:
        ref_id = int(parts[1])
    except ValueError:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid id in reference '{ref}' for '{field}'. Id must be an integer.",
        )
    try:
        ref_type = enum_class(parts[0])
    except ValueError:
        allowed = [e.value for e in enum_class]
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid reference type '{parts[0]}' for '{field}'. Allowed: {allowed}.",
        )
    return ref_type, ref_id


def _parse_open_ref(ref: str, field: str):
    parts = ref.split("/", 1)
    if len(parts) != 2:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid reference format for '{field}': '{ref}'. Expected 'ResourceType/<id>'.",
        )
    try:
        ref_id = int(parts[1])
    except ValueError:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid id in reference '{ref}' for '{field}'. Id must be an integer.",
        )
    return parts[0], ref_id


def _with_relationships(stmt):
    return stmt.options(
        selectinload(AuditEventModel.subtypes),
        selectinload(AuditEventModel.purpose_of_events),
        selectinload(AuditEventModel.source_types),
        selectinload(AuditEventModel.agents).selectinload(AuditEventAgent.roles),
        selectinload(AuditEventModel.agents).selectinload(AuditEventAgent.policies),
        selectinload(AuditEventModel.agents).selectinload(AuditEventAgent.purpose_of_uses),
        selectinload(AuditEventModel.entities).selectinload(AuditEventEntity.security_labels),
        selectinload(AuditEventModel.entities).selectinload(AuditEventEntity.details),
    )


def _apply_list_filters(stmt, user_id, org_id):
    if user_id:
        stmt = stmt.where(AuditEventModel.user_id == user_id)
    if org_id:
        stmt = stmt.where(AuditEventModel.org_id == org_id)
    return stmt


def _build_agents(agents_data, org_id):
    agents = []
    for a in agents_data:
        who_type = who_id = None
        if a.who:
            who_type, who_id = _parse_ref(a.who, AuditEventWhoReferenceType, "agent.who")
        location_type = location_id = None
        if a.location:
            location_type, location_id = _parse_ref(a.location, AuditEventLocationReferenceType, "agent.location")

        agent = AuditEventAgent(
            org_id=org_id,
            type_system=a.type_system,
            type_code=a.type_code,
            type_display=a.type_display,
            type_text=a.type_text,
            who_type=who_type,
            who_id=who_id,
            who_display=a.who_display,
            alt_id=a.alt_id,
            name=a.name,
            requestor=a.requestor,
            location_type=location_type,
            location_id=location_id,
            location_display=a.location_display,
            media_system=a.media_system,
            media_code=a.media_code,
            media_display=a.media_display,
            network_address=a.network_address,
            network_type=a.network_type,
            roles=[
                AuditEventAgentRole(
                    org_id=org_id,
                    coding_system=r.coding_system,
                    coding_code=r.coding_code,
                    coding_display=r.coding_display,
                    text=r.text,
                )
                for r in a.roles
            ],
            policies=[
                AuditEventAgentPolicy(org_id=org_id, value=p.value)
                for p in a.policies
            ],
            purpose_of_uses=[
                AuditEventAgentPurposeOfUse(
                    org_id=org_id,
                    coding_system=p.coding_system,
                    coding_code=p.coding_code,
                    coding_display=p.coding_display,
                    text=p.text,
                )
                for p in a.purpose_of_uses
            ],
        )
        agents.append(agent)
    return agents


def _build_entities(entities_data, org_id):
    entities = []
    for e in entities_data:
        what_type = what_id = None
        if e.what:
            what_type, what_id = _parse_open_ref(e.what, "entity.what")

        entity = AuditEventEntity(
            org_id=org_id,
            what_type=what_type,
            what_id=what_id,
            what_display=e.what_display,
            type_system=e.type_system,
            type_code=e.type_code,
            type_display=e.type_display,
            role_system=e.role_system,
            role_code=e.role_code,
            role_display=e.role_display,
            lifecycle_system=e.lifecycle_system,
            lifecycle_code=e.lifecycle_code,
            lifecycle_display=e.lifecycle_display,
            name=e.name,
            description=e.description,
            query=e.query,
            security_labels=[
                AuditEventEntitySecurityLabel(org_id=org_id, system=sl.system, code=sl.code, display=sl.display)
                for sl in e.security_labels
            ],
            details=[
                AuditEventEntityDetail(
                    org_id=org_id,
                    type=d.type,
                    value_string=d.value_string,
                    value_base64_binary=d.value_base64_binary,
                )
                for d in e.details
            ],
        )
        entities.append(entity)
    return entities


class AuditEventRepository:
    def __init__(self, session_factory: async_sessionmaker):
        self.session_factory = session_factory

    async def create(self, data: AuditEventCreateSchema, created_by: str) -> AuditEventModel:
        source_observer_type = source_observer_id = None
        if data.source_observer:
            source_observer_type, source_observer_id = _parse_ref(
                data.source_observer, AuditEventWhoReferenceType, "source_observer"
            )

        org_id = data.org_id

        model = AuditEventModel(
            user_id=data.user_id,
            org_id=org_id,
            type_system=data.type_system,
            type_code=data.type_code,
            type_display=data.type_display,
            action=data.action,
            period_start=_parse_dt(data.period_start),
            period_end=_parse_dt(data.period_end),
            recorded=_parse_dt(data.recorded),
            outcome=data.outcome,
            outcome_desc=data.outcome_desc,
            source_site=data.source_site,
            source_observer_type=source_observer_type,
            source_observer_id=source_observer_id,
            source_observer_display=data.source_observer_display,
            created_by=created_by,
            subtypes=[
                AuditEventSubtype(org_id=org_id, system=s.system, code=s.code, display=s.display)
                for s in data.subtypes
            ],
            purpose_of_events=[
                AuditEventPurposeOfEvent(
                    org_id=org_id,
                    coding_system=p.coding_system,
                    coding_code=p.coding_code,
                    coding_display=p.coding_display,
                    text=p.text,
                )
                for p in data.purpose_of_events
            ],
            source_types=[
                AuditEventSourceType(org_id=org_id, system=st.system, code=st.code, display=st.display)
                for st in data.source_types
            ],
            agents=_build_agents(data.agents, org_id),
            entities=_build_entities(data.entities, org_id),
        )

        async with self.session_factory() as session:
            session.add(model)
            await session.commit()
            await session.refresh(model)
            stmt = _with_relationships(
                select(AuditEventModel).where(AuditEventModel.id == model.id)
            )
            result = await session.execute(stmt)
            return result.scalars().first()

    async def get_by_audit_event_id(self, audit_event_id: int) -> Optional[AuditEventModel]:
        async with self.session_factory() as session:
            stmt = _with_relationships(
                select(AuditEventModel).where(AuditEventModel.audit_event_id == audit_event_id)
            )
            result = await session.execute(stmt)
            return result.scalars().first()

    async def list(
        self,
        user_id: Optional[str],
        org_id: Optional[str],
        limit: int,
        offset: int,
    ) -> Tuple[int, List[AuditEventModel]]:
        async with self.session_factory() as session:
            base = select(AuditEventModel)
            base = _apply_list_filters(base, user_id, org_id)

            count_stmt = select(func.count()).select_from(base.subquery())
            total = (await session.execute(count_stmt)).scalar_one()

            data_stmt = _with_relationships(base).offset(offset).limit(limit)
            rows = (await session.execute(data_stmt)).scalars().all()
            return total, list(rows)

    async def get_me(
        self,
        user_id: str,
        org_id: str,
        limit: int,
        offset: int,
    ) -> Tuple[int, List[AuditEventModel]]:
        return await self.list(user_id, org_id, limit, offset)

    async def patch(
        self,
        model: AuditEventModel,
        data: AuditEventPatchSchema,
        updated_by: str,
    ) -> AuditEventModel:
        updates = data.model_dump(exclude_unset=True)
        org_id = model.org_id

        if "source_observer" in updates:
            ref = updates.pop("source_observer")
            if ref:
                sot, soid = _parse_ref(ref, AuditEventWhoReferenceType, "source_observer")
                model.source_observer_type = sot
                model.source_observer_id = soid
            else:
                model.source_observer_type = None
                model.source_observer_id = None

        if "source_observer_display" in updates:
            model.source_observer_display = updates.pop("source_observer_display")

        if "subtypes" in updates:
            subtypes_data = updates.pop("subtypes")
            model.subtypes = [
                AuditEventSubtype(org_id=org_id, system=s["system"], code=s["code"], display=s["display"])
                for s in subtypes_data
            ]

        if "purpose_of_events" in updates:
            poe_data = updates.pop("purpose_of_events")
            model.purpose_of_events = [
                AuditEventPurposeOfEvent(
                    org_id=org_id,
                    coding_system=p["coding_system"],
                    coding_code=p["coding_code"],
                    coding_display=p["coding_display"],
                    text=p["text"],
                )
                for p in poe_data
            ]

        if "source_types" in updates:
            st_data = updates.pop("source_types")
            model.source_types = [
                AuditEventSourceType(org_id=org_id, system=st["system"], code=st["code"], display=st["display"])
                for st in st_data
            ]

        if "agents" in updates:
            from app.schemas.audit_event.input import AuditEventAgentInput
            agents_raw = updates.pop("agents")
            agents_input = [AuditEventAgentInput(**a) for a in agents_raw]
            model.agents = _build_agents(agents_input, org_id)

        if "entities" in updates:
            from app.schemas.audit_event.input import AuditEventEntityInput
            entities_raw = updates.pop("entities")
            entities_input = [AuditEventEntityInput(**e) for e in entities_raw]
            model.entities = _build_entities(entities_input, org_id)

        for field, value in updates.items():
            if field in ("period_start", "period_end"):
                value = _parse_dt(value)
            setattr(model, field, value)

        model.updated_by = updated_by

        async with self.session_factory() as session:
            merged = await session.merge(model)
            await session.commit()
            stmt = _with_relationships(
                select(AuditEventModel).where(AuditEventModel.id == merged.id)
            )
            result = await session.execute(stmt)
            return result.scalars().first()

    async def delete(self, model: AuditEventModel) -> None:
        async with self.session_factory() as session:
            merged = await session.merge(model)
            await session.delete(merged)
            await session.commit()
