from typing import List, Optional, Tuple

from fastapi import HTTPException, status as http_status
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker  # noqa: F401
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.enums import OrganizationReferenceType
from app.models.healthcare_service.enums import (
    HealthcareServiceCoverageAreaReferenceType,
    HealthcareServiceEndpointReferenceType,
    HealthcareServiceLocationReferenceType,
)
from app.models.healthcare_service.healthcare_service import (
    HealthcareServiceAvailableTime,
    HealthcareServiceCategory,
    HealthcareServiceCharacteristic,
    HealthcareServiceCommunication,
    HealthcareServiceCoverageArea,
    HealthcareServiceEligibility,
    HealthcareServiceEndpoint,
    HealthcareServiceIdentifier,
    HealthcareServiceLocation,
    HealthcareServiceModel,
    HealthcareServiceNotAvailable,
    HealthcareServiceProgram,
    HealthcareServiceReferralMethod,
    HealthcareServiceServiceProvisionCode,
    HealthcareServiceSpecialty,
    HealthcareServiceTelecom,
    HealthcareServiceType,
)
from app.schemas.enums import ContactPointSystem, ContactPointUse
from app.schemas.healthcare_service import (
    HealthcareServiceCreateSchema,
    HealthcareServicePatchSchema,
)


def _with_relationships(stmt):
    return stmt.options(
        selectinload(HealthcareServiceModel.identifiers),
        selectinload(HealthcareServiceModel.categories),
        selectinload(HealthcareServiceModel.types),
        selectinload(HealthcareServiceModel.specialties),
        selectinload(HealthcareServiceModel.locations),
        selectinload(HealthcareServiceModel.telecoms),
        selectinload(HealthcareServiceModel.coverage_areas),
        selectinload(HealthcareServiceModel.service_provision_codes),
        selectinload(HealthcareServiceModel.eligibilities),
        selectinload(HealthcareServiceModel.programs),
        selectinload(HealthcareServiceModel.characteristics),
        selectinload(HealthcareServiceModel.communications),
        selectinload(HealthcareServiceModel.referral_methods),
        selectinload(HealthcareServiceModel.available_times),
        selectinload(HealthcareServiceModel.not_available),
        selectinload(HealthcareServiceModel.endpoints),
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


class HealthcareServiceRepository:
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]):
        self.session_factory = session_factory

    # ── Read ──────────────────────────────────────────────────────────────────

    async def get_by_healthcare_service_id(
        self, healthcare_service_id: int
    ) -> Optional[HealthcareServiceModel]:
        async with self.session_factory() as session:
            stmt = _with_relationships(
                select(HealthcareServiceModel).where(
                    HealthcareServiceModel.healthcare_service_id == healthcare_service_id
                )
            )
            result = await session.execute(stmt)
            return result.scalars().first()

    def _apply_list_filters(self, stmt, user_id, org_id, active, name):
        if user_id:
            stmt = stmt.where(HealthcareServiceModel.user_id == user_id)
        if org_id:
            stmt = stmt.where(HealthcareServiceModel.org_id == org_id)
        if active is not None:
            stmt = stmt.where(HealthcareServiceModel.active == active)
        if name:
            stmt = stmt.where(HealthcareServiceModel.name.ilike(f"%{name}%"))
        return stmt

    async def get_me(
        self,
        user_id: str,
        org_id: str,
        active: Optional[bool] = None,
        name: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[HealthcareServiceModel], int]:
        async with self.session_factory() as session:
            base = self._apply_list_filters(
                _with_relationships(select(HealthcareServiceModel)),
                user_id, org_id, active, name,
            )
            count_base = self._apply_list_filters(
                select(func.count()).select_from(HealthcareServiceModel),
                user_id, org_id, active, name,
            )
            total = (await session.execute(count_base)).scalar_one()
            rows = list((await session.execute(
                base.order_by(HealthcareServiceModel.healthcare_service_id.desc())
                .offset(offset).limit(limit)
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
    ) -> Tuple[List[HealthcareServiceModel], int]:
        async with self.session_factory() as session:
            base = self._apply_list_filters(
                _with_relationships(select(HealthcareServiceModel)),
                user_id, org_id, active, name,
            )
            count_base = self._apply_list_filters(
                select(func.count()).select_from(HealthcareServiceModel),
                user_id, org_id, active, name,
            )
            total = (await session.execute(count_base)).scalar_one()
            rows = list((await session.execute(
                base.order_by(HealthcareServiceModel.healthcare_service_id.desc())
                .offset(offset).limit(limit)
            )).scalars().all())
        return rows, total

    # ── Create ────────────────────────────────────────────────────────────────

    async def create(
        self,
        payload: HealthcareServiceCreateSchema,
        user_id: Optional[str],
        org_id: Optional[str],
        created_by: Optional[str],
    ) -> HealthcareServiceModel:
        async with self.session_factory() as session:
            pb_type, pb_id = None, None
            if payload.provided_by:
                pb_type, pb_id = _parse_ref(
                    payload.provided_by, OrganizationReferenceType, "provided_by"
                )

            hs = HealthcareServiceModel(
                user_id=user_id,
                org_id=org_id,
                created_by=created_by,
                active=payload.active,
                provided_by_type=pb_type,
                provided_by_id=pb_id,
                provided_by_display=payload.provided_by_display,
                name=payload.name,
                comment=payload.comment,
                extra_details=payload.extra_details,
                photo_content_type=payload.photo_content_type,
                photo_language=payload.photo_language,
                photo_data=payload.photo_data,
                photo_url=payload.photo_url,
                photo_size=payload.photo_size,
                photo_hash=payload.photo_hash,
                photo_title=payload.photo_title,
                photo_creation=payload.photo_creation,
                appointment_required=payload.appointment_required,
                availability_exceptions=payload.availability_exceptions,
            )
            session.add(hs)

            for item in (payload.identifier or []):
                session.add(HealthcareServiceIdentifier(
                    healthcare_service=hs, org_id=org_id,
                    use=item.use,
                    type_system=item.type_system, type_code=item.type_code,
                    type_display=item.type_display, type_text=item.type_text,
                    system=item.system, value=item.value,
                    period_start=item.period_start, period_end=item.period_end,
                    assigner=item.assigner,
                ))

            for item in (payload.category or []):
                session.add(HealthcareServiceCategory(
                    healthcare_service=hs, org_id=org_id,
                    coding_system=item.coding_system, coding_code=item.coding_code,
                    coding_display=item.coding_display, text=item.text,
                ))

            for item in (payload.type or []):
                session.add(HealthcareServiceType(
                    healthcare_service=hs, org_id=org_id,
                    coding_system=item.coding_system, coding_code=item.coding_code,
                    coding_display=item.coding_display, text=item.text,
                ))

            for item in (payload.specialty or []):
                session.add(HealthcareServiceSpecialty(
                    healthcare_service=hs, org_id=org_id,
                    coding_system=item.coding_system, coding_code=item.coding_code,
                    coding_display=item.coding_display, text=item.text,
                ))

            for item in (payload.location or []):
                loc_type, loc_id = _parse_ref(
                    item.reference, HealthcareServiceLocationReferenceType, "location"
                )
                session.add(HealthcareServiceLocation(
                    healthcare_service=hs, org_id=org_id,
                    reference_type=loc_type, reference_id=loc_id,
                    reference_display=item.reference_display,
                ))

            for item in (payload.telecom or []):
                session.add(HealthcareServiceTelecom(
                    healthcare_service=hs, org_id=org_id,
                    system=ContactPointSystem(item.system) if item.system else None,
                    value=item.value,
                    use=ContactPointUse(item.use) if item.use else None,
                    rank=item.rank,
                    period_start=item.period_start,
                    period_end=item.period_end,
                ))

            for item in (payload.coverage_area or []):
                ca_type, ca_id = _parse_ref(
                    item.reference, HealthcareServiceCoverageAreaReferenceType, "coverage_area"
                )
                session.add(HealthcareServiceCoverageArea(
                    healthcare_service=hs, org_id=org_id,
                    reference_type=ca_type, reference_id=ca_id,
                    reference_display=item.reference_display,
                ))

            for item in (payload.service_provision_code or []):
                session.add(HealthcareServiceServiceProvisionCode(
                    healthcare_service=hs, org_id=org_id,
                    coding_system=item.coding_system, coding_code=item.coding_code,
                    coding_display=item.coding_display, text=item.text,
                ))

            for item in (payload.eligibility or []):
                session.add(HealthcareServiceEligibility(
                    healthcare_service=hs, org_id=org_id,
                    code_system=item.code_system, code_code=item.code_code,
                    code_display=item.code_display, code_text=item.code_text,
                    comment=item.comment,
                ))

            for item in (payload.program or []):
                session.add(HealthcareServiceProgram(
                    healthcare_service=hs, org_id=org_id,
                    coding_system=item.coding_system, coding_code=item.coding_code,
                    coding_display=item.coding_display, text=item.text,
                ))

            for item in (payload.characteristic or []):
                session.add(HealthcareServiceCharacteristic(
                    healthcare_service=hs, org_id=org_id,
                    coding_system=item.coding_system, coding_code=item.coding_code,
                    coding_display=item.coding_display, text=item.text,
                ))

            for item in (payload.communication or []):
                session.add(HealthcareServiceCommunication(
                    healthcare_service=hs, org_id=org_id,
                    coding_system=item.coding_system, coding_code=item.coding_code,
                    coding_display=item.coding_display, text=item.text,
                ))

            for item in (payload.referral_method or []):
                session.add(HealthcareServiceReferralMethod(
                    healthcare_service=hs, org_id=org_id,
                    coding_system=item.coding_system, coding_code=item.coding_code,
                    coding_display=item.coding_display, text=item.text,
                ))

            for item in (payload.available_time or []):
                session.add(HealthcareServiceAvailableTime(
                    healthcare_service=hs, org_id=org_id,
                    days_of_week=",".join(item.days_of_week) if item.days_of_week else None,
                    all_day=item.all_day,
                    available_start_time=item.available_start_time,
                    available_end_time=item.available_end_time,
                ))

            for item in (payload.not_available or []):
                session.add(HealthcareServiceNotAvailable(
                    healthcare_service=hs, org_id=org_id,
                    description=item.description,
                    during_start=item.during_start,
                    during_end=item.during_end,
                ))

            for item in (payload.endpoint or []):
                ep_type, ep_id = _parse_ref(
                    item.reference, HealthcareServiceEndpointReferenceType, "endpoint"
                )
                session.add(HealthcareServiceEndpoint(
                    healthcare_service=hs, org_id=org_id,
                    reference_type=ep_type, reference_id=ep_id,
                    reference_display=item.reference_display,
                ))

            await session.commit()
            await session.refresh(hs)

            stmt = _with_relationships(
                select(HealthcareServiceModel).where(HealthcareServiceModel.id == hs.id)
            )
            result = await session.execute(stmt)
            return result.scalars().one()

    # ── Patch ─────────────────────────────────────────────────────────────────

    async def patch(
        self,
        healthcare_service_id: int,
        payload: HealthcareServicePatchSchema,
        updated_by: Optional[str],
    ) -> Optional[HealthcareServiceModel]:
        async with self.session_factory() as session:
            stmt = _with_relationships(
                select(HealthcareServiceModel).where(
                    HealthcareServiceModel.healthcare_service_id == healthcare_service_id
                )
            )
            result = await session.execute(stmt)
            hs = result.scalars().first()
            if not hs:
                return None

            updates = payload.model_dump(exclude_unset=True)
            for field, value in updates.items():
                setattr(hs, field, value)
            hs.updated_by = updated_by

            await session.commit()
            await session.refresh(hs)

            stmt = _with_relationships(
                select(HealthcareServiceModel).where(HealthcareServiceModel.id == hs.id)
            )
            result = await session.execute(stmt)
            return result.scalars().one()

    # ── Delete ────────────────────────────────────────────────────────────────

    async def delete(self, healthcare_service_id: int) -> None:
        async with self.session_factory() as session:
            stmt = select(HealthcareServiceModel).where(
                HealthcareServiceModel.healthcare_service_id == healthcare_service_id
            )
            result = await session.execute(stmt)
            hs = result.scalars().first()
            if hs:
                await session.delete(hs)
                await session.commit()
