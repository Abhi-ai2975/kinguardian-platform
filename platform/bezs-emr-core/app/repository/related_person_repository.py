from typing import List, Optional, Tuple

from fastapi import HTTPException, status as http_status
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker  # noqa: F401
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.related_person.enums import RelatedPersonPatientReferenceType
from app.models.related_person.related_person import (
    RelatedPersonAddress,
    RelatedPersonCommunication,
    RelatedPersonIdentifier,
    RelatedPersonModel,
    RelatedPersonName,
    RelatedPersonPhoto,
    RelatedPersonRelationship,
    RelatedPersonTelecom,
)
from app.schemas.related_person.input import RelatedPersonCreateSchema, RelatedPersonPatchSchema


def _with_relationships(stmt):
    return stmt.options(
        selectinload(RelatedPersonModel.identifiers),
        selectinload(RelatedPersonModel.relationships),
        selectinload(RelatedPersonModel.names),
        selectinload(RelatedPersonModel.telecoms),
        selectinload(RelatedPersonModel.addresses),
        selectinload(RelatedPersonModel.photos),
        selectinload(RelatedPersonModel.communications),
    )


def _parse_patient_ref(ref: str):
    parts = ref.split("/", 1)
    if len(parts) != 2:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid reference format: '{ref}'. Expected 'Patient/<id>'.",
        )
    try:
        ref_id = int(parts[1])
    except ValueError:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid id in reference '{ref}'. Id must be an integer.",
        )
    try:
        ref_type = RelatedPersonPatientReferenceType(parts[0])
    except ValueError:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid reference type '{parts[0]}'. Only 'Patient' is allowed.",
        )
    return ref_type, ref_id


