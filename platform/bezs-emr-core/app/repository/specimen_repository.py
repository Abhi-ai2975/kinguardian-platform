from typing import List, Optional, Tuple

from fastapi import HTTPException, status as http_status
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker  # noqa: F401
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.specimen.enums import (
    SpecimenCollectorReferenceType,
    SpecimenContainerAdditiveReferenceType,
    SpecimenParentReferenceType,
    SpecimenProcessingAdditiveReferenceType,
    SpecimenRequestReferenceType,
    SpecimenSubjectReferenceType,
)
from app.models.specimen.specimen import (
    SpecimenCondition,
    SpecimenContainer,
    SpecimenContainerIdentifier,
    SpecimenIdentifier,
    SpecimenModel,
    SpecimenNote,
    SpecimenParent,
    SpecimenProcessing,
    SpecimenProcessingAdditive,
    SpecimenRequest,
)
from app.schemas.specimen.input import SpecimenCreateSchema, SpecimenPatchSchema


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


def _with_relationships(stmt):
    return stmt.options(
        selectinload(SpecimenModel.identifiers),
        selectinload(SpecimenModel.parents),
        selectinload(SpecimenModel.requests),
        selectinload(SpecimenModel.processing).selectinload(SpecimenProcessing.additives),
        selectinload(SpecimenModel.containers).selectinload(SpecimenContainer.container_identifiers),
        selectinload(SpecimenModel.conditions),
        selectinload(SpecimenModel.notes),
    )


