from dependency_injector.wiring import inject, Provide
from fastapi import Depends

from app.di.container import Container
from app.services.invoice_service import InvoiceService


@inject
def get_invoice_service(
    service: InvoiceService = Depends(Provide[Container.invoice.invoice_service]),
) -> InvoiceService:
    return service
