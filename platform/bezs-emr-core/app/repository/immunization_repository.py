from typing import List, Optional, Tuple

from fastapi import HTTPException, status as http_status
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker  # noqa: F401
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.enums import EncounterReferenceType, OrganizationReferenceType
from app.models.immunization.enums import (
    ImmunizationLocationReferenceType,
    ImmunizationPatientReferenceType,
    ImmunizationPerformerActorReferenceType,
    ImmunizationReactionDetailReferenceType,
    ImmunizationReasonReferenceType,
)
from app.models.immunization.immunization import (
    ImmunizationEducation,
    ImmunizationIdentifier,
    ImmunizationModel,
    ImmunizationNote,
    ImmunizationPerformer,
    ImmunizationProgramEligibility,
    ImmunizationProtocolApplied,
    ImmunizationProtocolAppliedTargetDisease,
    ImmunizationReaction,
    ImmunizationReasonCode,
    ImmunizationReasonReference,
    ImmunizationSubpotentReason,
)
from app.models.organization.organization import OrganizationModel
from app.schemas.immunization.input import (
    ImmunizationCreateSchema,
    ImmunizationPatchSchema,
)


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
        selectinload(ImmunizationModel.identifiers),
        selectinload(ImmunizationModel.performers),
        selectinload(ImmunizationModel.notes),
        selectinload(ImmunizationModel.reason_codes),
        selectinload(ImmunizationModel.reason_references),
        selectinload(ImmunizationModel.subpotent_reasons),
        selectinload(ImmunizationModel.educations),
        selectinload(ImmunizationModel.program_eligibilities),
        selectinload(ImmunizationModel.reactions),
        selectinload(ImmunizationModel.protocol_applied).selectinload(
            ImmunizationProtocolApplied.target_diseases
        ),
        selectinload(ImmunizationModel.manufacturer),
    )


def _apply_list_filters(stmt, user_id=None, org_id=None):
    if user_id is not None:
        stmt = stmt.where(ImmunizationModel.user_id == user_id)
    if org_id is not None:
        stmt = stmt.where(ImmunizationModel.org_id == org_id)
    return stmt


async def _resolve_manufacturer_pk(session: AsyncSession, ref: str, field: str) -> int:
    parts = ref.split("/", 1)
    if len(parts) != 2:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid reference format for '{field}': '{ref}'. Expected 'Organization/<id>'.",
        )
    try:
        org_public_id = int(parts[1])
    except ValueError:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid id in reference '{ref}' for '{field}'.",
        )
    if parts[0] != "Organization":
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid reference type '{parts[0]}' for '{field}'. Allowed: ['Organization'].",
        )
    result = await session.execute(
        select(OrganizationModel.id).where(OrganizationModel.organization_id == org_public_id)
    )
    pk = result.scalar_one_or_none()
    if pk is None:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Organization/{org_public_id} not found.",
        )
    return pk


