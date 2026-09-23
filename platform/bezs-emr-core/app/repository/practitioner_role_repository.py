from typing import List, Optional, Tuple

from fastapi import HTTPException, status as http_status
from sqlalchemy import func, or_
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker  # noqa: F401
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.enums import OrganizationReferenceType
from app.models.healthcare_service.healthcare_service import (
    HealthcareServiceModel,
    HealthcareServiceCategory,
)
from app.models.location.location import LocationModel, LocationTelecom
from app.models.practitioner.practitioner import (
    PractitionerModel,
    PractitionerName,
    PractitionerQualification,
    PractitionerTelecom,
    PractitionerPhoto,
)
from app.models.practitioner_role.enums import (
    PractitionerRoleEndpointReferenceType,
    PractitionerRoleHealthcareServiceReferenceType,
    PractitionerRoleLocationReferenceType,
)
from app.models.practitioner_role.practitioner_role import (
    PractitionerRoleAvailability,
    PractitionerRoleAvailabilityTime,
    PractitionerRoleCharacteristic,
    PractitionerRoleCommunication,
    PractitionerRoleContact,
    PractitionerRoleContactName,
    PractitionerRoleContactTelecom,
    PractitionerRoleCode,
    PractitionerRoleEndpoint,
    PractitionerRoleHealthcareService,
    PractitionerRoleIdentifier,
    PractitionerRoleLocation,
    PractitionerRoleModel,
    PractitionerRoleNotAvailableTime,
    PractitionerRoleSpecialty,
)
from app.schemas.practitioner_role import (
    PractitionerRoleCreateSchema,
    PractitionerRolePatchSchema,
)


def _with_relationships(stmt):
    return stmt.options(
        selectinload(PractitionerRoleModel.identifiers),
        selectinload(PractitionerRoleModel.codes),
        selectinload(PractitionerRoleModel.specialties),
        selectinload(PractitionerRoleModel.locations),
        selectinload(PractitionerRoleModel.healthcare_services),
        selectinload(PractitionerRoleModel.characteristics),
        selectinload(PractitionerRoleModel.communications),
        selectinload(PractitionerRoleModel.contacts).selectinload(PractitionerRoleContact.names),
        selectinload(PractitionerRoleModel.contacts).selectinload(PractitionerRoleContact.telecoms),
        selectinload(PractitionerRoleModel.availabilities).selectinload(PractitionerRoleAvailability.available_times),
        selectinload(PractitionerRoleModel.availabilities).selectinload(PractitionerRoleAvailability.not_available_times),
        selectinload(PractitionerRoleModel.endpoints),
    )


