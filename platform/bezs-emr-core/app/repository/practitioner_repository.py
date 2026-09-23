from typing import List, Optional, Tuple
from sqlalchemy import delete, exists, func
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker  # noqa: F401
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.practitioner import (
    PractitionerModel,
    PractitionerName,
    PractitionerIdentifier,
    PractitionerTelecom,
    PractitionerAddress,
    PractitionerPhoto,
    PractitionerQualification,
    PractitionerQualificationIdentifier,
    PractitionerCommunication,
)
from app.models.enums import OrganizationReferenceType
from app.schemas.practitioner import (
    PractitionerCreateSchema,
    PractitionerPatchSchema,
    PractitionerFullCreateSchema,
    PractitionerFullPatchSchema,
    PractitionerNameCreate,
    PractitionerNamePatch,
    PractitionerIdentifierCreate,
    PractitionerIdentifierPatch,
    PractitionerTelecomCreate,
    PractitionerTelecomPatch,
    PractitionerAddressCreate,
    PractitionerAddressPatch,
    PractitionerPhotoCreate,
    PractitionerPhotoPatch,
    QualificationIdentifierCreate,
    QualificationIdentifierPatch,
    PractitionerQualificationCreate,
    PractitionerQualificationPatch,
    PractitionerCommunicationCreate,
    PractitionerCommunicationPatch,
)


def _split(value: str | None) -> list[str]:
    if not value:
        return []
    return [s.strip() for s in value.split(",") if s.strip()]


def _parse_org_ref(ref: str) -> tuple:
    """Parse 'Organization/123' → (OrganizationReferenceType.Organization, 123)."""
    from fastapi import HTTPException
    parts = ref.split("/", 1)
    if len(parts) != 2:
        raise HTTPException(status_code=422, detail=f"Invalid reference format: '{ref}'.")
    try:
        ref_id = int(parts[1])
    except ValueError:
        raise HTTPException(status_code=422, detail=f"Invalid reference id in: '{ref}'.")
    try:
        ref_type = OrganizationReferenceType(parts[0])
    except ValueError:
        raise HTTPException(status_code=422, detail=f"Invalid reference type '{parts[0]}'. Allowed: ['Organization'].")
    return ref_type, ref_id


def _with_relationships(stmt):
    """Eager-load all practitioner sub-resources to avoid N+1 and async lazy-load failures."""
    return stmt.options(
        selectinload(PractitionerModel.names),
        selectinload(PractitionerModel.identifiers),
        selectinload(PractitionerModel.telecoms),
        selectinload(PractitionerModel.addresses),
        selectinload(PractitionerModel.photos),
        selectinload(PractitionerModel.qualifications).selectinload(PractitionerQualification.identifiers),
        selectinload(PractitionerModel.communications),
    )