class RelatedPersonRepository:
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]):
        self.session_factory = session_factory

    def _build_children(self, session, rp: RelatedPersonModel, payload, org_id: Optional[str]) -> None:
        for item in (payload.identifiers or []):
            session.add(RelatedPersonIdentifier(
                related_person=rp, org_id=org_id,
                use=item.use,
                type_system=item.type_system, type_code=item.type_code,
                type_display=item.type_display, type_text=item.type_text,
                system=item.system, value=item.value,
                period_start=item.period_start, period_end=item.period_end,
                assigner=item.assigner,
            ))

        for rel in (payload.relationships or []):
            session.add(RelatedPersonRelationship(
                related_person=rp, org_id=org_id,
                coding_system=rel.coding_system,
                coding_code=rel.coding_code,
                coding_display=rel.coding_display,
                text=rel.text,
            ))

        for nm in (payload.names or []):
            session.add(RelatedPersonName(
                related_person=rp, org_id=org_id,
                use=nm.use, text=nm.text, family=nm.family,
                given=",".join(nm.given) if nm.given else None,
                prefix=",".join(nm.prefix) if nm.prefix else None,
                suffix=",".join(nm.suffix) if nm.suffix else None,
                period_start=nm.period_start, period_end=nm.period_end,
            ))

        for tc in (payload.telecoms or []):
            session.add(RelatedPersonTelecom(
                related_person=rp, org_id=org_id,
                system=tc.system, value=tc.value, use=tc.use,
                rank=tc.rank,
                period_start=tc.period_start, period_end=tc.period_end,
            ))

        for addr in (payload.addresses or []):
            session.add(RelatedPersonAddress(
                related_person=rp, org_id=org_id,
                use=addr.use, type=addr.type, text=addr.text,
                line=",".join(addr.line) if addr.line else None,
                city=addr.city, district=addr.district,
                state=addr.state, postal_code=addr.postal_code, country=addr.country,
                period_start=addr.period_start, period_end=addr.period_end,
            ))

        for ph in (payload.photos or []):
            session.add(RelatedPersonPhoto(
                related_person=rp, org_id=org_id,
                content_type=ph.content_type, language=ph.language,
                data=ph.data, url=ph.url, size=ph.size,
                hash=ph.hash, title=ph.title, creation=ph.creation,
            ))

        for cm in (payload.communications or []):
            session.add(RelatedPersonCommunication(
                related_person=rp, org_id=org_id,
                language_system=cm.language_system,
                language_code=cm.language_code,
                language_display=cm.language_display,
                language_text=cm.language_text,
                preferred=cm.preferred,
            ))

    async def get_by_related_person_id(self, related_person_id: int) -> Optional[RelatedPersonModel]:
        async with self.session_factory() as session:
            stmt = _with_relationships(
                select(RelatedPersonModel).where(
                    RelatedPersonModel.related_person_id == related_person_id
                )
            )
            result = await session.execute(stmt)
            return result.scalars().first()

    def _apply_list_filters(self, stmt, user_id, org_id):
        if user_id:
            stmt = stmt.where(RelatedPersonModel.user_id == user_id)
        if org_id:
            stmt = stmt.where(RelatedPersonModel.org_id == org_id)
        return stmt

    async def get_me(
        self,
        user_id: str,
        org_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[RelatedPersonModel], int]:
        async with self.session_factory() as session:
            base = self._apply_list_filters(
                _with_relationships(select(RelatedPersonModel)), user_id, org_id
            )
            count_base = self._apply_list_filters(
                select(func.count()).select_from(RelatedPersonModel), user_id, org_id
            )
            total = (await session.execute(count_base)).scalar_one()
            rows = list((await session.execute(
                base.order_by(RelatedPersonModel.related_person_id.desc()).offset(offset).limit(limit)
            )).scalars().all())
        return rows, total

    async def list(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[RelatedPersonModel], int]:
        async with self.session_factory() as session:
            base = self._apply_list_filters(
                _with_relationships(select(RelatedPersonModel)), user_id, org_id
            )
            count_base = self._apply_list_filters(
                select(func.count()).select_from(RelatedPersonModel), user_id, org_id
            )
            total = (await session.execute(count_base)).scalar_one()
            rows = list((await session.execute(
                base.order_by(RelatedPersonModel.related_person_id.desc()).offset(offset).limit(limit)
            )).scalars().all())
        return rows, total

    async def create(
        self,
        payload: RelatedPersonCreateSchema,
        user_id: Optional[str],
        org_id: Optional[str],
        created_by: Optional[str],
    ) -> RelatedPersonModel:
        patient_type, patient_id = (None, None)
        if payload.patient:
            patient_type, patient_id = _parse_patient_ref(payload.patient)

        async with self.session_factory() as session:
            rp = RelatedPersonModel(
                user_id=user_id,
                org_id=org_id,
                created_by=created_by,
                active=payload.active,
                patient_type=patient_type,
                patient_id=patient_id,
                patient_display=payload.patient_display,
                gender=payload.gender,
                birth_date=payload.birth_date,
                period_start=payload.period_start,
                period_end=payload.period_end,
            )
            session.add(rp)
            await session.flush()
            self._build_children(session, rp, payload, org_id)
            await session.commit()
            await session.refresh(rp)

        return await self.get_by_related_person_id(rp.related_person_id)

    async def patch(
        self,
        related_person_id: int,
        payload: RelatedPersonPatchSchema,
        updated_by: Optional[str],
    ) -> Optional[RelatedPersonModel]:
        data = payload.model_dump(exclude_unset=True)
        async with self.session_factory() as session:
            stmt = _with_relationships(
                select(RelatedPersonModel).where(
                    RelatedPersonModel.related_person_id == related_person_id
                )
            )
            result = await session.execute(stmt)
            rp = result.scalars().first()
            if rp is None:
                return None

            # Scalar fields
            scalar_fields = ("active", "patient_display", "gender", "birth_date", "period_start", "period_end")
            for field in scalar_fields:
                if field in data:
                    setattr(rp, field, data[field])

            if "patient" in data and data["patient"]:
                pt, pi = _parse_patient_ref(data["patient"])
                rp.patient_type = pt
                rp.patient_id = pi

            rp.updated_by = updated_by

            # Delete and rebuild child arrays if provided
            child_arrays = ("identifiers", "relationships", "names", "telecoms", "addresses", "photos", "communications")
            needs_rebuild = any(k in data for k in child_arrays)
            if needs_rebuild:
                if "identifiers" in data:
                    for ch in list(rp.identifiers):
                        await session.delete(ch)
                if "relationships" in data:
                    for ch in list(rp.relationships):
                        await session.delete(ch)
                if "names" in data:
                    for ch in list(rp.names):
                        await session.delete(ch)
                if "telecoms" in data:
                    for ch in list(rp.telecoms):
                        await session.delete(ch)
                if "addresses" in data:
                    for ch in list(rp.addresses):
                        await session.delete(ch)
                if "photos" in data:
                    for ch in list(rp.photos):
                        await session.delete(ch)
                if "communications" in data:
                    for ch in list(rp.communications):
                        await session.delete(ch)
                await session.flush()

                rebuild = RelatedPersonPatchSchema.model_validate(data)
                self._build_children(session, rp, rebuild, rp.org_id)

            await session.commit()

        return await self.get_by_related_person_id(related_person_id)

    async def delete(self, related_person_id: int) -> bool:
        async with self.session_factory() as session:
            stmt = select(RelatedPersonModel).where(
                RelatedPersonModel.related_person_id == related_person_id
            )
            result = await session.execute(stmt)
            rp = result.scalars().first()
            if rp is None:
                return False
            await session.delete(rp)
            await session.commit()
        return True