def _build_children(data, org_id: Optional[str]) -> dict:
    children: dict = {}

    if data.identifiers is not None:
        children["identifiers"] = [
            ImmunizationIdentifier(
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
            )
            for i in data.identifiers
        ]

    if data.performers is not None:
        perfs = []
        for p in data.performers:
            actor_type, actor_id = None, None
            if p.actor:
                actor_type, actor_id = _parse_ref(p.actor, ImmunizationPerformerActorReferenceType, "performer.actor")
            perfs.append(ImmunizationPerformer(
                org_id=org_id,
                function_system=p.function_system,
                function_code=p.function_code,
                function_display=p.function_display,
                function_text=p.function_text,
                reference_type=actor_type,
                reference_id=actor_id,
                reference_display=p.actor_display,
            ))
        children["performers"] = perfs

    if data.notes is not None:
        notes = []
        for n in data.notes:
            auth_ref_type, auth_ref_id = None, None
            if n.author_reference:
                auth_ref_type, auth_ref_id = n.author_reference.split("/", 1)
                try:
                    auth_ref_id = int(auth_ref_id)
                except ValueError:
                    pass
            notes.append(ImmunizationNote(
                org_id=org_id,
                text=n.text,
                time=n.time,
                author_string=n.author_string,
                author_reference_type=auth_ref_type,
                author_reference_id=auth_ref_id,
                author_reference_display=n.author_reference_display,
            ))
        children["notes"] = notes

    if data.reason_codes is not None:
        children["reason_codes"] = [
            ImmunizationReasonCode(
                org_id=org_id,
                coding_system=rc.coding_system,
                coding_code=rc.coding_code,
                coding_display=rc.coding_display,
                text=rc.text,
            )
            for rc in data.reason_codes
        ]

    if data.reason_references is not None:
        rrs = []
        for rr in data.reason_references:
            rr_type, rr_id = _parse_ref(rr.reference, ImmunizationReasonReferenceType, "reasonReference")
            rrs.append(ImmunizationReasonReference(
                org_id=org_id,
                reference_type=rr_type,
                reference_id=rr_id,
                reference_display=rr.display,
            ))
        children["reason_references"] = rrs

    if data.subpotent_reasons is not None:
        children["subpotent_reasons"] = [
            ImmunizationSubpotentReason(
                org_id=org_id,
                coding_system=sr.coding_system,
                coding_code=sr.coding_code,
                coding_display=sr.coding_display,
                text=sr.text,
            )
            for sr in data.subpotent_reasons
        ]

    if data.educations is not None:
        children["educations"] = [
            ImmunizationEducation(
                org_id=org_id,
                document_type=e.document_type,
                reference=e.reference,
                publication_date=e.publication_date,
                presentation_date=e.presentation_date,
            )
            for e in data.educations
        ]

    if data.program_eligibilities is not None:
        children["program_eligibilities"] = [
            ImmunizationProgramEligibility(
                org_id=org_id,
                coding_system=pe.coding_system,
                coding_code=pe.coding_code,
                coding_display=pe.coding_display,
                text=pe.text,
            )
            for pe in data.program_eligibilities
        ]

    if data.reactions is not None:
        rxns = []
        for r in data.reactions:
            detail_type, detail_id = None, None
            if r.detail:
                detail_type, detail_id = _parse_ref(r.detail, ImmunizationReactionDetailReferenceType, "reaction.detail")
            rxns.append(ImmunizationReaction(
                org_id=org_id,
                date=r.date,
                detail_type=detail_type,
                detail_id=detail_id,
                detail_display=r.detail_display,
                reported=r.reported,
            ))
        children["reactions"] = rxns

    if data.protocol_applied is not None:
        pas = []
        for pa in data.protocol_applied:
            auth_type, auth_id = None, None
            if pa.authority:
                auth_type, auth_id = _parse_ref(pa.authority, OrganizationReferenceType, "protocolApplied.authority")
            target_diseases = []
            if pa.target_diseases:
                target_diseases = [
                    ImmunizationProtocolAppliedTargetDisease(
                        org_id=org_id,
                        coding_system=td.coding_system,
                        coding_code=td.coding_code,
                        coding_display=td.coding_display,
                        text=td.text,
                    )
                    for td in pa.target_diseases
                ]
            pas.append(ImmunizationProtocolApplied(
                org_id=org_id,
                series=pa.series,
                authority_type=auth_type,
                authority_id=auth_id,
                authority_display=pa.authority_display,
                dose_number_positive_int=pa.dose_number_positive_int,
                dose_number_string=pa.dose_number_string,
                series_doses_positive_int=pa.series_doses_positive_int,
                series_doses_string=pa.series_doses_string,
                target_diseases=target_diseases,
            ))
        children["protocol_applied"] = pas

    return children


