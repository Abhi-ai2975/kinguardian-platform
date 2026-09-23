from typing import List, Optional, Tuple

from fastapi import HTTPException, status as http_status
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker  # noqa: F401
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.claim_response.claim_response import (
    ClaimResponseModel,
    ClaimResponseIdentifier,
    ClaimResponseItem,
    ClaimResponseItemAdjudication,
    ClaimResponseItemDetail,
    ClaimResponseItemDetailAdjudication,
    ClaimResponseItemDetailSubDetail,
    ClaimResponseItemDetailSubDetailAdjudication,
    ClaimResponseAddItem,
    ClaimResponseAddItemProvider,
    ClaimResponseAddItemModifier,
    ClaimResponseAddItemProgramCode,
    ClaimResponseAddItemSubSite,
    ClaimResponseAddItemAdjudication,
    ClaimResponseAddItemDetail,
    ClaimResponseAddItemDetailModifier,
    ClaimResponseAddItemDetailAdjudication,
    ClaimResponseAddItemDetailSubDetail,
    ClaimResponseAddItemDetailSubDetailModifier,
    ClaimResponseAddItemDetailSubDetailAdjudication,
    ClaimResponseAdjudication,
    ClaimResponseTotal,
    ClaimResponseProcessNote,
    ClaimResponseCommunicationRequest,
    ClaimResponseInsurance,
    ClaimResponseError,
)
from app.models.claim_response.enums import (
    ClaimResponseStatus,
    ClaimResponseUse,
    ClaimResponseOutcome,
    ClaimResponsePatientReferenceType,
    ClaimResponseRequestorReferenceType,
    ClaimResponseRequestReferenceType,
    ClaimResponseAddItemProviderReferenceType,
    ClaimResponseAddItemLocationReferenceType,
    ClaimResponseInsuranceCoverageReferenceType,
    ClaimResponseInsuranceClaimResponseReferenceType,
    ClaimResponseCommunicationRequestReferenceType,
)
from app.models.enums import OrganizationReferenceType
from app.schemas.claim_response.input import (
    ClaimResponseCreateSchema,
    ClaimResponsePatchSchema,
)


def _with_relationships(stmt):
    return stmt.options(
        selectinload(ClaimResponseModel.identifiers),
        selectinload(ClaimResponseModel.adjudications),
        selectinload(ClaimResponseModel.totals),
        selectinload(ClaimResponseModel.process_notes),
        selectinload(ClaimResponseModel.communication_requests),
        selectinload(ClaimResponseModel.insurances),
        selectinload(ClaimResponseModel.errors),
        selectinload(ClaimResponseModel.items).selectinload(ClaimResponseItem.adjudications),
        selectinload(ClaimResponseModel.items)
        .selectinload(ClaimResponseItem.details)
        .selectinload(ClaimResponseItemDetail.adjudications),
        selectinload(ClaimResponseModel.items)
        .selectinload(ClaimResponseItem.details)
        .selectinload(ClaimResponseItemDetail.sub_details)
        .selectinload(ClaimResponseItemDetailSubDetail.adjudications),
        selectinload(ClaimResponseModel.add_items).selectinload(ClaimResponseAddItem.providers),
        selectinload(ClaimResponseModel.add_items).selectinload(ClaimResponseAddItem.modifiers),
        selectinload(ClaimResponseModel.add_items).selectinload(ClaimResponseAddItem.program_codes),
        selectinload(ClaimResponseModel.add_items).selectinload(ClaimResponseAddItem.sub_sites),
        selectinload(ClaimResponseModel.add_items).selectinload(ClaimResponseAddItem.adjudications),
        selectinload(ClaimResponseModel.add_items)
        .selectinload(ClaimResponseAddItem.details)
        .selectinload(ClaimResponseAddItemDetail.modifiers),
        selectinload(ClaimResponseModel.add_items)
        .selectinload(ClaimResponseAddItem.details)
        .selectinload(ClaimResponseAddItemDetail.adjudications),
        selectinload(ClaimResponseModel.add_items)
        .selectinload(ClaimResponseAddItem.details)
        .selectinload(ClaimResponseAddItemDetail.sub_details)
        .selectinload(ClaimResponseAddItemDetailSubDetail.modifiers),
        selectinload(ClaimResponseModel.add_items)
        .selectinload(ClaimResponseAddItem.details)
        .selectinload(ClaimResponseAddItemDetail.sub_details)
        .selectinload(ClaimResponseAddItemDetailSubDetail.adjudications),
    )


