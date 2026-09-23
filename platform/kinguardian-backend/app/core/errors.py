import uuid
from enum import Enum
from typing import Optional, Dict, Any
from fastapi import HTTPException, status
from pydantic import BaseModel, Field


class ErrorCode(str, Enum):
    FAMILY_NOT_FOUND = "FAMILY_NOT_FOUND"
    SUBJECT_NOT_FOUND = "SUBJECT_NOT_FOUND"
    FORBIDDEN = "FORBIDDEN"
    CONSENT_REQUIRED = "CONSENT_REQUIRED"
    MEDICATION_NOT_ACTIVE = "MEDICATION_NOT_ACTIVE"
    APPOINTMENT_NOT_FOUND = "APPOINTMENT_NOT_FOUND"
    DOCUMENT_NOT_READY = "DOCUMENT_NOT_READY"
    AI_ACTION_REQUIRES_APPROVAL = "AI_ACTION_REQUIRES_APPROVAL"
    RATE_LIMITED = "RATE_LIMITED"
    UNAUTHORIZED = "UNAUTHORIZED"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    IMMUTABILITY_VIOLATION = "IMMUTABILITY_VIOLATION"
    INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR"


class ErrorDetail(BaseModel):
    code: str = Field(..., description="Stable domain-specific error code")
    message: str = Field(..., description="Human-readable error description")
    request_id: str = Field(..., description="Correlation request ID")
    details: Optional[Dict[str, Any]] = None


class ErrorResponse(BaseModel):
    error: ErrorDetail


class AppError(HTTPException):
    """
    Standardized Application Exception for KinGuardian.
    Guarantees stable error envelopes without leaking raw exception types or stack traces.
    """
    def __init__(
        self,
        code: ErrorCode,
        message: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: Optional[Dict[str, Any]] = None
    ):
        self.code = code
        self.message = message
        self.details = details
        super().__init__(status_code=status_code, detail=message)


# Specialized Domain Exceptions

class FamilyNotFoundError(AppError):
    def __init__(self, family_id: Optional[Any] = None, message: Optional[str] = None):
        msg = message or f"Family '{family_id}' was not found."
        super().__init__(
            code=ErrorCode.FAMILY_NOT_FOUND,
            message=msg,
            status_code=status.HTTP_404_NOT_FOUND
        )


class SubjectNotFoundError(AppError):
    def __init__(self, subject_id: Optional[Any] = None, message: Optional[str] = None):
        msg = message or f"Care subject '{subject_id}' was not found."
        super().__init__(
            code=ErrorCode.SUBJECT_NOT_FOUND,
            message=msg,
            status_code=status.HTTP_404_NOT_FOUND
        )


class ForbiddenError(AppError):
    def __init__(self, message: Optional[str] = None):
        msg = message or "You do not have permission to perform this action."
        super().__init__(
            code=ErrorCode.FORBIDDEN,
            message=msg,
            status_code=status.HTTP_403_FORBIDDEN
        )


class ConsentRequiredError(AppError):
    def __init__(self, message: Optional[str] = None, required_scope: Optional[str] = None):
        msg = message or "You do not have permission to view this health information. Explicit patient consent is required."
        details = {"required_scope": required_scope} if required_scope else None
        super().__init__(
            code=ErrorCode.CONSENT_REQUIRED,
            message=msg,
            status_code=status.HTTP_403_FORBIDDEN,
            details=details
        )


class MedicationNotActiveError(AppError):
    def __init__(self, message: Optional[str] = None):
        msg = message or "Medication is not active or has been discontinued."
        super().__init__(
            code=ErrorCode.MEDICATION_NOT_ACTIVE,
            message=msg,
            status_code=status.HTTP_400_BAD_REQUEST
        )


class AppointmentNotFoundError(AppError):
    def __init__(self, appointment_id: Optional[Any] = None, message: Optional[str] = None):
        msg = message or f"Appointment '{appointment_id}' was not found."
        super().__init__(
            code=ErrorCode.APPOINTMENT_NOT_FOUND,
            message=msg,
            status_code=status.HTTP_404_NOT_FOUND
        )


class DocumentNotReadyError(AppError):
    def __init__(self, message: Optional[str] = None):
        msg = message or "Document extraction is still processing and not ready."
        super().__init__(
            code=ErrorCode.DOCUMENT_NOT_READY,
            message=msg,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY
        )


class AIActionRequiresApprovalError(AppError):
    def __init__(self, action_id: Optional[Any] = None, message: Optional[str] = None):
        msg = message or f"AI Action '{action_id}' requires coordinator or parent approval before execution."
        super().__init__(
            code=ErrorCode.AI_ACTION_REQUIRES_APPROVAL,
            message=msg,
            status_code=status.HTTP_400_BAD_REQUEST
        )


class RateLimitedError(AppError):
    def __init__(self, message: Optional[str] = None):
        msg = message or "Too many requests. Please slow down."
        super().__init__(
            code=ErrorCode.RATE_LIMITED,
            message=msg,
            status_code=status.HTTP_429_TOO_MANY_REQUESTS
        )
