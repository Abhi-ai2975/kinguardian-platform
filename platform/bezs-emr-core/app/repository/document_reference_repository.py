from typing import List, Optional, Tuple

from fastapi import HTTPException, status as http_status
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker  # noqa: F401
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.document_reference.enums import (
    DocumentReferenceAuthorReferenceType,
    DocumentReferenceAuthenticatorReferenceType,
    DocumentReferenceContextEncounterType,
    DocumentReferenceContextSourcePatientInfoType,
    DocumentReferenceRelatesToCode,
    DocumentReferenceRelatesToTargetType,
    DocumentReferenceSubjectReferenceType,
)
from app.models.document_reference.document_reference import (
    DocumentReferenceAuthor,
    DocumentReferenceCategory,
    DocumentReferenceContent,
    DocumentReferenceContextEncounter,
    DocumentReferenceContextEvent,
    DocumentReferenceContextRelated,
    DocumentReferenceIdentifier,
    DocumentReferenceModel,
    DocumentReferenceRelatesTo,
    DocumentReferenceSecurityLabel,
)
from app.models.enums import OrganizationReferenceType
from app.schemas.document_reference.input import (
    DocumentReferenceCreateSchema,
    DocumentReferencePatchSchema,
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


def _parse_open_ref(ref: str, field: str):
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
    return parts[0], ref_id


def _with_relationships(stmt):
    return stmt.options(
        selectinload(DocumentReferenceModel.identifiers),
        selectinload(DocumentReferenceModel.categories),
        selectinload(DocumentReferenceModel.authors),
        selectinload(DocumentReferenceModel.relates_to),
        selectinload(DocumentReferenceModel.security_labels),
        selectinload(DocumentReferenceModel.content),
        selectinload(DocumentReferenceModel.context_encounters),
        selectinload(DocumentReferenceModel.context_events),
        selectinload(DocumentReferenceModel.context_related),
        selectinload(DocumentReferenceModel.custodian),
    )


def _apply_list_filters(stmt, user_id=None, org_id=None):
    if user_id is not None:
        stmt = stmt.where(DocumentReferenceModel.user_id == user_id)
    if org_id is not None:
        stmt = stmt.where(DocumentReferenceModel.org_id == org_id)
    return stmt


class DocumentReferenceRepository:
    def __init__(self, session_factory: async_sessionmaker):
        self.session_factory = session_factory

    def _build_children(self, session, dr, payload: DocumentReferenceCreateSchema, org_id: Optional[str]):
        if payload.identifiers:
            for i in payload.identifiers:
                session.add(DocumentReferenceIdentifier(
                    document_reference_id=dr.id,
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

        if payload.categories:
            for c in payload.categories:
                session.add(DocumentReferenceCategory(
                    document_reference_id=dr.id,
                    org_id=org_id,
                    coding_system=c.coding_system,
                    coding_code=c.coding_code,
                    coding_display=c.coding_display,
                    text=c.text,
                ))

        if payload.authors:
            for a in payload.authors:
                ref_type, ref_id = None, None
                if a.reference:
                    ref_type, ref_id = _parse_ref(a.reference, DocumentReferenceAuthorReferenceType, "author")
                session.add(DocumentReferenceAuthor(
                    document_reference_id=dr.id,
                    org_id=org_id,
                    reference_type=ref_type,
                    reference_id=ref_id,
                    reference_display=a.display,
                ))

        if payload.relates_to:
            for r in payload.relates_to:
                try:
                    code = DocumentReferenceRelatesToCode(r.code)
                except ValueError:
                    allowed = [e.value for e in DocumentReferenceRelatesToCode]
                    raise HTTPException(
                        status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail=f"Invalid relatesTo.code '{r.code}'. Allowed: {allowed}.",
                    )
                target_type, target_id = _parse_ref(r.target, DocumentReferenceRelatesToTargetType, "relatesTo.target")
                session.add(DocumentReferenceRelatesTo(
                    document_reference_id=dr.id,
                    org_id=org_id,
                    code=code,
                    target_type=target_type,
                    target_id=target_id,
                    target_display=r.target_display,
                ))

        if payload.security_labels:
            for sl in payload.security_labels:
                session.add(DocumentReferenceSecurityLabel(
                    document_reference_id=dr.id,
                    org_id=org_id,
                    coding_system=sl.coding_system,
                    coding_code=sl.coding_code,
                    coding_display=sl.coding_display,
                    text=sl.text,
                ))

        for c in payload.content:
            att = c.attachment
            session.add(DocumentReferenceContent(
                document_reference_id=dr.id,
                org_id=org_id,
                attachment_content_type=att.content_type,
                attachment_language=att.language,
                attachment_data=att.data,
                attachment_url=att.url,
                attachment_size=att.size,
                attachment_hash=att.hash,
                attachment_title=att.title,
                attachment_creation=att.creation,
                format_system=c.format_system,
                format_version=c.format_version,
                format_code=c.format_code,
                format_display=c.format_display,
            ))

        if payload.context:
            ctx = payload.context
            if ctx.encounter:
                for e in ctx.encounter:
                    ref_type, ref_id = None, None
                    if e.reference:
                        ref_type, ref_id = _parse_ref(e.reference, DocumentReferenceContextEncounterType, "context.encounter")
                    session.add(DocumentReferenceContextEncounter(
                        document_reference_id=dr.id,
                        org_id=org_id,
                        reference_type=ref_type,
                        reference_id=ref_id,
                        reference_display=e.display,
                    ))
            if ctx.event:
                for ev in ctx.event:
                    session.add(DocumentReferenceContextEvent(
                        document_reference_id=dr.id,
                        org_id=org_id,
                        coding_system=ev.coding_system,
                        coding_code=ev.coding_code,
                        coding_display=ev.coding_display,
                        text=ev.text,
                    ))
            if ctx.related:
                for r in ctx.related:
                    ref_type_str, ref_id = None, None
                    if r.reference:
                        ref_type_str, ref_id = _parse_open_ref(r.reference, "context.related")
                    session.add(DocumentReferenceContextRelated(
                        document_reference_id=dr.id,
                        org_id=org_id,
                        reference_type=ref_type_str,
                        reference_id=ref_id,
                        reference_display=r.display,
                    ))

    def _apply_context_to_model(self, dr, payload):
        ctx = payload.context
        if ctx is None:
            return
        dr.context_period_start = ctx.period_start
        dr.context_period_end = ctx.period_end
        dr.context_facility_type_system = ctx.facility_type_system
        dr.context_facility_type_code = ctx.facility_type_code
        dr.context_facility_type_display = ctx.facility_type_display
        dr.context_facility_type_text = ctx.facility_type_text
        dr.context_practice_setting_system = ctx.practice_setting_system
        dr.context_practice_setting_code = ctx.practice_setting_code
        dr.context_practice_setting_display = ctx.practice_setting_display
        dr.context_practice_setting_text = ctx.practice_setting_text
        if ctx.source_patient_info:
            sp_type, sp_id = _parse_ref(ctx.source_patient_info, DocumentReferenceContextSourcePatientInfoType, "context.sourcePatientInfo")
            dr.context_source_patient_info_type = sp_type
            dr.context_source_patient_info_id = sp_id
            dr.context_source_patient_info_display = ctx.source_patient_info_display

    async def create(
        self,
        payload: DocumentReferenceCreateSchema,
        user_id: Optional[str],
        org_id: Optional[str],
        created_by: Optional[str],
    ) -> DocumentReferenceModel:
        async with self.session_factory() as session:
            subject_type, subject_id = None, None
            if payload.subject:
                subject_type, subject_id = _parse_ref(payload.subject, DocumentReferenceSubjectReferenceType, "subject")

            authenticator_type, authenticator_id = None, None
            if payload.authenticator:
                authenticator_type, authenticator_id = _parse_ref(
                    payload.authenticator, DocumentReferenceAuthenticatorReferenceType, "authenticator"
                )

            custodian_type, custodian_db_id = None, None
            if payload.custodian:
                _, cust_public_id = _parse_ref(payload.custodian, OrganizationReferenceType, "custodian")
                from app.models.organization.organization import OrganizationModel
                result = await session.execute(
                    select(OrganizationModel).where(OrganizationModel.organization_id == cust_public_id)
                )
                org_row = result.scalar_one_or_none()
                if org_row is None:
                    raise HTTPException(status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Organization/{cust_public_id} not found.")
                custodian_type = OrganizationReferenceType.Organization
                custodian_db_id = org_row.id

            dr = DocumentReferenceModel(
                user_id=user_id,
                org_id=org_id,
                status=payload.status,
                doc_status=payload.doc_status,
                master_identifier_use=payload.master_identifier_use,
                master_identifier_type_system=payload.master_identifier_type_system,
                master_identifier_type_code=payload.master_identifier_type_code,
                master_identifier_type_display=payload.master_identifier_type_display,
                master_identifier_type_text=payload.master_identifier_type_text,
                master_identifier_system=payload.master_identifier_system,
                master_identifier_value=payload.master_identifier_value,
                master_identifier_period_start=payload.master_identifier_period_start,
                master_identifier_period_end=payload.master_identifier_period_end,
                master_identifier_assigner=payload.master_identifier_assigner,
                type_system=payload.type_system,
                type_code=payload.type_code,
                type_display=payload.type_display,
                type_text=payload.type_text,
                subject_type=subject_type,
                subject_id=subject_id,
                subject_display=payload.subject_display,
                date=payload.date,
                authenticator_type=authenticator_type,
                authenticator_id=authenticator_id,
                authenticator_display=payload.authenticator_display,
                custodian_type=custodian_type,
                custodian_id=custodian_db_id,
                custodian_display=payload.custodian_display,
                description=payload.description,
                created_by=created_by,
            )
            if payload.context:
                self._apply_context_to_model(dr, payload)

            session.add(dr)
            await session.flush()
            self._build_children(session, dr, payload, org_id)
            await session.commit()
            await session.refresh(dr)

        return await self.get_by_document_reference_id(dr.document_reference_id)

    async def patch(
        self,
        document_reference_id: int,
        payload: DocumentReferencePatchSchema,
        updated_by: Optional[str],
    ) -> Optional[DocumentReferenceModel]:
        async with self.session_factory() as session:
            stmt = _with_relationships(
                select(DocumentReferenceModel).where(
                    DocumentReferenceModel.document_reference_id == document_reference_id
                )
            )
            result = await session.execute(stmt)
            dr = result.scalar_one_or_none()
            if dr is None:
                return None

            data = payload.model_dump(exclude_unset=True)

            if "status" in data:
                dr.status = data["status"]
            if "doc_status" in data:
                dr.doc_status = data["doc_status"]
            if "description" in data:
                dr.description = data["description"]
            if "date" in data:
                dr.date = data["date"]

            for field in [
                "master_identifier_use", "master_identifier_type_system", "master_identifier_type_code",
                "master_identifier_type_display", "master_identifier_type_text", "master_identifier_system",
                "master_identifier_value", "master_identifier_period_start", "master_identifier_period_end",
                "master_identifier_assigner", "type_system", "type_code", "type_display", "type_text",
                "subject_display", "authenticator_display", "custodian_display",
            ]:
                if field in data:
                    setattr(dr, field, data[field])

            if "subject" in data and data["subject"]:
                subject_type, subject_id = _parse_ref(data["subject"], DocumentReferenceSubjectReferenceType, "subject")
                dr.subject_type = subject_type
                dr.subject_id = subject_id

            if "authenticator" in data and data["authenticator"]:
                auth_type, auth_id = _parse_ref(data["authenticator"], DocumentReferenceAuthenticatorReferenceType, "authenticator")
                dr.authenticator_type = auth_type
                dr.authenticator_id = auth_id

            if "custodian" in data and data["custodian"]:
                _, cust_public_id = _parse_ref(data["custodian"], OrganizationReferenceType, "custodian")
                from app.models.organization.organization import OrganizationModel
                org_result = await session.execute(
                    select(OrganizationModel).where(OrganizationModel.organization_id == cust_public_id)
                )
                org_row = org_result.scalar_one_or_none()
                if org_row is None:
                    raise HTTPException(status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Organization/{cust_public_id} not found.")
                dr.custodian_type = OrganizationReferenceType.Organization
                dr.custodian_id = org_row.id

            if "context" in data and data["context"] is not None:
                self._apply_context_to_model(dr, payload)
                # Replace context child lists
                for child in list(dr.context_encounters):
                    await session.delete(child)
                for child in list(dr.context_events):
                    await session.delete(child)
                for child in list(dr.context_related):
                    await session.delete(child)
                await session.flush()
                ctx = payload.context
                if ctx and ctx.encounter:
                    for e in ctx.encounter:
                        ref_type, ref_id = None, None
                        if e.reference:
                            ref_type, ref_id = _parse_ref(e.reference, DocumentReferenceContextEncounterType, "context.encounter")
                        session.add(DocumentReferenceContextEncounter(
                            document_reference_id=dr.id, org_id=dr.org_id,
                            reference_type=ref_type, reference_id=ref_id, reference_display=e.display,
                        ))
                if ctx and ctx.event:
                    for ev in ctx.event:
                        session.add(DocumentReferenceContextEvent(
                            document_reference_id=dr.id, org_id=dr.org_id,
                            coding_system=ev.coding_system, coding_code=ev.coding_code,
                            coding_display=ev.coding_display, text=ev.text,
                        ))
                if ctx and ctx.related:
                    for r in ctx.related:
                        ref_type_str, ref_id = None, None
                        if r.reference:
                            ref_type_str, ref_id = _parse_open_ref(r.reference, "context.related")
                        session.add(DocumentReferenceContextRelated(
                            document_reference_id=dr.id, org_id=dr.org_id,
                            reference_type=ref_type_str, reference_id=ref_id, reference_display=r.display,
                        ))

            if "identifiers" in data and data["identifiers"] is not None:
                for child in list(dr.identifiers):
                    await session.delete(child)
                await session.flush()
                for i in payload.identifiers or []:
                    session.add(DocumentReferenceIdentifier(
                        document_reference_id=dr.id, org_id=dr.org_id,
                        use=i.use, type_system=i.type_system, type_code=i.type_code,
                        type_display=i.type_display, type_text=i.type_text,
                        system=i.system, value=i.value,
                        period_start=i.period_start, period_end=i.period_end, assigner=i.assigner,
                    ))

            if "categories" in data and data["categories"] is not None:
                for child in list(dr.categories):
                    await session.delete(child)
                await session.flush()
                for c in payload.categories or []:
                    session.add(DocumentReferenceCategory(
                        document_reference_id=dr.id, org_id=dr.org_id,
                        coding_system=c.coding_system, coding_code=c.coding_code,
                        coding_display=c.coding_display, text=c.text,
                    ))

            if "authors" in data and data["authors"] is not None:
                for child in list(dr.authors):
                    await session.delete(child)
                await session.flush()
                for a in payload.authors or []:
                    ref_type, ref_id = None, None
                    if a.reference:
                        ref_type, ref_id = _parse_ref(a.reference, DocumentReferenceAuthorReferenceType, "author")
                    session.add(DocumentReferenceAuthor(
                        document_reference_id=dr.id, org_id=dr.org_id,
                        reference_type=ref_type, reference_id=ref_id, reference_display=a.display,
                    ))

            if "relates_to" in data and data["relates_to"] is not None:
                for child in list(dr.relates_to):
                    await session.delete(child)
                await session.flush()
                for r in payload.relates_to or []:
                    try:
                        code = DocumentReferenceRelatesToCode(r.code)
                    except ValueError:
                        allowed = [e.value for e in DocumentReferenceRelatesToCode]
                        raise HTTPException(status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Invalid relatesTo.code '{r.code}'. Allowed: {allowed}.")
                    target_type, target_id = _parse_ref(r.target, DocumentReferenceRelatesToTargetType, "relatesTo.target")
                    session.add(DocumentReferenceRelatesTo(
                        document_reference_id=dr.id, org_id=dr.org_id,
                        code=code, target_type=target_type, target_id=target_id, target_display=r.target_display,
                    ))

            if "security_labels" in data and data["security_labels"] is not None:
                for child in list(dr.security_labels):
                    await session.delete(child)
                await session.flush()
                for sl in payload.security_labels or []:
                    session.add(DocumentReferenceSecurityLabel(
                        document_reference_id=dr.id, org_id=dr.org_id,
                        coding_system=sl.coding_system, coding_code=sl.coding_code,
                        coding_display=sl.coding_display, text=sl.text,
                    ))

            if "content" in data and data["content"] is not None:
                for child in list(dr.content):
                    await session.delete(child)
                await session.flush()
                for c in payload.content or []:
                    att = c.attachment
                    session.add(DocumentReferenceContent(
                        document_reference_id=dr.id, org_id=dr.org_id,
                        attachment_content_type=att.content_type, attachment_language=att.language,
                        attachment_data=att.data, attachment_url=att.url, attachment_size=att.size,
                        attachment_hash=att.hash, attachment_title=att.title, attachment_creation=att.creation,
                        format_system=c.format_system, format_version=c.format_version,
                        format_code=c.format_code, format_display=c.format_display,
                    ))

            dr.updated_by = updated_by
            await session.commit()

        return await self.get_by_document_reference_id(document_reference_id)

    async def delete(self, document_reference_id: int) -> bool:
        async with self.session_factory() as session:
            result = await session.execute(
                select(DocumentReferenceModel).where(
                    DocumentReferenceModel.document_reference_id == document_reference_id
                )
            )
            dr = result.scalar_one_or_none()
            if dr is None:
                return False
            await session.delete(dr)
            await session.commit()
            return True

    async def list(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[DocumentReferenceModel], int]:
        async with self.session_factory() as session:
            base = select(DocumentReferenceModel)
            base = _apply_list_filters(base, user_id, org_id)
            count_result = await session.execute(select(func.count()).select_from(base.subquery()))
            total = count_result.scalar_one()
            stmt = _with_relationships(base).order_by(DocumentReferenceModel.id.desc()).limit(limit).offset(offset)
            rows = await session.execute(stmt)
            return list(rows.scalars().all()), total

    async def get_me(
        self,
        user_id: str,
        org_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[DocumentReferenceModel], int]:
        return await self.list(user_id=user_id, org_id=org_id, limit=limit, offset=offset)

    async def get_by_document_reference_id(self, document_reference_id: int) -> Optional[DocumentReferenceModel]:
        async with self.session_factory() as session:
            stmt = _with_relationships(
                select(DocumentReferenceModel).where(
                    DocumentReferenceModel.document_reference_id == document_reference_id
                )
            )
            result = await session.execute(stmt)
            return result.scalar_one_or_none()
