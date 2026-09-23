from dependency_injector import containers, providers

from app.repository.invoice_repository import InvoiceRepository
from app.services.invoice_service import InvoiceService


class InvoiceContainer(containers.DeclarativeContainer):

    core = providers.DependenciesContainer()

    invoice_repository = providers.Factory(
        InvoiceRepository,
        session_factory=core.database.provided.session,
    )

    invoice_service = providers.Factory(
        InvoiceService,
        repository=invoice_repository,
    )
