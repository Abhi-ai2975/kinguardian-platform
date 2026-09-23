from datetime import datetime
from typing import List, Optional, Tuple

from fastapi import HTTPException, status as http_status
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker  # noqa: F401
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.enums import OrganizationReferenceType
from app.models.episode_of_care.enums import (
    EpisodeOfCareAccountReferenceType,
    EpisodeOfCareCareManagerReferenceType,
    EpisodeOfCareDiagnosisReferenceType,
    EpisodeOfCarePatientReferenceType,
    EpisodeOfCareReferralRequestReferenceType,
    EpisodeOfCareTeamReferenceType,
)
from app.models.episode_of_care.episode_of_care import (
    EpisodeOfCareAccount,
    EpisodeOfCareDiagnosis,
    EpisodeOfCareIdentifier,
    EpisodeOfCareModel,
    EpisodeOfCareReferralRequest,
    EpisodeOfCareStatusHistory,
    EpisodeOfCareTeam,
    EpisodeOfCareType,
)
from app.models.organization.organization import OrganizationModel
from app.schemas.episode_of_care.input import (
    EpisodeOfCareCreateSchema,
    EpisodeOfCarePatchSchema,
)


def _parse_dt(s) -> Optional[datetime]:
    if s is None:
        return None
    if isinstance(s, datetime):
        return s
    return datetime.fromisoformat(str(s).replace("Z", "+00:00"))


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
        selectinload(EpisodeOfCareModel.identifiers),
        selectinload(EpisodeOfCareModel.status_history),
        selectinload(EpisodeOfCareModel.types),
        selectinload(EpisodeOfCareModel.diagnoses),
        selectinload(EpisodeOfCareModel.referral_requests),
        selectinload(EpisodeOfCareModel.team),
        selectinload(EpisodeOfCareModel.accounts),
        selectinload(EpisodeOfCareModel.managing_organization),
    )


def _apply_list_filters(stmt, user_id=None, org_id=None, episode_status=None, patient_id=None):
    if user_id is not None:
        stmt = stmt.where(EpisodeOfCareModel.user_id == user_id)
    if org_id is not None:
        stmt = stmt.where(EpisodeOfCareModel.org_id == org_id)
    if episode_status is not None:
        stmt = stmt.where(EpisodeOfCareModel.status == episode_status)
    if patient_id is not None:
        stmt = stmt.where(EpisodeOfCareModel.patient_id == patient_id)
    return stmt


async def _resolve_managing_org_pk(session: AsyncSession, ref: str) -> int:
    parts = ref.split("/", 1)
    if len(parts) != 2:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid reference format for 'managing_organization': '{ref}'. Expected 'Organization/<id>'.",
        )
    if parts[0] != "Organization":
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid reference type '{parts[0]}' for 'managing_organization'. Allowed: ['Organization'].",
        )
    try:
        org_public_id = int(parts[1])
    except ValueError:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid id in reference '{ref}' for 'managing_organization'.",
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
            EpisodeOfCareIdentifier(
                org_id=org_id,
                use=i.use,
                type_system=i.type_system,
                type_code=i.type_code,
                type_display=i.type_display,
                type_text=i.type_text,
                system=i.system,
                value=i.value,
                period_start=_parse_dt(i.period_start),
                period_end=_parse_dt(i.period_end),
                assigner=i.assigner,
            )
            for i in data.identifiers
        ]

    if data.status_history is not None:
        children["status_history"] = [
            EpisodeOfCareStatusHistory(
                org_id=org_id,
                status=sh.status,
                period_start=_parse_dt(sh.period_start),
                period_end=_parse_dt(sh.period_end),
            )
            for sh in data.status_history
        ]

    if data.types is not None:
        children["types"] = [
            EpisodeOfCareType(
                org_id=org_id,
                coding_system=t.coding_system,
                coding_code=t.coding_code,
                coding_display=t.coding_display,
                text=t.text,
            )
            for t in data.types
        ]

    if data.diagnoses is not None:
        diags = []
        for d in data.diagnoses:
            ref_type, ref_id = None, None
            if d.condition:
                ref_type, ref_id = _parse_ref(d.condition, EpisodeOfCareDiagnosisReferenceType, "diagnosis.condition")
            diags.append(EpisodeOfCareDiagnosis(
                org_id=org_id,
                reference_type=ref_type,
                reference_id=ref_id,
                reference_display=d.condition_display,
                role_system=d.role_system,
                role_code=d.role_code,
                role_display=d.role_display,
                role_text=d.role_text,
                rank=d.rank,
            ))
        children["diagnoses"] = diags

    if data.referral_requests is not None:
        rrs = []
        for r in data.referral_requests:
            ref_type, ref_id = None, None
            if r.reference:
                ref_type, ref_id = _parse_ref(r.reference, EpisodeOfCareReferralRequestReferenceType, "referralRequest")
            rrs.append(EpisodeOfCareReferralRequest(
                org_id=org_id,
                reference_type=ref_type,
                reference_id=ref_id,
                reference_display=r.reference_display,
            ))
        children["referral_requests"] = rrs

    if data.team is not None:
        teams = []
        for t in data.team:
            ref_type, ref_id = None, None
            if t.reference:
                ref_type, ref_id = _parse_ref(t.reference, EpisodeOfCareTeamReferenceType, "team")
            teams.append(EpisodeOfCareTeam(
                org_id=org_id,
                reference_type=ref_type,
                reference_id=ref_id,
                reference_display=t.reference_display,
            ))
        children["team"] = teams

    if data.accounts is not None:
        accts = []
        for a in data.accounts:
            ref_type, ref_id = None, None
            if a.reference:
                ref_type, ref_id = _parse_ref(a.reference, EpisodeOfCareAccountReferenceType, "account")
            accts.append(EpisodeOfCareAccount(
                org_id=org_id,
                reference_type=ref_type,
                reference_id=ref_id,
                reference_display=a.reference_display,
            ))
        children["accounts"] = accts

    return children


