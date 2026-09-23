from typing import List, Optional, Tuple

from fastapi import HTTPException, status as http_status
from sqlalchemy import delete, exists, func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker  # noqa: F401
from sqlalchemy.orm import selectinload

from app.models.patient.patient import (
    PatientModel,
    PatientAddress,
    PatientCommunication,
    PatientContact,
    PatientContactRelationship,
    PatientContactTelecom,
    PatientGeneralPractitioner,
    PatientIdentifier,
    PatientLink,
    PatientName,
    PatientPhoto,
    PatientTelecom,
)
from app.models.enums import OrganizationReferenceType
from app.schemas.resources import (
    AddressCreate,
    AddressPatch,
    CommunicationCreate,
    CommunicationPatch,
    ContactCreate,
    ContactPatch,
    GeneralPractitionerCreate,
    GeneralPractitionerPatch,
    IdentifierCreate,
    IdentifierPatch,
    LinkCreate,
    LinkPatch,
    NameCreate,
    NamePatch,
    PatientCreateSchema,
    PatientFullCreateSchema,
    PatientPatchSchema,
    PatientFullPatchSchema,
    PhotoCreate,
    PhotoPatch,
    TelecomCreate,
    TelecomPatch,
)


def _parse_org_ref(ref: str) -> tuple:
    """Parse 'Organization/123' → (OrganizationReferenceType.Organization, 123)."""
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
        ref_type = OrganizationReferenceType(parts[0])
    except ValueError:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid reference type '{parts[0]}'. Allowed: ['Organization'].",
        )
    return ref_type, ref_id


def _with_relationships(stmt):
    return stmt.options(
        selectinload(PatientModel.names),
        selectinload(PatientModel.identifiers),
        selectinload(PatientModel.telecoms),
        selectinload(PatientModel.addresses),
        selectinload(PatientModel.photos),
        selectinload(PatientModel.contacts).selectinload(PatientContact.relationships),
        selectinload(PatientModel.contacts).selectinload(PatientContact.telecoms),
        selectinload(PatientModel.communications),
        selectinload(PatientModel.general_practitioners),
        selectinload(PatientModel.links),
    )