def _parse_ref(ref_str: str, enum_cls) -> Tuple:
    parts = ref_str.split("/", 1)
    if len(parts) != 2:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid reference format '{ref_str}'. Expected 'ResourceType/id'.",
        )
    ref_type_str, ref_id_str = parts
    try:
        ref_type = enum_cls(ref_type_str)
    except ValueError:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Reference type '{ref_type_str}' is not allowed for this field.",
        )
    try:
        ref_id = int(ref_id_str)
    except ValueError:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Reference id '{ref_id_str}' is not a valid integer.",
        )
    return ref_type, ref_id


def _parse_ref_optional(ref_str: Optional[str], enum_cls) -> Tuple[Optional[object], Optional[int]]:
    if not ref_str:
        return None, None
    ref_type, ref_id = _parse_ref(ref_str, enum_cls)
    return ref_type, ref_id


def _join_ints(lst: Optional[List[int]]) -> Optional[str]:
    if not lst:
        return None
    return ",".join(str(x) for x in lst)


def _join_strs(lst: Optional[List[str]]) -> Optional[str]:
    if not lst:
        return None
    return ",".join(lst)


class ClaimResponseRepository:
    def __init__(self, session_factory: async_sessionmaker):
        self.session_factory = session_factory

    async def get_by_claim_response_id(
        self, claim_response_id: int
    ) -> Optional[ClaimResponseModel]:
        async with self.session_factory() as session:
            stmt = _with_relationships(
                select(ClaimResponseModel).where(
                    ClaimResponseModel.claim_response_id == claim_response_id
                )
            )
            result = await session.execute(stmt)
            return result.scalar_one_or_none()

    def _apply_list_filters(
        self,
        stmt,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        cr_status: Optional[str] = None,
        use: Optional[str] = None,
        outcome: Optional[str] = None,
    ):
        if user_id:
            stmt = stmt.where(ClaimResponseModel.user_id == user_id)
        if org_id:
            stmt = stmt.where(ClaimResponseModel.org_id == org_id)
        if cr_status:
            stmt = stmt.where(ClaimResponseModel.status == cr_status)
        if use:
            stmt = stmt.where(ClaimResponseModel.use == use)
        if outcome:
            stmt = stmt.where(ClaimResponseModel.outcome == outcome)
        return stmt

    async def get_me(
        self,
        user_id: str,
        org_id: str,
        cr_status: Optional[str] = None,
        use: Optional[str] = None,
        outcome: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[ClaimResponseModel], int]:
        async with self.session_factory() as session:
            base = self._apply_list_filters(
                _with_relationships(select(ClaimResponseModel)),
                user_id=user_id,
                org_id=org_id,
                cr_status=cr_status,
                use=use,
                outcome=outcome,
            )
            count_base = self._apply_list_filters(
                select(func.count()).select_from(ClaimResponseModel),
                user_id=user_id,
                org_id=org_id,
                cr_status=cr_status,
                use=use,
                outcome=outcome,
            )
            total = (await session.execute(count_base)).scalar_one()
            rows = list(
                (
                    await session.execute(
                        base.order_by(ClaimResponseModel.claim_response_id.desc())
                        .offset(offset)
                        .limit(limit)
                    )
                ).scalars().all()
            )
        return rows, total

    async def list(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        cr_status: Optional[str] = None,
        use: Optional[str] = None,
        outcome: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[ClaimResponseModel], int]:
        async with self.session_factory() as session:
            base = self._apply_list_filters(
                _with_relationships(select(ClaimResponseModel)),
                user_id=user_id,
                org_id=org_id,
                cr_status=cr_status,
                use=use,
                outcome=outcome,
            )
            count_base = self._apply_list_filters(
                select(func.count()).select_from(ClaimResponseModel),
                user_id=user_id,
                org_id=org_id,
                cr_status=cr_status,
                use=use,
                outcome=outcome,
            )
            total = (await session.execute(count_base)).scalar_one()
            rows = list(
                (
                    await session.execute(
                        base.order_by(ClaimResponseModel.claim_response_id.desc())
                        .offset(offset)
                        .limit(limit)
                    )
                ).scalars().all()
            )
        return rows, total

    async def create(
        self,
        data: ClaimResponseCreateSchema,
        user_id: Optional[str],
        org_id: Optional[str],
        created_by: Optional[str],
    ) -> ClaimResponseModel:
        async with self.session_factory() as session:
            # --- required references ---
            patient_type, patient_id = _parse_ref(data.patient, ClaimResponsePatientReferenceType)
            insurer_type, insurer_id = _parse_ref(data.insurer, OrganizationReferenceType)

            # --- optional references ---
            requestor_type, requestor_id = _parse_ref_optional(
                data.requestor, ClaimResponseRequestorReferenceType
            )
            request_type, request_id = _parse_ref_optional(
                data.request, ClaimResponseRequestReferenceType
            )

            model = ClaimResponseModel(
                user_id=user_id,
                org_id=org_id,
                created_by=created_by,
                status=ClaimResponseStatus(data.status).value,
                use=ClaimResponseUse(data.use).value,
                outcome=ClaimResponseOutcome(data.outcome).value,
                created=data.created,
                type_system=data.type_system,
                type_code=data.type_code,
                type_display=data.type_display,
                type_text=data.type_text,
                sub_type_system=data.sub_type_system,
                sub_type_code=data.sub_type_code,
                sub_type_display=data.sub_type_display,
                sub_type_text=data.sub_type_text,
                patient_type=patient_type,
                patient_id=patient_id,
                patient_display=data.patient_display,
                insurer_type=insurer_type,
                insurer_id=insurer_id,
                insurer_display=data.insurer_display,
                requestor_type=requestor_type,
                requestor_id=requestor_id,
                requestor_display=data.requestor_display,
                request_type=request_type,
                request_id=request_id,
                request_display=data.request_display,
                disposition=data.disposition,
                pre_auth_ref=data.pre_auth_ref,
                pre_auth_period_start=data.pre_auth_period_start,
                pre_auth_period_end=data.pre_auth_period_end,
                payee_type_system=data.payee_type_system,
                payee_type_code=data.payee_type_code,
                payee_type_display=data.payee_type_display,
                payee_type_text=data.payee_type_text,
                payment_type_system=data.payment_type_system,
                payment_type_code=data.payment_type_code,
                payment_type_display=data.payment_type_display,
                payment_type_text=data.payment_type_text,
                payment_adjustment_value=data.payment_adjustment_value,
                payment_adjustment_currency=data.payment_adjustment_currency,
                payment_adjustment_reason_system=data.payment_adjustment_reason_system,
                payment_adjustment_reason_code=data.payment_adjustment_reason_code,
                payment_adjustment_reason_display=data.payment_adjustment_reason_display,
                payment_adjustment_reason_text=data.payment_adjustment_reason_text,
                payment_date=data.payment_date,
                payment_amount_value=data.payment_amount_value,
                payment_amount_currency=data.payment_amount_currency,
                payment_identifier_use=data.payment_identifier_use,
                payment_identifier_type_system=data.payment_identifier_type_system,
                payment_identifier_type_code=data.payment_identifier_type_code,
                payment_identifier_type_display=data.payment_identifier_type_display,
                payment_identifier_type_text=data.payment_identifier_type_text,
                payment_identifier_system=data.payment_identifier_system,
                payment_identifier_value=data.payment_identifier_value,
                payment_identifier_period_start=data.payment_identifier_period_start,
                payment_identifier_period_end=data.payment_identifier_period_end,
                payment_identifier_assigner=data.payment_identifier_assigner,
                funds_reserve_system=data.funds_reserve_system,
                funds_reserve_code=data.funds_reserve_code,
                funds_reserve_display=data.funds_reserve_display,
                funds_reserve_text=data.funds_reserve_text,
                form_code_system=data.form_code_system,
                form_code_code=data.form_code_code,
                form_code_display=data.form_code_display,
                form_code_text=data.form_code_text,
                form_content_type=data.form_content_type,
                form_language=data.form_language,
                form_data=data.form_data,
                form_url=data.form_url,
                form_size=data.form_size,
                form_hash=data.form_hash,
                form_title=data.form_title,
                form_creation=data.form_creation,
            )

            # identifiers
            for ident in data.identifier or []:
                model.identifiers.append(
                    ClaimResponseIdentifier(
                        org_id=data.org_id,
                        use=ident.use,
                        type_system=ident.type_system,
                        type_code=ident.type_code,
                        type_display=ident.type_display,
                        type_text=ident.type_text,
                        system=ident.system,
                        value=ident.value,
                        period_start=ident.period_start,
                        period_end=ident.period_end,
                        assigner=ident.assigner,
                    )
                )

            # header-level adjudications
            for adj in data.adjudications or []:
                model.adjudications.append(
                    ClaimResponseAdjudication(
                        org_id=data.org_id,
                        category_system=adj.category_system,
                        category_code=adj.category_code,
                        category_display=adj.category_display,
                        category_text=adj.category_text,
                        reason_system=adj.reason_system,
                        reason_code=adj.reason_code,
                        reason_display=adj.reason_display,
                        reason_text=adj.reason_text,
                        amount_value=adj.amount_value,
                        amount_currency=adj.amount_currency,
                        adj_value=adj.adj_value,
                    )
                )

            # items
            for item_in in data.items or []:
                item = ClaimResponseItem(
                    org_id=data.org_id,
                    item_sequence=item_in.item_sequence,
                    note_number=_join_ints(item_in.note_number),
                )
                for adj in item_in.adjudications or []:
                    item.adjudications.append(
                        ClaimResponseItemAdjudication(
                            org_id=data.org_id,
                            category_system=adj.category_system,
                            category_code=adj.category_code,
                            category_display=adj.category_display,
                            category_text=adj.category_text,
                            reason_system=adj.reason_system,
                            reason_code=adj.reason_code,
                            reason_display=adj.reason_display,
                            reason_text=adj.reason_text,
                            amount_value=adj.amount_value,
                            amount_currency=adj.amount_currency,
                            adj_value=adj.adj_value,
                        )
                    )
                for det_in in item_in.details or []:
                    detail = ClaimResponseItemDetail(
                        org_id=data.org_id,
                        detail_sequence=det_in.detail_sequence,
                        note_number=_join_ints(det_in.note_number),
                    )
                    for adj in det_in.adjudications or []:
                        detail.adjudications.append(
                            ClaimResponseItemDetailAdjudication(
                                org_id=data.org_id,
                                category_system=adj.category_system,
                                category_code=adj.category_code,
                                category_display=adj.category_display,
                                category_text=adj.category_text,
                                reason_system=adj.reason_system,
                                reason_code=adj.reason_code,
                                reason_display=adj.reason_display,
                                reason_text=adj.reason_text,
                                amount_value=adj.amount_value,
                                amount_currency=adj.amount_currency,
                                adj_value=adj.adj_value,
                            )
                        )
                    for sd_in in det_in.sub_details or []:
                        sub_detail = ClaimResponseItemDetailSubDetail(
                            org_id=data.org_id,
                            sub_detail_sequence=sd_in.sub_detail_sequence,
                            note_number=_join_ints(sd_in.note_number),
                        )
                        for adj in sd_in.adjudications or []:
                            sub_detail.adjudications.append(
                                ClaimResponseItemDetailSubDetailAdjudication(
                                    org_id=data.org_id,
                                    category_system=adj.category_system,
                                    category_code=adj.category_code,
                                    category_display=adj.category_display,
                                    category_text=adj.category_text,
                                    reason_system=adj.reason_system,
                                    reason_code=adj.reason_code,
                                    reason_display=adj.reason_display,
                                    reason_text=adj.reason_text,
                                    amount_value=adj.amount_value,
                                    amount_currency=adj.amount_currency,
                                    adj_value=adj.adj_value,
                                )
                            )
                        detail.sub_details.append(sub_detail)
                    item.details.append(detail)
                model.items.append(item)

            # addItems
            for ai_in in data.add_items or []:
                loc_ref_type, loc_ref_id = _parse_ref_optional(
                    ai_in.location_ref, ClaimResponseAddItemLocationReferenceType
                )
                add_item = ClaimResponseAddItem(
                    org_id=data.org_id,
                    item_sequence=_join_ints(ai_in.item_sequence),
                    detail_sequence=_join_ints(ai_in.detail_sequence),
                    subdetail_sequence=_join_ints(ai_in.subdetail_sequence),
                    product_or_service_system=ai_in.product_or_service_system,
                    product_or_service_code=ai_in.product_or_service_code,
                    product_or_service_display=ai_in.product_or_service_display,
                    product_or_service_text=ai_in.product_or_service_text,
                    serviced_date=ai_in.serviced_date,
                    serviced_period_start=ai_in.serviced_period_start,
                    serviced_period_end=ai_in.serviced_period_end,
                    location_cc_system=ai_in.location_cc_system,
                    location_cc_code=ai_in.location_cc_code,
                    location_cc_display=ai_in.location_cc_display,
                    location_cc_text=ai_in.location_cc_text,
                    location_address_use=ai_in.location_address_use,
                    location_address_type=ai_in.location_address_type,
                    location_address_text=ai_in.location_address_text,
                    location_address_line=_join_strs(ai_in.location_address_line),
                    location_address_city=ai_in.location_address_city,
                    location_address_district=ai_in.location_address_district,
                    location_address_state=ai_in.location_address_state,
                    location_address_postal_code=ai_in.location_address_postal_code,
                    location_address_country=ai_in.location_address_country,
                    location_ref_type=loc_ref_type,
                    location_ref_id=loc_ref_id,
                    location_ref_display=ai_in.location_ref_display,
                    quantity_value=ai_in.quantity_value,
                    quantity_unit=ai_in.quantity_unit,
                    quantity_system=ai_in.quantity_system,
                    quantity_code=ai_in.quantity_code,
                    unit_price_value=ai_in.unit_price_value,
                    unit_price_currency=ai_in.unit_price_currency,
                    factor=ai_in.factor,
                    net_value=ai_in.net_value,
                    net_currency=ai_in.net_currency,
                    body_site_system=ai_in.body_site_system,
                    body_site_code=ai_in.body_site_code,
                    body_site_display=ai_in.body_site_display,
                    body_site_text=ai_in.body_site_text,
                    note_number=_join_ints(ai_in.note_number),
                )
                for prov in ai_in.providers or []:
                    prov_type, prov_id = _parse_ref(
                        prov.reference, ClaimResponseAddItemProviderReferenceType
                    )
                    add_item.providers.append(
                        ClaimResponseAddItemProvider(
                            org_id=data.org_id,
                            reference_type=prov_type,
                            reference_id=prov_id,
                            reference_display=prov.reference_display,
                        )
                    )
                for mod in ai_in.modifiers or []:
                    add_item.modifiers.append(
                        ClaimResponseAddItemModifier(
                            org_id=data.org_id,
                            coding_system=mod.coding_system,
                            coding_code=mod.coding_code,
                            coding_display=mod.coding_display,
                            text=mod.text,
                        )
                    )
                for pc in ai_in.program_codes or []:
                    add_item.program_codes.append(
                        ClaimResponseAddItemProgramCode(
                            org_id=data.org_id,
                            coding_system=pc.coding_system,
                            coding_code=pc.coding_code,
                            coding_display=pc.coding_display,
                            text=pc.text,
                        )
                    )
                for ss in ai_in.sub_sites or []:
                    add_item.sub_sites.append(
                        ClaimResponseAddItemSubSite(
                            org_id=data.org_id,
                            coding_system=ss.coding_system,
                            coding_code=ss.coding_code,
                            coding_display=ss.coding_display,
                            text=ss.text,
                        )
                    )
                for adj in ai_in.adjudications or []:
                    add_item.adjudications.append(
                        ClaimResponseAddItemAdjudication(
                            org_id=data.org_id,
                            category_system=adj.category_system,
                            category_code=adj.category_code,
                            category_display=adj.category_display,
                            category_text=adj.category_text,
                            reason_system=adj.reason_system,
                            reason_code=adj.reason_code,
                            reason_display=adj.reason_display,
                            reason_text=adj.reason_text,
                            amount_value=adj.amount_value,
                            amount_currency=adj.amount_currency,
                            adj_value=adj.adj_value,
                        )
                    )
                for det_in in ai_in.details or []:
                    ai_detail = ClaimResponseAddItemDetail(
                        org_id=data.org_id,
                        product_or_service_system=det_in.product_or_service_system,
                        product_or_service_code=det_in.product_or_service_code,
                        product_or_service_display=det_in.product_or_service_display,
                        product_or_service_text=det_in.product_or_service_text,
                        quantity_value=det_in.quantity_value,
                        quantity_unit=det_in.quantity_unit,
                        quantity_system=det_in.quantity_system,
                        quantity_code=det_in.quantity_code,
                        unit_price_value=det_in.unit_price_value,
                        unit_price_currency=det_in.unit_price_currency,
                        factor=det_in.factor,
                        net_value=det_in.net_value,
                        net_currency=det_in.net_currency,
                        note_number=_join_ints(det_in.note_number),
                    )
                    for mod in det_in.modifiers or []:
                        ai_detail.modifiers.append(
                            ClaimResponseAddItemDetailModifier(
                                org_id=data.org_id,
                                coding_system=mod.coding_system,
                                coding_code=mod.coding_code,
                                coding_display=mod.coding_display,
                                text=mod.text,
                            )
                        )
                    for adj in det_in.adjudications or []:
                        ai_detail.adjudications.append(
                            ClaimResponseAddItemDetailAdjudication(
                                org_id=data.org_id,
                                category_system=adj.category_system,
                                category_code=adj.category_code,
                                category_display=adj.category_display,
                                category_text=adj.category_text,
                                reason_system=adj.reason_system,
                                reason_code=adj.reason_code,
                                reason_display=adj.reason_display,
                                reason_text=adj.reason_text,
                                amount_value=adj.amount_value,
                                amount_currency=adj.amount_currency,
                                adj_value=adj.adj_value,
                            )
                        )
                    for sd_in in det_in.sub_details or []:
                        ai_sub = ClaimResponseAddItemDetailSubDetail(
                            org_id=data.org_id,
                            product_or_service_system=sd_in.product_or_service_system,
                            product_or_service_code=sd_in.product_or_service_code,
                            product_or_service_display=sd_in.product_or_service_display,
                            product_or_service_text=sd_in.product_or_service_text,
                            quantity_value=sd_in.quantity_value,
                            quantity_unit=sd_in.quantity_unit,
                            quantity_system=sd_in.quantity_system,
                            quantity_code=sd_in.quantity_code,
                            unit_price_value=sd_in.unit_price_value,
                            unit_price_currency=sd_in.unit_price_currency,
                            factor=sd_in.factor,
                            net_value=sd_in.net_value,
                            net_currency=sd_in.net_currency,
                            note_number=_join_ints(sd_in.note_number),
                        )
                        for mod in sd_in.modifiers or []:
                            ai_sub.modifiers.append(
                                ClaimResponseAddItemDetailSubDetailModifier(
                                    org_id=data.org_id,
                                    coding_system=mod.coding_system,
                                    coding_code=mod.coding_code,
                                    coding_display=mod.coding_display,
                                    text=mod.text,
                                )
                            )
                        for adj in sd_in.adjudications or []:
                            ai_sub.adjudications.append(
                                ClaimResponseAddItemDetailSubDetailAdjudication(
                                    org_id=data.org_id,
                                    category_system=adj.category_system,
                                    category_code=adj.category_code,
                                    category_display=adj.category_display,
                                    category_text=adj.category_text,
                                    reason_system=adj.reason_system,
                                    reason_code=adj.reason_code,
                                    reason_display=adj.reason_display,
                                    reason_text=adj.reason_text,
                                    amount_value=adj.amount_value,
                                    amount_currency=adj.amount_currency,
                                    adj_value=adj.adj_value,
                                )
                            )
                        ai_detail.sub_details.append(ai_sub)
                    add_item.details.append(ai_detail)
                model.add_items.append(add_item)

            # totals
            for tot in data.totals or []:
                model.totals.append(
                    ClaimResponseTotal(
                        org_id=data.org_id,
                        category_system=tot.category_system,
                        category_code=tot.category_code,
                        category_display=tot.category_display,
                        category_text=tot.category_text,
                        amount_value=tot.amount_value,
                        amount_currency=tot.amount_currency,
                    )
                )

            # process notes
            for note in data.process_notes or []:
                model.process_notes.append(
                    ClaimResponseProcessNote(
                        org_id=data.org_id,
                        number=note.number,
                        note_type=note.note_type,
                        text=note.text,
                        language_system=note.language_system,
                        language_code=note.language_code,
                        language_display=note.language_display,
                        language_text=note.language_text,
                    )
                )

            # communication requests
            for cr_req in data.communication_requests or []:
                cr_type, cr_id = _parse_ref(
                    cr_req.reference, ClaimResponseCommunicationRequestReferenceType
                )
                model.communication_requests.append(
                    ClaimResponseCommunicationRequest(
                        org_id=data.org_id,
                        reference_type=cr_type,
                        reference_id=cr_id,
                        reference_display=cr_req.reference_display,
                    )
                )

            # insurances
            for ins in data.insurances or []:
                cov_type, cov_id = _parse_ref(
                    ins.coverage, ClaimResponseInsuranceCoverageReferenceType
                )
                cr_ref_type, cr_ref_id = _parse_ref_optional(
                    ins.claim_response_ref, ClaimResponseInsuranceClaimResponseReferenceType
                )
                model.insurances.append(
                    ClaimResponseInsurance(
                        org_id=data.org_id,
                        sequence=ins.sequence,
                        focal=ins.focal,
                        coverage_type=cov_type,
                        coverage_id=cov_id,
                        coverage_display=ins.coverage_display,
                        business_arrangement=ins.business_arrangement,
                        claim_response_ref_type=cr_ref_type,
                        claim_response_ref_id=cr_ref_id,
                        claim_response_ref_display=ins.claim_response_ref_display,
                    )
                )

            # errors
            for err in data.errors or []:
                model.errors.append(
                    ClaimResponseError(
                        org_id=data.org_id,
                        item_sequence=err.item_sequence,
                        detail_sequence=err.detail_sequence,
                        sub_detail_sequence=err.sub_detail_sequence,
                        code_system=err.code_system,
                        code_code=err.code_code,
                        code_display=err.code_display,
                        code_text=err.code_text,
                    )
                )

            session.add(model)
            await session.commit()
            await session.refresh(model)

            stmt = _with_relationships(
                select(ClaimResponseModel).where(ClaimResponseModel.id == model.id)
            )
            result = await session.execute(stmt)
            return result.scalar_one()

    async def patch(
        self,
        claim_response_id: int,
        data: ClaimResponsePatchSchema,
        updated_by: Optional[str],
    ) -> Optional[ClaimResponseModel]:
        async with self.session_factory() as session:
            stmt = _with_relationships(
                select(ClaimResponseModel).where(
                    ClaimResponseModel.claim_response_id == claim_response_id
                )
            )
            result = await session.execute(stmt)
            db_model = result.scalar_one_or_none()
            if not db_model:
                return None

            updates = data.model_dump(exclude_unset=True)
            for field, value in updates.items():
                if field == "status" and value is not None:
                    value = ClaimResponseStatus(value).value
                elif field == "use" and value is not None:
                    value = ClaimResponseUse(value).value
                elif field == "outcome" and value is not None:
                    value = ClaimResponseOutcome(value).value
                setattr(db_model, field, value)
            db_model.updated_by = updated_by

            await session.commit()
            await session.refresh(db_model)

            stmt = _with_relationships(
                select(ClaimResponseModel).where(ClaimResponseModel.id == db_model.id)
            )
            result = await session.execute(stmt)
            return result.scalar_one()

    async def delete(self, claim_response_id: int) -> None:
        async with self.session_factory() as session:
            stmt = select(ClaimResponseModel).where(
                ClaimResponseModel.claim_response_id == claim_response_id
            )
            result = await session.execute(stmt)
            db_model = result.scalar_one_or_none()
            if db_model:
                await session.delete(db_model)
                await session.commit()
