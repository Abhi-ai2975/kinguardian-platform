"""DocumentReference input schema re-exports."""

from app.schemas.document_reference.input import (
    DocumentReferenceCreateSchema,
    DocumentReferencePatchSchema,
    ListDocumentReferencesSchema,
)

__all__ = [
    "DocumentReferenceCreateSchema",
    "DocumentReferencePatchSchema",
    "ListDocumentReferencesSchema",
]