def _with_booking_relationships(stmt):
    """Extends _with_relationships to also eager-load all linked Practitioner sub-resources."""
    return stmt.options(
        selectinload(PractitionerRoleModel.identifiers),
        selectinload(PractitionerRoleModel.codes),
        selectinload(PractitionerRoleModel.specialties),
        selectinload(PractitionerRoleModel.locations),
        selectinload(PractitionerRoleModel.healthcare_services),
        selectinload(PractitionerRoleModel.characteristics),
        selectinload(PractitionerRoleModel.communications),
        selectinload(PractitionerRoleModel.contacts).selectinload(PractitionerRoleContact.names),
        selectinload(PractitionerRoleModel.contacts).selectinload(PractitionerRoleContact.telecoms),
        selectinload(PractitionerRoleModel.availabilities).selectinload(PractitionerRoleAvailability.available_times),
        selectinload(PractitionerRoleModel.availabilities).selectinload(PractitionerRoleAvailability.not_available_times),
        selectinload(PractitionerRoleModel.endpoints),
        selectinload(PractitionerRoleModel.practitioner).selectinload(PractitionerModel.names),
        selectinload(PractitionerRoleModel.practitioner).selectinload(PractitionerModel.identifiers),
        selectinload(PractitionerRoleModel.practitioner).selectinload(PractitionerModel.telecoms),
        selectinload(PractitionerRoleModel.practitioner).selectinload(PractitionerModel.addresses),
        selectinload(PractitionerRoleModel.practitioner).selectinload(PractitionerModel.photos),
        selectinload(PractitionerRoleModel.practitioner).selectinload(PractitionerModel.qualifications).selectinload(PractitionerQualification.identifiers),
        selectinload(PractitionerRoleModel.practitioner).selectinload(PractitionerModel.communications),
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


class PractitionerRoleRepository:
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]):
        self.session_factory = session_factory

    # ── Read ──────────────────────────────────────────────────────────────────

    async def get_by_practitioner_role_id(
        self, practitioner_role_id: int
    ) -> Optional[PractitionerRoleModel]:
        async with self.session_factory() as session:
            stmt = _with_relationships(
                select(PractitionerRoleModel).where(
                    PractitionerRoleModel.practitioner_role_id == practitioner_role_id
                )
            )
            result = await session.execute(stmt)
            return result.scalars().first()

    def _apply_list_filters(self, stmt, user_id, org_id, active, practitioner_id):
        if user_id:
            stmt = stmt.where(PractitionerRoleModel.user_id == user_id)
        if org_id:
            stmt = stmt.where(PractitionerRoleModel.org_id == org_id)
        if active is not None:
            stmt = stmt.where(PractitionerRoleModel.active == active)
        if practitioner_id is not None:
            sub = (
                select(PractitionerModel.id)
                .where(PractitionerModel.practitioner_id == practitioner_id)
                .scalar_subquery()
            )
            stmt = stmt.where(PractitionerRoleModel.practitioner_fk_id == sub)
        return stmt

    async def get_me(
        self,
        user_id: str,
        org_id: str,
        active: Optional[bool] = None,
        practitioner_id: Optional[int] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[PractitionerRoleModel], int]:
        async with self.session_factory() as session:
            base = self._apply_list_filters(
                _with_relationships(select(PractitionerRoleModel)),
                user_id, org_id, active, practitioner_id,
            )
            count_base = self._apply_list_filters(
                select(func.count()).select_from(PractitionerRoleModel),
                user_id, org_id, active, practitioner_id,
            )
            total = (await session.execute(count_base)).scalar_one()
            rows = list((await session.execute(
                base.order_by(PractitionerRoleModel.practitioner_role_id.desc())
                    .offset(offset).limit(limit)
            )).scalars().all())
        return rows, total

    async def list(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        active: Optional[bool] = None,
        practitioner_id: Optional[int] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[PractitionerRoleModel], int]:
        async with self.session_factory() as session:
            base = self._apply_list_filters(
                _with_relationships(select(PractitionerRoleModel)),
                user_id, org_id, active, practitioner_id,
            )
            count_base = self._apply_list_filters(
                select(func.count()).select_from(PractitionerRoleModel),
                user_id, org_id, active, practitioner_id,
            )
            total = (await session.execute(count_base)).scalar_one()
            rows = list((await session.execute(
                base.order_by(PractitionerRoleModel.practitioner_role_id.desc())
                    .offset(offset).limit(limit)
            )).scalars().all())
        return rows, total

    async def list_for_booking(
        self,
        org_id: Optional[str] = None,
        active: Optional[bool] = True,
        specialty_code: Optional[str] = None,
        day_of_week: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[PractitionerRoleModel], int]:
        async with self.session_factory() as session:
            base = _with_booking_relationships(select(PractitionerRoleModel))
            count_base = select(func.count()).select_from(PractitionerRoleModel)

            if org_id:
                base = base.where(PractitionerRoleModel.org_id == org_id)
                count_base = count_base.where(PractitionerRoleModel.org_id == org_id)
            if active is not None:
                base = base.where(PractitionerRoleModel.active == active)
                count_base = count_base.where(PractitionerRoleModel.active == active)
            if specialty_code:
                sp_sub = (
                    select(PractitionerRoleSpecialty.practitioner_role_id)
                    .where(PractitionerRoleSpecialty.coding_code == specialty_code)
                    .scalar_subquery()
                )
                base = base.where(PractitionerRoleModel.id.in_(sp_sub))
                count_base = count_base.where(PractitionerRoleModel.id.in_(sp_sub))
            if day_of_week:
                avt_sub = (
                    select(PractitionerRoleAvailabilityTime.availability_id)
                    .where(or_(
                        PractitionerRoleAvailabilityTime.days_of_week.contains(day_of_week),
                        PractitionerRoleAvailabilityTime.all_day == True,  # noqa: E712
                    ))
                    .scalar_subquery()
                )
                av_sub = (
                    select(PractitionerRoleAvailability.practitioner_role_id)
                    .where(PractitionerRoleAvailability.id.in_(avt_sub))
                    .scalar_subquery()
                )
                base = base.where(PractitionerRoleModel.id.in_(av_sub))
                count_base = count_base.where(PractitionerRoleModel.id.in_(av_sub))

            total = (await session.execute(count_base)).scalar_one()
            rows = list((await session.execute(
                base.order_by(PractitionerRoleModel.practitioner_role_id)
                    .offset(offset).limit(limit)
            )).scalars().all())

            # Batch-load Location and HealthcareService details for booking enrichment
            loc_pub_ids = {
                loc.reference_id for pr in rows for loc in pr.locations if loc.reference_id
            }
            hs_pub_ids = {
                hs.reference_id for pr in rows for hs in pr.healthcare_services if hs.reference_id
            }

            loc_lookup: dict = {}
            if loc_pub_ids:
                loc_rows = (await session.execute(
                    select(LocationModel)
                    .options(selectinload(LocationModel.telecoms))
                    .where(LocationModel.location_id.in_(loc_pub_ids))
                )).scalars().all()
                loc_lookup = {lm.location_id: lm for lm in loc_rows}

            hs_lookup: dict = {}
            if hs_pub_ids:
                hs_rows = (await session.execute(
                    select(HealthcareServiceModel)
                    .options(selectinload(HealthcareServiceModel.categories))
                    .where(HealthcareServiceModel.healthcare_service_id.in_(hs_pub_ids))
                )).scalars().all()
                hs_lookup = {hm.healthcare_service_id: hm for hm in hs_rows}

        return rows, total, loc_lookup, hs_lookup

    # ── Create ────────────────────────────────────────────────────────────────

    async def create(
        self,
        payload: PractitionerRoleCreateSchema,
        user_id: Optional[str],
        org_id: Optional[str],
        created_by: Optional[str],
    ) -> PractitionerRoleModel:
        async with self.session_factory() as session:
            # Resolve practitioner reference
            prac_fk_id = None
            prac_ref_id = None
            if payload.practitioner:
                parts = payload.practitioner.split("/", 1)
                if len(parts) != 2 or parts[0] != "Practitioner":
                    raise HTTPException(
                        status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail=f"Invalid practitioner reference: '{payload.practitioner}'. Expected 'Practitioner/<id>'.",
                    )
                try:
                    prac_ref_id = int(parts[1])
                except ValueError:
                    raise HTTPException(
                        status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail=f"Invalid practitioner id in: '{payload.practitioner}'.",
                    )
                prac_row = (await session.execute(
                    select(PractitionerModel).where(PractitionerModel.practitioner_id == prac_ref_id)
                )).scalars().first()
                if not prac_row:
                    raise HTTPException(
                        status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail=f"Practitioner '{payload.practitioner}' not found.",
                    )
                prac_fk_id = prac_row.id

            # Resolve organization reference (no FK — just store type + raw int)
            org_type = None
            org_id_val = None
            if payload.organization:
                org_type, org_id_val = _parse_ref(
                    payload.organization, OrganizationReferenceType, "organization"
                )

            pr = PractitionerRoleModel(
                user_id=user_id,
                org_id=org_id,
                created_by=created_by,
                active=payload.active,
                period_start=payload.period_start,
                period_end=payload.period_end,
                practitioner_fk_id=prac_fk_id,
                practitioner_ref_id=prac_ref_id,
                practitioner_display=payload.practitioner_display,
                organization_type=org_type,
                organization_id=org_id_val,
                organization_display=payload.organization_display,
                availability_exceptions=payload.availability_exceptions,
            )
            session.add(pr)

            for item in (payload.identifier or []):
                session.add(PractitionerRoleIdentifier(
                    practitioner_role=pr, org_id=org_id,
                    use=item.use,
                    type_system=item.type_system, type_code=item.type_code,
                    type_display=item.type_display, type_text=item.type_text,
                    system=item.system, value=item.value,
                    period_start=item.period_start, period_end=item.period_end,
                    assigner=item.assigner,
                ))

            for item in (payload.code or []):
                session.add(PractitionerRoleCode(
                    practitioner_role=pr, org_id=org_id,
                    coding_system=item.coding_system, coding_code=item.coding_code,
                    coding_display=item.coding_display, text=item.text,
                ))

            for item in (payload.specialty or []):
                session.add(PractitionerRoleSpecialty(
                    practitioner_role=pr, org_id=org_id,
                    coding_system=item.coding_system, coding_code=item.coding_code,
                    coding_display=item.coding_display, text=item.text,
                ))

            for item in (payload.location or []):
                ref_type, ref_id = _parse_ref(
                    item.reference, PractitionerRoleLocationReferenceType, "location"
                )
                session.add(PractitionerRoleLocation(
                    practitioner_role=pr, org_id=org_id,
                    reference_type=ref_type, reference_id=ref_id,
                    reference_display=item.reference_display,
                ))

            for item in (payload.healthcare_service or []):
                ref_type, ref_id = _parse_ref(
                    item.reference, PractitionerRoleHealthcareServiceReferenceType, "healthcareService"
                )
                session.add(PractitionerRoleHealthcareService(
                    practitioner_role=pr, org_id=org_id,
                    reference_type=ref_type, reference_id=ref_id,
                    reference_display=item.reference_display,
                ))

            for item in (payload.characteristic or []):
                session.add(PractitionerRoleCharacteristic(
                    practitioner_role=pr, org_id=org_id,
                    coding_system=item.coding_system, coding_code=item.coding_code,
                    coding_display=item.coding_display, text=item.text,
                ))

            for item in (payload.communication or []):
                session.add(PractitionerRoleCommunication(
                    practitioner_role=pr, org_id=org_id,
                    coding_system=item.coding_system, coding_code=item.coding_code,
                    coding_display=item.coding_display, text=item.text,
                ))

            for c_item in (payload.contact or []):
                c_org_type = None
                c_org_id = None
                if c_item.organization:
                    c_org_type, c_org_id = _parse_ref(
                        c_item.organization, OrganizationReferenceType, "contact.organization"
                    )
                contact = PractitionerRoleContact(
                    practitioner_role=pr, org_id=org_id,
                    purpose_system=c_item.purpose_system,
                    purpose_code=c_item.purpose_code,
                    purpose_display=c_item.purpose_display,
                    purpose_text=c_item.purpose_text,
                    address_use=c_item.address_use,
                    address_type=c_item.address_type,
                    address_text=c_item.address_text,
                    address_line=",".join(c_item.address_line) if c_item.address_line else None,
                    address_city=c_item.address_city,
                    address_district=c_item.address_district,
                    address_state=c_item.address_state,
                    address_postal_code=c_item.address_postal_code,
                    address_country=c_item.address_country,
                    address_period_start=c_item.address_period_start,
                    address_period_end=c_item.address_period_end,
                    organization_type=c_org_type,
                    organization_id=c_org_id,
                    organization_display=c_item.organization_display,
                    period_start=c_item.period_start,
                    period_end=c_item.period_end,
                )
                session.add(contact)

                for n_item in (c_item.names or []):
                    session.add(PractitionerRoleContactName(
                        contact=contact, org_id=org_id,
                        use=n_item.use,
                        text=n_item.text,
                        family=n_item.family,
                        given=",".join(n_item.given) if n_item.given else None,
                        prefix=",".join(n_item.prefix) if n_item.prefix else None,
                        suffix=",".join(n_item.suffix) if n_item.suffix else None,
                        period_start=n_item.period_start,
                        period_end=n_item.period_end,
                    ))

                for t_item in (c_item.telecoms or []):
                    session.add(PractitionerRoleContactTelecom(
                        contact=contact, org_id=org_id,
                        system=t_item.system,
                        value=t_item.value,
                        use=t_item.use,
                        rank=t_item.rank,
                        period_start=t_item.period_start,
                        period_end=t_item.period_end,
                    ))

            for av_item in (payload.availability or []):
                av = PractitionerRoleAvailability(
                    practitioner_role=pr, org_id=org_id,
                )
                session.add(av)

                for at_item in (av_item.available_times or []):
                    session.add(PractitionerRoleAvailabilityTime(
                        availability=av, org_id=org_id,
                        days_of_week=",".join(at_item.days_of_week) if at_item.days_of_week else None,
                        all_day=at_item.all_day,
                        available_start_time=at_item.available_start_time,
                        available_end_time=at_item.available_end_time,
                    ))

                for nat_item in (av_item.not_available_times or []):
                    session.add(PractitionerRoleNotAvailableTime(
                        availability=av, org_id=org_id,
                        description=nat_item.description,
                        during_start=nat_item.during_start,
                        during_end=nat_item.during_end,
                    ))

            for item in (payload.endpoint or []):
                ref_type, ref_id = _parse_ref(
                    item.reference, PractitionerRoleEndpointReferenceType, "endpoint"
                )
                session.add(PractitionerRoleEndpoint(
                    practitioner_role=pr, org_id=org_id,
                    reference_type=ref_type, reference_id=ref_id,
                    reference_display=item.reference_display,
                ))

            await session.commit()
            await session.refresh(pr)

            stmt = _with_relationships(
                select(PractitionerRoleModel).where(PractitionerRoleModel.id == pr.id)
            )
            result = await session.execute(stmt)
            return result.scalars().one()

    # ── Patch ─────────────────────────────────────────────────────────────────

    async def patch(
        self,
        practitioner_role_id: int,
        payload: PractitionerRolePatchSchema,
        updated_by: Optional[str],
    ) -> Optional[PractitionerRoleModel]:
        async with self.session_factory() as session:
            stmt = _with_relationships(
                select(PractitionerRoleModel).where(
                    PractitionerRoleModel.practitioner_role_id == practitioner_role_id
                )
            )
            result = await session.execute(stmt)
            pr = result.scalars().first()
            if not pr:
                return None

            for field, value in payload.model_dump(exclude_unset=True).items():
                setattr(pr, field, value)
            pr.updated_by = updated_by

            await session.commit()
            await session.refresh(pr)

            stmt = _with_relationships(
                select(PractitionerRoleModel).where(PractitionerRoleModel.id == pr.id)
            )
            result = await session.execute(stmt)
            return result.scalars().one()

    # ── Delete ────────────────────────────────────────────────────────────────

    async def delete(self, practitioner_role_id: int) -> None:
        async with self.session_factory() as session:
            stmt = select(PractitionerRoleModel).where(
                PractitionerRoleModel.practitioner_role_id == practitioner_role_id
            )
            result = await session.execute(stmt)
            pr = result.scalars().first()
            if pr:
                await session.delete(pr)
                await session.commit()
