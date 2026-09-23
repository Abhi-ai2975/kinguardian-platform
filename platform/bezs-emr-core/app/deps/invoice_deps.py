from fastapi import Depends, HTTPException, Path, status

from app.di.dependencies.invoice import get_invoice_service
from app.models.invoice.invoice import InvoiceModel
from app.services.invoice_service import InvoiceService


async def resolve_invoice(
    invoice_id: int = Path(..., ge=1, description="Public invoice identifier."),
    invoice_service: InvoiceService = Depends(get_invoice_service),
) -> InvoiceModel:
    """Load invoice by public id or raise 404."""
    invoice = await invoice_service.get_raw_by_invoice_id(invoice_id)
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found"
        )
    return invoice