class PatientRepository:
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]):
        self.session_factory = session_factory

    # ── Read ──────────────────────────────────────────────────────────────────

    async def get_by_patient_id(self, patient_id: int) -> Optional[PatientModel]:
        async with self.session_factory() as session:
            stmt = _with_relationships(
                select(PatientModel).where(PatientModel.patient_id == patient_id)
            )
            result = await session.execute(stmt)
            return result.scalars().first()

    async def get_by_patient_id_in_org(
        self, patient_id: int, user_id: str, org_id: str
    ) -> Optional[PatientModel]:
        async with self.session_factory() as session:
            stmt = _with_relationships(
                select(PatientModel).where(
                    PatientModel.patient_id == patient_id,
                    PatientModel.org_id == org_id,
                )
            )
            result = await session.execute(stmt)
            return result.scalars().first()

    async def get_by_user_id(self, user_id: str) -> Optional[PatientModel]:
        async with self.session_factory() as session:
            stmt = _with_relationships(
                select(PatientModel).where(PatientModel.user_id == user_id)
            )
            result = await session.execute(stmt)
            return result.scalars().first()

    async def get_me(self, user_id: str, org_id: str) -> Optional[PatientModel]:
        async with self.session_factory() as session:
            stmt = _with_relationships(
                select(PatientModel).where(
                    PatientModel.user_id == user_id,
                    PatientModel.org_id == org_id,
                )
            )
            result = await session.execute(stmt)
            return result.scalars().first()

    def _apply_list_filters(self, stmt, user_id, org_id, family_name, given_name, gender, active):
        if user_id:
            stmt = stmt.where(PatientModel.user_id == user_id)
        if org_id:
            stmt = stmt.where(PatientModel.org_id == org_id)
        if family_name:
            stmt = stmt.where(
                exists(
                    select(PatientName.id).where(
                        PatientName.patient_id == PatientModel.id,
                        PatientName.family.ilike(f"%{family_name}%"),
                    )
                )
            )
        if given_name:
            stmt = stmt.where(
                exists(
                    select(PatientName.id).where(
                        PatientName.patient_id == PatientModel.id,
                        PatientName.given.ilike(f"%{given_name}%"),
                    )
                )
            )
        if gender is not None:
            stmt = stmt.where(PatientModel.gender == gender)
        if active is not None:
            stmt = stmt.where(PatientModel.active == active)
        return stmt

    async def list(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        family_name: Optional[str] = None,
        given_name: Optional[str] = None,
        gender: Optional[str] = None,
        active: Optional[bool] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[PatientModel], int]:
        async with self.session_factory() as session:
            base = self._apply_list_filters(
                _with_relationships(select(PatientModel)),
                user_id, org_id, family_name, given_name, gender, active,
            )
            count_base = self._apply_list_filters(
                select(func.count()).select_from(PatientModel),
                user_id, org_id, family_name, given_name, gender, active,
            )
            total = (await session.execute(count_base)).scalar_one()
            rows = list((await session.execute(
                base.order_by(PatientModel.patient_id.desc()).offset(offset).limit(limit)
            )).scalars().all())
        return rows, total

    # ── Write ─────────────────────────────────────────────────────────────────

    async def create(
        self,
        payload: PatientCreateSchema,
        user_id: Optional[str],
        org_id: Optional[str] = None,
        created_by: Optional[str] = None,
    ) -> PatientModel:
        async with self.session_factory() as session:
            patient = PatientModel(
                user_id=user_id,
                org_id=org_id,
                active=payload.active,
                gender=payload.gender,
                birth_date=payload.birth_date,
                deceased_boolean=payload.deceased_boolean,
                deceased_datetime=payload.deceased_datetime,
                marital_status_system=payload.marital_status_system,
                marital_status_code=payload.marital_status_code,
                marital_status_display=payload.marital_status_display,
                marital_status_text=payload.marital_status_text,
                multiple_birth_boolean=payload.multiple_birth_boolean,
                multiple_birth_integer=payload.multiple_birth_integer,
                managing_organization_type=(
                    _parse_org_ref(payload.managing_organization)[0]
                    if payload.managing_organization else None
                ),
                managing_organization_id=(
                    _parse_org_ref(payload.managing_organization)[1]
                    if payload.managing_organization else None
                ),
                managing_organization_display=payload.managing_organization_display,
                created_by=created_by,
            )
            try:
                session.add(patient)
                await session.commit()
                await session.refresh(patient)
            except Exception:
                await session.rollback()
                raise

        return await self.get_by_patient_id(patient.patient_id)

    async def create_full(
        self,
        payload: PatientFullCreateSchema,
        user_id: Optional[str],
        org_id: Optional[str] = None,
        created_by: Optional[str] = None,
    ) -> PatientModel:
        async with self.session_factory() as session:
            patient = PatientModel(
                user_id=user_id,
                org_id=org_id,
                active=payload.active,
                gender=payload.gender,
                birth_date=payload.birth_date,
                deceased_boolean=payload.deceased_boolean,
                deceased_datetime=payload.deceased_datetime,
                marital_status_system=payload.marital_status_system,
                marital_status_code=payload.marital_status_code,
                marital_status_display=payload.marital_status_display,
                marital_status_text=payload.marital_status_text,
                multiple_birth_boolean=payload.multiple_birth_boolean,
                multiple_birth_integer=payload.multiple_birth_integer,
                managing_organization_type=(
                    _parse_org_ref(payload.managing_organization)[0]
                    if payload.managing_organization else None
                ),
                managing_organization_id=(
                    _parse_org_ref(payload.managing_organization)[1]
                    if payload.managing_organization else None
                ),
                managing_organization_display=payload.managing_organization_display,
                created_by=created_by,
            )
            session.add(patient)
            await session.flush()

            if payload.names:
                for n in payload.names:
                    session.add(PatientName(
                        patient_id=patient.id,
                        org_id=org_id,
                        use=n.use,
                        text=n.text,
                        family=n.family,
                        given=", ".join(n.given) if n.given else None,
                        prefix=", ".join(n.prefix) if n.prefix else None,
                        suffix=", ".join(n.suffix) if n.suffix else None,
                        period_start=n.period_start,
                        period_end=n.period_end,
                    ))

            if payload.identifiers:
                for i in payload.identifiers:
                    session.add(PatientIdentifier(
                        patient_id=patient.id,
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
                    session.add(PatientTelecom(
                        patient_id=patient.id,
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
                    session.add(PatientAddress(
                        patient_id=patient.id,
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
                    session.add(PatientPhoto(
                        patient_id=patient.id,
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

            if payload.contacts:
                for c in payload.contacts:
                    contact = PatientContact(
                        patient_id=patient.id,
                        org_id=org_id,
                        name_use=c.name_use,
                        name_text=c.name_text,
                        name_family=c.name_family,
                        name_given=", ".join(c.name_given) if c.name_given else None,
                        name_prefix=", ".join(c.name_prefix) if c.name_prefix else None,
                        name_suffix=", ".join(c.name_suffix) if c.name_suffix else None,
                        address_use=c.address_use,
                        address_type=c.address_type,
                        address_text=c.address_text,
                        address_line=", ".join(c.address_line) if c.address_line else None,
                        address_city=c.address_city,
                        address_district=c.address_district,
                        address_state=c.address_state,
                        address_postal_code=c.address_postal_code,
                        address_country=c.address_country,
                        address_period_start=c.address_period_start,
                        address_period_end=c.address_period_end,
                        gender=c.gender,
                        organization_type=(
                            _parse_org_ref(c.organization)[0]
                            if c.organization else None
                        ),
                        organization_id=(
                            _parse_org_ref(c.organization)[1]
                            if c.organization else None
                        ),
                        organization_display=c.organization_display,
                        period_start=c.period_start,
                        period_end=c.period_end,
                    )
                    session.add(contact)
                    await session.flush()

                    if c.relationship:
                        for r in c.relationship:
                            session.add(PatientContactRelationship(
                                contact_id=contact.id,
                                org_id=org_id,
                                coding_system=r.coding_system,
                                coding_code=r.coding_code,
                                coding_display=r.coding_display,
                                text=r.text,
                            ))

                    if c.telecom:
                        for t in c.telecom:
                            session.add(PatientContactTelecom(
                                contact_id=contact.id,
                                org_id=org_id,
                                system=t.system,
                                value=t.value,
                                use=t.use,
                                rank=t.rank,
                                period_start=t.period_start,
                                period_end=t.period_end,
                            ))

            if payload.communications:
                for cm in payload.communications:
                    session.add(PatientCommunication(
                        patient_id=patient.id,
                        org_id=org_id,
                        language_system=cm.language_system,
                        language_code=cm.language_code,
                        language_display=cm.language_display,
                        language_text=cm.language_text,
                        preferred=cm.preferred,
                    ))

            if payload.general_practitioners:
                for gp in payload.general_practitioners:
                    session.add(PatientGeneralPractitioner(
                        patient_id=patient.id,
                        org_id=org_id,
                        reference_type=gp.reference_type,
                        reference_id=gp.reference_id,
                        reference_display=gp.reference_display,
                    ))

            if payload.links:
                for lk in payload.links:
                    session.add(PatientLink(
                        patient_id=patient.id,
                        org_id=org_id,
                        other_type=lk.other_type,
                        other_id=lk.other_id,
                        other_display=lk.other_display,
                        type=lk.type,
                    ))

            try:
                await session.commit()
                await session.refresh(patient)
            except Exception:
                await session.rollback()
                raise

        return await self.get_by_patient_id(patient.patient_id)

    async def patch(
        self,
        patient_id: int,
        payload: PatientPatchSchema,
        updated_by: Optional[str] = None,
    ) -> Optional[PatientModel]:
        async with self.session_factory() as session:
            stmt = select(PatientModel).where(PatientModel.patient_id == patient_id)
            result = await session.execute(stmt)
            patient = result.scalars().first()

            if not patient:
                return None

            for field, value in payload.model_dump(exclude_unset=True).items():
                if field == "managing_organization":
                    if value is not None:
                        ref_type, ref_id = _parse_org_ref(value)
                        patient.managing_organization_type = ref_type
                        patient.managing_organization_id = ref_id
                    else:
                        patient.managing_organization_type = None
                        patient.managing_organization_id = None
                else:
                    setattr(patient, field, value)
            if updated_by is not None:
                patient.updated_by = updated_by

            try:
                await session.commit()
                await session.refresh(patient)
            except Exception:
                await session.rollback()
                raise

        return await self.get_by_patient_id(patient_id)

    async def patch_full(
        self,
        patient_id: int,
        payload: PatientFullPatchSchema,
        updated_by: Optional[str] = None,
    ) -> Optional[PatientModel]:
        async with self.session_factory() as session:
            stmt = select(PatientModel).where(PatientModel.patient_id == patient_id)
            patient = (await session.execute(stmt)).scalars().first()
            if not patient:
                return None

            _SUB = {
                "names", "identifiers", "telecom", "addresses", "photos",
                "contacts", "communications", "general_practitioners", "links",
            }
            for field, value in payload.model_dump(exclude_unset=True).items():
                if field in _SUB:
                    continue
                if field == "managing_organization":
                    if value is not None:
                        patient.managing_organization_type, patient.managing_organization_id = _parse_org_ref(value)
                    else:
                        patient.managing_organization_type = None
                        patient.managing_organization_id = None
                else:
                    setattr(patient, field, value)
            if updated_by is not None:
                patient.updated_by = updated_by

            if payload.names is not None:
                await session.execute(delete(PatientName).where(PatientName.patient_id == patient.id))
                for n in payload.names:
                    session.add(PatientName(
                        patient_id=patient.id, org_id=patient.org_id,
                        use=n.use, text=n.text, family=n.family,
                        given=", ".join(n.given) if n.given else None,
                        prefix=", ".join(n.prefix) if n.prefix else None,
                        suffix=", ".join(n.suffix) if n.suffix else None,
                        period_start=n.period_start, period_end=n.period_end,
                    ))

            if payload.identifiers is not None:
                await session.execute(delete(PatientIdentifier).where(PatientIdentifier.patient_id == patient.id))
                for i in payload.identifiers:
                    session.add(PatientIdentifier(
                        patient_id=patient.id, org_id=patient.org_id,
                        use=i.use, type_system=i.type_system, type_code=i.type_code,
                        type_display=i.type_display, type_text=i.type_text,
                        system=i.system, value=i.value,
                        period_start=i.period_start, period_end=i.period_end, assigner=i.assigner,
                    ))

            if payload.telecom is not None:
                await session.execute(delete(PatientTelecom).where(PatientTelecom.patient_id == patient.id))
                for t in payload.telecom:
                    session.add(PatientTelecom(
                        patient_id=patient.id, org_id=patient.org_id,
                        system=t.system, value=t.value, use=t.use, rank=t.rank,
                        period_start=t.period_start, period_end=t.period_end,
                    ))

            if payload.addresses is not None:
                await session.execute(delete(PatientAddress).where(PatientAddress.patient_id == patient.id))
                for a in payload.addresses:
                    session.add(PatientAddress(
                        patient_id=patient.id, org_id=patient.org_id,
                        use=a.use, type=a.type, text=a.text,
                        line=", ".join(a.line) if a.line else None,
                        city=a.city, district=a.district, state=a.state,
                        postal_code=a.postal_code, country=a.country,
                        period_start=a.period_start, period_end=a.period_end,
                    ))

            if payload.photos is not None:
                await session.execute(delete(PatientPhoto).where(PatientPhoto.patient_id == patient.id))
                for p in payload.photos:
                    session.add(PatientPhoto(
                        patient_id=patient.id, org_id=patient.org_id,
                        content_type=p.content_type, language=p.language, data=p.data,
                        url=p.url, size=p.size, hash=p.hash, title=p.title, creation=p.creation,
                    ))

            if payload.contacts is not None:
                contact_ids = list((await session.execute(
                    select(PatientContact.id).where(PatientContact.patient_id == patient.id)
                )).scalars().all())
                if contact_ids:
                    await session.execute(
                        delete(PatientContactRelationship).where(
                            PatientContactRelationship.contact_id.in_(contact_ids)
                        )
                    )
                    await session.execute(
                        delete(PatientContactTelecom).where(
                            PatientContactTelecom.contact_id.in_(contact_ids)
                        )
                    )
                await session.execute(delete(PatientContact).where(PatientContact.patient_id == patient.id))
                for c in payload.contacts:
                    contact = PatientContact(
                        patient_id=patient.id, org_id=patient.org_id,
                        name_use=c.name_use, name_text=c.name_text, name_family=c.name_family,
                        name_given=", ".join(c.name_given) if c.name_given else None,
                        name_prefix=", ".join(c.name_prefix) if c.name_prefix else None,
                        name_suffix=", ".join(c.name_suffix) if c.name_suffix else None,
                        address_use=c.address_use, address_type=c.address_type, address_text=c.address_text,
                        address_line=", ".join(c.address_line) if c.address_line else None,
                        address_city=c.address_city, address_district=c.address_district,
                        address_state=c.address_state, address_postal_code=c.address_postal_code,
                        address_country=c.address_country,
                        address_period_start=c.address_period_start, address_period_end=c.address_period_end,
                        gender=c.gender,
                        organization_type=(_parse_org_ref(c.organization)[0] if c.organization else None),
                        organization_id=(_parse_org_ref(c.organization)[1] if c.organization else None),
                        organization_display=c.organization_display,
                        period_start=c.period_start, period_end=c.period_end,
                    )
                    session.add(contact)
                    await session.flush()
                    if c.relationship:
                        for r in c.relationship:
                            session.add(PatientContactRelationship(
                                contact_id=contact.id, org_id=patient.org_id,
                                coding_system=r.coding_system, coding_code=r.coding_code,
                                coding_display=r.coding_display, text=r.text,
                            ))
                    if c.telecom:
                        for t in c.telecom:
                            session.add(PatientContactTelecom(
                                contact_id=contact.id, org_id=patient.org_id,
                                system=t.system, value=t.value, use=t.use, rank=t.rank,
                                period_start=t.period_start, period_end=t.period_end,
                            ))

            if payload.communications is not None:
                await session.execute(delete(PatientCommunication).where(PatientCommunication.patient_id == patient.id))
                for cm in payload.communications:
                    session.add(PatientCommunication(
                        patient_id=patient.id, org_id=patient.org_id,
                        language_system=cm.language_system, language_code=cm.language_code,
                        language_display=cm.language_display, language_text=cm.language_text,
                        preferred=cm.preferred,
                    ))

            if payload.general_practitioners is not None:
                await session.execute(
                    delete(PatientGeneralPractitioner).where(PatientGeneralPractitioner.patient_id == patient.id)
                )
                for gp in payload.general_practitioners:
                    session.add(PatientGeneralPractitioner(
                        patient_id=patient.id, org_id=patient.org_id,
                        reference_type=gp.reference_type, reference_id=gp.reference_id,
                        reference_display=gp.reference_display,
                    ))

            if payload.links is not None:
                await session.execute(delete(PatientLink).where(PatientLink.patient_id == patient.id))
                for lk in payload.links:
                    session.add(PatientLink(
                        patient_id=patient.id, org_id=patient.org_id,
                        other_type=lk.other_type, other_id=lk.other_id,
                        other_display=lk.other_display, type=lk.type,
                    ))

            try:
                await session.commit()
            except Exception:
                await session.rollback()
                raise

        return await self.get_by_patient_id(patient_id)

    async def delete(self, patient_id: int) -> bool:
        async with self.session_factory() as session:
            stmt = select(PatientModel).where(PatientModel.patient_id == patient_id)
            result = await session.execute(stmt)
            patient = result.scalars().first()

            if not patient:
                return False

            try:
                await session.delete(patient)
                await session.commit()
                return True
            except Exception:
                await session.rollback()
                raise

    # ── Sub-resource mutations ─────────────────────────────────────────────────

    async def _get_internal(self, session, patient_id: int) -> Optional[PatientModel]:
        """Fetch by public patient_id — internal PK only, no relationships loaded."""
        result = await session.execute(
            select(PatientModel).where(PatientModel.patient_id == patient_id)
        )
        return result.scalars().first()

    async def add_name(self, patient_id: int, payload: NameCreate) -> Optional[PatientModel]:
        async with self.session_factory() as session:
            patient = await self._get_internal(session, patient_id)
            if not patient:
                return None

            name = PatientName(
                patient_id=patient.id,
                org_id=patient.org_id,
                use=payload.use,
                text=payload.text,
                family=payload.family,
                given=", ".join(payload.given) if payload.given else None,
                prefix=", ".join(payload.prefix) if payload.prefix else None,
                suffix=", ".join(payload.suffix) if payload.suffix else None,
                period_start=payload.period_start,
                period_end=payload.period_end,
            )
            try:
                session.add(name)
                await session.commit()
            except Exception:
                await session.rollback()
                raise

        return await self.get_by_patient_id(patient_id)

    async def add_identifier(self, patient_id: int, payload: IdentifierCreate) -> Optional[PatientModel]:
        async with self.session_factory() as session:
            patient = await self._get_internal(session, patient_id)
            if not patient:
                return None

            ident = PatientIdentifier(
                patient_id=patient.id,
                org_id=patient.org_id,
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
                session.add(ident)
                await session.commit()
            except Exception:
                await session.rollback()
                raise

        return await self.get_by_patient_id(patient_id)

    async def add_telecom(self, patient_id: int, payload: TelecomCreate) -> Optional[PatientModel]:
        async with self.session_factory() as session:
            patient = await self._get_internal(session, patient_id)
            if not patient:
                return None

            telecom = PatientTelecom(
                patient_id=patient.id,
                org_id=patient.org_id,
                system=payload.system,
                value=payload.value,
                use=payload.use,
                rank=payload.rank,
                period_start=payload.period_start,
                period_end=payload.period_end,
            )
            try:
                session.add(telecom)
                await session.commit()
            except Exception:
                await session.rollback()
                raise

        return await self.get_by_patient_id(patient_id)

    async def add_address(self, patient_id: int, payload: AddressCreate) -> Optional[PatientModel]:
        async with self.session_factory() as session:
            patient = await self._get_internal(session, patient_id)
            if not patient:
                return None

            address = PatientAddress(
                patient_id=patient.id,
                org_id=patient.org_id,
                use=payload.use,
                type=payload.type,
                text=payload.text,
                line=", ".join(payload.line) if payload.line else None,
                city=payload.city,
                district=payload.district,
                state=payload.state,
                postal_code=payload.postal_code,
                country=payload.country,
                period_start=payload.period_start,
                period_end=payload.period_end,
            )
            try:
                session.add(address)
                await session.commit()
            except Exception:
                await session.rollback()
                raise

        return await self.get_by_patient_id(patient_id)

    async def add_photo(self, patient_id: int, payload: PhotoCreate) -> Optional[PatientModel]:
        async with self.session_factory() as session:
            patient = await self._get_internal(session, patient_id)
            if not patient:
                return None

            photo = PatientPhoto(
                patient_id=patient.id,
                org_id=patient.org_id,
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
                session.add(photo)
                await session.commit()
            except Exception:
                await session.rollback()
                raise

        return await self.get_by_patient_id(patient_id)

    async def add_contact(self, patient_id: int, payload: ContactCreate) -> Optional[PatientModel]:
        async with self.session_factory() as session:
            patient = await self._get_internal(session, patient_id)
            if not patient:
                return None

            contact = PatientContact(
                patient_id=patient.id,
                org_id=patient.org_id,
                name_use=payload.name_use,
                name_text=payload.name_text,
                name_family=payload.name_family,
                name_given=", ".join(payload.name_given) if payload.name_given else None,
                name_prefix=", ".join(payload.name_prefix) if payload.name_prefix else None,
                name_suffix=", ".join(payload.name_suffix) if payload.name_suffix else None,
                address_use=payload.address_use,
                address_type=payload.address_type,
                address_text=payload.address_text,
                address_line=", ".join(payload.address_line) if payload.address_line else None,
                address_city=payload.address_city,
                address_district=payload.address_district,
                address_state=payload.address_state,
                address_postal_code=payload.address_postal_code,
                address_country=payload.address_country,
                address_period_start=payload.address_period_start,
                address_period_end=payload.address_period_end,
                gender=payload.gender,
                organization_type=(
                    _parse_org_ref(payload.organization)[0]
                    if payload.organization else None
                ),
                organization_id=(
                    _parse_org_ref(payload.organization)[1]
                    if payload.organization else None
                ),
                organization_display=payload.organization_display,
                period_start=payload.period_start,
                period_end=payload.period_end,
            )
            session.add(contact)
            await session.flush()  # get contact.id before adding grandchildren

            if payload.relationship:
                for r in payload.relationship:
                    session.add(PatientContactRelationship(
                        contact_id=contact.id,
                        org_id=patient.org_id,
                        coding_system=r.coding_system,
                        coding_code=r.coding_code,
                        coding_display=r.coding_display,
                        text=r.text,
                    ))

            if payload.telecom:
                for t in payload.telecom:
                    session.add(PatientContactTelecom(
                        contact_id=contact.id,
                        org_id=patient.org_id,
                        system=t.system,
                        value=t.value,
                        use=t.use,
                        rank=t.rank,
                        period_start=t.period_start,
                        period_end=t.period_end,
                    ))

            try:
                await session.commit()
            except Exception:
                await session.rollback()
                raise

        return await self.get_by_patient_id(patient_id)

    async def add_communication(
        self, patient_id: int, payload: CommunicationCreate
    ) -> Optional[PatientModel]:
        async with self.session_factory() as session:
            patient = await self._get_internal(session, patient_id)
            if not patient:
                return None

            comm = PatientCommunication(
                patient_id=patient.id,
                org_id=patient.org_id,
                language_system=payload.language_system,
                language_code=payload.language_code,
                language_display=payload.language_display,
                language_text=payload.language_text,
                preferred=payload.preferred,
            )
            try:
                session.add(comm)
                await session.commit()
            except Exception:
                await session.rollback()
                raise

        return await self.get_by_patient_id(patient_id)

    async def add_general_practitioner(
        self, patient_id: int, payload: GeneralPractitionerCreate
    ) -> Optional[PatientModel]:
        async with self.session_factory() as session:
            patient = await self._get_internal(session, patient_id)
            if not patient:
                return None

            gp = PatientGeneralPractitioner(
                patient_id=patient.id,
                org_id=patient.org_id,
                reference_type=payload.reference_type,
                reference_id=payload.reference_id,
                reference_display=payload.reference_display,
            )
            try:
                session.add(gp)
                await session.commit()
            except Exception:
                await session.rollback()
                raise

        return await self.get_by_patient_id(patient_id)

    async def add_link(self, patient_id: int, payload: LinkCreate) -> Optional[PatientModel]:
        async with self.session_factory() as session:
            patient = await self._get_internal(session, patient_id)
            if not patient:
                return None

            link = PatientLink(
                patient_id=patient.id,
                org_id=patient.org_id,
                other_type=payload.other_type,
                other_id=payload.other_id,
                other_display=payload.other_display,
                type=payload.type,
            )
            try:
                session.add(link)
                await session.commit()
            except Exception:
                await session.rollback()
                raise

        return await self.get_by_patient_id(patient_id)

    # ── Sub-resource list queries ──────────────────────────────────────────────

    async def get_names(self, patient_id: int) -> list:
        async with self.session_factory() as session:
            patient = await self._get_internal(session, patient_id)
            if not patient:
                return []
            result = await session.execute(
                select(PatientName).where(PatientName.patient_id == patient.id)
            )
            return list(result.scalars().all())

    async def get_identifiers(self, patient_id: int) -> list:
        async with self.session_factory() as session:
            patient = await self._get_internal(session, patient_id)
            if not patient:
                return []
            result = await session.execute(
                select(PatientIdentifier).where(PatientIdentifier.patient_id == patient.id)
            )
            return list(result.scalars().all())

    async def get_telecoms(self, patient_id: int) -> list:
        async with self.session_factory() as session:
            patient = await self._get_internal(session, patient_id)
            if not patient:
                return []
            result = await session.execute(
                select(PatientTelecom).where(PatientTelecom.patient_id == patient.id)
            )
            return list(result.scalars().all())

    async def get_addresses(self, patient_id: int) -> list:
        async with self.session_factory() as session:
            patient = await self._get_internal(session, patient_id)
            if not patient:
                return []
            result = await session.execute(
                select(PatientAddress).where(PatientAddress.patient_id == patient.id)
            )
            return list(result.scalars().all())

    async def get_photos(self, patient_id: int) -> list:
        async with self.session_factory() as session:
            patient = await self._get_internal(session, patient_id)
            if not patient:
                return []
            result = await session.execute(
                select(PatientPhoto).where(PatientPhoto.patient_id == patient.id)
            )
            return list(result.scalars().all())

    async def get_contacts(self, patient_id: int) -> list:
        async with self.session_factory() as session:
            patient = await self._get_internal(session, patient_id)
            if not patient:
                return []
            stmt = (
                select(PatientContact)
                .where(PatientContact.patient_id == patient.id)
                .options(
                    selectinload(PatientContact.relationships),
                    selectinload(PatientContact.telecoms),
                )
            )
            result = await session.execute(stmt)
            return list(result.scalars().all())

    async def get_communications(self, patient_id: int) -> list:
        async with self.session_factory() as session:
            patient = await self._get_internal(session, patient_id)
            if not patient:
                return []
            result = await session.execute(
                select(PatientCommunication).where(PatientCommunication.patient_id == patient.id)
            )
            return list(result.scalars().all())

    async def get_general_practitioners(self, patient_id: int) -> list:
        async with self.session_factory() as session:
            patient = await self._get_internal(session, patient_id)
            if not patient:
                return []
            result = await session.execute(
                select(PatientGeneralPractitioner).where(
                    PatientGeneralPractitioner.patient_id == patient.id
                )
            )
            return list(result.scalars().all())

    async def get_links(self, patient_id: int) -> list:
        async with self.session_factory() as session:
            patient = await self._get_internal(session, patient_id)
            if not patient:
                return []
            result = await session.execute(
                select(PatientLink).where(PatientLink.patient_id == patient.id)
            )
            return list(result.scalars().all())

    # ── Sub-resource delete ────────────────────────────────────────────────────

    async def _delete_child(self, session, model_class, child_id: int, parent_internal_id: int) -> bool:
        """Delete a child row by its id, verifying it belongs to the given parent internal id."""
        result = await session.execute(
            select(model_class).where(
                model_class.id == child_id,
                model_class.patient_id == parent_internal_id,
            )
        )
        row = result.scalars().first()
        if not row:
            return False
        try:
            await session.delete(row)
            await session.commit()
            return True
        except Exception:
            await session.rollback()
            raise

    async def delete_name(self, patient_id: int, name_id: int) -> bool:
        async with self.session_factory() as session:
            patient = await self._get_internal(session, patient_id)
            if not patient:
                return False
            return await self._delete_child(session, PatientName, name_id, patient.id)

    async def delete_identifier(self, patient_id: int, identifier_id: int) -> bool:
        async with self.session_factory() as session:
            patient = await self._get_internal(session, patient_id)
            if not patient:
                return False
            return await self._delete_child(session, PatientIdentifier, identifier_id, patient.id)

    async def delete_telecom(self, patient_id: int, telecom_id: int) -> bool:
        async with self.session_factory() as session:
            patient = await self._get_internal(session, patient_id)
            if not patient:
                return False
            return await self._delete_child(session, PatientTelecom, telecom_id, patient.id)

    async def delete_address(self, patient_id: int, address_id: int) -> bool:
        async with self.session_factory() as session:
            patient = await self._get_internal(session, patient_id)
            if not patient:
                return False
            return await self._delete_child(session, PatientAddress, address_id, patient.id)

    async def delete_photo(self, patient_id: int, photo_id: int) -> bool:
        async with self.session_factory() as session:
            patient = await self._get_internal(session, patient_id)
            if not patient:
                return False
            return await self._delete_child(session, PatientPhoto, photo_id, patient.id)

    async def delete_contact(self, patient_id: int, contact_id: int) -> bool:
        async with self.session_factory() as session:
            patient = await self._get_internal(session, patient_id)
            if not patient:
                return False
            return await self._delete_child(session, PatientContact, contact_id, patient.id)

    async def delete_communication(self, patient_id: int, comm_id: int) -> bool:
        async with self.session_factory() as session:
            patient = await self._get_internal(session, patient_id)
            if not patient:
                return False
            return await self._delete_child(session, PatientCommunication, comm_id, patient.id)

    async def delete_general_practitioner(self, patient_id: int, gp_id: int) -> bool:
        async with self.session_factory() as session:
            patient = await self._get_internal(session, patient_id)
            if not patient:
                return False
            return await self._delete_child(session, PatientGeneralPractitioner, gp_id, patient.id)

    async def delete_link(self, patient_id: int, link_id: int) -> bool:
        async with self.session_factory() as session:
            patient = await self._get_internal(session, patient_id)
            if not patient:
                return False
            return await self._delete_child(session, PatientLink, link_id, patient.id)

    # ── Sub-resource patch ─────────────────────────────────────────────────────

    async def _fetch_child(self, session, model_class, child_id: int, parent_internal_id: int):
        """Fetch child by id, verify parent ownership, return row or None."""
        result = await session.execute(
            select(model_class).where(
                model_class.id == child_id,
                model_class.patient_id == parent_internal_id,
            )
        )
        return result.scalars().first()

    async def patch_name(self, patient_id: int, name_id: int, payload: NamePatch) -> Optional[PatientModel]:
        async with self.session_factory() as session:
            patient = await self._get_internal(session, patient_id)
            if not patient:
                return None
            row = await self._fetch_child(session, PatientName, name_id, patient.id)
            if not row:
                return None
            data = payload.model_dump(exclude_unset=True)
            for field in ("given", "prefix", "suffix"):
                if field in data:
                    data[field] = ", ".join(data[field]) if data[field] else None
            for field, value in data.items():
                setattr(row, field, value)
            try:
                await session.commit()
            except Exception:
                await session.rollback()
                raise
        return await self.get_by_patient_id(patient_id)

    async def patch_identifier(self, patient_id: int, identifier_id: int, payload: IdentifierPatch) -> Optional[PatientModel]:
        async with self.session_factory() as session:
            patient = await self._get_internal(session, patient_id)
            if not patient:
                return None
            row = await self._fetch_child(session, PatientIdentifier, identifier_id, patient.id)
            if not row:
                return None
            for field, value in payload.model_dump(exclude_unset=True).items():
                setattr(row, field, value)
            try:
                await session.commit()
            except Exception:
                await session.rollback()
                raise
        return await self.get_by_patient_id(patient_id)

    async def patch_telecom(self, patient_id: int, telecom_id: int, payload: TelecomPatch) -> Optional[PatientModel]:
        async with self.session_factory() as session:
            patient = await self._get_internal(session, patient_id)
            if not patient:
                return None
            row = await self._fetch_child(session, PatientTelecom, telecom_id, patient.id)
            if not row:
                return None
            for field, value in payload.model_dump(exclude_unset=True).items():
                setattr(row, field, value)
            try:
                await session.commit()
            except Exception:
                await session.rollback()
                raise
        return await self.get_by_patient_id(patient_id)

    async def patch_address(self, patient_id: int, address_id: int, payload: AddressPatch) -> Optional[PatientModel]:
        async with self.session_factory() as session:
            patient = await self._get_internal(session, patient_id)
            if not patient:
                return None
            row = await self._fetch_child(session, PatientAddress, address_id, patient.id)
            if not row:
                return None
            data = payload.model_dump(exclude_unset=True)
            if "line" in data:
                data["line"] = ", ".join(data["line"]) if data["line"] else None
            for field, value in data.items():
                setattr(row, field, value)
            try:
                await session.commit()
            except Exception:
                await session.rollback()
                raise
        return await self.get_by_patient_id(patient_id)

    async def patch_photo(self, patient_id: int, photo_id: int, payload: PhotoPatch) -> Optional[PatientModel]:
        async with self.session_factory() as session:
            patient = await self._get_internal(session, patient_id)
            if not patient:
                return None
            row = await self._fetch_child(session, PatientPhoto, photo_id, patient.id)
            if not row:
                return None
            for field, value in payload.model_dump(exclude_unset=True).items():
                setattr(row, field, value)
            try:
                await session.commit()
            except Exception:
                await session.rollback()
                raise
        return await self.get_by_patient_id(patient_id)

    async def patch_contact(self, patient_id: int, contact_id: int, payload: ContactPatch) -> Optional[PatientModel]:
        async with self.session_factory() as session:
            patient = await self._get_internal(session, patient_id)
            if not patient:
                return None
            stmt = (
                select(PatientContact)
                .where(PatientContact.id == contact_id, PatientContact.patient_id == patient.id)
                .options(
                    selectinload(PatientContact.relationships),
                    selectinload(PatientContact.telecoms),
                )
            )
            contact = (await session.execute(stmt)).scalars().first()
            if not contact:
                return None

            data = payload.model_dump(exclude_unset=True)

            if "relationship" in data:
                for r in contact.relationships:
                    await session.delete(r)
                for r in (data.pop("relationship") or []):
                    session.add(PatientContactRelationship(
                        contact_id=contact.id,
                        org_id=patient.org_id,
                        **r,
                    ))
            else:
                data.pop("relationship", None)

            if "telecom" in data:
                for t in contact.telecoms:
                    await session.delete(t)
                for t in (data.pop("telecom") or []):
                    session.add(PatientContactTelecom(
                        contact_id=contact.id,
                        org_id=patient.org_id,
                        **t,
                    ))
            else:
                data.pop("telecom", None)

            if "organization" in data:
                org = data.pop("organization")
                if org:
                    contact.organization_type, contact.organization_id = _parse_org_ref(org)
                else:
                    contact.organization_type = None
                    contact.organization_id = None

            for field in ("name_given", "name_prefix", "name_suffix"):
                if field in data:
                    data[field] = ", ".join(data[field]) if data[field] else None
            if "address_line" in data:
                data["address_line"] = ", ".join(data["address_line"]) if data["address_line"] else None

            for field, value in data.items():
                setattr(contact, field, value)

            try:
                await session.commit()
            except Exception:
                await session.rollback()
                raise
        return await self.get_by_patient_id(patient_id)

    async def patch_communication(self, patient_id: int, comm_id: int, payload: CommunicationPatch) -> Optional[PatientModel]:
        async with self.session_factory() as session:
            patient = await self._get_internal(session, patient_id)
            if not patient:
                return None
            row = await self._fetch_child(session, PatientCommunication, comm_id, patient.id)
            if not row:
                return None
            for field, value in payload.model_dump(exclude_unset=True).items():
                setattr(row, field, value)
            try:
                await session.commit()
            except Exception:
                await session.rollback()
                raise
        return await self.get_by_patient_id(patient_id)

    async def patch_general_practitioner(self, patient_id: int, gp_id: int, payload: GeneralPractitionerPatch) -> Optional[PatientModel]:
        async with self.session_factory() as session:
            patient = await self._get_internal(session, patient_id)
            if not patient:
                return None
            row = await self._fetch_child(session, PatientGeneralPractitioner, gp_id, patient.id)
            if not row:
                return None
            for field, value in payload.model_dump(exclude_unset=True).items():
                setattr(row, field, value)
            try:
                await session.commit()
            except Exception:
                await session.rollback()
                raise
        return await self.get_by_patient_id(patient_id)

    async def patch_link(self, patient_id: int, link_id: int, payload: LinkPatch) -> Optional[PatientModel]:
        async with self.session_factory() as session:
            patient = await self._get_internal(session, patient_id)
            if not patient:
                return None
            row = await self._fetch_child(session, PatientLink, link_id, patient.id)
            if not row:
                return None
            for field, value in payload.model_dump(exclude_unset=True).items():
                setattr(row, field, value)
            try:
                await session.commit()
            except Exception:
                await session.rollback()
                raise
        return await self.get_by_patient_id(patient_id)
