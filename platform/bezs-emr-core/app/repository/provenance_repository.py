from typing import List, Optional, Tuple

from fastapi import HTTPException, status as http_status
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker  # noqa: F401
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.provenance.enums import (
    ProvenanceAgentWhoReferenceType,
    ProvenanceEntityRole,
    ProvenanceLocationReferenceType,
)
from app.models.provenance.provenance import (
    ProvenanceAgent,
    ProvenanceAgentRole,
    ProvenanceEntity,
    ProvenanceEntityAgent,
    ProvenanceModel,
    ProvenancePolicy,
    ProvenanceReason,
    ProvenanceSignature,
    ProvenanceSignatureType,
    ProvenanceTarget,
)
from app.schemas.provenance.input import (
    ProvenanceCreateSchema,
    ProvenancePatchSchema,
)


def _with_relationships(stmt):
    return stmt.options(
        selectinload(ProvenanceModel.targets),
        selectinload(ProvenanceModel.policies),
        selectinload(ProvenanceModel.reasons),
        selectinload(ProvenanceModel.agents).selectinload(ProvenanceAgent.roles),
        selectinload(ProvenanceModel.entities).selectinload(ProvenanceEntity.entity_agents),
        selectinload(ProvenanceModel.signatures).selectinload(ProvenanceSignature.signature_types),
    )


def _parse_ref_closed(ref: str, enum_cls, field: str):
    parts = ref.split("/", 1)
    if len(parts) != 2:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid reference format: '{ref}'. Expected 'ResourceType/id'.",
        )
    try:
        ref_id = int(parts[1])
    except ValueError:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid reference id in: '{ref}'. Id must be an integer.",
        )
    try:
        ref_type = enum_cls(parts[0])
    except ValueError:
        allowed = [e.value for e in enum_cls]
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid reference type '{parts[0]}' for {field}. Allowed: {allowed}.",
        )
    return ref_type, ref_id


def _parse_ref_open(ref: str, field: str):
    parts = ref.split("/", 1)
    if len(parts) != 2:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid reference format: '{ref}'. Expected 'ResourceType/id'.",
        )
    try:
        ref_id = int(parts[1])
    except ValueError:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid reference id in: '{ref}'. Id must be an integer.",
        )
    return parts[0], ref_id


def _parse_ref_closed_optional(ref: Optional[str], enum_cls, field: str):
    if not ref:
        return None, None
    return _parse_ref_closed(ref, enum_cls, field)


def _parse_ref_open_optional(ref: Optional[str], field: str):
    if not ref:
        return None, None
    return _parse_ref_open(ref, field)


