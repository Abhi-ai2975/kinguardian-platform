from typing import List, Optional, Tuple

from fastapi import HTTPException, status as http_status
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker  # noqa: F401
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.enums import OrganizationReferenceType
from app.models.location.enums import (
    LocationEndpointReferenceType,
    LocationMode,
    LocationPartOfReferenceType,
    LocationStatus,
)
from app.models.location.location import (
    LocationAlias,
    LocationEndpoint,
    LocationHoursOfOperation,
    LocationIdentifier,
    LocationModel,
    LocationTelecom,
    LocationType,
)
from app.schemas.enums import ContactPointSystem, ContactPointUse
from app.schemas.location.input import LocationCreateSchema, LocationPatchSchema


def _with_relationships(stmt):
    return stmt.options(
        selectinload(LocationModel.identifiers),
        selectinload(LocationModel.aliases),
        selectinload(LocationModel.types),
        selectinload(LocationModel.telecoms),
        selectinload(LocationModel.hours_of_operation),
        selectinload(LocationModel.endpoints),
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


def _parse_ref_optional(ref: Optional[str], enum_cls, field: str):
    if not ref:
        return None, None
    return _parse_ref(ref, enum_cls, field)


def _cast_contact_point_system(value: Optional[str]) -> Optional[ContactPointSystem]:
    if not value:
        return None
    try:
        return ContactPointSystem(value)
    except ValueError:
        return None


def _cast_contact_point_use(value: Optional[str]) -> Optional[ContactPointUse]:
    if not value:
        return None
    try:
        return ContactPointUse(value)
    except ValueError:
        return None


class LocationRepository:
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]):
        self.session_factory = session_factory

    async def get_by_location_id(self, location_id: int) -> Optional[LocationModel]:
        async with self.session_factory() as session:
            stmt = _with_relationships(
                select(LocationModel).where(LocationModel.location_id == location_id)
            )
            result = await session.execute(stmt)
            return result.scalars().first()

    def _apply_list_filters(self, stmt, user_id, org_id, location_status):
        if user_id:
            stmt = stmt.where(LocationModel.user_id == user_id)
        if org_id:
            stmt = stmt.where(LocationModel.org_id == org_id)
        if location_status:
            try:
                stmt = stmt.where(LocationModel.status == LocationStatus(location_status))
            except ValueError:
                pass
        return stmt

    async def get_me(
        self,
        user_id: str,
        org_id: str,
        location_status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[LocationModel], int]:
        async with self.session_factory() as session:
            base = self._apply_list_filters(
                _with_relationships(select(LocationModel)),
                user_id, org_id, location_status,
            )
            count_base = self._apply_list_filters(
                select(func.count()).select_from(LocationModel),
                user_id, org_id, location_status,
            )
            total = (await session.execute(count_base)).scalar_one()
            rows = list((await session.execute(
                base.order_by(LocationModel.location_id.desc()).offset(offset).limit(limit)
            )).scalars().all())
        return rows, total

    async def list(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        location_status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[LocationModel], int]:
        async with self.session_factory() as session:
            base = self._apply_list_filters(
                _with_relationships(select(LocationModel)),
                user_id, org_id, location_status,
            )
            count_base = self._apply_list_filters(
                select(func.count()).select_from(LocationModel),
                user_id, org_id, location_status,
            )
            total = (await session.execute(count_base)).scalar_one()
            rows = list((await session.execute(
                base.order_by(LocationModel.location_id.desc()).offset(offset).limit(limit)
            )).scalars().all())
        return rows, total

    async def create(
        self,
        payload: LocationCreateSchema,
        user_id: Optional[str],
        org_id: Optional[str],
        created_by: Optional[str],
    ) -> LocationModel:
        async with self.session_factory() as session:
            org_type, org_id_val = _parse_ref_optional(
                payload.managing_organization, OrganizationReferenceType, "managingOrganization"
            )
            po_type, po_id = _parse_ref_optional(
                payload.part_of, LocationPartOfReferenceType, "partOf"
            )

            status_enum = None
            if payload.status:
                try:
                    status_enum = LocationStatus(payload.status)
                except ValueError:
                    raise HTTPException(
                        status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail=f"Invalid status '{payload.status}'. Allowed: {[s.value for s in LocationStatus]}.",
                    )

            mode_enum = None
            if payload.mode:
                try:
                    mode_enum = LocationMode(payload.mode)
                except ValueError:
                    raise HTTPException(
                        status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail=f"Invalid mode '{payload.mode}'. Allowed: {[m.value for m in LocationMode]}.",
                    )

            location = LocationModel(
                user_id=user_id,
                org_id=org_id,
                created_by=created_by,
                status=status_enum.value if status_enum else None,
                operational_status_system=payload.operational_status_system,
                operational_status_code=payload.operational_status_code,
                operational_status_display=payload.operational_status_display,
                name=payload.name,
                description=payload.description,
                mode=mode_enum.value if mode_enum else None,
                address_use=payload.address_use,
                address_type=payload.address_type,
                address_text=payload.address_text,
                address_line=",".join(payload.address_line) if payload.address_line else None,
                address_city=payload.address_city,
                address_district=payload.address_district,
                address_state=payload.address_state,
                address_postal_code=payload.address_postal_code,
                address_country=payload.address_country,
                address_period_start=payload.address_period_start,
                address_period_end=payload.address_period_end,
                physical_type_system=payload.physical_type_system,
                physical_type_code=payload.physical_type_code,
                physical_type_display=payload.physical_type_display,
                physical_type_text=payload.physical_type_text,
                managing_organization_type=org_type,
                managing_organization_id=org_id_val,
                managing_organization_display=payload.managing_organization_display,
                part_of_type=po_type,
                part_of_id=po_id,
                part_of_display=payload.part_of_display,
                availability_exceptions=payload.availability_exceptions,
                position_longitude=payload.position_longitude,
                position_latitude=payload.position_latitude,
                position_altitude=payload.position_altitude,
            )
            session.add(location)

            for item in (payload.identifiers or []):
                session.add(LocationIdentifier(
                    location=location, org_id=org_id,
                    use=item.use,
                    type_system=item.type_system, type_code=item.type_code,
                    type_display=item.type_display, type_text=item.type_text,
                    system=item.system, value=item.value,
                    period_start=item.period_start, period_end=item.period_end,
                    assigner=item.assigner,
                ))

            for alias_str in (payload.aliases or []):
                session.add(LocationAlias(location=location, org_id=org_id, alias=alias_str))

            for t in (payload.types or []):
                session.add(LocationType(
                    location=location, org_id=org_id,
                    coding_system=t.coding_system, coding_code=t.coding_code,
                    coding_display=t.coding_display, text=t.text,
                ))

            for tc in (payload.telecoms or []):
                session.add(LocationTelecom(
                    location=location, org_id=org_id,
                    system=_cast_contact_point_system(tc.system),
                    value=tc.value,
                    use=_cast_contact_point_use(tc.use),
                    rank=tc.rank,
                    period_start=tc.period_start,
                    period_end=tc.period_end,
                ))

            for h in (payload.hours_of_operation or []):
                session.add(LocationHoursOfOperation(
                    location=location, org_id=org_id,
                    days_of_week=",".join(h.days_of_week) if h.days_of_week else None,
                    all_day=h.all_day,
                    opening_time=h.opening_time,
                    closing_time=h.closing_time,
                ))

            for ep in (payload.endpoints or []):
                ep_type, ep_id = _parse_ref(ep.reference, LocationEndpointReferenceType, "endpoint")
                session.add(LocationEndpoint(
                    location=location, org_id=org_id,
                    reference_type=ep_type,
                    reference_id=ep_id,
                    reference_display=ep.reference_display,
                ))

            try:
                await session.commit()
                await session.refresh(location)
            except Exception:
                await session.rollback()
                raise

        return await self.get_by_location_id(location.location_id)

    async def patch(
        self,
        location_id: int,
        payload: LocationPatchSchema,
        updated_by: Optional[str],
    ) -> Optional[LocationModel]:
        async with self.session_factory() as session:
            stmt = select(LocationModel).where(LocationModel.location_id == location_id)
            result = await session.execute(stmt)
            location = result.scalars().first()
            if not location:
                return None

            updates = payload.model_dump(exclude_unset=True)
            for field, value in updates.items():
                if field == "status" and value is not None:
                    try:
                        setattr(location, field, LocationStatus(value).value)
                    except ValueError:
                        raise HTTPException(
                            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail=f"Invalid status '{value}'.",
                        )
                elif field == "mode" and value is not None:
                    try:
                        setattr(location, field, LocationMode(value).value)
                    except ValueError:
                        raise HTTPException(
                            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail=f"Invalid mode '{value}'.",
                        )
                elif field == "managing_organization" and value is not None:
                    org_type, org_id_val = _parse_ref(value, OrganizationReferenceType, "managingOrganization")
                    location.managing_organization_type = org_type
                    location.managing_organization_id = org_id_val
                elif field == "part_of" and value is not None:
                    po_type, po_id = _parse_ref(value, LocationPartOfReferenceType, "partOf")
                    location.part_of_type = po_type
                    location.part_of_id = po_id
                elif field == "address_line" and value is not None:
                    location.address_line = ",".join(value) if value else None
                elif field not in ("managing_organization", "part_of"):
                    setattr(location, field, value)

            location.updated_by = updated_by

            try:
                await session.commit()
                await session.refresh(location)
            except Exception:
                await session.rollback()
                raise

        return await self.get_by_location_id(location_id)

    async def delete(self, location_id: int) -> None:
        async with self.session_factory() as session:
            stmt = select(LocationModel).where(LocationModel.location_id == location_id)
            result = await session.execute(stmt)
            location = result.scalars().first()
            if not location:
                raise HTTPException(
                    status_code=http_status.HTTP_404_NOT_FOUND,
                    detail="Location not found",
                )
            try:
                await session.delete(location)
                await session.commit()
            except Exception:
                await session.rollback()
                raise