class SpecimenRepository:
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]):
        self.session_factory = session_factory

    def _build_children(self, session, sp: SpecimenModel, payload, org_id: Optional[str]) -> None:
        for item in (payload.identifiers or []):
            session.add(SpecimenIdentifier(
                specimen=sp, org_id=org_id,
                use=item.use,
                type_system=item.type_system, type_code=item.type_code,
                type_display=item.type_display, type_text=item.type_text,
                system=item.system, value=item.value,
                period_start=item.period_start, period_end=item.period_end,
                assigner=item.assigner,
            ))

        for par in (payload.parents or []):
            if par.reference:
                ref_type, ref_id = _parse_ref(par.reference, SpecimenParentReferenceType, "parents.reference")
                session.add(SpecimenParent(
                    specimen=sp, org_id=org_id,
                    reference_type=ref_type, reference_id=ref_id, reference_display=par.display,
                ))

        for req in (payload.requests or []):
            if req.reference:
                ref_type, ref_id = _parse_ref(req.reference, SpecimenRequestReferenceType, "requests.reference")
                session.add(SpecimenRequest(
                    specimen=sp, org_id=org_id,
                    reference_type=ref_type, reference_id=ref_id, reference_display=req.display,
                ))

        for proc in (payload.processing or []):
            proc_obj = SpecimenProcessing(
                specimen=sp, org_id=org_id,
                description=proc.description,
                procedure_system=proc.procedure_system,
                procedure_code=proc.procedure_code,
                procedure_display=proc.procedure_display,
                procedure_text=proc.procedure_text,
                time_datetime=proc.time_datetime,
                time_period_start=proc.time_period_start,
                time_period_end=proc.time_period_end,
            )
            session.add(proc_obj)
            for add in (proc.additives or []):
                if add.reference:
                    ref_type, ref_id = _parse_ref(add.reference, SpecimenProcessingAdditiveReferenceType, "processing.additives.reference")
                    session.add(SpecimenProcessingAdditive(
                        processing=proc_obj, org_id=org_id,
                        reference_type=ref_type, reference_id=ref_id, reference_display=add.display,
                    ))

        for cont in (payload.container or []):
            add_ref_type, add_ref_id = (None, None)
            if cont.additive_reference:
                add_ref_type, add_ref_id = _parse_ref(cont.additive_reference, SpecimenContainerAdditiveReferenceType, "container.additive_reference")
            cont_obj = SpecimenContainer(
                specimen=sp, org_id=org_id,
                description=cont.description,
                type_system=cont.type_system, type_code=cont.type_code,
                type_display=cont.type_display, type_text=cont.type_text,
                capacity_value=cont.capacity_value,
                capacity_unit=cont.capacity_unit,
                capacity_system=cont.capacity_system,
                capacity_code=cont.capacity_code,
                specimen_quantity_value=cont.specimen_quantity_value,
                specimen_quantity_unit=cont.specimen_quantity_unit,
                specimen_quantity_system=cont.specimen_quantity_system,
                specimen_quantity_code=cont.specimen_quantity_code,
                additive_cc_system=cont.additive_cc_system,
                additive_cc_code=cont.additive_cc_code,
                additive_cc_display=cont.additive_cc_display,
                additive_cc_text=cont.additive_cc_text,
                additive_reference_type=add_ref_type,
                additive_reference_id=add_ref_id,
                additive_reference_display=cont.additive_reference_display,
            )
            session.add(cont_obj)
            for ci in (cont.identifiers or []):
                session.add(SpecimenContainerIdentifier(
                    container=cont_obj, org_id=org_id,
                    use=ci.use,
                    type_system=ci.type_system, type_code=ci.type_code,
                    type_display=ci.type_display, type_text=ci.type_text,
                    system=ci.system, value=ci.value,
                    period_start=ci.period_start, period_end=ci.period_end,
                    assigner=ci.assigner,
                ))

        for cond in (payload.conditions or []):
            session.add(SpecimenCondition(
                specimen=sp, org_id=org_id,
                coding_system=cond.coding_system,
                coding_code=cond.coding_code,
                coding_display=cond.coding_display,
                text=cond.text,
            ))

        for note in (payload.notes or []):
            auth_ref_type, auth_ref_id = (None, None)
            if note.author_reference:
                parts = note.author_reference.split("/", 1)
                if len(parts) == 2:
                    try:
                        auth_ref_id = int(parts[1])
                        auth_ref_type = parts[0]
                    except ValueError:
                        pass
            session.add(SpecimenNote(
                specimen=sp, org_id=org_id,
                text=note.text,
                time=note.time,
                author_string=note.author_string,
                author_reference_type=auth_ref_type,
                author_reference_id=auth_ref_id,
                author_reference_display=note.author_reference_display,
            ))

    def _apply_collection_to_model(self, sp: SpecimenModel, col) -> None:
        if col is None:
            return
        collector_type, collector_id = (None, None)
        if col.collector:
            collector_type, collector_id = _parse_ref(col.collector, SpecimenCollectorReferenceType, "collection.collector")
        sp.collection_collector_type = collector_type
        sp.collection_collector_id = collector_id
        sp.collection_collector_display = col.collector_display
        sp.collection_collected_datetime = col.collected_datetime
        sp.collection_collected_period_start = col.collected_period_start
        sp.collection_collected_period_end = col.collected_period_end
        sp.collection_duration_value = col.duration_value
        sp.collection_duration_unit = col.duration_unit
        sp.collection_duration_system = col.duration_system
        sp.collection_duration_code = col.duration_code
        sp.collection_quantity_value = col.quantity_value
        sp.collection_quantity_unit = col.quantity_unit
        sp.collection_quantity_system = col.quantity_system
        sp.collection_quantity_code = col.quantity_code
        sp.collection_method_system = col.method_system
        sp.collection_method_code = col.method_code
        sp.collection_method_display = col.method_display
        sp.collection_method_text = col.method_text
        sp.collection_body_site_system = col.body_site_system
        sp.collection_body_site_code = col.body_site_code
        sp.collection_body_site_display = col.body_site_display
        sp.collection_body_site_text = col.body_site_text
        sp.collection_fasting_status_cc_system = col.fasting_status_cc_system
        sp.collection_fasting_status_cc_code = col.fasting_status_cc_code
        sp.collection_fasting_status_cc_display = col.fasting_status_cc_display
        sp.collection_fasting_status_cc_text = col.fasting_status_cc_text
        sp.collection_fasting_status_duration_value = col.fasting_status_duration_value
        sp.collection_fasting_status_duration_unit = col.fasting_status_duration_unit
        sp.collection_fasting_status_duration_system = col.fasting_status_duration_system
        sp.collection_fasting_status_duration_code = col.fasting_status_duration_code

    async def get_by_specimen_id(self, specimen_id: int) -> Optional[SpecimenModel]:
        async with self.session_factory() as session:
            stmt = _with_relationships(
                select(SpecimenModel).where(SpecimenModel.specimen_id == specimen_id)
            )
            result = await session.execute(stmt)
            return result.scalars().first()

    def _apply_list_filters(self, stmt, user_id, org_id):
        if user_id:
            stmt = stmt.where(SpecimenModel.user_id == user_id)
        if org_id:
            stmt = stmt.where(SpecimenModel.org_id == org_id)
        return stmt

    async def get_me(
        self,
        user_id: str,
        org_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[SpecimenModel], int]:
        async with self.session_factory() as session:
            base = self._apply_list_filters(
                _with_relationships(select(SpecimenModel)), user_id, org_id
            )
            count_base = self._apply_list_filters(
                select(func.count()).select_from(SpecimenModel), user_id, org_id
            )
            total = (await session.execute(count_base)).scalar_one()
            rows = list((await session.execute(
                base.order_by(SpecimenModel.specimen_id.desc()).offset(offset).limit(limit)
            )).scalars().all())
        return rows, total

    async def list(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[SpecimenModel], int]:
        async with self.session_factory() as session:
            base = self._apply_list_filters(
                _with_relationships(select(SpecimenModel)), user_id, org_id
            )
            count_base = self._apply_list_filters(
                select(func.count()).select_from(SpecimenModel), user_id, org_id
            )
            total = (await session.execute(count_base)).scalar_one()
            rows = list((await session.execute(
                base.order_by(SpecimenModel.specimen_id.desc()).offset(offset).limit(limit)
            )).scalars().all())
        return rows, total

    async def create(
        self,
        payload: SpecimenCreateSchema,
        user_id: Optional[str],
        org_id: Optional[str],
        created_by: Optional[str],
    ) -> SpecimenModel:
        subject_type, subject_id = (None, None)
        if payload.subject:
            subject_type, subject_id = _parse_ref(payload.subject, SpecimenSubjectReferenceType, "subject")

        async with self.session_factory() as session:
            sp = SpecimenModel(
                user_id=user_id,
                org_id=org_id,
                created_by=created_by,
                status=payload.status,
                type_system=payload.type_system,
                type_code=payload.type_code,
                type_display=payload.type_display,
                type_text=payload.type_text,
                subject_type=subject_type,
                subject_id=subject_id,
                subject_display=payload.subject_display,
                received_time=payload.received_time,
                accession_identifier_use=payload.accession_identifier_use,
                accession_identifier_type_system=payload.accession_identifier_type_system,
                accession_identifier_type_code=payload.accession_identifier_type_code,
                accession_identifier_type_display=payload.accession_identifier_type_display,
                accession_identifier_type_text=payload.accession_identifier_type_text,
                accession_identifier_system=payload.accession_identifier_system,
                accession_identifier_value=payload.accession_identifier_value,
                accession_identifier_period_start=payload.accession_identifier_period_start,
                accession_identifier_period_end=payload.accession_identifier_period_end,
                accession_identifier_assigner=payload.accession_identifier_assigner,
            )
            self._apply_collection_to_model(sp, payload.collection)
            session.add(sp)
            await session.flush()
            self._build_children(session, sp, payload, org_id)
            await session.commit()
            await session.refresh(sp)

        return await self.get_by_specimen_id(sp.specimen_id)

    async def patch(
        self,
        specimen_id: int,
        payload: SpecimenPatchSchema,
        updated_by: Optional[str],
    ) -> Optional[SpecimenModel]:
        data = payload.model_dump(exclude_unset=True)
        async with self.session_factory() as session:
            stmt = _with_relationships(
                select(SpecimenModel).where(SpecimenModel.specimen_id == specimen_id)
            )
            result = await session.execute(stmt)
            sp = result.scalars().first()
            if sp is None:
                return None

            scalar_fields = (
                "status", "type_system", "type_code", "type_display", "type_text",
                "subject_display", "received_time",
                "accession_identifier_use", "accession_identifier_type_system",
                "accession_identifier_type_code", "accession_identifier_type_display",
                "accession_identifier_type_text", "accession_identifier_system",
                "accession_identifier_value", "accession_identifier_period_start",
                "accession_identifier_period_end", "accession_identifier_assigner",
            )
            for field in scalar_fields:
                if field in data:
                    setattr(sp, field, data[field])

            if "subject" in data and data["subject"]:
                st, si = _parse_ref(data["subject"], SpecimenSubjectReferenceType, "subject")
                sp.subject_type = st
                sp.subject_id = si

            if "collection" in data:
                self._apply_collection_to_model(sp, payload.collection)

            sp.updated_by = updated_by

            child_arrays = ("identifiers", "parents", "requests", "processing", "container", "conditions", "notes")
            needs_rebuild = any(k in data for k in child_arrays)
            if needs_rebuild:
                if "identifiers" in data:
                    for ch in list(sp.identifiers):
                        await session.delete(ch)
                if "parents" in data:
                    for ch in list(sp.parents):
                        await session.delete(ch)
                if "requests" in data:
                    for ch in list(sp.requests):
                        await session.delete(ch)
                if "processing" in data:
                    for ch in list(sp.processing):
                        await session.delete(ch)
                if "container" in data:
                    for ch in list(sp.containers):
                        await session.delete(ch)
                if "conditions" in data:
                    for ch in list(sp.conditions):
                        await session.delete(ch)
                if "notes" in data:
                    for ch in list(sp.notes):
                        await session.delete(ch)
                await session.flush()

                rebuild = SpecimenPatchSchema.model_validate(data)
                self._build_children(session, sp, rebuild, sp.org_id)

            await session.commit()

        return await self.get_by_specimen_id(specimen_id)

    async def delete(self, specimen_id: int) -> bool:
        async with self.session_factory() as session:
            stmt = select(SpecimenModel).where(SpecimenModel.specimen_id == specimen_id)
            result = await session.execute(stmt)
            sp = result.scalars().first()
            if sp is None:
                return False
            await session.delete(sp)
            await session.commit()
        return True
