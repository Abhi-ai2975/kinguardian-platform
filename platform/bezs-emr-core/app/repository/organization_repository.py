from typing import List, Optional, Tuple

from fastapi import HTTPException, status as http_status
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker  # noqa: F401
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.enums import OrganizationReferenceType
from app.models.organization.enums import OrganizationEndpointReferenceType
from app.models.organization.organization import (
    OrganizationModel,
    OrganizationIdentifier,
    OrganizationType,
    OrganizationAlias,
    OrganizationTelecom,
    OrganizationAddress,
    OrganizationContact,
    OrganizationContactTelecom,
    OrganizationEndpoint,
)
from app.schemas.organization import OrganizationCreateSchema, OrganizationPatchSchema


def _with_relationships(stmt):
    return stmt.options(
        selectinload(OrganizationModel.identifiers),
        selectinload(OrganizationModel.types),
        selectinload(OrganizationModel.aliases),
        selectinload(OrganizationModel.telecoms),
        selectinload(OrganizationModel.addresses),
        selectinload(OrganizationModel.contacts).selectinload(
            OrganizationContact.telecoms
        ),
        selectinload(OrganizationModel.endpoints),
    )


def _parse_ref(ref: str, enum_cls, field: str):
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


class OrganizationRepository:
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]):
        self.session_factory = session_factory

    # ── Read ──────────────────────────────────────────────────────────────────

    async def get_by_organization_id(self, organization_id: int) -> Optional[OrganizationModel]:
        async with self.session_factory() as session:
            stmt = _with_relationships(
                select(OrganizationModel).where(
                    OrganizationModel.organization_id == organization_id
                )
            )
            result = await session.execute(stmt)
            return result.scalars().first()

    def _apply_list_filters(self, stmt, user_id, org_id, active, name):
        if user_id:
            stmt = stmt.where(OrganizationModel.user_id == user_id)
        if org_id:
            stmt = stmt.where(OrganizationModel.org_id == org_id)
        if active is not None:
            stmt = stmt.where(OrganizationModel.active == active)
        if name:
            stmt = stmt.where(OrganizationModel.name.ilike(f"%{name}%"))
        return stmt

    async def get_me(
        self,
        user_id: str,
        org_id: str,
        active: Optional[bool] = None,
        name: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[OrganizationModel], int]:
        async with self.session_factory() as session:
            base = self._apply_list_filters(
                _with_relationships(select(OrganizationModel)),
                user_id, org_id, active, name,
            )
            count_base = self._apply_list_filters(
                select(func.count()).select_from(OrganizationModel),
                user_id, org_id, active, name,
            )
            total = (await session.execute(count_base)).scalar_one()
            rows = list((await session.execute(
                base.order_by(OrganizationModel.organization_id.desc()).offset(offset).limit(limit)
            )).scalars().all())
        return rows, total

    async def list(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        active: Optional[bool] = None,
        name: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[OrganizationModel], int]:
        async with self.session_factory() as session:
            base = self._apply_list_filters(
                _with_relationships(select(OrganizationModel)),
                user_id, org_id, active, name,
            )
            count_base = self._apply_list_filters(
                select(func.count()).select_from(OrganizationModel),
                user_id, org_id, active, name,
            )
            total = (await session.execute(count_base)).scalar_one()
            rows = list((await session.execute(
                base.order_by(OrganizationModel.organization_id.desc()).offset(offset).limit(limit)
            )).scalars().all())
        return rows, total

    # ── Create ────────────────────────────────────────────────────────────────

    async def create(
        self,
        payload: OrganizationCreateSchema,
        user_id: Optional[str],
        org_id: Optional[str],
        created_by: Optional[str],
    ) -> OrganizationModel:
        async with self.session_factory() as session:
            # resolve partOf
            partof_type_val, partof_id_val = None, None
            if payload.partof:
                partof_type_val, partof_id_val = _parse_ref(
                    payload.partof, OrganizationReferenceType, "partOf"
                )

            org = OrganizationModel(
                user_id=user_id,
                org_id=org_id,
                created_by=created_by,
                active=payload.active,
                name=payload.name,
                partof_type=partof_type_val,
                partof_id=partof_id_val,
                partof_display=payload.partof_display,
            )
            session.add(org)

            # identifier
            for item in (payload.identifier or []):
                session.add(OrganizationIdentifier(
                    organization=org, org_id=org_id,
                    use=item.use.value if item.use else None,
                    type_system=item.type_system, type_code=item.type_code,
                    type_display=item.type_display, type_text=item.type_text,
                    system=item.system, value=item.value,
                    period_start=item.period_start, period_end=item.period_end,
                    assigner=item.assigner,
                ))

            # type
            for item in (payload.type or []):
                session.add(OrganizationType(
                    organization=org, org_id=org_id,
                    coding_system=item.coding_system, coding_code=item.coding_code,
                    coding_display=item.coding_display, text=item.text,
                ))

            # alias
            for item in (payload.alias or []):
                session.add(OrganizationAlias(
                    organization=org, org_id=org_id,
                    value=item.value,
                ))

            # telecom
            for item in (payload.telecom or []):
                session.add(OrganizationTelecom(
                    organization=org, org_id=org_id,
                    system=item.system.value if item.system else None,
                    value=item.value,
                    use=item.use.value if item.use else None,
                    rank=item.rank,
                    period_start=item.period_start, period_end=item.period_end,
                ))

            # address
            for item in (payload.address or []):
                session.add(OrganizationAddress(
                    organization=org, org_id=org_id,
                    use=item.use.value if item.use else None,
                    type=item.type.value if item.type else None,
                    text=item.text,
                    line=",".join(item.line) if item.line else None,
                    city=item.city,
                    district=item.district,
                    state=item.state,
                    postal_code=item.postal_code,
                    country=item.country,
                    period_start=item.period_start, period_end=item.period_end,
                ))

            # contact (nested: contact_telecom)
            for item in (payload.contact or []):
                contact_row = OrganizationContact(
                    organization=org, org_id=org_id,
                    purpose_system=item.purpose_system, purpose_code=item.purpose_code,
                    purpose_display=item.purpose_display, purpose_text=item.purpose_text,
                    name_use=item.name_use.value if item.name_use else None,
                    name_text=item.name_text, name_family=item.name_family,
                    name_given=",".join(item.name_given) if item.name_given else None,
                    name_prefix=",".join(item.name_prefix) if item.name_prefix else None,
                    name_suffix=",".join(item.name_suffix) if item.name_suffix else None,
                    name_period_start=item.name_period_start,
                    name_period_end=item.name_period_end,
                    address_use=item.address_use.value if item.address_use else None,
                    address_type=item.address_type.value if item.address_type else None,
                    address_text=item.address_text,
                    address_line=",".join(item.address_line) if item.address_line else None,
                    address_city=item.address_city, address_district=item.address_district,
                    address_state=item.address_state, address_postal_code=item.address_postal_code,
                    address_country=item.address_country,
                    address_period_start=item.address_period_start,
                    address_period_end=item.address_period_end,
                )
                session.add(contact_row)

                for tc in (item.telecom or []):
                    session.add(OrganizationContactTelecom(
                        contact=contact_row, org_id=org_id,
                        system=tc.system.value if tc.system else None,
                        value=tc.value,
                        use=tc.use.value if tc.use else None,
                        rank=tc.rank,
                        period_start=tc.period_start, period_end=tc.period_end,
                    ))

            # endpoint
            for item in (payload.endpoint or []):
                ep_type, ep_id = _parse_ref(item.reference, OrganizationEndpointReferenceType, "endpoint")
                session.add(OrganizationEndpoint(
                    organization=org, org_id=org_id,
                    reference_type=ep_type, reference_id=ep_id,
                    reference_display=item.reference_display,
                ))

            await session.commit()
            await session.refresh(org)

            stmt = _with_relationships(
                select(OrganizationModel).where(OrganizationModel.id == org.id)
            )
            result = await session.execute(stmt)
            return result.scalars().one()

    # ── Patch ─────────────────────────────────────────────────────────────────

    async def patch(
        self,
        organization_id: int,
        payload: OrganizationPatchSchema,
        updated_by: Optional[str],
    ) -> Optional[OrganizationModel]:
        async with self.session_factory() as session:
            stmt = _with_relationships(
                select(OrganizationModel).where(
                    OrganizationModel.organization_id == organization_id
                )
            )
            result = await session.execute(stmt)
            org = result.scalars().first()
            if not org:
                return None

            updates = payload.model_dump(exclude_unset=True)
            for field, value in updates.items():
                setattr(org, field, value)
            org.updated_by = updated_by

            await session.commit()
            await session.refresh(org)

            stmt = _with_relationships(
                select(OrganizationModel).where(OrganizationModel.id == org.id)
            )
            result = await session.execute(stmt)
            return result.scalars().one()

    # ── Delete ────────────────────────────────────────────────────────────────

    async def delete(self, organization_id: int) -> None:
        async with self.session_factory() as session:
            stmt = select(OrganizationModel).where(
                OrganizationModel.organization_id == organization_id
            )
            result = await session.execute(stmt)
            org = result.scalars().first()
            if org:
                await session.delete(org)
                await session.commit()
