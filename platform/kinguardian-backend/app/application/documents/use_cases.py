"""
Documents Application Use Cases:
- UploadHealthDocumentUseCase
- ProcessHealthDocumentUseCase
- ReviewDocumentExtractionUseCase
- IngestDocumentAsyncUseCase
- ApproveAndSyncClinicalRecordUseCase
"""

import uuid
from typing import Dict, Any, Optional
from app.domains.family.application.services import FamilyService
from app.domains.family.domain.entities import HealthDocumentEntity, DocumentExtractionEntity
from app.application.documents.workflow import DocumentProcessingWorkflow


class UploadHealthDocumentUseCase:
    """Stores medical document/prescription metadata and persists file in FileNest WORM storage."""
    def __init__(self, family_service: FamilyService):
        self.family_service = family_service

    async def execute(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        subject_id: uuid.UUID,
        filenest_file_id: uuid.UUID,
        document_type: str,
        title: Optional[str] = None,
        mime_type: str = "application/pdf",
        file_size_bytes: int = 0
    ) -> HealthDocumentEntity:
        return await self.family_service.add_health_document(
            requester_id=requester_id,
            family_id=family_id,
            subject_id=subject_id,
            filenest_file_id=str(filenest_file_id),
            document_type=document_type
        )


class ProcessHealthDocumentUseCase:
    """Executes OCR text and structured clinical entity extraction on an uploaded document."""
    def __init__(self, family_service: FamilyService):
        self.family_service = family_service

    async def execute(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        document_id: uuid.UUID,
        extracted_text: str,
        structured_data: Optional[Dict[str, Any]] = None,
        confidence: float = 0.95,
        extraction_type: str = "ocr"
    ) -> DocumentExtractionEntity:
        raw_output = {"text": extracted_text}
        normalized_output = structured_data or {"extracted": extracted_text}
        return await self.family_service.add_document_extraction(
            requester_id=requester_id,
            family_id=family_id,
            document_id=document_id,
            extraction_type=extraction_type,
            raw_output=raw_output,
            normalized_output=normalized_output,
            confidence=confidence
        )


class ReviewDocumentExtractionUseCase:
    """Allows coordinator or caregiver to review and approve clinical values extracted from a document."""
    def __init__(self, family_service: FamilyService):
        self.family_service = family_service

    async def execute(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        extraction_id: uuid.UUID,
        approved: bool = True,
        normalized_output: Optional[Dict[str, Any]] = None
    ) -> Optional[DocumentExtractionEntity]:
        review_status = "approved" if approved else "rejected"
        return await self.family_service.review_document_extraction(
            requester_id=requester_id,
            family_id=family_id,
            extraction_id=extraction_id,
            review_status=review_status,
            normalized_output=normalized_output
        )


class IngestDocumentAsyncUseCase:
    """Uploads document to FileNest WORM storage, validates format, and emits asynchronous document events."""
    def __init__(self, workflow: DocumentProcessingWorkflow):
        self.workflow = workflow

    async def execute(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        subject_id: uuid.UUID,
        file_bytes: bytes,
        filename: str,
        document_type: str = "prescription",
        mime_type: str = "application/pdf"
    ) -> HealthDocumentEntity:
        return await self.workflow.upload_document_to_filenest(
            requester_id=requester_id,
            family_id=family_id,
            subject_id=subject_id,
            file_bytes=file_bytes,
            filename=filename,
            document_type=document_type,
            mime_type=mime_type
        )


class ApproveAndSyncClinicalRecordUseCase:
    """Reviews candidate clinical entities and optionally syncs approved data into the FHIR R4 clinical record."""
    def __init__(self, workflow: DocumentProcessingWorkflow):
        self.workflow = workflow

    async def execute(
        self,
        reviewer_id: uuid.UUID,
        family_id: uuid.UUID,
        extraction_id: uuid.UUID,
        approved_data: Dict[str, Any],
        write_to_clinical_record: bool = True
    ) -> Dict[str, Any]:
        return await self.workflow.review_and_sync_clinical_record(
            reviewer_id=reviewer_id,
            family_id=family_id,
            extraction_id=extraction_id,
            approved_data=approved_data,
            write_to_clinical_record=write_to_clinical_record
        )