class ImmunizationRepository:
    def __init__(self, session_factory: async_sessionmaker):
        self.session_factory = session_factory

    async def create(self, data: ImmunizationCreateSchema, created_by: Optional[str] = None) -> ImmunizationModel:
        async with self.session_factory() as session:
            patient_type, patient_id = None, None
            if data.patient:
                patient_type, patient_id = _parse_ref(data.patient, ImmunizationPatientReferenceType, "patient")

            encounter_type, encounter_id = None, None
            if data.encounter:
                encounter_type, encounter_id = _parse_ref(data.encounter, EncounterReferenceType, "encounter")

            location_type, location_id = None, None
            if data.location:
                location_type, location_id = _parse_ref(data.location, ImmunizationLocationReferenceType, "location")

            manufacturer_pk, manufacturer_type = None, None
            if data.manufacturer:
                manufacturer_pk = await _resolve_manufacturer_pk(session, data.manufacturer, "manufacturer")
                manufacturer_type = OrganizationReferenceType.Organization

            children = _build_children(data, data.org_id)

            model = ImmunizationModel(
                user_id=data.user_id,
                org_id=data.org_id,
                status=data.status,
                occurrence_datetime=data.occurrence_datetime,
                occurrence_string=data.occurrence_string,
                status_reason_system=data.status_reason_system,
                status_reason_code=data.status_reason_code,
                status_reason_display=data.status_reason_display,
                status_reason_text=data.status_reason_text,
                vaccine_code_system=data.vaccine_code_system,
                vaccine_code_code=data.vaccine_code_code,
                vaccine_code_display=data.vaccine_code_display,
                vaccine_code_text=data.vaccine_code_text,
                patient_type=patient_type,
                patient_id=patient_id,
                patient_display=data.patient_display,
                encounter_type=encounter_type,
                encounter_id=encounter_id,
                encounter_display=data.encounter_display,
                recorded=data.recorded,
                primary_source=data.primary_source,
                report_origin_system=data.report_origin_system,
                report_origin_code=data.report_origin_code,
                report_origin_display=data.report_origin_display,
                report_origin_text=data.report_origin_text,
                location_type=location_type,
                location_id=location_id,
                location_display=data.location_display,
                manufacturer_type=manufacturer_type,
                manufacturer_id=manufacturer_pk,
                manufacturer_display=data.manufacturer_display,
                lot_number=data.lot_number,
                expiration_date=data.expiration_date,
                site_system=data.site_system,
                site_code=data.site_code,
                site_display=data.site_display,
                site_text=data.site_text,
                route_system=data.route_system,
                route_code=data.route_code,
                route_display=data.route_display,
                route_text=data.route_text,
                dose_quantity_value=data.dose_quantity_value,
                dose_quantity_unit=data.dose_quantity_unit,
                dose_quantity_system=data.dose_quantity_system,
                dose_quantity_code=data.dose_quantity_code,
                is_subpotent=data.is_subpotent,
                funding_source_system=data.funding_source_system,
                funding_source_code=data.funding_source_code,
                funding_source_display=data.funding_source_display,
                funding_source_text=data.funding_source_text,
                created_by=created_by,
                **children,
            )
            session.add(model)
            await session.commit()
            await session.refresh(model)

            stmt = _with_relationships(select(ImmunizationModel).where(ImmunizationModel.id == model.id))
            result = await session.execute(stmt)
            return result.scalar_one()

    async def get_by_immunization_id(self, immunization_id: int) -> Optional[ImmunizationModel]:
        async with self.session_factory() as session:
            stmt = _with_relationships(
                select(ImmunizationModel).where(ImmunizationModel.immunization_id == immunization_id)
            )
            result = await session.execute(stmt)
            return result.scalar_one_or_none()

    async def list(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[int, List[ImmunizationModel]]:
        async with self.session_factory() as session:
            base = select(ImmunizationModel)
            base = _apply_list_filters(base, user_id, org_id)

            count_stmt = select(func.count()).select_from(base.subquery())
            total = (await session.execute(count_stmt)).scalar_one()

            data_stmt = _with_relationships(base.offset(offset).limit(limit))
            rows = (await session.execute(data_stmt)).scalars().all()
            return total, list(rows)

    async def get_me(
        self,
        user_id: str,
        org_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[int, List[ImmunizationModel]]:
        return await self.list(user_id=user_id, org_id=org_id, limit=limit, offset=offset)

    async def patch(self, model: ImmunizationModel, data: ImmunizationPatchSchema, updated_by: Optional[str] = None) -> ImmunizationModel:
        async with self.session_factory() as session:
            db_model = await session.merge(model)
            updates = data.model_dump(exclude_unset=True)

            if "patient" in updates:
                ref = updates.pop("patient")
                if ref:
                    pt, pid = _parse_ref(ref, ImmunizationPatientReferenceType, "patient")
                    db_model.patient_type = pt
                    db_model.patient_id = pid
                else:
                    db_model.patient_type = None
                    db_model.patient_id = None

            if "encounter" in updates:
                ref = updates.pop("encounter")
                if ref:
                    et, eid = _parse_ref(ref, EncounterReferenceType, "encounter")
                    db_model.encounter_type = et
                    db_model.encounter_id = eid
                else:
                    db_model.encounter_type = None
                    db_model.encounter_id = None

            if "location" in updates:
                ref = updates.pop("location")
                if ref:
                    lt, lid = _parse_ref(ref, ImmunizationLocationReferenceType, "location")
                    db_model.location_type = lt
                    db_model.location_id = lid
                else:
                    db_model.location_type = None
                    db_model.location_id = None

            if "manufacturer" in updates:
                ref = updates.pop("manufacturer")
                if ref:
                    pk = await _resolve_manufacturer_pk(session, ref, "manufacturer")
                    db_model.manufacturer_type = OrganizationReferenceType.Organization
                    db_model.manufacturer_id = pk
                else:
                    db_model.manufacturer_type = None
                    db_model.manufacturer_id = None

            child_keys = ["identifiers", "performers", "notes", "reason_codes", "reason_references",
                          "subpotent_reasons", "educations", "program_eligibilities", "reactions", "protocol_applied"]
            child_data_map = {k: updates.pop(k) for k in child_keys if k in updates}

            for key, value in updates.items():
                setattr(db_model, key, value)

            if updated_by:
                db_model.updated_by = updated_by

            if child_data_map:
                patch_schema_partial = ImmunizationPatchSchema(**{k: v for k, v in child_data_map.items()})
                new_children = _build_children(patch_schema_partial, db_model.org_id)
                for key, new_list in new_children.items():
                    setattr(db_model, key, new_list)

            await session.commit()
            await session.refresh(db_model)

            stmt = _with_relationships(select(ImmunizationModel).where(ImmunizationModel.id == db_model.id))
            result = await session.execute(stmt)
            return result.scalar_one()

    async def delete(self, model: ImmunizationModel) -> None:
        async with self.session_factory() as session:
            db_model = await session.merge(model)
            await session.delete(db_model)
            await session.commit()
