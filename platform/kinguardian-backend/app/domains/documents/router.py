import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.domains.family.infrastructure.models import AppProfile
from app.domains.family.infrastructure.repositories import (
    SQLAlchemyAppProfileRepository,
    SQLAlchemyFamilyRepository,
    SQLAlchemyConsentRepository
)
from app.domains.events.services import EventService
from app.domains.family.application.services import FamilyService
from app.domains.family.schemas import (
    HealthDocumentResponse,
    HealthDocumentUploadInitRequest,
    HealthDocumentUploadInitResponse,
    FileNestWebhookPayload,
    DocumentExtractionResponse
)
from app.domains.family.domain.exceptions import FamilyAccessError
from app.domains.documents.schemas import DocumentUploadResponse
from app.domains.documents.services import DocumentService

router = APIRouter(prefix="/documents", tags=["Documents"])


def get_family_service(session: AsyncSession) -> FamilyService:
    user_repo = SQLAlchemyAppProfileRepository(session)
    circle_repo = SQLAlchemyFamilyRepository(session)
    consent_repo = SQLAlchemyConsentRepository(session)
    event_logger = EventService(session)
    return FamilyService(user_repo, circle_repo, consent_repo, event_logger)


@router.post("", response_model=HealthDocumentUploadInitResponse, status_code=status.HTTP_201_CREATED)
async def initiate_document_upload(
    payload: HealthDocumentUploadInitRequest,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Step 1 of FileNest Integration:
    Creates KinGuardian document metadata and initiates secure FileNest upload target.
    """
    service = get_family_service(db_session)
    subject_id = payload.subject_id
    if not subject_id:
        # Resolve from user's subjects
        subjects = await service.circle_repo.list_care_subjects_by_profile(current_user.id)
        if not subjects:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="subject_id is required.")
        subject_id = subjects[0].id

    try:
        return await service.initiate_subject_document_upload(
            requester_id=current_user.id,
            subject_id=subject_id,
            document_type=payload.document_type,
            filename=payload.filename,
            mime_type=payload.mime_type,
            file_size_bytes=payload.file_size_bytes
        )
    except FamilyAccessError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.post("/webhook")

@router.post("/filenest-webhook")
async def handle_filenest_webhook(
    payload: FileNestWebhookPayload,
    db_session: AsyncSession = Depends(get_db)
):
    """
    FileNest Webhook Receiver:
    Triggered when a file finishes uploading or processing in FileNest.
    Advances KinGuardian document processing workflow and executes AI Extraction.
    """
    service = get_family_service(db_session)
    try:
        return await service.process_filenest_webhook(
            event=payload.event,
            file_id=payload.file_id,
            status=payload.status,
            mime_type=payload.mime_type,
            extracted_text=payload.extracted_text,
            classification=payload.classification,
            metadata=payload.metadata
        )
    except FamilyAccessError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/{parent_id}")
async def get_document_or_parent_documents(
    parent_id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Retrieves health document metadata by document ID, or lists documents for parent.
    """
    service = get_family_service(db_session)
    doc = await service.circle_repo.get_health_document(parent_id)
    if doc:
        return doc
    doc_service = DocumentService(db_session)
    return await doc_service.list_parent_documents(parent_id, current_user.id)



@router.get("/{id}/extractions", response_model=List[DocumentExtractionResponse])
async def get_document_extractions(
    id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Retrieves AI extractions for a health document.
    """
    circle_repo = SQLAlchemyFamilyRepository(db_session)
    doc = await circle_repo.get_health_document(id)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
    return await circle_repo.list_document_extractions(id)


@router.post("/upload/{parent_id}", response_model=DocumentUploadResponse)
async def upload_document(
    parent_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    service = DocumentService(db_session)
    file_bytes = await file.read()
    return await service.upload_parent_document(
        parent_id=parent_id,
        requester_id=current_user.id,
        filename=file.filename or "upload.bin",
        file_bytes=file_bytes,
        mime_type=file.content_type or "application/octet-stream"
    )
