import uuid
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.logging import get_logger
from app.domains.family.application.services import FamilyService
from app.domains.events.services import EventService
from app.domains.family.application.permissions import (
    PermissionVerifier,
    CAP_UPLOAD_DOCUMENTS,
    CAP_VIEW_DOCUMENTS
)
from app.domains.family.infrastructure.models import CareSubject
from app.domains.family.infrastructure.repositories import SQLAlchemyAppProfileRepository, SQLAlchemyFamilyRepository, SQLAlchemyConsentRepository
from app.domains.documents.schemas import DocumentUploadResponse

try:
    from filenest import AsyncFileNest
    FILENEST_SDK_AVAILABLE = True
except ImportError:
    FILENEST_SDK_AVAILABLE = False

logger = get_logger(__name__)


class DocumentService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.profile_repo = SQLAlchemyAppProfileRepository(session)
        self.circle_repo = SQLAlchemyFamilyRepository(session)
        self.event_service = EventService(session)
        
        self.family_service = FamilyService(
            user_repo=self.profile_repo,
            circle_repo=self.circle_repo,
            consent_repo=SQLAlchemyConsentRepository(session),
            event_logger=self.event_service
        )

    async def _verify_capability_and_consent(self, parent_id: uuid.UUID, requester_id: uuid.UUID, required_cap: str, scope: str) -> tuple[uuid.UUID, uuid.UUID]:
        # Find shared family
        circles = await self.circle_repo.list_for_user(parent_id)
        circle_id = None
        for c in circles:
            m = await self.circle_repo.get_member(c.id, requester_id)
            if m:
                circle_id = c.id
                break

        if not circle_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No shared family context found with this parent"
            )

        stmt = select(CareSubject).where(
            CareSubject.family_id == circle_id,
            CareSubject.profile_id == parent_id
        )
        res = await self.session.execute(stmt)
        subject = res.scalar_one_or_none()
        if not subject:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Parent is not registered as a Care Subject in this family context."
            )

        # Enforce consent check
        has_consent = await self.family_service.check_consent(
            family_id=circle_id,
            subject_id=subject.id,
            grantor_profile_id=parent_id,
            grantee_profile_id=requester_id,
            scope_key=scope
        )
        if not has_consent:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"You do not have consent to access this parent's {scope} records"
            )

        # Enforce capability check
        verifier = PermissionVerifier(self.session)
        has_cap = await verifier.verify_capability(
            profile_id=requester_id,
            family_id=circle_id,
            capability=required_cap,
            subject_id=subject.id
        )
        if not has_cap:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"You do not have the required '{required_cap}' capability"
            )
            
        return circle_id, subject.id

    async def upload_parent_document(
        self,
        parent_id: uuid.UUID,
        requester_id: uuid.UUID,
        filename: str,
        file_bytes: bytes,
        mime_type: str
    ) -> DocumentUploadResponse:
        # Enforce consent & capability checks
        circle_id, _ = await self._verify_capability_and_consent(parent_id, requester_id, CAP_UPLOAD_DOCUMENTS, "documents")

        # FileNest Upload
        doc_resp = None
        if FILENEST_SDK_AVAILABLE and settings.FILENEST_API_KEY and settings.FILENEST_PROJECT_ID:
            try:
                async with AsyncFileNest(
                    api_key=settings.FILENEST_API_KEY,
                    project_id=settings.FILENEST_PROJECT_ID,
                    base_url=settings.FILENEST_URL
                ) as fn:
                    response = await fn.files.upload(
                        filename=filename,
                        data=file_bytes,
                        mimeType=mime_type
                    )
                    doc_resp = DocumentUploadResponse(
                        file_id=response.get("id", "unknown"),
                        filename=response.get("filename", filename),
                        mime_type=response.get("mime_type", mime_type),
                        size_bytes=response.get("size_bytes", len(file_bytes)),
                        status=response.get("status", "processing"),
                        classification=response.get("classification")
                    )
            except Exception as e:
                logger.error(f"FileNest upload failed: {e}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Failed to upload document to storage backend"
                )
        else:
            logger.info("FileNest credentials or SDK missing/inactive. Simulating secure storage upload.")
            doc_resp = DocumentUploadResponse(
                file_id=f"mock_fil_{uuid.uuid4().hex[:8]}",
                filename=filename,
                mime_type=mime_type,
                size_bytes=len(file_bytes),
                status="ready",
                classification="prescription"
            )

        # Audit Log
        if doc_resp:
            requester = await self.profile_repo.get_by_id(requester_id)
            parent = await self.profile_repo.get_by_id(parent_id)
            requester_tz = requester.timezone if requester else "UTC"
            parent_tz = parent.timezone if parent else "Asia/Kolkata"

            await self.event_service.log_event(
                care_circle_id=circle_id,
                event_type="document_uploaded",
                payload={
                    "uploaded_by": str(requester_id),
                    "parent_id": str(parent_id),
                    "file_id": doc_resp.file_id,
                    "filename": doc_resp.filename,
                    "classification": doc_resp.classification
                },
                parent_tz=parent_tz,
                coordinator_tz=requester_tz
            )

        return doc_resp
    
    async def list_parent_documents(self, parent_id: uuid.UUID, requester_id: uuid.UUID):
        # Enforce consent & capability checks
        await self._verify_capability_and_consent(parent_id, requester_id, CAP_VIEW_DOCUMENTS, "documents")

        if FILENEST_SDK_AVAILABLE and settings.FILENEST_API_KEY and settings.FILENEST_PROJECT_ID:
            try:
                async with AsyncFileNest(
                    api_key=settings.FILENEST_API_KEY,
                    project_id=settings.FILENEST_PROJECT_ID,
                    base_url=settings.FILENEST_URL
                ) as fn:
                    result = await fn.files.list(limit=50)
                    return result.get("data", [])
            except Exception as e:
                logger.error(f"Failed to list documents from FileNest: {e}")
                
        return []
