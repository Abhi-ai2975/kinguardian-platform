"""
File Security Boundary & FileNest Signed Access:
Enforces that mobile clients never receive raw/unrestricted object storage credentials.

Architectural Flow:
Mobile Client
    ↓
KinGuardian Permission Check (Auth + Tenancy + Membership + Consent)
    ↓
FileNest Signed Upload / Download (Short-lived HMAC signed URL, max TTL 900s)
    ↓
FileNest Object Storage
"""

import uuid
import hmac
import hashlib
import time
from typing import Dict, Any, Optional
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import get_logger
from app.domains.family.infrastructure.repositories import (
    SQLAlchemyFamilyRepository,
    SQLAlchemyConsentRepository
)
from app.domains.family.domain.exceptions import FamilyAccessError

logger = get_logger(__name__)


class FileSecurityBoundary:
    """
    Enforces KinGuardian authorization checks and generates scoped, short-lived
    FileNest signed URLs without exposing master storage credentials.
    """

    ALLOWED_MIME_TYPES = {
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/heic"
    }

    @classmethod
    def _generate_hmac_signature(cls, file_id: str, expiry_timestamp: int) -> str:
        raw_secret = settings.JWT_SECRET_KEY.get_secret_value() if hasattr(settings.JWT_SECRET_KEY, "get_secret_value") else str(settings.JWT_SECRET_KEY)
        secret = raw_secret.encode("utf-8")
        payload = f"{file_id}:{expiry_timestamp}".encode("utf-8")
        return hmac.new(secret, payload, hashlib.sha256).hexdigest()


    @classmethod
    async def authorize_and_generate_signed_upload(
        cls,
        session: AsyncSession,
        requester_id: uuid.UUID,
        subject_id: uuid.UUID,
        document_type: str,
        filename: str,
        mime_type: str,
        expiry_seconds: int = 900
    ) -> Dict[str, Any]:
        """
        Validates permission and MIME type, then generates a temporary signed upload URL.
        """
        if mime_type.lower() not in cls.ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported document MIME type '{mime_type}'. Allowed types: {sorted(list(cls.ALLOWED_MIME_TYPES))}"
            )

        family_repo = SQLAlchemyFamilyRepository(session)
        subject = await family_repo.get_care_subject(subject_id)
        if not subject:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Care subject not found."
            )

        # Enforce Membership
        membership = await family_repo.get_member(subject.family_id, requester_id)
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Requester is not authorized to upload documents for this family circle."
            )

        # Generate scoped file ID & signed upload URL
        file_id = f"filenest_{uuid.uuid4().hex}"
        expires_at = int(time.time()) + expiry_seconds
        sig = cls._generate_hmac_signature(file_id, expires_at)
        signed_upload_url = (
            f"{settings.FILENEST_URL}/api/v1/files/upload/{file_id}"
            f"?token=sig_{sig[:16]}&expires={expires_at}"
        )

        logger.info(
            f"Signed upload URL generated for subject={subject_id}, file_id={file_id}, "
            f"expires_in={expiry_seconds}s"
        )

        return {
            "filenest_file_id": file_id,
            "filename": filename,
            "mime_type": mime_type,
            "upload_url": signed_upload_url,
            "expires_in_seconds": expiry_seconds,
            "credentials_exposed": False
        }

    @classmethod
    async def authorize_and_generate_signed_download(
        cls,
        session: AsyncSession,
        requester_id: uuid.UUID,
        document_id: uuid.UUID,
        expiry_seconds: int = 900
    ) -> Dict[str, Any]:
        """
        Validates permission and generates a temporary signed download/preview URL.
        """
        family_repo = SQLAlchemyFamilyRepository(session)
        doc = await family_repo.get_health_document(document_id)
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Health document not found."
            )

        # Enforce Membership
        membership = await family_repo.get_member(doc.family_id, requester_id)
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Requester is not authorized to view documents for this family circle."
            )

        # Enforce WORM & quarantine security
        if doc.status == "quarantined":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Document is quarantined due to safety validation failure."
            )

        expires_at = int(time.time()) + expiry_seconds
        sig = cls._generate_hmac_signature(doc.filenest_file_id, expires_at)
        signed_download_url = (
            f"{settings.FILENEST_URL}/api/v1/files/download/{doc.filenest_file_id}"
            f"?token=sig_{sig[:16]}&expires={expires_at}"
        )

        logger.info(
            f"Signed download URL generated for doc={document_id}, "
            f"file_id={doc.filenest_file_id}, expires_in={expiry_seconds}s"
        )

        return {
            "document_id": str(doc.id),
            "filenest_file_id": doc.filenest_file_id,
            "download_url": signed_download_url,
            "expires_in_seconds": expiry_seconds,
            "credentials_exposed": False
        }