class ProvenanceRepository:
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]):
        self.session_factory = session_factory

    async def get_by_provenance_id(self, provenance_id: int) -> Optional[ProvenanceModel]:
        async with self.session_factory() as session:
            stmt = _with_relationships(
                select(ProvenanceModel).where(ProvenanceModel.provenance_id == provenance_id)
            )
            result = await session.execute(stmt)
            return result.scalars().first()

    def _apply_list_filters(self, stmt, user_id, org_id):
        if user_id:
            stmt = stmt.where(ProvenanceModel.user_id == user_id)
        if org_id:
            stmt = stmt.where(ProvenanceModel.org_id == org_id)
        return stmt

    async def get_me(
        self,
        user_id: str,
        org_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[ProvenanceModel], int]:
        async with self.session_factory() as session:
            base = self._apply_list_filters(
                _with_relationships(select(ProvenanceModel)), user_id, org_id
            )
            count_base = self._apply_list_filters(
                select(func.count()).select_from(ProvenanceModel), user_id, org_id
            )
            total = (await session.execute(count_base)).scalar_one()
            rows = list((await session.execute(
                base.order_by(ProvenanceModel.provenance_id.desc()).offset(offset).limit(limit)
            )).scalars().all())
        return rows, total

    async def list(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[ProvenanceModel], int]:
        async with self.session_factory() as session:
            base = self._apply_list_filters(
                _with_relationships(select(ProvenanceModel)), user_id, org_id
            )
            count_base = self._apply_list_filters(
                select(func.count()).select_from(ProvenanceModel), user_id, org_id
            )
            total = (await session.execute(count_base)).scalar_one()
            rows = list((await session.execute(
                base.order_by(ProvenanceModel.provenance_id.desc()).offset(offset).limit(limit)
            )).scalars().all())
        return rows, total

    def _build_agents(self, session, prov_model, org_id, agent_inputs):
        for a in agent_inputs:
            who_type, who_id = _parse_ref_closed(a.who, ProvenanceAgentWhoReferenceType, "agent.who")
            on_behalf_type, on_behalf_id = _parse_ref_closed_optional(
                a.on_behalf_of, ProvenanceAgentWhoReferenceType, "agent.on_behalf_of"
            )
            agent = ProvenanceAgent(
                provenance=prov_model,
                org_id=org_id,
                type_system=a.type_system,
                type_code=a.type_code,
                type_display=a.type_display,
                type_text=a.type_text,
                who_type=who_type,
                who_id=who_id,
                who_display=a.who_display,
                on_behalf_of_type=on_behalf_type,
                on_behalf_of_id=on_behalf_id,
                on_behalf_of_display=a.on_behalf_of_display,
            )
            session.add(agent)
            for r in (a.roles or []):
                session.add(ProvenanceAgentRole(
                    agent=agent, org_id=org_id,
                    coding_system=r.coding_system,
                    coding_code=r.coding_code,
                    coding_display=r.coding_display,
                    text=r.text,
                ))

    def _build_entities(self, session, prov_model, org_id, entity_inputs):
        for e in entity_inputs:
            try:
                role = ProvenanceEntityRole(e.role)
            except ValueError:
                allowed = [r.value for r in ProvenanceEntityRole]
                raise HTTPException(
                    status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Invalid entity role '{e.role}'. Allowed: {allowed}.",
                )
            what_type, what_id = _parse_ref_open(e.what, "entity.what")
            entity = ProvenanceEntity(
                provenance=prov_model,
                org_id=org_id,
                role=role,
                what_type=what_type,
                what_id=what_id,
                what_display=e.what_display,
            )
            session.add(entity)
            for ea in (e.entity_agents or []):
                ea_who_type, ea_who_id = _parse_ref_closed(
                    ea.who, ProvenanceAgentWhoReferenceType, "entity.agent.who"
                )
                ea_ob_type, ea_ob_id = _parse_ref_closed_optional(
                    ea.on_behalf_of, ProvenanceAgentWhoReferenceType, "entity.agent.on_behalf_of"
                )
                session.add(ProvenanceEntityAgent(
                    entity=entity, org_id=org_id,
                    type_system=ea.type_system,
                    type_code=ea.type_code,
                    type_display=ea.type_display,
                    type_text=ea.type_text,
                    who_type=ea_who_type,
                    who_id=ea_who_id,
                    who_display=ea.who_display,
                    on_behalf_of_type=ea_ob_type,
                    on_behalf_of_id=ea_ob_id,
                    on_behalf_of_display=ea.on_behalf_of_display,
                ))

    def _build_signatures(self, session, prov_model, org_id, signature_inputs):
        for s in signature_inputs:
            who_type, who_id = _parse_ref_open_optional(s.who, "signature.who")
            ob_type, ob_id = _parse_ref_open_optional(s.on_behalf_of, "signature.on_behalf_of")
            sig = ProvenanceSignature(
                provenance=prov_model,
                org_id=org_id,
                when=s.when,
                who_type=who_type,
                who_id=who_id,
                who_display=s.who_display,
                on_behalf_of_type=ob_type,
                on_behalf_of_id=ob_id,
                on_behalf_of_display=s.on_behalf_of_display,
                target_format=s.target_format,
                sig_format=s.sig_format,
                data=s.data,
            )
            session.add(sig)
            for st in s.signature_types:
                session.add(ProvenanceSignatureType(
                    signature=sig, org_id=org_id,
                    system=st.system,
                    code=st.code,
                    display=st.display,
                ))

    async def create(
        self,
        payload: ProvenanceCreateSchema,
        user_id: Optional[str],
        org_id: Optional[str],
        created_by: Optional[str],
    ) -> ProvenanceModel:
        async with self.session_factory() as session:
            loc_type, loc_id = _parse_ref_closed_optional(
                payload.location, ProvenanceLocationReferenceType, "location"
            )

            prov = ProvenanceModel(
                user_id=user_id,
                org_id=org_id,
                created_by=created_by,
                recorded=payload.recorded,
                occurred_period_start=payload.occurred_period_start,
                occurred_period_end=payload.occurred_period_end,
                occurred_date_time=payload.occurred_date_time,
                location_type=loc_type,
                location_id=loc_id,
                location_display=payload.location_display,
                activity_system=payload.activity_system,
                activity_code=payload.activity_code,
                activity_display=payload.activity_display,
                activity_text=payload.activity_text,
            )
            session.add(prov)

            for t in payload.targets:
                t_type, t_id = _parse_ref_open(t.reference, "target.reference")
                session.add(ProvenanceTarget(
                    provenance=prov, org_id=org_id,
                    reference_type=t_type,
                    reference_id=t_id,
                    reference_display=t.reference_display,
                ))

            for p in (payload.policies or []):
                session.add(ProvenancePolicy(
                    provenance=prov, org_id=org_id, uri=p.uri
                ))

            for r in (payload.reasons or []):
                session.add(ProvenanceReason(
                    provenance=prov, org_id=org_id,
                    coding_system=r.coding_system,
                    coding_code=r.coding_code,
                    coding_display=r.coding_display,
                    text=r.text,
                ))

            self._build_agents(session, prov, org_id, payload.agents)

            if payload.entities:
                self._build_entities(session, prov, org_id, payload.entities)

            if payload.signatures:
                self._build_signatures(session, prov, org_id, payload.signatures)

            try:
                await session.commit()
                await session.refresh(prov)
            except Exception:
                await session.rollback()
                raise

        return await self.get_by_provenance_id(prov.provenance_id)

    async def patch(
        self,
        provenance_id: int,
        payload: ProvenancePatchSchema,
        updated_by: Optional[str],
    ) -> Optional[ProvenanceModel]:
        async with self.session_factory() as session:
            stmt = _with_relationships(
                select(ProvenanceModel).where(ProvenanceModel.provenance_id == provenance_id)
            )
            result = await session.execute(stmt)
            prov = result.scalars().first()
            if not prov:
                return None

            updates = payload.model_dump(exclude_unset=True)

            scalar_fields = {
                "recorded", "occurred_period_start", "occurred_period_end",
                "occurred_date_time", "location_display",
                "activity_system", "activity_code", "activity_display", "activity_text",
            }

            for field, value in updates.items():
                if field in scalar_fields:
                    setattr(prov, field, value)
                elif field == "location" and value is not None:
                    loc_type, loc_id = _parse_ref_closed(
                        value, ProvenanceLocationReferenceType, "location"
                    )
                    prov.location_type = loc_type
                    prov.location_id = loc_id
                elif field == "targets" and value is not None:
                    for existing in list(prov.targets):
                        await session.delete(existing)
                    for t in value:
                        t_type, t_id = _parse_ref_open(t["reference"], "target.reference")
                        session.add(ProvenanceTarget(
                            provenance=prov, org_id=prov.org_id,
                            reference_type=t_type,
                            reference_id=t_id,
                            reference_display=t.get("reference_display"),
                        ))
                elif field == "policies" and value is not None:
                    for existing in list(prov.policies):
                        await session.delete(existing)
                    for p in value:
                        session.add(ProvenancePolicy(
                            provenance=prov, org_id=prov.org_id, uri=p["uri"]
                        ))
                elif field == "reasons" and value is not None:
                    for existing in list(prov.reasons):
                        await session.delete(existing)
                    for r in value:
                        session.add(ProvenanceReason(
                            provenance=prov, org_id=prov.org_id,
                            coding_system=r.get("coding_system"),
                            coding_code=r.get("coding_code"),
                            coding_display=r.get("coding_display"),
                            text=r.get("text"),
                        ))
                elif field == "agents" and value is not None:
                    for existing in list(prov.agents):
                        await session.delete(existing)
                    await session.flush()
                    agent_inputs = [
                        type("_A", (), {
                            "type_system": a.get("type_system"),
                            "type_code": a.get("type_code"),
                            "type_display": a.get("type_display"),
                            "type_text": a.get("type_text"),
                            "who": a["who"],
                            "who_display": a.get("who_display"),
                            "on_behalf_of": a.get("on_behalf_of"),
                            "on_behalf_of_display": a.get("on_behalf_of_display"),
                            "roles": [
                                type("_R", (), {
                                    "coding_system": r.get("coding_system"),
                                    "coding_code": r.get("coding_code"),
                                    "coding_display": r.get("coding_display"),
                                    "text": r.get("text"),
                                })()
                                for r in a.get("roles") or []
                            ],
                        })()
                        for a in value
                    ]
                    self._build_agents(session, prov, prov.org_id, agent_inputs)
                elif field == "entities" and value is not None:
                    for existing in list(prov.entities):
                        await session.delete(existing)
                    await session.flush()
                    entity_inputs = [
                        type("_E", (), {
                            "role": e["role"],
                            "what": e["what"],
                            "what_display": e.get("what_display"),
                            "entity_agents": [
                                type("_EA", (), {
                                    "type_system": ea.get("type_system"),
                                    "type_code": ea.get("type_code"),
                                    "type_display": ea.get("type_display"),
                                    "type_text": ea.get("type_text"),
                                    "who": ea["who"],
                                    "who_display": ea.get("who_display"),
                                    "on_behalf_of": ea.get("on_behalf_of"),
                                    "on_behalf_of_display": ea.get("on_behalf_of_display"),
                                })()
                                for ea in e.get("entity_agents") or []
                            ],
                        })()
                        for e in value
                    ]
                    self._build_entities(session, prov, prov.org_id, entity_inputs)
                elif field == "signatures" and value is not None:
                    for existing in list(prov.signatures):
                        await session.delete(existing)
                    await session.flush()
                    sig_inputs = [
                        type("_S", (), {
                            "when": s["when"],
                            "who": s.get("who"),
                            "who_display": s.get("who_display"),
                            "on_behalf_of": s.get("on_behalf_of"),
                            "on_behalf_of_display": s.get("on_behalf_of_display"),
                            "target_format": s.get("target_format"),
                            "sig_format": s.get("sig_format"),
                            "data": s.get("data"),
                            "signature_types": [
                                type("_ST", (), {
                                    "system": st.get("system"),
                                    "code": st.get("code"),
                                    "display": st.get("display"),
                                })()
                                for st in s.get("signature_types") or []
                            ],
                        })()
                        for s in value
                    ]
                    self._build_signatures(session, prov, prov.org_id, sig_inputs)

            prov.updated_by = updated_by

            try:
                await session.commit()
                await session.refresh(prov)
            except Exception:
                await session.rollback()
                raise

        return await self.get_by_provenance_id(provenance_id)

    async def delete(self, provenance_id: int) -> None:
        async with self.session_factory() as session:
            stmt = select(ProvenanceModel).where(ProvenanceModel.provenance_id == provenance_id)
            result = await session.execute(stmt)
            prov = result.scalars().first()
            if not prov:
                raise HTTPException(
                    status_code=http_status.HTTP_404_NOT_FOUND,
                    detail="Provenance not found",
                )
            try:
                await session.delete(prov)
                await session.commit()
            except Exception:
                await session.rollback()
                raise
