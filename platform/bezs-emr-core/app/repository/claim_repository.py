from typing import List, Optional, Tuple

from fastapi import HTTPException, status as http_status
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker  # noqa: F401
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.claim.claim import (
    ClaimDiagnosis,
    ClaimInsurance,
    ClaimInsurancePreAuthRef,
    ClaimItem,
    ClaimItemDetail,
    ClaimItemDetailSubDetail,
    ClaimItemEncounter,
    ClaimModel,
    ClaimProcedure,
    ClaimCareTeam,
    ClaimSupportingInfo,
    ClaimRelated,
    ClaimIdentifier,
    ClaimDiagnosisType,
    ClaimProcedureType,
    ClaimProcedureUdi,
    ClaimItemModifier,
    ClaimItemProgramCode,
    ClaimItemUdi,
    ClaimItemSubSite,
    ClaimItemDetailModifier,
    ClaimItemDetailProgramCode,
    ClaimItemDetailUdi,
    ClaimItemDetailSubDetailModifier,
    ClaimItemDetailSubDetailProgramCode,
    ClaimItemDetailSubDetailUdi,
)
from app.models.claim.enums import (
    ClaimStatus,
    ClaimUse,
    ClaimPatientReferenceType,
    ClaimEntererReferenceType,
    ClaimProviderReferenceType,
    ClaimPrescriptionReferenceType,
    ClaimReferralReferenceType,
    ClaimLocationReferenceType,
    ClaimPayeePartyReferenceType,
    ClaimRelatedClaimReferenceType,
    ClaimDiagnosisConditionReferenceType,
    ClaimProcedureReferenceType,
    ClaimDeviceReferenceType,
    ClaimInsuranceCoverageReferenceType,
    ClaimInsuranceClaimResponseReferenceType,
    ClaimItemEncounterReferenceType,
)
from app.models.encounter.encounter import EncounterModel
from app.models.enums import OrganizationReferenceType
from app.schemas.claim.input import ClaimCreateSchema, ClaimPatchSchema