class EpisodeOfCareRepository:
    def __init__(self, session_factory: async_sessionmaker):
        self.session_factory = session_factory

    async def create(self, data: EpisodeOfCareCreateSchema, created_by: Optional[str]) -> EpisodeOfCareModel:
        async with self.session_factory() as session:
            patient_type, patient_id = None, None
            if data.patient:
                patient_type, patient_id = _parse_ref(data.patient, EpisodeOfCarePatientReferenceType, "patient")

            care_manager_type, care_manager_id = None, None
            if data.care_manager:
                care_manager_type, care_manager_id = _parse_ref(
                    data.care_manager, EpisodeOfCareCareManagerReferenceType, "careManager"
                )

            managing_org_pk = None
            managing_org_type = None
            if data.managing_organization:
                managing_org_pk = await _resolve_managing_org_pk(session, data.managing_organization)
                managing_org_type = OrganizationReferenceType.Organization

            children = _build_children(data, data.org_id)

            model = EpisodeOfCareModel(
                user_id=data.user_id,
                org_id=data.org_id,
                status=data.status,
                patient_type=patient_type,
                patient_id=patient_id,
                patient_display=data.patient_display,
                managing_organization_type=managing_org_type,
                managing_organization_id=managing_org_pk,
                managing_organization_display=data.managing_organization_display,
                period_start=_parse_dt(data.period_start),
                period_end=_parse_dt(data.period_end),
                care_manager_type=care_manager_type,
                care_manager_id=care_manager_id,
                care_manager_display=data.care_manager_display,
                created_by=created_by,
                **children,
            )
            session.add(model)
            await session.commit()
            await session.refresh(model)

            stmt = _with_relationships(
                select(EpisodeOfCareModel).where(EpisodeOfCareModel.id == model.id)
            )
            result = await session.execute(stmt)
            return result.scalar_one()

    async def get(self, episode_of_care_id: int) -> Optional[EpisodeOfCareModel]:
        async with self.session_factory() as session:
            stmt = _with_relationships(
                select(EpisodeOfCareModel).where(
                    EpisodeOfCareModel.episode_of_care_id == episode_of_care_id
                )
            )
            result = await session.execute(stmt)
            return result.scalar_one_or_none()

    async def list(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        episode_status=None,
        patient_id: Optional[int] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[int, List[EpisodeOfCareModel]]:
        async with self.session_factory() as session:
            base = select(EpisodeOfCareModel)
            base = _apply_list_filters(base, user_id, org_id, episode_status, patient_id)

            count_stmt = select(func.count()).select_from(base.subquery())
            total = (await session.execute(count_stmt)).scalar_one()

            data_stmt = _with_relationships(base).offset(offset).limit(limit)
            rows = (await session.execute(data_stmt)).scalars().all()
            return total, list(rows)

    async def patch(
        self, model: EpisodeOfCareModel, data: EpisodeOfCarePatchSchema, updated_by: Optional[str]
    ) -> EpisodeOfCareModel:
        async with self.session_factory() as session:
            result = await session.execute(
                _with_relationships(
                    select(EpisodeOfCareModel).where(EpisodeOfCareModel.id == model.id)
                )
            )
            db_model = result.scalar_one()
            updates = data.model_dump(exclude_unset=True)

            for field, value in updates.items():
                if field == "patient":
                    if value is not None:
                        pt, pid = _parse_ref(value, EpisodeOfCarePatientReferenceType, "patient")
                        db_model.patient_type = pt
                        db_model.patient_id = pid
                    else:
                        db_model.patient_type = None
                        db_model.patient_id = None
                elif field == "patient_display":
                    db_model.patient_display = value
                elif field == "managing_organization":
                    if value is not None:
                        pk = await _resolve_managing_org_pk(session, value)
                        db_model.managing_organization_id = pk
                        db_model.managing_organization_type = OrganizationReferenceType.Organization
                    else:
                        db_model.managing_organization_id = None
                        db_model.managing_organization_type = None
                elif field == "managing_organization_display":
                    db_model.managing_organization_display = value
                elif field == "care_manager":
                    if value is not None:
                        cmt, cmid = _parse_ref(value, EpisodeOfCareCareManagerReferenceType, "careManager")
                        db_model.care_manager_type = cmt
                        db_model.care_manager_id = cmid
                    else:
                        db_model.care_manager_type = None
                        db_model.care_manager_id = None
                elif field == "care_manager_display":
                    db_model.care_manager_display = value
                elif field in ("period_start", "period_end"):
                    setattr(db_model, field, _parse_dt(value))
                elif field in (
                    "identifiers", "status_history", "types", "diagnoses",
                    "referral_requests", "team", "accounts",
                ):
                    children = _build_children(data, db_model.org_id)
                    if field in children:
                        setattr(db_model, field, children[field])
                else:
                    setattr(db_model, field, value)

            db_model.updated_by = updated_by
            await session.commit()
            await session.refresh(db_model)

            stmt = _with_relationships(
                select(EpisodeOfCareModel).where(EpisodeOfCareModel.id == db_model.id)
            )
            result = await session.execute(stmt)
            return result.scalar_one()

    async def delete(self, model: EpisodeOfCareModel) -> None:
        async with self.session_factory() as session:
            result = await session.execute(
                select(EpisodeOfCareModel).where(EpisodeOfCareModel.id == model.id)
            )
            db_model = result.scalar_one_or_none()
            if db_model:
                await session.delete(db_model)
                await session.commit()