class PractitionerRepository:
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]):
        self.session_factory = session_factory

    # ── Read ──────────────────────────────────────────────────────────────

    async def get_by_practitioner_id(self, practitioner_id: int) -> Optional[PractitionerModel]:
        async with self.session_factory() as session:
            stmt = _with_relationships(
                select(PractitionerModel).where(PractitionerModel.practitioner_id == practitioner_id)
            )
            return (await session.execute(stmt)).scalars().first()

    async def get_by_user_id(self, user_id: str) -> Optional[PractitionerModel]:
        async with self.session_factory() as session:
            stmt = _with_relationships(
                select(PractitionerModel).where(PractitionerModel.user_id == user_id)
            )
            return (await session.execute(stmt)).scalars().first()

    async def get_me(self, user_id: str, org_id: str) -> Optional[PractitionerModel]:
        async with self.session_factory() as session:
            stmt = _with_relationships(
                select(PractitionerModel).where(
                    PractitionerModel.user_id == user_id,
                    PractitionerModel.org_id == org_id,
                )
            )
            return (await session.execute(stmt)).scalars().first()

    def _apply_list_filters(self, stmt, user_id, org_id, family_name, given_name, active):
        if user_id:
            stmt = stmt.where(PractitionerModel.user_id == user_id)
        if org_id:
            stmt = stmt.where(PractitionerModel.org_id == org_id)
        if family_name:
            stmt = stmt.where(
                exists(
                    select(PractitionerName.id).where(
                        PractitionerName.practitioner_id == PractitionerModel.id,
                        PractitionerName.family.ilike(f"%{family_name}%"),
                    )
                )
            )
        if given_name:
            stmt = stmt.where(
                exists(
                    select(PractitionerName.id).where(
                        PractitionerName.practitioner_id == PractitionerModel.id,
                        PractitionerName.given.ilike(f"%{given_name}%"),
                    )
                )
            )
        if active is not None:
            stmt = stmt.where(PractitionerModel.active == active)
        return stmt

    async def list(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        family_name: Optional[str] = None,
        given_name: Optional[str] = None,
        active: Optional[bool] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[PractitionerModel], int]:
        async with self.session_factory() as session:
            base = self._apply_list_filters(
                _with_relationships(select(PractitionerModel)),
                user_id, org_id, family_name, given_name, active,
            )
            count_base = self._apply_list_filters(
                select(func.count()).select_from(PractitionerModel),
                user_id, org_id, family_name, given_name, active,
            )
            total = (await session.execute(count_base)).scalar_one()
            rows = list((await session.execute(
                base.order_by(PractitionerModel.practitioner_id.desc()).offset(offset).limit(limit)
            )).scalars().all())
        return rows, total

    # ── Write ─────────────────────────────────────────────────────────────

    async def create(
        self,
        payload: PractitionerCreateSchema,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        created_by: Optional[str] = None,
    ) -> PractitionerModel:
        async with self.session_factory() as session:
            practitioner = PractitionerModel(
                user_id=user_id,
                org_id=org_id,
                active=payload.active,
                gender=payload.gender,
                birth_date=payload.birth_date,
                deceased_boolean=payload.deceased_boolean,
                deceased_datetime=payload.deceased_datetime,
                created_by=created_by,
            )
            try:
                session.add(practitioner)
                await session.commit()
                await session.refresh(practitioner)
            except Exception:
                await session.rollback()
                raise
        return await self.get_by_practitioner_id(practitioner.practitioner_id)

    async def create_full(
        self,
        payload: PractitionerFullCreateSchema,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        created_by: Optional[str] = None,
    ) -> PractitionerModel:
        async with self.session_factory() as session:
            practitioner = PractitionerModel(
                user_id=user_id,
                org_id=org_id,
                active=payload.active,
                gender=payload.gender,
                birth_date=payload.birth_date,
                deceased_boolean=payload.deceased_boolean,
                deceased_datetime=payload.deceased_datetime,
                created_by=created_by,
            )
            session.add(practitioner)
            await session.flush()

            if payload.names:
                for n in payload.names:
                    session.add(PractitionerName(
                        practitioner_id=practitioner.id,
                        org_id=org_id,
                        use=n.use,
                        text=n.text,
                        family=n.family,
                        given=",".join(n.given) if n.given else None,
                        prefix=",".join(n.prefix) if n.prefix else None,
                        suffix=",".join(n.suffix) if n.suffix else None,
                        period_start=n.period_start,
                        period_end=n.period_end,
                    ))

            if payload.identifiers:
                for i in payload.identifiers:
                    session.add(PractitionerIdentifier(
                        practitioner_id=practitioner.id,
                        org_id=org_id,
                        use=i.use,
                        type_system=i.type_system,
                        type_code=i.type_code,
                        type_display=i.type_display,
                        type_text=i.type_text,
                        system=i.system,
                        value=i.value,
                        period_start=i.period_start,
                        period_end=i.period_end,
                        assigner=i.assigner,
                    ))

            if payload.telecom:
                for t in payload.telecom:
                    session.add(PractitionerTelecom(
                        practitioner_id=practitioner.id,
                        org_id=org_id,
                        system=t.system,
                        value=t.value,
                        use=t.use,
                        rank=t.rank,
                        period_start=t.period_start,
                        period_end=t.period_end,
                    ))

            if payload.addresses:
                for a in payload.addresses:
                    session.add(PractitionerAddress(
                        practitioner_id=practitioner.id,
                        org_id=org_id,
                        use=a.use,
                        type=a.type,
                        text=a.text,
                        line=", ".join(a.line) if a.line else None,
                        city=a.city,
                        district=a.district,
                        state=a.state,
                        postal_code=a.postal_code,
                        country=a.country,
                        period_start=a.period_start,
                        period_end=a.period_end,
                    ))

            if payload.photos:
                for p in payload.photos:
                    session.add(PractitionerPhoto(
                        practitioner_id=practitioner.id,
                        org_id=org_id,
                        content_type=p.content_type,
                        language=p.language,
                        data=p.data,
                        url=p.url,
                        size=p.size,
                        hash=p.hash,
                        title=p.title,
                        creation=p.creation,
                    ))

            if payload.qualifications:
                for q in payload.qualifications:
                    qualification = PractitionerQualification(
                        practitioner_id=practitioner.id,
                        org_id=org_id,
                        code_system=q.code_system,
                        code_code=q.code_code,
                        code_display=q.code_display,
                        code_text=q.code_text,
                        status_system=q.status_system,
                        status_code=q.status_code,
                        status_display=q.status_display,
                        status_text=q.status_text,
                        period_start=q.period_start,
                        period_end=q.period_end,
                        issuer_type=(_parse_org_ref(q.issuer)[0] if q.issuer else None),
                        issuer_id=(_parse_org_ref(q.issuer)[1] if q.issuer else None),
                        issuer_display=q.issuer_display,
                    )
                    session.add(qualification)
                    await session.flush()

                    if q.identifier:
                        for qi in q.identifier:
                            session.add(PractitionerQualificationIdentifier(
                                qualification_id=qualification.id,
                                org_id=org_id,
                                use=qi.use,
                                type_system=qi.type_system,
                                type_code=qi.type_code,
                                type_display=qi.type_display,
                                type_text=qi.type_text,
                                system=qi.system,
                                value=qi.value,
                                period_start=qi.period_start,
                                period_end=qi.period_end,
                                assigner=qi.assigner,
                            ))

            if payload.communications:
                for cm in payload.communications:
                    session.add(PractitionerCommunication(
                        practitioner_id=practitioner.id,
                        org_id=org_id,
                        language_system=cm.language_system,
                        language_code=cm.language_code,
                        language_display=cm.language_display,
                        language_text=cm.language_text,
                        preferred=cm.preferred,
                    ))

            try:
                await session.commit()
                await session.refresh(practitioner)
            except Exception:
                await session.rollback()
                raise

        return await self.get_by_practitioner_id(practitioner.practitioner_id)

    async def patch(
        self,
        practitioner_id: int,
        payload: PractitionerPatchSchema,
        updated_by: Optional[str] = None,
    ) -> Optional[PractitionerModel]:
        async with self.session_factory() as session:
            stmt = select(PractitionerModel).where(PractitionerModel.practitioner_id == practitioner_id)
            practitioner = (await session.execute(stmt)).scalars().first()
            if not practitioner:
                return None
            for field, value in payload.model_dump(exclude_unset=True).items():
                setattr(practitioner, field, value)
            if updated_by is not None:
                practitioner.updated_by = updated_by
            try:
                await session.commit()
                await session.refresh(practitioner)
            except Exception:
                await session.rollback()
                raise
        return await self.get_by_practitioner_id(practitioner_id)

    async def patch_full(
        self,
        practitioner_id: int,
        payload: PractitionerFullPatchSchema,
        updated_by: Optional[str] = None,
    ) -> Optional[PractitionerModel]:
        async with self.session_factory() as session:
            stmt = select(PractitionerModel).where(PractitionerModel.practitioner_id == practitioner_id)
            practitioner = (await session.execute(stmt)).scalars().first()
            if not practitioner:
                return None

            _SUB = {"names", "identifiers", "telecom", "addresses", "photos", "qualifications", "communications"}
            for field, value in payload.model_dump(exclude_unset=True).items():
                if field in _SUB:
                    continue
                setattr(practitioner, field, value)
            if updated_by is not None:
                practitioner.updated_by = updated_by

            if payload.names is not None:
                await session.execute(
                    delete(PractitionerName).where(PractitionerName.practitioner_id == practitioner.id)
                )
                for n in payload.names:
                    session.add(PractitionerName(
                        practitioner_id=practitioner.id, org_id=practitioner.org_id,
                        use=n.use, text=n.text, family=n.family,
                        given=",".join(n.given) if n.given else None,
                        prefix=",".join(n.prefix) if n.prefix else None,
                        suffix=",".join(n.suffix) if n.suffix else None,
                        period_start=n.period_start, period_end=n.period_end,
                    ))

            if payload.identifiers is not None:
                await session.execute(
                    delete(PractitionerIdentifier).where(PractitionerIdentifier.practitioner_id == practitioner.id)
                )
                for i in payload.identifiers:
                    session.add(PractitionerIdentifier(
                        practitioner_id=practitioner.id, org_id=practitioner.org_id,
                        use=i.use, type_system=i.type_system, type_code=i.type_code,
                        type_display=i.type_display, type_text=i.type_text,
                        system=i.system, value=i.value,
                        period_start=i.period_start, period_end=i.period_end, assigner=i.assigner,
                    ))

            if payload.telecom is not None:
                await session.execute(
                    delete(PractitionerTelecom).where(PractitionerTelecom.practitioner_id == practitioner.id)
                )
                for t in payload.telecom:
                    session.add(PractitionerTelecom(
                        practitioner_id=practitioner.id, org_id=practitioner.org_id,
                        system=t.system, value=t.value, use=t.use, rank=t.rank,
                        period_start=t.period_start, period_end=t.period_end,
                    ))

            if payload.addresses is not None:
                await session.execute(
                    delete(PractitionerAddress).where(PractitionerAddress.practitioner_id == practitioner.id)
                )
                for a in payload.addresses:
                    session.add(PractitionerAddress(
                        practitioner_id=practitioner.id, org_id=practitioner.org_id,
                        use=a.use, type=a.type, text=a.text,
                        line=",".join(a.line) if a.line else None,
                        city=a.city, district=a.district, state=a.state,
                        postal_code=a.postal_code, country=a.country,
                        period_start=a.period_start, period_end=a.period_end,
                    ))

            if payload.photos is not None:
                await session.execute(
                    delete(PractitionerPhoto).where(PractitionerPhoto.practitioner_id == practitioner.id)
                )
                for p in payload.photos:
                    session.add(PractitionerPhoto(
                        practitioner_id=practitioner.id, org_id=practitioner.org_id,
                        content_type=p.content_type, language=p.language, data=p.data,
                        url=p.url, size=p.size, hash=p.hash, title=p.title, creation=p.creation,
                    ))

            if payload.qualifications is not None:
                qual_ids = list((await session.execute(
                    select(PractitionerQualification.id).where(
                        PractitionerQualification.practitioner_id == practitioner.id
                    )
                )).scalars().all())
                if qual_ids:
                    await session.execute(
                        delete(PractitionerQualificationIdentifier).where(
                            PractitionerQualificationIdentifier.qualification_id.in_(qual_ids)
                        )
                    )
                await session.execute(
                    delete(PractitionerQualification).where(
                        PractitionerQualification.practitioner_id == practitioner.id
                    )
                )
                for q in payload.qualifications:
                    qualification = PractitionerQualification(
                        practitioner_id=practitioner.id, org_id=practitioner.org_id,
                        code_system=q.code_system, code_code=q.code_code,
                        code_display=q.code_display, code_text=q.code_text,
                        status_system=q.status_system, status_code=q.status_code,
                        status_display=q.status_display, status_text=q.status_text,
                        period_start=q.period_start, period_end=q.period_end,
                        issuer_type=(_parse_org_ref(q.issuer)[0] if q.issuer else None),
                        issuer_id=(_parse_org_ref(q.issuer)[1] if q.issuer else None),
                        issuer_display=q.issuer_display,
                    )
                    session.add(qualification)
                    await session.flush()
                    if q.identifier:
                        for qi in q.identifier:
                            session.add(PractitionerQualificationIdentifier(
                                qualification_id=qualification.id, org_id=practitioner.org_id,
                                use=qi.use, type_system=qi.type_system, type_code=qi.type_code,
                                type_display=qi.type_display, type_text=qi.type_text,
                                system=qi.system, value=qi.value,
                                period_start=qi.period_start, period_end=qi.period_end, assigner=qi.assigner,
                            ))

            if payload.communications is not None:
                await session.execute(
                    delete(PractitionerCommunication).where(
                        PractitionerCommunication.practitioner_id == practitioner.id
                    )
                )
                for cm in payload.communications:
                    session.add(PractitionerCommunication(
                        practitioner_id=practitioner.id, org_id=practitioner.org_id,
                        language_system=cm.language_system, language_code=cm.language_code,
                        language_display=cm.language_display, language_text=cm.language_text,
                        preferred=cm.preferred,
                    ))

            try:
                await session.commit()
            except Exception:
                await session.rollback()
                raise

        return await self.get_by_practitioner_id(practitioner_id)

    async def delete(self, practitioner_id: int) -> bool:
        async with self.session_factory() as session:
            stmt = select(PractitionerModel).where(PractitionerModel.practitioner_id == practitioner_id)
            practitioner = (await session.execute(stmt)).scalars().first()
            if not practitioner:
                return False
            try:
                await session.delete(practitioner)
                await session.commit()
                return True
            except Exception:
                await session.rollback()
                raise

    # ── Sub-resource mutations ────────────────────────────────────────────

    async def add_name(
        self, practitioner_id: int, payload: PractitionerNameCreate
    ) -> Optional[PractitionerModel]:
        async with self.session_factory() as session:
            stmt = select(PractitionerModel).where(PractitionerModel.practitioner_id == practitioner_id)
            practitioner = (await session.execute(stmt)).scalars().first()
            if not practitioner:
                return None
            row = PractitionerName(
                practitioner_id=practitioner.id,
                org_id=practitioner.org_id,
                use=payload.use,
                text=payload.text,
                family=payload.family,
                given=",".join(payload.given) if payload.given else None,
                prefix=",".join(payload.prefix) if payload.prefix else None,
                suffix=",".join(payload.suffix) if payload.suffix else None,
                period_start=payload.period_start,
                period_end=payload.period_end,
            )
            try:
                session.add(row)
                await session.commit()
            except Exception:
                await session.rollback()
                raise
        return await self.get_by_practitioner_id(practitioner_id)

    async def add_identifier(
        self, practitioner_id: int, payload: PractitionerIdentifierCreate
    ) -> Optional[PractitionerModel]:
        async with self.session_factory() as session:
            stmt = select(PractitionerModel).where(PractitionerModel.practitioner_id == practitioner_id)
            practitioner = (await session.execute(stmt)).scalars().first()
            if not practitioner:
                return None
            row = PractitionerIdentifier(
                practitioner_id=practitioner.id,
                org_id=practitioner.org_id,
                use=payload.use,
                type_system=payload.type_system,
                type_code=payload.type_code,
                type_display=payload.type_display,
                type_text=payload.type_text,
                system=payload.system,
                value=payload.value,
                period_start=payload.period_start,
                period_end=payload.period_end,
                assigner=payload.assigner,
            )
            try:
                session.add(row)
                await session.commit()
            except Exception:
                await session.rollback()
                raise
        return await self.get_by_practitioner_id(practitioner_id)

    async def add_telecom(
        self, practitioner_id: int, payload: PractitionerTelecomCreate
    ) -> Optional[PractitionerModel]:
        async with self.session_factory() as session:
            stmt = select(PractitionerModel).where(PractitionerModel.practitioner_id == practitioner_id)
            practitioner = (await session.execute(stmt)).scalars().first()
            if not practitioner:
                return None
            row = PractitionerTelecom(
                practitioner_id=practitioner.id,
                org_id=practitioner.org_id,
                system=payload.system,
                value=payload.value,
                use=payload.use,
                rank=payload.rank,
                period_start=payload.period_start,
                period_end=payload.period_end,
            )
            try:
                session.add(row)
                await session.commit()
            except Exception:
                await session.rollback()
                raise
        return await self.get_by_practitioner_id(practitioner_id)

    async def add_address(
        self, practitioner_id: int, payload: PractitionerAddressCreate
    ) -> Optional[PractitionerModel]:
        async with self.session_factory() as session:
            stmt = select(PractitionerModel).where(PractitionerModel.practitioner_id == practitioner_id)
            practitioner = (await session.execute(stmt)).scalars().first()
            if not practitioner:
                return None
            row = PractitionerAddress(
                practitioner_id=practitioner.id,
                org_id=practitioner.org_id,
                use=payload.use,
                type=payload.type,
                text=payload.text,
                line=",".join(payload.line) if payload.line else None,
                city=payload.city,
                district=payload.district,
                state=payload.state,
                postal_code=payload.postal_code,
                country=payload.country,
                period_start=payload.period_start,
                period_end=payload.period_end,
            )
            try:
                session.add(row)
                await session.commit()
            except Exception:
                await session.rollback()
                raise
        return await self.get_by_practitioner_id(practitioner_id)

    async def add_photo(
        self, practitioner_id: int, payload: PractitionerPhotoCreate
    ) -> Optional[PractitionerModel]:
        async with self.session_factory() as session:
            stmt = select(PractitionerModel).where(PractitionerModel.practitioner_id == practitioner_id)
            practitioner = (await session.execute(stmt)).scalars().first()
            if not practitioner:
                return None
            row = PractitionerPhoto(
                practitioner_id=practitioner.id,
                org_id=practitioner.org_id,
                content_type=payload.content_type,
                language=payload.language,
                data=payload.data,
                url=payload.url,
                size=payload.size,
                hash=payload.hash,
                title=payload.title,
                creation=payload.creation,
            )
            try:
                session.add(row)
                await session.commit()
            except Exception:
                await session.rollback()
                raise
        return await self.get_by_practitioner_id(practitioner_id)

    async def add_qualification(
        self, practitioner_id: int, payload: PractitionerQualificationCreate
    ) -> Optional[PractitionerModel]:
        async with self.session_factory() as session:
            stmt = select(PractitionerModel).where(PractitionerModel.practitioner_id == practitioner_id)
            practitioner = (await session.execute(stmt)).scalars().first()
            if not practitioner:
                return None
            qualification = PractitionerQualification(
                practitioner_id=practitioner.id,
                org_id=practitioner.org_id,
                code_system=payload.code_system,
                code_code=payload.code_code,
                code_display=payload.code_display,
                code_text=payload.code_text,
                status_system=payload.status_system,
                status_code=payload.status_code,
                status_display=payload.status_display,
                status_text=payload.status_text,
                period_start=payload.period_start,
                period_end=payload.period_end,
                issuer_type=(_parse_org_ref(payload.issuer)[0] if payload.issuer else None),
                issuer_id=(_parse_org_ref(payload.issuer)[1] if payload.issuer else None),
                issuer_display=payload.issuer_display,
            )
            session.add(qualification)
            await session.flush()  # get qualification.id before adding grandchildren

            if payload.identifier:
                for qi in payload.identifier:
                    session.add(PractitionerQualificationIdentifier(
                        qualification_id=qualification.id,
                        org_id=practitioner.org_id,
                        use=qi.use,
                        type_system=qi.type_system,
                        type_code=qi.type_code,
                        type_display=qi.type_display,
                        type_text=qi.type_text,
                        system=qi.system,
                        value=qi.value,
                        period_start=qi.period_start,
                        period_end=qi.period_end,
                        assigner=qi.assigner,
                    ))

            try:
                await session.commit()
            except Exception:
                await session.rollback()
                raise
        return await self.get_by_practitioner_id(practitioner_id)

    async def add_communication(
        self, practitioner_id: int, payload: PractitionerCommunicationCreate
    ) -> Optional[PractitionerModel]:
        async with self.session_factory() as session:
            stmt = select(PractitionerModel).where(PractitionerModel.practitioner_id == practitioner_id)
            practitioner = (await session.execute(stmt)).scalars().first()
            if not practitioner:
                return None
            row = PractitionerCommunication(
                practitioner_id=practitioner.id,
                org_id=practitioner.org_id,
                language_system=payload.language_system,
                language_code=payload.language_code,
                language_display=payload.language_display,
                language_text=payload.language_text,
                preferred=payload.preferred,
            )
            try:
                session.add(row)
                await session.commit()
            except Exception:
                await session.rollback()
                raise
        return await self.get_by_practitioner_id(practitioner_id)

    # ── Sub-resource reads ────────────────────────────────────────────────────

    async def _get_internal(self, session, practitioner_id: int) -> Optional[PractitionerModel]:
        stmt = select(PractitionerModel).where(PractitionerModel.practitioner_id == practitioner_id)
        return (await session.execute(stmt)).scalars().first()

    async def get_names(self, practitioner_id: int) -> list:
        async with self.session_factory() as session:
            practitioner = await self._get_internal(session, practitioner_id)
            if not practitioner:
                return []
            return list((await session.execute(
                select(PractitionerName).where(PractitionerName.practitioner_id == practitioner.id)
            )).scalars().all())

    async def get_identifiers(self, practitioner_id: int) -> list:
        async with self.session_factory() as session:
            practitioner = await self._get_internal(session, practitioner_id)
            if not practitioner:
                return []
            return list((await session.execute(
                select(PractitionerIdentifier).where(PractitionerIdentifier.practitioner_id == practitioner.id)
            )).scalars().all())

    async def get_telecoms(self, practitioner_id: int) -> list:
        async with self.session_factory() as session:
            practitioner = await self._get_internal(session, practitioner_id)
            if not practitioner:
                return []
            return list((await session.execute(
                select(PractitionerTelecom).where(PractitionerTelecom.practitioner_id == practitioner.id)
            )).scalars().all())

    async def get_addresses(self, practitioner_id: int) -> list:
        async with self.session_factory() as session:
            practitioner = await self._get_internal(session, practitioner_id)
            if not practitioner:
                return []
            return list((await session.execute(
                select(PractitionerAddress).where(PractitionerAddress.practitioner_id == practitioner.id)
            )).scalars().all())

    async def get_photos(self, practitioner_id: int) -> list:
        async with self.session_factory() as session:
            practitioner = await self._get_internal(session, practitioner_id)
            if not practitioner:
                return []
            return list((await session.execute(
                select(PractitionerPhoto).where(PractitionerPhoto.practitioner_id == practitioner.id)
            )).scalars().all())

    async def get_qualifications(self, practitioner_id: int) -> list:
        async with self.session_factory() as session:
            practitioner = await self._get_internal(session, practitioner_id)
            if not practitioner:
                return []
            stmt = (
                select(PractitionerQualification)
                .where(PractitionerQualification.practitioner_id == practitioner.id)
                .options(selectinload(PractitionerQualification.identifiers))
            )
            return list((await session.execute(stmt)).scalars().all())

    async def get_communications(self, practitioner_id: int) -> list:
        async with self.session_factory() as session:
            practitioner = await self._get_internal(session, practitioner_id)
            if not practitioner:
                return []
            return list((await session.execute(
                select(PractitionerCommunication).where(PractitionerCommunication.practitioner_id == practitioner.id)
            )).scalars().all())

    # ── Sub-resource deletes ──────────────────────────────────────────────────

    async def _delete_child(self, session, model_class, child_id: int, parent_internal_id: int) -> bool:
        row = (await session.execute(
            select(model_class).where(model_class.id == child_id)
        )).scalars().first()
        if not row or row.practitioner_id != parent_internal_id:
            return False
        await session.delete(row)
        await session.commit()
        return True

    async def delete_name(self, practitioner_id: int, name_id: int) -> bool:
        async with self.session_factory() as session:
            practitioner = await self._get_internal(session, practitioner_id)
            if not practitioner:
                return False
            return await self._delete_child(session, PractitionerName, name_id, practitioner.id)

    async def delete_identifier(self, practitioner_id: int, identifier_id: int) -> bool:
        async with self.session_factory() as session:
            practitioner = await self._get_internal(session, practitioner_id)
            if not practitioner:
                return False
            return await self._delete_child(session, PractitionerIdentifier, identifier_id, practitioner.id)

    async def delete_telecom(self, practitioner_id: int, telecom_id: int) -> bool:
        async with self.session_factory() as session:
            practitioner = await self._get_internal(session, practitioner_id)
            if not practitioner:
                return False
            return await self._delete_child(session, PractitionerTelecom, telecom_id, practitioner.id)

    async def delete_address(self, practitioner_id: int, address_id: int) -> bool:
        async with self.session_factory() as session:
            practitioner = await self._get_internal(session, practitioner_id)
            if not practitioner:
                return False
            return await self._delete_child(session, PractitionerAddress, address_id, practitioner.id)

    async def delete_photo(self, practitioner_id: int, photo_id: int) -> bool:
        async with self.session_factory() as session:
            practitioner = await self._get_internal(session, practitioner_id)
            if not practitioner:
                return False
            return await self._delete_child(session, PractitionerPhoto, photo_id, practitioner.id)

    async def delete_qualification(self, practitioner_id: int, qualification_id: int) -> bool:
        async with self.session_factory() as session:
            practitioner = await self._get_internal(session, practitioner_id)
            if not practitioner:
                return False
            return await self._delete_child(session, PractitionerQualification, qualification_id, practitioner.id)

    async def delete_communication(self, practitioner_id: int, comm_id: int) -> bool:
        async with self.session_factory() as session:
            practitioner = await self._get_internal(session, practitioner_id)
            if not practitioner:
                return False
            return await self._delete_child(session, PractitionerCommunication, comm_id, practitioner.id)

    # ── Sub-resource patch ─────────────────────────────────────────────────────

    async def _fetch_child(self, session, model_class, child_id: int, parent_internal_id: int):
        """Fetch child by id, verify parent ownership, return row or None."""
        row = (await session.execute(
            select(model_class).where(model_class.id == child_id)
        )).scalars().first()
        if not row or row.practitioner_id != parent_internal_id:
            return None
        return row

    async def patch_name(self, practitioner_id: int, name_id: int, payload: PractitionerNamePatch) -> Optional[PractitionerModel]:
        async with self.session_factory() as session:
            practitioner = await self._get_internal(session, practitioner_id)
            if not practitioner:
                return None
            row = await self._fetch_child(session, PractitionerName, name_id, practitioner.id)
            if not row:
                return None
            data = payload.model_dump(exclude_unset=True)
            for field in ("given", "prefix", "suffix"):
                if field in data:
                    data[field] = ",".join(data[field]) if data[field] else None
            for field, value in data.items():
                setattr(row, field, value)
            try:
                await session.commit()
            except Exception:
                await session.rollback()
                raise
        return await self.get_by_practitioner_id(practitioner_id)

    async def patch_identifier(self, practitioner_id: int, identifier_id: int, payload: PractitionerIdentifierPatch) -> Optional[PractitionerModel]:
        async with self.session_factory() as session:
            practitioner = await self._get_internal(session, practitioner_id)
            if not practitioner:
                return None
            row = await self._fetch_child(session, PractitionerIdentifier, identifier_id, practitioner.id)
            if not row:
                return None
            for field, value in payload.model_dump(exclude_unset=True).items():
                setattr(row, field, value)
            try:
                await session.commit()
            except Exception:
                await session.rollback()
                raise
        return await self.get_by_practitioner_id(practitioner_id)

    async def patch_telecom(self, practitioner_id: int, telecom_id: int, payload: PractitionerTelecomPatch) -> Optional[PractitionerModel]:
        async with self.session_factory() as session:
            practitioner = await self._get_internal(session, practitioner_id)
            if not practitioner:
                return None
            row = await self._fetch_child(session, PractitionerTelecom, telecom_id, practitioner.id)
            if not row:
                return None
            for field, value in payload.model_dump(exclude_unset=True).items():
                setattr(row, field, value)
            try:
                await session.commit()
            except Exception:
                await session.rollback()
                raise
        return await self.get_by_practitioner_id(practitioner_id)

    async def patch_address(self, practitioner_id: int, address_id: int, payload: PractitionerAddressPatch) -> Optional[PractitionerModel]:
        async with self.session_factory() as session:
            practitioner = await self._get_internal(session, practitioner_id)
            if not practitioner:
                return None
            row = await self._fetch_child(session, PractitionerAddress, address_id, practitioner.id)
            if not row:
                return None
            data = payload.model_dump(exclude_unset=True)
            if "line" in data:
                data["line"] = ",".join(data["line"]) if data["line"] else None
            for field, value in data.items():
                setattr(row, field, value)
            try:
                await session.commit()
            except Exception:
                await session.rollback()
                raise
        return await self.get_by_practitioner_id(practitioner_id)

    async def patch_photo(self, practitioner_id: int, photo_id: int, payload: PractitionerPhotoPatch) -> Optional[PractitionerModel]:
        async with self.session_factory() as session:
            practitioner = await self._get_internal(session, practitioner_id)
            if not practitioner:
                return None
            row = await self._fetch_child(session, PractitionerPhoto, photo_id, practitioner.id)
            if not row:
                return None
            for field, value in payload.model_dump(exclude_unset=True).items():
                setattr(row, field, value)
            try:
                await session.commit()
            except Exception:
                await session.rollback()
                raise
        return await self.get_by_practitioner_id(practitioner_id)

    async def patch_qualification(self, practitioner_id: int, qualification_id: int, payload: PractitionerQualificationPatch) -> Optional[PractitionerModel]:
        async with self.session_factory() as session:
            practitioner = await self._get_internal(session, practitioner_id)
            if not practitioner:
                return None
            stmt = (
                select(PractitionerQualification)
                .where(
                    PractitionerQualification.id == qualification_id,
                    PractitionerQualification.practitioner_id == practitioner.id,
                )
                .options(selectinload(PractitionerQualification.identifiers))
            )
            qualification = (await session.execute(stmt)).scalars().first()
            if not qualification:
                return None

            data = payload.model_dump(exclude_unset=True)

            if "identifier" in data:
                for qi in qualification.identifiers:
                    await session.delete(qi)
                for qi in (data.pop("identifier") or []):
                    session.add(PractitionerQualificationIdentifier(
                        qualification_id=qualification.id,
                        org_id=practitioner.org_id,
                        **qi,
                    ))
            else:
                data.pop("identifier", None)

            if "issuer" in data:
                issuer = data.pop("issuer")
                if issuer:
                    qualification.issuer_type, qualification.issuer_id = _parse_org_ref(issuer)
                else:
                    qualification.issuer_type = None
                    qualification.issuer_id = None

            for field, value in data.items():
                setattr(qualification, field, value)

            try:
                await session.commit()
            except Exception:
                await session.rollback()
                raise
        return await self.get_by_practitioner_id(practitioner_id)

    async def patch_communication(self, practitioner_id: int, comm_id: int, payload: PractitionerCommunicationPatch) -> Optional[PractitionerModel]:
        async with self.session_factory() as session:
            practitioner = await self._get_internal(session, practitioner_id)
            if not practitioner:
                return None
            row = await self._fetch_child(session, PractitionerCommunication, comm_id, practitioner.id)
            if not row:
                return None
            for field, value in payload.model_dump(exclude_unset=True).items():
                setattr(row, field, value)
            try:
                await session.commit()
            except Exception:
                await session.rollback()
                raise
        return await self.get_by_practitioner_id(practitioner_id)
