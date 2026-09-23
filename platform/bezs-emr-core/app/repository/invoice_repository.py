from typing import List, Optional, Tuple

from fastapi import HTTPException, status as http_status
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker  # noqa: F401
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.invoice.invoice import (
    InvoiceModel,
    InvoiceIdentifier,
    InvoiceParticipant,
    InvoiceLineItem,
    InvoiceLineItemPriceComponent,
    InvoiceTotalPriceComponent,
    InvoiceNote,
)
from app.models.invoice.enums import (
    InvoiceStatus,
    InvoiceSubjectReferenceType,
    InvoiceRecipientReferenceType,
    InvoiceParticipantActorReferenceType,
    InvoiceAccountReferenceType,
    InvoiceLineItemChargeItemReferenceType,
)
from app.models.enums import OrganizationReferenceType
from app.schemas.invoice.input import InvoiceCreateSchema, InvoicePatchSchema


def _with_relationships(stmt):
    return stmt.options(
        selectinload(InvoiceModel.identifiers),
        selectinload(InvoiceModel.participants),
        selectinload(InvoiceModel.line_items).selectinload(InvoiceLineItem.price_components),
        selectinload(InvoiceModel.total_price_components),
        selectinload(InvoiceModel.notes),
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


class InvoiceRepository:
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]):
        self.session_factory = session_factory

    async def get_by_invoice_id(self, invoice_id: int) -> Optional[InvoiceModel]:
        async with self.session_factory() as session:
            stmt = _with_relationships(
                select(InvoiceModel).where(InvoiceModel.invoice_id == invoice_id)
            )
            result = await session.execute(stmt)
            return result.scalars().first()

    def _apply_list_filters(self, stmt, user_id, org_id, invoice_status):
        if user_id:
            stmt = stmt.where(InvoiceModel.user_id == user_id)
        if org_id:
            stmt = stmt.where(InvoiceModel.org_id == org_id)
        if invoice_status:
            try:
                stmt = stmt.where(InvoiceModel.status == InvoiceStatus(invoice_status))
            except ValueError:
                pass
        return stmt

    async def get_me(
        self,
        user_id: str,
        org_id: str,
        invoice_status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[InvoiceModel], int]:
        async with self.session_factory() as session:
            base = self._apply_list_filters(
                _with_relationships(select(InvoiceModel)),
                user_id, org_id, invoice_status,
            )
            count_base = self._apply_list_filters(
                select(func.count()).select_from(InvoiceModel),
                user_id, org_id, invoice_status,
            )
            total = (await session.execute(count_base)).scalar_one()
            rows = list((await session.execute(
                base.order_by(InvoiceModel.invoice_id.desc()).offset(offset).limit(limit)
            )).scalars().all())
        return rows, total

    async def list(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        invoice_status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[InvoiceModel], int]:
        async with self.session_factory() as session:
            base = self._apply_list_filters(
                _with_relationships(select(InvoiceModel)),
                user_id, org_id, invoice_status,
            )
            count_base = self._apply_list_filters(
                select(func.count()).select_from(InvoiceModel),
                user_id, org_id, invoice_status,
            )
            total = (await session.execute(count_base)).scalar_one()
            rows = list((await session.execute(
                base.order_by(InvoiceModel.invoice_id.desc()).offset(offset).limit(limit)
            )).scalars().all())
        return rows, total

    async def create(
        self,
        payload: InvoiceCreateSchema,
        user_id: Optional[str],
        org_id: Optional[str],
        created_by: Optional[str],
    ) -> InvoiceModel:
        async with self.session_factory() as session:
            subj_type, subj_id = _parse_ref_optional(payload.subject, InvoiceSubjectReferenceType, "subject")
            rec_type, rec_id = _parse_ref_optional(payload.recipient, InvoiceRecipientReferenceType, "recipient")
            iss_type, iss_id = _parse_ref_optional(payload.issuer, OrganizationReferenceType, "issuer")
            acc_type, acc_id = _parse_ref_optional(payload.account, InvoiceAccountReferenceType, "account")

            try:
                status_enum = InvoiceStatus(payload.status)
            except ValueError:
                raise HTTPException(
                    status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Invalid status '{payload.status}'. Allowed: {[s.value for s in InvoiceStatus]}.",
                )

            invoice = InvoiceModel(
                user_id=user_id,
                org_id=org_id,
                created_by=created_by,
                status=status_enum,
                cancelled_reason=payload.cancelled_reason,
                type_system=payload.type_system,
                type_code=payload.type_code,
                type_display=payload.type_display,
                type_text=payload.type_text,
                subject_type=subj_type,
                subject_id=subj_id,
                subject_display=payload.subject_display,
                recipient_type=rec_type,
                recipient_id=rec_id,
                recipient_display=payload.recipient_display,
                date=payload.date,
                issuer_type=iss_type,
                issuer_id=iss_id,
                issuer_display=payload.issuer_display,
                account_type=acc_type,
                account_id=acc_id,
                account_display=payload.account_display,
                total_net_value=payload.total_net_value,
                total_net_currency=payload.total_net_currency,
                total_gross_value=payload.total_gross_value,
                total_gross_currency=payload.total_gross_currency,
                payment_terms=payload.payment_terms,
            )
            session.add(invoice)

            for item in (payload.identifiers or []):
                session.add(InvoiceIdentifier(
                    invoice=invoice, org_id=org_id,
                    use=item.use,
                    type_system=item.type_system, type_code=item.type_code,
                    type_display=item.type_display, type_text=item.type_text,
                    system=item.system, value=item.value,
                    period_start=item.period_start, period_end=item.period_end,
                    assigner=item.assigner,
                ))

            for p in (payload.participants or []):
                actor_type, actor_id = _parse_ref(p.actor, InvoiceParticipantActorReferenceType, "participant.actor")
                session.add(InvoiceParticipant(
                    invoice=invoice, org_id=org_id,
                    role_system=p.role_system, role_code=p.role_code,
                    role_display=p.role_display, role_text=p.role_text,
                    reference_type=actor_type,
                    reference_id=actor_id,
                    reference_display=p.actor_display,
                ))

            for li_data in (payload.line_items or []):
                chargeitem_ref_type = None
                if li_data.chargeitem_ref_type:
                    try:
                        chargeitem_ref_type = InvoiceLineItemChargeItemReferenceType(li_data.chargeitem_ref_type)
                    except ValueError:
                        pass
                li = InvoiceLineItem(
                    invoice=invoice, org_id=org_id,
                    sequence=li_data.sequence,
                    chargeitem_ref_type=chargeitem_ref_type,
                    chargeitem_ref_id=li_data.chargeitem_ref_id,
                    chargeitem_ref_display=li_data.chargeitem_ref_display,
                    chargeitem_cc_system=li_data.chargeitem_cc_system,
                    chargeitem_cc_code=li_data.chargeitem_cc_code,
                    chargeitem_cc_display=li_data.chargeitem_cc_display,
                    chargeitem_cc_text=li_data.chargeitem_cc_text,
                )
                session.add(li)
                for pc_data in (li_data.price_components or []):
                    session.add(InvoiceLineItemPriceComponent(
                        line_item=li, org_id=org_id,
                        type=pc_data.type,
                        code_system=pc_data.code_system, code_code=pc_data.code_code,
                        code_display=pc_data.code_display, code_text=pc_data.code_text,
                        factor=pc_data.factor,
                        amount_value=pc_data.amount_value,
                        amount_currency=pc_data.amount_currency,
                    ))

            for tpc_data in (payload.total_price_components or []):
                session.add(InvoiceTotalPriceComponent(
                    invoice=invoice, org_id=org_id,
                    type=tpc_data.type,
                    code_system=tpc_data.code_system, code_code=tpc_data.code_code,
                    code_display=tpc_data.code_display, code_text=tpc_data.code_text,
                    factor=tpc_data.factor,
                    amount_value=tpc_data.amount_value,
                    amount_currency=tpc_data.amount_currency,
                ))

            for n_data in (payload.notes or []):
                session.add(InvoiceNote(
                    invoice=invoice, org_id=org_id,
                    text=n_data.text,
                    time=n_data.time,
                    author_string=n_data.author_string,
                    author_reference_type=n_data.author_reference_type,
                    author_reference_id=n_data.author_reference_id,
                    author_reference_display=n_data.author_reference_display,
                ))

            try:
                await session.commit()
                await session.refresh(invoice)
            except Exception:
                await session.rollback()
                raise

        return await self.get_by_invoice_id(invoice.invoice_id)

    async def patch(
        self,
        invoice_id: int,
        payload: InvoicePatchSchema,
        updated_by: Optional[str],
    ) -> Optional[InvoiceModel]:
        async with self.session_factory() as session:
            stmt = select(InvoiceModel).where(InvoiceModel.invoice_id == invoice_id)
            result = await session.execute(stmt)
            invoice = result.scalars().first()
            if not invoice:
                return None

            updates = payload.model_dump(exclude_unset=True)
            for field, value in updates.items():
                if field == "status" and value is not None:
                    try:
                        setattr(invoice, field, InvoiceStatus(value).value)
                    except ValueError:
                        raise HTTPException(
                            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail=f"Invalid status '{value}'.",
                        )
                else:
                    setattr(invoice, field, value)
            invoice.updated_by = updated_by

            try:
                await session.commit()
                await session.refresh(invoice)
            except Exception:
                await session.rollback()
                raise

        return await self.get_by_invoice_id(invoice_id)

    async def delete(self, invoice_id: int) -> None:
        async with self.session_factory() as session:
            stmt = select(InvoiceModel).where(InvoiceModel.invoice_id == invoice_id)
            result = await session.execute(stmt)
            invoice = result.scalars().first()
            if not invoice:
                raise HTTPException(
                    status_code=http_status.HTTP_404_NOT_FOUND,
                    detail="Invoice not found",
                )
            try:
                await session.delete(invoice)
                await session.commit()
            except Exception:
                await session.rollback()
                raise