def _with_relationships(stmt):
    return stmt.options(
        selectinload(ClaimModel.identifiers),
        selectinload(ClaimModel.related),
        selectinload(ClaimModel.care_team),
        selectinload(ClaimModel.supporting_info),
        selectinload(ClaimModel.diagnoses).selectinload(ClaimDiagnosis.types),
        selectinload(ClaimModel.procedures).selectinload(ClaimProcedure.types),
        selectinload(ClaimModel.procedures).selectinload(ClaimProcedure.udi),
        selectinload(ClaimModel.insurance).selectinload(ClaimInsurance.pre_auth_refs),
        selectinload(ClaimModel.items).selectinload(ClaimItem.modifiers),
        selectinload(ClaimModel.items).selectinload(ClaimItem.program_codes),
        selectinload(ClaimModel.items).selectinload(ClaimItem.udi),
        selectinload(ClaimModel.items).selectinload(ClaimItem.sub_sites),
        selectinload(ClaimModel.items).selectinload(ClaimItem.encounters).selectinload(ClaimItemEncounter.encounter),
        selectinload(ClaimModel.items).selectinload(ClaimItem.details).selectinload(ClaimItemDetail.modifiers),
        selectinload(ClaimModel.items).selectinload(ClaimItem.details).selectinload(ClaimItemDetail.program_codes),
        selectinload(ClaimModel.items).selectinload(ClaimItem.details).selectinload(ClaimItemDetail.udi),
        selectinload(ClaimModel.items).selectinload(ClaimItem.details).selectinload(ClaimItemDetail.sub_details).selectinload(ClaimItemDetailSubDetail.modifiers),
        selectinload(ClaimModel.items).selectinload(ClaimItem.details).selectinload(ClaimItemDetail.sub_details).selectinload(ClaimItemDetailSubDetail.program_codes),
        selectinload(ClaimModel.items).selectinload(ClaimItem.details).selectinload(ClaimItemDetail.sub_details).selectinload(ClaimItemDetailSubDetail.udi),
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


class ClaimRepository:
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]):
        self.session_factory = session_factory

    async def get_by_claim_id(self, claim_id: int) -> Optional[ClaimModel]:
        async with self.session_factory() as session:
            stmt = _with_relationships(select(ClaimModel).where(ClaimModel.claim_id == claim_id))
            result = await session.execute(stmt)
            return result.scalars().first()

    def _apply_list_filters(self, stmt, user_id, org_id, claim_status, claim_use):
        if user_id:
            stmt = stmt.where(ClaimModel.user_id == user_id)
        if org_id:
            stmt = stmt.where(ClaimModel.org_id == org_id)
        if claim_status:
            try:
                stmt = stmt.where(ClaimModel.status == ClaimStatus(claim_status))
            except ValueError:
                pass
        if claim_use:
            try:
                stmt = stmt.where(ClaimModel.use == ClaimUse(claim_use))
            except ValueError:
                pass
        return stmt

    async def get_me(
        self,
        user_id: str,
        org_id: str,
        claim_status: Optional[str] = None,
        claim_use: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[ClaimModel], int]:
        async with self.session_factory() as session:
            base = self._apply_list_filters(
                _with_relationships(select(ClaimModel)),
                user_id, org_id, claim_status, claim_use,
            )
            count_base = self._apply_list_filters(
                select(func.count()).select_from(ClaimModel),
                user_id, org_id, claim_status, claim_use,
            )
            total = (await session.execute(count_base)).scalar_one()
            rows = list((await session.execute(
                base.order_by(ClaimModel.claim_id.desc()).offset(offset).limit(limit)
            )).scalars().all())
        return rows, total

    async def list(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        claim_status: Optional[str] = None,
        claim_use: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[ClaimModel], int]:
        async with self.session_factory() as session:
            base = self._apply_list_filters(
                _with_relationships(select(ClaimModel)),
                user_id, org_id, claim_status, claim_use,
            )
            count_base = self._apply_list_filters(
                select(func.count()).select_from(ClaimModel),
                user_id, org_id, claim_status, claim_use,
            )
            total = (await session.execute(count_base)).scalar_one()
            rows = list((await session.execute(
                base.order_by(ClaimModel.claim_id.desc()).offset(offset).limit(limit)
            )).scalars().all())
        return rows, total

    async def create(
        self,
        payload: ClaimCreateSchema,
        user_id: Optional[str],
        org_id: Optional[str],
        created_by: Optional[str],
    ) -> ClaimModel:
        async with self.session_factory() as session:
            pat_type, pat_id = _parse_ref(payload.patient, ClaimPatientReferenceType, "patient")
            prov_type, prov_id = _parse_ref(payload.provider, ClaimProviderReferenceType, "provider")
            ent_type, ent_id = _parse_ref_optional(payload.enterer, ClaimEntererReferenceType, "enterer")
            ins_type, ins_id = _parse_ref_optional(payload.insurer, OrganizationReferenceType, "insurer")
            rx_type, rx_id = _parse_ref_optional(payload.prescription, ClaimPrescriptionReferenceType, "prescription")
            orig_rx_type, orig_rx_id = _parse_ref_optional(payload.original_prescription, ClaimPrescriptionReferenceType, "original_prescription")
            payee_type_val, payee_id_val = _parse_ref_optional(payload.payee_party, ClaimPayeePartyReferenceType, "payee_party")
            ref_type, ref_id = _parse_ref_optional(payload.referral, ClaimReferralReferenceType, "referral")
            fac_type, fac_id = _parse_ref_optional(payload.facility, ClaimLocationReferenceType, "facility")

            claim = ClaimModel(
                user_id=user_id,
                org_id=org_id,
                created_by=created_by,
                status=ClaimStatus(payload.status).value,
                use=ClaimUse(payload.use).value,
                created=payload.created,
                type_system=payload.type_system,
                type_code=payload.type_code,
                type_display=payload.type_display,
                type_text=payload.type_text,
                sub_type_system=payload.sub_type_system,
                sub_type_code=payload.sub_type_code,
                sub_type_display=payload.sub_type_display,
                sub_type_text=payload.sub_type_text,
                patient_type=pat_type,
                patient_id=pat_id,
                patient_display=payload.patient_display,
                billable_period_start=payload.billable_period_start,
                billable_period_end=payload.billable_period_end,
                enterer_type=ent_type,
                enterer_id=ent_id,
                enterer_display=payload.enterer_display,
                insurer_type=ins_type,
                insurer_id=ins_id,
                insurer_display=payload.insurer_display,
                provider_type=prov_type,
                provider_id=prov_id,
                provider_display=payload.provider_display,
                priority_system=payload.priority_system,
                priority_code=payload.priority_code,
                priority_display=payload.priority_display,
                priority_text=payload.priority_text,
                funds_reserve_system=payload.funds_reserve_system,
                funds_reserve_code=payload.funds_reserve_code,
                funds_reserve_display=payload.funds_reserve_display,
                funds_reserve_text=payload.funds_reserve_text,
                prescription_type=rx_type,
                prescription_id=rx_id,
                prescription_display=payload.prescription_display,
                original_prescription_type=orig_rx_type,
                original_prescription_id=orig_rx_id,
                original_prescription_display=payload.original_prescription_display,
                payee_type_system=payload.payee_type_system,
                payee_type_code=payload.payee_type_code,
                payee_type_display=payload.payee_type_display,
                payee_type_text=payload.payee_type_text,
                payee_party_type=payee_type_val,
                payee_party_id=payee_id_val,
                payee_party_display=payload.payee_party_display,
                referral_type=ref_type,
                referral_id=ref_id,
                referral_display=payload.referral_display,
                facility_type=fac_type,
                facility_id=fac_id,
                facility_display=payload.facility_display,
                accident_date=payload.accident_date,
                accident_type_system=payload.accident_type_system,
                accident_type_code=payload.accident_type_code,
                accident_type_display=payload.accident_type_display,
                accident_type_text=payload.accident_type_text,
                accident_location_address_use=payload.accident_location_address_use,
                accident_location_address_type=payload.accident_location_address_type,
                accident_location_address_text=payload.accident_location_address_text,
                accident_location_address_line=payload.accident_location_address_line,
                accident_location_address_city=payload.accident_location_address_city,
                accident_location_address_district=payload.accident_location_address_district,
                accident_location_address_state=payload.accident_location_address_state,
                accident_location_address_postal_code=payload.accident_location_address_postal_code,
                accident_location_address_country=payload.accident_location_address_country,
                accident_location_address_period_start=payload.accident_location_address_period_start,
                accident_location_address_period_end=payload.accident_location_address_period_end,
                accident_location_reference_type=ClaimLocationReferenceType(payload.accident_location_reference_type) if payload.accident_location_reference_type else None,
                accident_location_reference_id=payload.accident_location_reference_id,
                accident_location_reference_display=payload.accident_location_reference_display,
                total_value=payload.total_value,
                total_currency=payload.total_currency,
            )
            session.add(claim)

            for item in (payload.identifiers or []):
                session.add(ClaimIdentifier(
                    claim=claim, org_id=org_id,
                    use=item.use,
                    type_system=item.type_system, type_code=item.type_code,
                    type_display=item.type_display, type_text=item.type_text,
                    system=item.system, value=item.value,
                    period_start=item.period_start, period_end=item.period_end,
                    assigner=item.assigner,
                ))

            for item in (payload.related or []):
                r_type, r_id = None, None
                if item.related_claim_type:
                    try:
                        r_type = ClaimRelatedClaimReferenceType(item.related_claim_type)
                        r_id = item.related_claim_id
                    except ValueError:
                        pass
                session.add(ClaimRelated(
                    claim=claim, org_id=org_id,
                    related_claim_type=r_type,
                    related_claim_id=r_id,
                    related_claim_display=item.related_claim_display,
                    relationship_system=item.relationship_system,
                    relationship_code=item.relationship_code,
                    relationship_display=item.relationship_display,
                    relationship_text=item.relationship_text,
                    reference_use=item.reference_use,
                    reference_type_system=item.reference_type_system,
                    reference_type_code=item.reference_type_code,
                    reference_type_display=item.reference_type_display,
                    reference_type_text=item.reference_type_text,
                    reference_system=item.reference_system,
                    reference_value=item.reference_value,
                    reference_period_start=item.reference_period_start,
                    reference_period_end=item.reference_period_end,
                    reference_assigner=item.reference_assigner,
                ))

            for item in (payload.care_team or []):
                ct_type, ct_id = _parse_ref(item.provider, ClaimProviderReferenceType, "care_team.provider")
                session.add(ClaimCareTeam(
                    claim=claim, org_id=org_id,
                    sequence=item.sequence,
                    provider_type=ct_type,
                    provider_id=ct_id,
                    provider_display=item.provider_display,
                    responsible=item.responsible,
                    role_system=item.role_system, role_code=item.role_code,
                    role_display=item.role_display, role_text=item.role_text,
                    qualification_system=item.qualification_system,
                    qualification_code=item.qualification_code,
                    qualification_display=item.qualification_display,
                    qualification_text=item.qualification_text,
                ))

            for item in (payload.supporting_info or []):
                session.add(ClaimSupportingInfo(
                    claim=claim, org_id=org_id,
                    sequence=item.sequence,
                    category_system=item.category_system, category_code=item.category_code,
                    category_display=item.category_display, category_text=item.category_text,
                    code_system=item.code_system, code_code=item.code_code,
                    code_display=item.code_display, code_text=item.code_text,
                    timing_date=item.timing_date,
                    timing_period_start=item.timing_period_start,
                    timing_period_end=item.timing_period_end,
                    value_boolean=item.value_boolean,
                    value_string=item.value_string,
                    value_quantity_value=item.value_quantity_value,
                    value_quantity_comparator=item.value_quantity_comparator,
                    value_quantity_unit=item.value_quantity_unit,
                    value_quantity_system=item.value_quantity_system,
                    value_quantity_code=item.value_quantity_code,
                    value_attachment_content_type=item.value_attachment_content_type,
                    value_attachment_language=item.value_attachment_language,
                    value_attachment_data=item.value_attachment_data,
                    value_attachment_url=item.value_attachment_url,
                    value_attachment_size=item.value_attachment_size,
                    value_attachment_hash=item.value_attachment_hash,
                    value_attachment_title=item.value_attachment_title,
                    value_attachment_creation=item.value_attachment_creation,
                    value_reference_type=item.value_reference_type,
                    value_reference_id=item.value_reference_id,
                    value_reference_display=item.value_reference_display,
                    reason_system=item.reason_system, reason_code=item.reason_code,
                    reason_display=item.reason_display, reason_text=item.reason_text,
                ))

            for item in (payload.diagnoses or []):
                dx_ref_type = ClaimDiagnosisConditionReferenceType(item.diagnosis_reference_type) if item.diagnosis_reference_type else None
                dx = ClaimDiagnosis(
                    claim=claim, org_id=org_id,
                    sequence=item.sequence,
                    diagnosis_codeable_concept_system=item.diagnosis_codeable_concept_system,
                    diagnosis_codeable_concept_code=item.diagnosis_codeable_concept_code,
                    diagnosis_codeable_concept_display=item.diagnosis_codeable_concept_display,
                    diagnosis_codeable_concept_text=item.diagnosis_codeable_concept_text,
                    diagnosis_reference_type=dx_ref_type,
                    diagnosis_reference_id=item.diagnosis_reference_id,
                    diagnosis_reference_display=item.diagnosis_reference_display,
                    on_admission_system=item.on_admission_system,
                    on_admission_code=item.on_admission_code,
                    on_admission_display=item.on_admission_display,
                    on_admission_text=item.on_admission_text,
                    package_code_system=item.package_code_system,
                    package_code_code=item.package_code_code,
                    package_code_display=item.package_code_display,
                    package_code_text=item.package_code_text,
                )
                session.add(dx)
                for t in (item.types or []):
                    session.add(ClaimDiagnosisType(
                        diagnosis=dx, org_id=org_id,
                        coding_system=t.coding_system, coding_code=t.coding_code,
                        coding_display=t.coding_display, text=t.text,
                    ))

            for item in (payload.procedures or []):
                proc_ref_type = ClaimProcedureReferenceType(item.procedure_reference_type) if item.procedure_reference_type else None
                proc = ClaimProcedure(
                    claim=claim, org_id=org_id,
                    sequence=item.sequence,
                    date=item.date,
                    procedure_codeable_concept_system=item.procedure_codeable_concept_system,
                    procedure_codeable_concept_code=item.procedure_codeable_concept_code,
                    procedure_codeable_concept_display=item.procedure_codeable_concept_display,
                    procedure_codeable_concept_text=item.procedure_codeable_concept_text,
                    procedure_reference_type=proc_ref_type,
                    procedure_reference_id=item.procedure_reference_id,
                    procedure_reference_display=item.procedure_reference_display,
                )
                session.add(proc)
                for t in (item.types or []):
                    session.add(ClaimProcedureType(
                        procedure=proc, org_id=org_id,
                        coding_system=t.coding_system, coding_code=t.coding_code,
                        coding_display=t.coding_display, text=t.text,
                    ))
                for u in (item.udi or []):
                    u_type = ClaimDeviceReferenceType(u.reference_type) if u.reference_type else None
                    session.add(ClaimProcedureUdi(
                        procedure=proc, org_id=org_id,
                        reference_type=u_type,
                        reference_id=u.reference_id,
                        reference_display=u.reference_display,
                    ))

            for item in (payload.insurance or []):
                cov_type, cov_id = _parse_ref(item.coverage, ClaimInsuranceCoverageReferenceType, "insurance.coverage")
                cr_ins_type = ClaimInsuranceClaimResponseReferenceType(item.claim_response_type) if item.claim_response_type else None
                ins_obj = ClaimInsurance(
                    claim=claim, org_id=org_id,
                    sequence=item.sequence,
                    focal=item.focal,
                    identifier_use=item.identifier_use,
                    identifier_type_system=item.identifier_type_system,
                    identifier_type_code=item.identifier_type_code,
                    identifier_type_display=item.identifier_type_display,
                    identifier_type_text=item.identifier_type_text,
                    identifier_system=item.identifier_system,
                    identifier_value=item.identifier_value,
                    identifier_period_start=item.identifier_period_start,
                    identifier_period_end=item.identifier_period_end,
                    identifier_assigner=item.identifier_assigner,
                    coverage_type=cov_type,
                    coverage_id=cov_id,
                    coverage_display=item.coverage_display,
                    business_arrangement=item.business_arrangement,
                    claim_response_type=cr_ins_type,
                    claim_response_id=item.claim_response_id,
                    claim_response_display=item.claim_response_display,
                )
                session.add(ins_obj)
                for par in (item.pre_auth_refs or []):
                    session.add(ClaimInsurancePreAuthRef(
                        insurance=ins_obj, org_id=org_id, value=par.value
                    ))

            for item in (payload.items or []):
                # Convert cross-ref sequence lists to comma-sep text
                cts_str = ",".join(str(x) for x in item.care_team_sequence) if item.care_team_sequence else None
                dxs_str = ",".join(str(x) for x in item.diagnosis_sequence) if item.diagnosis_sequence else None
                prs_str = ",".join(str(x) for x in item.procedure_sequence) if item.procedure_sequence else None
                iss_str = ",".join(str(x) for x in item.information_sequence) if item.information_sequence else None
                loc_ref_type = ClaimLocationReferenceType(item.location_reference_type) if item.location_reference_type else None
                ci = ClaimItem(
                    claim=claim, org_id=org_id,
                    sequence=item.sequence,
                    care_team_sequence=cts_str,
                    diagnosis_sequence=dxs_str,
                    procedure_sequence=prs_str,
                    information_sequence=iss_str,
                    revenue_system=item.revenue_system, revenue_code=item.revenue_code,
                    revenue_display=item.revenue_display, revenue_text=item.revenue_text,
                    category_system=item.category_system, category_code=item.category_code,
                    category_display=item.category_display, category_text=item.category_text,
                    product_or_service_system=item.product_or_service_system,
                    product_or_service_code=item.product_or_service_code,
                    product_or_service_display=item.product_or_service_display,
                    product_or_service_text=item.product_or_service_text,
                    serviced_date=item.serviced_date,
                    serviced_period_start=item.serviced_period_start,
                    serviced_period_end=item.serviced_period_end,
                    location_codeable_concept_system=item.location_codeable_concept_system,
                    location_codeable_concept_code=item.location_codeable_concept_code,
                    location_codeable_concept_display=item.location_codeable_concept_display,
                    location_codeable_concept_text=item.location_codeable_concept_text,
                    location_address_use=item.location_address_use,
                    location_address_type=item.location_address_type,
                    location_address_text=item.location_address_text,
                    location_address_line=item.location_address_line,
                    location_address_city=item.location_address_city,
                    location_address_district=item.location_address_district,
                    location_address_state=item.location_address_state,
                    location_address_postal_code=item.location_address_postal_code,
                    location_address_country=item.location_address_country,
                    location_address_period_start=item.location_address_period_start,
                    location_address_period_end=item.location_address_period_end,
                    location_reference_type=loc_ref_type,
                    location_reference_id=item.location_reference_id,
                    location_reference_display=item.location_reference_display,
                    quantity_value=item.quantity_value,
                    quantity_unit=item.quantity_unit,
                    quantity_system=item.quantity_system,
                    quantity_code=item.quantity_code,
                    unit_price_value=item.unit_price_value,
                    unit_price_currency=item.unit_price_currency,
                    factor=item.factor,
                    net_value=item.net_value,
                    net_currency=item.net_currency,
                    body_site_system=item.body_site_system,
                    body_site_code=item.body_site_code,
                    body_site_display=item.body_site_display,
                    body_site_text=item.body_site_text,
                )
                session.add(ci)

                for m in (item.modifiers or []):
                    session.add(ClaimItemModifier(item=ci, org_id=org_id, coding_system=m.coding_system, coding_code=m.coding_code, coding_display=m.coding_display, text=m.text))
                for pc in (item.program_codes or []):
                    session.add(ClaimItemProgramCode(item=ci, org_id=org_id, coding_system=pc.coding_system, coding_code=pc.coding_code, coding_display=pc.coding_display, text=pc.text))
                for u in (item.udi or []):
                    u_type = ClaimDeviceReferenceType(u.reference_type) if u.reference_type else None
                    session.add(ClaimItemUdi(item=ci, org_id=org_id, reference_type=u_type, reference_id=u.reference_id, reference_display=u.reference_display))
                for ss in (item.sub_sites or []):
                    session.add(ClaimItemSubSite(item=ci, org_id=org_id, coding_system=ss.coding_system, coding_code=ss.coding_code, coding_display=ss.coding_display, text=ss.text))
                for enc in (item.encounters or []):
                    enc_ref_type = ClaimItemEncounterReferenceType(enc.reference_type) if enc.reference_type else None
                    # Look up internal encounter PK from public encounter_id
                    enc_internal_id = None
                    if enc.reference_id is not None:
                        enc_row = (await session.execute(
                            select(EncounterModel.id).where(EncounterModel.encounter_id == enc.reference_id)
                        )).scalar_one_or_none()
                        enc_internal_id = enc_row
                    session.add(ClaimItemEncounter(
                        item=ci, org_id=org_id,
                        reference_type=enc_ref_type,
                        reference_id=enc_internal_id,
                        reference_display=enc.reference_display,
                    ))

                for det in (item.details or []):
                    det_obj = ClaimItemDetail(
                        item=ci, org_id=org_id,
                        sequence=det.sequence,
                        revenue_system=det.revenue_system, revenue_code=det.revenue_code,
                        revenue_display=det.revenue_display, revenue_text=det.revenue_text,
                        category_system=det.category_system, category_code=det.category_code,
                        category_display=det.category_display, category_text=det.category_text,
                        product_or_service_system=det.product_or_service_system,
                        product_or_service_code=det.product_or_service_code,
                        product_or_service_display=det.product_or_service_display,
                        product_or_service_text=det.product_or_service_text,
                        quantity_value=det.quantity_value,
                        quantity_unit=det.quantity_unit,
                        quantity_system=det.quantity_system,
                        quantity_code=det.quantity_code,
                        unit_price_value=det.unit_price_value,
                        unit_price_currency=det.unit_price_currency,
                        factor=det.factor,
                        net_value=det.net_value,
                        net_currency=det.net_currency,
                    )
                    session.add(det_obj)
                    for m in (det.modifiers or []):
                        session.add(ClaimItemDetailModifier(detail=det_obj, org_id=org_id, coding_system=m.coding_system, coding_code=m.coding_code, coding_display=m.coding_display, text=m.text))
                    for pc in (det.program_codes or []):
                        session.add(ClaimItemDetailProgramCode(detail=det_obj, org_id=org_id, coding_system=pc.coding_system, coding_code=pc.coding_code, coding_display=pc.coding_display, text=pc.text))
                    for u in (det.udi or []):
                        u_type = ClaimDeviceReferenceType(u.reference_type) if u.reference_type else None
                        session.add(ClaimItemDetailUdi(detail=det_obj, org_id=org_id, reference_type=u_type, reference_id=u.reference_id, reference_display=u.reference_display))
                    for sd in (det.sub_details or []):
                        sd_obj = ClaimItemDetailSubDetail(
                            detail=det_obj, org_id=org_id,
                            sequence=sd.sequence,
                            revenue_system=sd.revenue_system, revenue_code=sd.revenue_code,
                            revenue_display=sd.revenue_display, revenue_text=sd.revenue_text,
                            category_system=sd.category_system, category_code=sd.category_code,
                            category_display=sd.category_display, category_text=sd.category_text,
                            product_or_service_system=sd.product_or_service_system,
                            product_or_service_code=sd.product_or_service_code,
                            product_or_service_display=sd.product_or_service_display,
                            product_or_service_text=sd.product_or_service_text,
                            quantity_value=sd.quantity_value,
                            quantity_unit=sd.quantity_unit,
                            quantity_system=sd.quantity_system,
                            quantity_code=sd.quantity_code,
                            unit_price_value=sd.unit_price_value,
                            unit_price_currency=sd.unit_price_currency,
                            factor=sd.factor,
                            net_value=sd.net_value,
                            net_currency=sd.net_currency,
                        )
                        session.add(sd_obj)
                        for m in (sd.modifiers or []):
                            session.add(ClaimItemDetailSubDetailModifier(sub_detail=sd_obj, org_id=org_id, coding_system=m.coding_system, coding_code=m.coding_code, coding_display=m.coding_display, text=m.text))
                        for pc in (sd.program_codes or []):
                            session.add(ClaimItemDetailSubDetailProgramCode(sub_detail=sd_obj, org_id=org_id, coding_system=pc.coding_system, coding_code=pc.coding_code, coding_display=pc.coding_display, text=pc.text))
                        for u in (sd.udi or []):
                            u_type = ClaimDeviceReferenceType(u.reference_type) if u.reference_type else None
                            session.add(ClaimItemDetailSubDetailUdi(sub_detail=sd_obj, org_id=org_id, reference_type=u_type, reference_id=u.reference_id, reference_display=u.reference_display))

            await session.commit()
            await session.refresh(claim)

            stmt = _with_relationships(select(ClaimModel).where(ClaimModel.id == claim.id))
            result = await session.execute(stmt)
            return result.scalars().one()

    async def patch(
        self,
        claim_id: int,
        payload: ClaimPatchSchema,
        updated_by: Optional[str],
    ) -> Optional[ClaimModel]:
        async with self.session_factory() as session:
            stmt = _with_relationships(select(ClaimModel).where(ClaimModel.claim_id == claim_id))
            result = await session.execute(stmt)
            claim = result.scalars().first()
            if not claim:
                return None

            updates = payload.model_dump(exclude_unset=True)
            for field, value in updates.items():
                if field == "status" and value is not None:
                    setattr(claim, field, ClaimStatus(value).value)
                elif field == "use" and value is not None:
                    setattr(claim, field, ClaimUse(value).value)
                else:
                    setattr(claim, field, value)
            claim.updated_by = updated_by

            await session.commit()
            await session.refresh(claim)

            stmt = _with_relationships(select(ClaimModel).where(ClaimModel.id == claim.id))
            result = await session.execute(stmt)
            return result.scalars().one()

    async def delete(self, claim_id: int) -> None:
        async with self.session_factory() as session:
            stmt = select(ClaimModel).where(ClaimModel.claim_id == claim_id)
            result = await session.execute(stmt)
            claim = result.scalars().first()
            if claim:
                await session.delete(claim)
                await session.commit()
