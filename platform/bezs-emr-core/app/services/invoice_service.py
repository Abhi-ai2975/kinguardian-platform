from typing import List, Optional, Tuple

from app.fhir.mappers.invoice import to_fhir_invoice, to_plain_invoice
from app.models.invoice.invoice import InvoiceModel
from app.repository.invoice_repository import InvoiceRepository
from app.schemas.invoice.input import InvoiceCreateSchema, InvoicePatchSchema


class InvoiceService:
    def __init__(self, repository: InvoiceRepository):
        self.repository = repository

    def _to_fhir(self, invoice: InvoiceModel) -> dict:
        return to_fhir_invoice(invoice)

    def _to_plain(self, invoice: InvoiceModel) -> dict:
        return to_plain_invoice(invoice)

    async def get_raw_by_invoice_id(self, invoice_id: int) -> Optional[InvoiceModel]:
        return await self.repository.get_by_invoice_id(invoice_id)

    async def get_invoice(self, invoice_id: int) -> Optional[InvoiceModel]:
        return await self.repository.get_by_invoice_id(invoice_id)

    async def get_me(
        self,
        user_id: str,
        org_id: str,
        invoice_status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[InvoiceModel], int]:
        return await self.repository.get_me(
            user_id, org_id, invoice_status=invoice_status, limit=limit, offset=offset
        )

    async def list_invoices(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        invoice_status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[InvoiceModel], int]:
        return await self.repository.list(
            user_id=user_id,
            org_id=org_id,
            invoice_status=invoice_status,
            limit=limit,
            offset=offset,
        )

    async def create_invoice(
        self,
        data: InvoiceCreateSchema,
        user_id: Optional[str],
        org_id: Optional[str],
        created_by: Optional[str],
    ) -> InvoiceModel:
        return await self.repository.create(data, user_id, org_id, created_by)

    async def patch_invoice(
        self,
        invoice_id: int,
        data: InvoicePatchSchema,
        updated_by: Optional[str],
    ) -> Optional[InvoiceModel]:
        return await self.repository.patch(invoice_id, data, updated_by)

    async def delete_invoice(self, invoice_id: int) -> None:
        await self.repository.delete(invoice_id)
